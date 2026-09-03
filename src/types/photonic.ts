/**
 * Photonic Chip Architecture Types for Kimi K3 Optical Accelerator
 */

export interface PhotonicBlock {
  id: string;
  name: string;
  category: 'laser' | 'waveguide' | 'modulator' | 'weight_core' | 'detector' | 'interconnect' | 'control';
  coordinates: { x: number; y: number; width: number; height: number };
  description: string;
  technicalSpecs: { [key: string]: string | number };
  lossPenaltyDb: number;
  latencyPs: number;
  energyFjPerBit?: number;
}

export interface K3LayerPreset {
  id: string;
  name: string;
  type: 'attention_qkv' | 'attention_proj' | 'moe_gate' | 'moe_up_down';
  dimM: number;
  dimK: number;
  dimN: number;
  weightsCountMillion: number;
  sparsityPct: number;
  description: string;
}

export interface SimulationState {
  batchSize: number;
  sequenceLength: number;
  selectedLayerId: string;
  laserWavelengthNm: number;
  laserOpticalPowerDbm: number;
  matrixRadix: number; // e.g. 64 for 64x64 WDM or MZI mesh
  opticalBaudRateGbaud: number;
  modulatorEnergyFjPerBit: number;
  waveguideLossDbPerCm: number;
  waveguideLengthCm: number;
  pcmWeightExtinctionRatioDb: number;
  thermalStabilizerActive: boolean;
  precisionMode: 'Optical-Analog-8bit' | 'Optical-Analog-6bit' | 'Optical-FP8' | 'Optical-INT4';
}

export interface SimulationMetrics {
  opticalCoreLatencyPs: number;
  totalTokenLatencyUs: number;
  electronicGpuLatencyUs: number;
  speedupFactor: number;
  opticalPowerWatts: number;
  electronicPowerWatts: number;
  energyEfficiencyTopsPerWatt: number;
  opticalTflops: number;
  memoryBandwidthSavedTbps: number;
  dramEnergySavedJoulesPerToken: number;
  totalInsertionLossDb: number;
  linkMarginDb: number;
  opticalSnrDb: number;
  bitErrorRate: number;
}

export interface DriverCommand {
  command: string;
  description: string;
  output: string;
}
