import React, { useState } from 'react';
import { SimulationState, SimulationMetrics, K3LayerPreset } from '../types/photonic';
import { KIMI_K3_LAYERS } from '../data/kimiK3Specs';
import { 
  Zap, 
  Gauge, 
  Layers, 
  ShieldCheck, 
  TrendingUp, 
  ArrowRight, 
  Cpu, 
  Sliders,
  HardDrive,
  CheckCircle2
} from 'lucide-react';

interface OpticalGemmSimulatorProps {
  state: SimulationState;
  setState: React.Dispatch<React.SetStateAction<SimulationState>>;
  metrics: SimulationMetrics;
}

export const OpticalGemmSimulator: React.FC<OpticalGemmSimulatorProps> = ({
  state,
  setState,
  metrics,
}) => {
  const [selectedCellIndex, setSelectedCellIndex] = useState<number | null>(14);

  const currentLayer: K3LayerPreset = 
    KIMI_K3_LAYERS.find(l => l.id === state.selectedLayerId) || KIMI_K3_LAYERS[0];

  return (
    <div className="space-y-6">
      {/* Top Architecture Alert: Why Hardware Weights Accelerate Inference */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-cyan-950/30 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Hardware-Stored Non-Volatile Optical In-Memory Weights
              <span className="text-xs bg-emerald-900/60 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-700/50">
                0.00 mW Static Retention
              </span>
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Standard GPUs (B200/H100) are severely memory-bandwidth bound during LLM token generation, spending &gt;85% of time and power fetching weights from HBM3e. 
              The <strong>Kimi-PAU K3-X1</strong> permanently stores weights inside physical phase-change silicon waveguide meshes (Sb2Se3 PCM). 
              Light computes matrix products in transit at the speed of light with <strong>zero DRAM read latency</strong>.
            </p>
          </div>
        </div>

        <div className="shrink-0 bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2 text-right">
          <div className="text-[10px] text-slate-400 uppercase font-mono">DRAM Traffic Eliminated</div>
          <div className="text-base font-bold text-emerald-400 font-mono">
            {metrics.memoryBandwidthSavedTbps} TB/s
          </div>
        </div>
      </div>

      {/* Simulator Controls & Comparative Performance Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Workload & Optical Controls */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" /> Simulation Controls
            </h3>
            <span className="text-[11px] font-mono text-cyan-400">Kimi K3 Workload</span>
          </div>

          {/* Model Layer Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Kimi K3 Target Layer
            </label>
            <select
              value={state.selectedLayerId}
              onChange={(e) => setState(prev => ({ ...prev, selectedLayerId: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            >
              {KIMI_K3_LAYERS.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.dimK} x {l.dimN})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 leading-tight pt-1">
              {currentLayer.description}
            </p>
          </div>

          {/* Batch Size Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Batch Size (Concurrent Requests)</span>
              <span className="font-mono text-cyan-400 font-bold">{state.batchSize}</span>
            </div>
            <input
              type="range"
              min="1"
              max="64"
              step="1"
              value={state.batchSize}
              onChange={(e) => setState(prev => ({ ...prev, batchSize: Number(e.target.value) }))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>1 (Ultra-low Latency)</span>
              <span>32</span>
              <span>64 (Throughput)</span>
            </div>
          </div>

          {/* Context Sequence Length */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Context Window</span>
              <span className="font-mono text-cyan-400 font-bold">
                {state.sequenceLength >= 1024 ? `${state.sequenceLength / 1024}k tokens` : `${state.sequenceLength} tokens`}
              </span>
            </div>
            <input
              type="range"
              min="1024"
              max="131072"
              step="4096"
              value={state.sequenceLength}
              onChange={(e) => setState(prev => ({ ...prev, sequenceLength: Number(e.target.value) }))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>1k</span>
              <span>64k</span>
              <span>128k (Max Kimi K3)</span>
            </div>
          </div>

          {/* Optical Matrix Radix */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Photonic Crossbar Radix</span>
              <span className="font-mono text-cyan-400 font-bold">{state.matrixRadix} x {state.matrixRadix}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              {[32, 64, 128].map(radix => (
                <button
                  key={radix}
                  onClick={() => setState(prev => ({ ...prev, matrixRadix: radix }))}
                  className={`py-1.5 rounded-lg border text-center transition-all ${
                    state.matrixRadix === radix
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {radix}x{radix}
                </button>
              ))}
            </div>
          </div>

          {/* Optical Baud Rate & Modulation Energy */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400">MRM Baud Rate</label>
              <select
                value={state.opticalBaudRateGbaud}
                onChange={(e) => setState(prev => ({ ...prev, opticalBaudRateGbaud: Number(e.target.value) }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200"
              >
                <option value={28}>28 Gbaud</option>
                <option value={56}>56 Gbaud (PAM4)</option>
                <option value={112}>112 Gbaud (Max)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400">Precision Mode</label>
              <select
                value={state.precisionMode}
                onChange={(e) => setState(prev => ({ ...prev, precisionMode: e.target.value as any }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200"
              >
                <option value="Optical-Analog-8bit">Optical 8-bit Analog</option>
                <option value="Optical-FP8">Optical FP8 (E4M3)</option>
                <option value="Optical-Analog-6bit">Optical 6-bit Analog</option>
                <option value="Optical-INT4">Optical INT4</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Column: Comparison Engine & Speedup Visualizer */}
        <div className="lg:col-span-8 space-y-6">
          {/* Head-to-Head Latency & Power Comparison */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" /> Kimi K3 Inference Latency Comparison
              </h3>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-800/60">
                {metrics.speedupFactor}x Overall Speedup
              </span>
            </div>

            {/* Latency Comparative Bars */}
            <div className="space-y-4">
              {/* Kimi-PAU Photonic Accelerator */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span> Kimi-PAU K3-X1 Photonic Accelerator
                  </span>
                  <span className="font-bold text-white">{metrics.totalTokenLatencyUs} µs / token</span>
                </div>
                <div className="w-full h-7 bg-slate-900 rounded-lg overflow-hidden border border-cyan-500/40 p-0.5">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded transition-all duration-300 flex items-center px-2 text-[10px] font-bold text-slate-950 font-mono shadow-md"
                    style={{ width: `${Math.max(6, Math.min(100, (metrics.totalTokenLatencyUs / metrics.electronicGpuLatencyUs) * 100))}%` }}
                  >
                    {metrics.totalTokenLatencyUs} µs
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span>Core Optical Propagation: {metrics.opticalCoreLatencyPs} ps</span>
                  <span>Modulation &amp; CPO Link: ~1.1 µs</span>
                  <span className="text-emerald-400 font-semibold">0 ns DRAM Stall</span>
                </div>
              </div>

              {/* Electronic High-End GPU Baseline */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="font-semibold text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-600"></span> Electronic GPU Baseline (HBM3e @ 8.0 TB/s)
                  </span>
                  <span className="font-bold text-slate-300">{metrics.electronicGpuLatencyUs} µs / token</span>
                </div>
                <div className="w-full h-7 bg-slate-900 rounded-lg overflow-hidden border border-slate-800 p-0.5">
                  <div 
                    className="h-full bg-slate-600 rounded transition-all duration-300 flex items-center px-2 text-[10px] font-bold text-white font-mono"
                    style={{ width: '100%' }}
                  >
                    {metrics.electronicGpuLatencyUs} µs (Memory Bound)
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span>HBM3e Parameter Fetch: 88% of time</span>
                  <span>Compute: 12%</span>
                  <span className="text-rose-400">High DRAM Refresh Leakage</span>
                </div>
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Energy Efficiency</div>
                <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                  {metrics.energyEfficiencyTopsPerWatt} TOPS/W
                </div>
                <div className="text-[10px] text-slate-500 font-mono">11x vs electronic GPU</div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Active Power Draw</div>
                <div className="text-base font-bold text-amber-400 font-mono mt-0.5">
                  {metrics.opticalPowerWatts} W
                </div>
                <div className="text-[10px] text-slate-500 font-mono">vs 700 W electronic GPU</div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Effective TFLOPS</div>
                <div className="text-base font-bold text-cyan-400 font-mono mt-0.5">
                  {metrics.opticalTflops} TFLOPS
                </div>
                <div className="text-[10px] text-slate-500 font-mono">Continuous optical flow</div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] text-slate-400 font-mono uppercase">DRAM Energy Saved</div>
                <div className="text-base font-bold text-purple-400 font-mono mt-0.5">
                  {(metrics.dramEnergySavedJoulesPerToken * 1000).toFixed(1)} mJ
                </div>
                <div className="text-[10px] text-slate-500 font-mono">Per token generation</div>
              </div>
            </div>
          </div>

          {/* Interactive Optical Weight Matrix Mesh Heatmap */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400" /> Non-Volatile Optical Matrix Cell Grid (Sb2Se3 PCM)
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Each cell sets an optical transmission coefficient directly through the waveguide. Click any cell to inspect phase-state.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-[10px] text-slate-400">Low Attenuation</span>
                <div className="w-16 h-2 rounded bg-gradient-to-r from-emerald-500 to-slate-800"></div>
                <span className="text-[10px] text-slate-400">High Atten</span>
              </div>
            </div>

            {/* 8x8 Visual Sub-Tile */}
            <div className="grid grid-cols-8 gap-1.5 p-3 bg-slate-950 rounded-xl border border-slate-800/80">
              {Array.from({ length: 64 }).map((_, idx) => {
                const isSelected = selectedCellIndex === idx;
                // Simulated weight value based on trigonometric wave
                const normalizedWeight = (Math.sin(idx * 0.45) + 1) / 2;
                const phaseDeg = Math.round(normalizedWeight * 180);
                const transmissionPct = Math.round((1 - normalizedWeight * 0.75) * 100);

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedCellIndex(idx)}
                    className={`aspect-square rounded-md flex flex-col items-center justify-center p-1 text-[9px] font-mono transition-all border ${
                      isSelected
                        ? 'border-cyan-400 ring-2 ring-cyan-500/40 z-10 scale-105'
                        : 'border-slate-800 hover:border-slate-600'
                    }`}
                    style={{
                      backgroundColor: `rgba(16, 185, 129, ${0.1 + normalizedWeight * 0.75})`
                    }}
                  >
                    <span className="text-[8px] text-slate-200 font-bold">W{idx}</span>
                    <span className="text-[7px] text-cyan-200">{transmissionPct}%</span>
                  </button>
                );
              })}
            </div>

            {/* Active Cell Inspector */}
            {selectedCellIndex !== null && (
              <div className="mt-3 bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xs">
                    W{selectedCellIndex}
                  </div>
                  <div>
                    <div className="text-slate-200 font-bold">
                      PCM Cell [Row {Math.floor(selectedCellIndex / 8)}, Col {selectedCellIndex % 8}]
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      Storage: Sb2Se3 Amorphous/Crystalline Ratio (8-bit state)
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[11px]">
                  <div>
                    <span className="text-slate-400">Phase Shift: </span>
                    <span className="text-cyan-300 font-bold">0.42π rad</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Static Leakage: </span>
                    <span className="text-emerald-400 font-bold">0.00 mW</span>
                  </div>
                  <div>
                    <span className="text-slate-400">State: </span>
                    <span className="text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      Non-Volatile Locked
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
