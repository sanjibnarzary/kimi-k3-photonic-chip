import { SimulationState, SimulationMetrics, K3LayerPreset } from '../types/photonic';
import { KIMI_K3_LAYERS } from '../data/kimiK3Specs';

const SPEED_OF_LIGHT = 299792458; // m/s
const SI3N4_GROUP_INDEX = 2.08;
const SOI_GROUP_INDEX = 3.96;

export function calculateSimulationMetrics(state: SimulationState): SimulationMetrics {
  const selectedLayer: K3LayerPreset = 
    KIMI_K3_LAYERS.find(l => l.id === state.selectedLayerId) || KIMI_K3_LAYERS[0];

  // 1. Physical Optical Core Latency
  // Time for light wavefront to traverse the waveguide bus and optical matrix crossbar
  const waveguideLengthM = (state.waveguideLengthCm / 100);
  const passiveDelaySec = (waveguideLengthM * SI3N4_GROUP_INDEX) / SPEED_OF_LIGHT;
  const activeCoreLengthM = 0.008; // 8mm active crossbar
  const activeDelaySec = (activeCoreLengthM * SOI_GROUP_INDEX) / SPEED_OF_LIGHT;
  const opticalCoreLatencyPs = Math.round((passiveDelaySec + activeDelaySec) * 1e12); // in picoseconds

  // 2. Electro-Optic Modulator & Transimpedance Amplifier conversion latency
  const modRateGhz = state.opticalBaudRateGbaud;
  const serializationLatencyPs = Math.round((1000 / modRateGhz) * 4); // PAM4 modulation cycle
  const tiaAdcLatencyPs = 35; // 35 ps for ultrafast TIA + flash/SAR ADC
  const cpoBridgeLatencyPs = 450; // 0.45 ns for optical CPO link to host memory

  // Total latency per matrix tile (picoseconds)
  const singleTileLatencyPs = opticalCoreLatencyPs + serializationLatencyPs + tiaAdcLatencyPs + cpoBridgeLatencyPs;

  // Number of optical tiles needed for layer dimension (K x N)
  // Each tile executes (matrixRadix x matrixRadix) simultaneously across 64 WDM wavelengths
  const opsPerTile = state.matrixRadix * state.matrixRadix * 64;
  const totalWeightParams = selectedLayer.dimK * selectedLayer.dimN;
  const effectiveParams = selectedLayer.sparsityPct > 0 
    ? totalWeightParams * (1 - (selectedLayer.sparsityPct / 100))
    : totalWeightParams;

  const totalTiles = Math.max(1, Math.ceil(effectiveParams / opsPerTile));
  // 16 optical chiplets operating in parallel on the CPO substrate
  const parallelChiplets = 16;
  const serialTilePasses = Math.ceil(totalTiles / parallelChiplets);

  // Total Optical Inference Latency in Microseconds
  // Hardware-stored weights: ZERO DRAM read access latency!
  const totalTokenLatencyUs = Math.max(0.42, Number(((serialTilePasses * singleTileLatencyPs * 1e-6) * (state.batchSize / 4)).toFixed(3)));

  // 3. Comparison with Electronic GPU Baseline (e.g. B200 / H100 with HBM3e)
  // In electronic GPU LLM decoding (batch size 1-16), compute is strictly memory-bandwidth bound.
  // Weight parameter fetching from HBM3e (8.0 TB/s on B200):
  // Time = (Weights bytes) / HBM_Bandwidth + Compute ALU overhead
  const bytesPerParam = state.precisionMode === 'Optical-FP8' ? 1.0 : (state.precisionMode === 'Optical-INT4' ? 0.5 : 1.0);
  const weightDataGigabytes = (effectiveParams * bytesPerParam) / 1e9;
  const hbm3eBandwidthGbps = 8000; // 8.0 TB/s
  const electronicDramFetchTimeSec = (weightDataGigabytes / hbm3eBandwidthGbps) * (1 + (state.sequenceLength / 65536) * 0.15);
  const electronicComputeOverheadSec = 2.5e-6; // 2.5 us ALU kernel launch and pipeline overhead
  const electronicGpuLatencyUs = Number(((electronicDramFetchTimeSec + electronicComputeOverheadSec) * 1e6 * (state.batchSize * 0.4)).toFixed(2));

  const speedupFactor = Number((electronicGpuLatencyUs / totalTokenLatencyUs).toFixed(2));

  // 4. Power & Energy Consumption
  // Laser Comb power: Laser efficiency ~20%, so wall-plug is 5x optical power
  const laserOptPowerWatts = Math.pow(10, state.laserOpticalPowerDbm / 10) / 1000;
  const laserWallPowerWatts = laserOptPowerWatts * 64 * 5; // 64 WDM tones
  
  // Modulator dynamic power (MRM at state.modulatorEnergyFjPerBit)
  const bitRateBps = state.opticalBaudRateGbaud * 1e9 * 2; // PAM4 = 2 bits/baud
  const modPowerPerChannel = (state.modulatorEnergyFjPerBit * 1e-15) * bitRateBps;
  const totalModPowerWatts = modPowerPerChannel * 64 * parallelChiplets;

  // Thermal stabilization micro-heaters
  const thermalPllPowerWatts = state.thermalStabilizerActive ? 6.5 : 0.2; // 6.5W active phase tracking
  const tiaAdcPowerWatts = 14.2; // TIA + high-speed ADC array
  const hostCpoIoPowerWatts = 4.8; // UCIe optical PHY

  const opticalPowerWatts = Number((laserWallPowerWatts + totalModPowerWatts + thermalPllPowerWatts + tiaAdcPowerWatts + hostCpoIoPowerWatts).toFixed(1));
  const electronicPowerWatts = 700; // Baseline 700W for high-end electronic GPU during full HBM streaming

  // Total MAC operations
  const totalMacOps = 2 * effectiveParams * state.batchSize;
  const opticalTflops = Number(((totalMacOps / (totalTokenLatencyUs * 1e-6)) / 1e12).toFixed(1));

  // TOPS / Watt calculation
  const tops = totalMacOps / 1e12;
  const energyJoules = opticalPowerWatts * (totalTokenLatencyUs * 1e-6);
  const energyEfficiencyTopsPerWatt = Number((tops / energyJoules).toFixed(1));

  // Memory bandwidth saved (TB/s) because weights are permanently in hardware PCM
  const memoryBandwidthSavedTbps = Number(((effectiveParams * bytesPerParam) / (totalTokenLatencyUs * 1e-6) / 1e12).toFixed(2));
  const dramEnergySavedJoulesPerToken = Number((weightDataGigabytes * 3.5e-3).toFixed(4)); // ~3.5 mJ per GB HBM read

  // 5. Optical Insertion Loss & Link Budget
  const inputCouplerLossDb = 0.45;
  const outputCouplerLossDb = 0.45;
  const propLossDb = state.waveguideLossDbPerCm * state.waveguideLengthCm;
  const modLossDb = 1.2;
  const matrixLossDb = 1.8;
  const pcmLossDb = 0.75;
  const demuxLossDb = 0.9;
  const thermalPenaltyDb = state.thermalStabilizerActive ? 0.15 : 3.8; // severe attenuation if phase drifts

  const totalInsertionLossDb = Number((
    inputCouplerLossDb + outputCouplerLossDb + propLossDb + modLossDb + matrixLossDb + pcmLossDb + demuxLossDb + thermalPenaltyDb
  ).toFixed(2));

  // Received Optical Power
  const rxPowerDbm = state.laserOpticalPowerDbm - totalInsertionLossDb;
  const receiverSensitivityDbm = -18.5; // High-speed Ge PIN diode sensitivity limit
  const linkMarginDb = Number((rxPowerDbm - receiverSensitivityDbm).toFixed(2));

  // Optical Signal to Noise Ratio (OSNR)
  const opticalSnrDb = Number((Math.max(12, 38.5 - totalInsertionLossDb * 0.8)).toFixed(1));

  // Bit Error Rate (BER) estimated from OSNR and Q-factor
  const qFactor = Math.pow(10, opticalSnrDb / 20) / 2.5;
  const bitErrorRate = Math.max(1e-16, 0.5 * Math.exp(-0.5 * qFactor * qFactor));

  return {
    opticalCoreLatencyPs,
    totalTokenLatencyUs,
    electronicGpuLatencyUs,
    speedupFactor,
    opticalPowerWatts,
    electronicPowerWatts,
    energyEfficiencyTopsPerWatt,
    opticalTflops,
    memoryBandwidthSavedTbps,
    dramEnergySavedJoulesPerToken,
    totalInsertionLossDb,
    linkMarginDb,
    opticalSnrDb,
    bitErrorRate
  };
}
