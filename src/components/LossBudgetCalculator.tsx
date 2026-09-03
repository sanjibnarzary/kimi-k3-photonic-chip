import React, { useEffect, useRef } from 'react';
import { SimulationState, SimulationMetrics } from '../types/photonic';
import { 
  Radio, 
  Flame, 
  ShieldCheck, 
  AlertTriangle, 
  Activity, 
  Sliders, 
  Sparkles,
  Info
} from 'lucide-react';

interface LossBudgetCalculatorProps {
  state: SimulationState;
  setState: React.Dispatch<React.SetStateAction<SimulationState>>;
  metrics: SimulationMetrics;
}

export const LossBudgetCalculator: React.FC<LossBudgetCalculatorProps> = ({
  state,
  setState,
  metrics,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Optical loss stages breakdown
  const stages = [
    { name: 'DFB Comb Laser Input', loss: 0.0, power: state.laserOpticalPowerDbm, color: 'text-red-400' },
    { name: 'Input Edge Coupler (Inverse Taper)', loss: -0.45, power: state.laserOpticalPowerDbm - 0.45, color: 'text-cyan-400' },
    { name: `Si3N4 Waveguide Bus (${state.waveguideLengthCm}cm @ ${state.waveguideLossDbPerCm}dB/cm)`, loss: -(state.waveguideLossDbPerCm * state.waveguideLengthCm), power: state.laserOpticalPowerDbm - 0.45 - (state.waveguideLossDbPerCm * state.waveguideLengthCm), color: 'text-blue-400' },
    { name: 'Micro-Ring Modulator (MRM)', loss: -1.2, power: state.laserOpticalPowerDbm - 0.45 - (state.waveguideLossDbPerCm * state.waveguideLengthCm) - 1.2, color: 'text-cyan-300' },
    { name: '64x64 Optical Matrix Crossbar', loss: -1.8, power: state.laserOpticalPowerDbm - 0.45 - (state.waveguideLossDbPerCm * state.waveguideLengthCm) - 1.2 - 1.8, color: 'text-emerald-400' },
    { name: 'Sb2Se3 Non-Volatile Weight Cells', loss: -0.75, power: state.laserOpticalPowerDbm - 0.45 - (state.waveguideLossDbPerCm * state.waveguideLengthCm) - 1.2 - 1.8 - 0.75, color: 'text-emerald-300' },
    { name: 'WDM Demultiplexer (AWG)', loss: -0.9, power: state.laserOpticalPowerDbm - 0.45 - (state.waveguideLossDbPerCm * state.waveguideLengthCm) - 1.2 - 1.8 - 0.75 - 0.9, color: 'text-purple-400' },
    { name: 'Thermal Phase Detuning Penalty', loss: state.thermalStabilizerActive ? -0.15 : -3.8, power: state.laserOpticalPowerDbm - metrics.totalInsertionLossDb, color: state.thermalStabilizerActive ? 'text-emerald-400' : 'text-rose-400' },
  ];

  // Draw simulated 56 Gbaud PAM4 Optical Eye Diagram
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Draw horizontal grid lines (PAM4 4-levels: 00, 01, 10, 11)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Eye diagram jitter based on SNR and thermal PLL status
    const noiseAmp = state.thermalStabilizerActive ? 4 : 22;
    const eyeOpening = state.thermalStabilizerActive ? 0.85 : 0.35;

    ctx.strokeStyle = state.thermalStabilizerActive ? 'rgba(56, 189, 248, 0.45)' : 'rgba(244, 63, 94, 0.45)';
    ctx.lineWidth = 1.5;

    // Draw simulated eye traces
    for (let trace = 0; trace < 36; trace++) {
      ctx.beginPath();
      const offset = (trace % 4) * (height / 4.5) + 20;
      for (let x = 0; x < width; x += 4) {
        const t = (x / width) * Math.PI * 4;
        const jitter = (Math.random() - 0.5) * noiseAmp;
        const y = height / 2 + Math.sin(t + trace * 0.2) * (height * 0.38 * eyeOpening) + jitter;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Label PAM4 levels
    ctx.font = '10px monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Level 3 (11) - +3.2 dBm', 10, 22);
    ctx.fillText('Level 2 (10)', 10, height * 0.36);
    ctx.fillText('Level 1 (01)', 10, height * 0.65);
    ctx.fillText('Level 0 (00) - Extinction Floor', 10, height - 10);
  }, [state.thermalStabilizerActive, state.laserOpticalPowerDbm, metrics.opticalSnrDb]);

  return (
    <div className="space-y-6">
      {/* Top Banner: Loss Minimization Architecture */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" /> Advanced Silicon Photonics Loss Budget &amp; Link Margin
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Minimizing optical loss is paramount for scaling LLM inference without requiring power-hungry optical amplifiers. 
              The <strong>Kimi-PAU</strong> integrates low-loss stoichiometric Si3N4 waveguides (&lt;0.08 dB/cm) and sub-0.45 dB edge couplers to guarantee a robust <strong>+{metrics.linkMarginDb} dB link margin</strong> at the Germanium photodiode.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-right font-mono">
              <div className="text-[10px] text-slate-400 uppercase">Total Insertion Loss</div>
              <div className="text-base font-bold text-amber-400">-{metrics.totalInsertionLossDb} dB</div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-right font-mono">
              <div className="text-[10px] text-slate-400 uppercase">Link Margin</div>
              <div className="text-base font-bold text-emerald-400">+{metrics.linkMarginDb} dB</div>
            </div>
          </div>
        </div>
      </div>

      {/* Optical Link Cascade Breakdown & Interactive Tuners */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cascade Stages Flow */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              Photonic Transmission Cascade (Launch to Photodiode)
            </h4>
            <span className="text-[11px] font-mono text-slate-400">
              Rx Sensitivity: -18.5 dBm
            </span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            {stages.map((st, i) => (
              <div 
                key={st.name}
                className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between hover:border-slate-700 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 font-bold">
                    {i + 1}
                  </span>
                  <span className="text-slate-200">{st.name}</span>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <span className={`font-bold ${st.loss === 0 ? 'text-slate-400' : 'text-amber-400'}`}>
                    {st.loss === 0 ? 'Launch' : `${st.loss.toFixed(2)} dB`}
                  </span>
                  <span className="w-20 text-slate-300 font-semibold">
                    {st.power.toFixed(2)} dBm
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Link Margin Result Banner */}
          <div className="mt-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3.5 flex items-center justify-between font-mono text-xs">
            <div className="flex items-center gap-2 text-emerald-300 font-bold">
              <ShieldCheck className="w-4 h-4" /> Received Optical Power at Germanium PIN Diode:
            </div>
            <div className="text-emerald-400 font-bold text-sm">
              {(state.laserOpticalPowerDbm - metrics.totalInsertionLossDb).toFixed(2)} dBm (Margin: +{metrics.linkMarginDb} dB)
            </div>
          </div>
        </div>

        {/* Right Column: Physical Loss Controls & 56 Gbaud Optical Eye Diagram */}
        <div className="lg:col-span-5 space-y-6">
          {/* Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" /> Waveguide &amp; Laser Tuning
              </h4>
            </div>

            {/* Laser Launch Power */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">DFB Comb Laser Power</span>
                <span className="text-cyan-400 font-bold">+{state.laserOpticalPowerDbm} dBm / channel</span>
              </div>
              <input
                type="range"
                min="3"
                max="12"
                step="0.5"
                value={state.laserOpticalPowerDbm}
                onChange={(e) => setState(prev => ({ ...prev, laserOpticalPowerDbm: Number(e.target.value) }))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Si3N4 Waveguide Propagation Loss */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Si3N4 Waveguide Loss</span>
                <span className="text-cyan-400 font-bold">{state.waveguideLossDbPerCm} dB / cm</span>
              </div>
              <input
                type="range"
                min="0.04"
                max="0.20"
                step="0.01"
                value={state.waveguideLossDbPerCm}
                onChange={(e) => setState(prev => ({ ...prev, waveguideLossDbPerCm: Number(e.target.value) }))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="text-[10px] text-slate-500 font-mono">
                Sub-0.08 dB/cm achieved via stoichiometric LPCVD Si3N4 anneal
              </div>
            </div>

            {/* Thermal Drift Closed-Loop PLL Toggle */}
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400" /> Thermal Drift Phase-Lock (PLL)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Microheaters counter rack ambient thermal swing
                  </div>
                </div>

                <button
                  onClick={() => setState(prev => ({ ...prev, thermalStabilizerActive: !prev.thermalStabilizerActive }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                    state.thermalStabilizerActive
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                      : 'bg-rose-950 border-rose-500 text-rose-300 animate-pulse'
                  }`}
                >
                  {state.thermalStabilizerActive ? 'PLL ACTIVE (0.015 rad)' : 'PLL DISABLED (3.8 dB Drift)'}
                </button>
              </div>
            </div>
          </div>

          {/* 56 Gbaud PAM4 Optical Eye Diagram */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" /> 56 Gbaud PAM4 Optical Eye Diagram
              </h4>
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                state.thermalStabilizerActive 
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-800' 
                  : 'bg-rose-950 text-rose-300 border-rose-800'
              }`}>
                OSNR: {metrics.opticalSnrDb} dB
              </span>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-800">
              <canvas
                ref={canvasRef}
                width={460}
                height={210}
                className="w-full h-auto block"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Bit Error Rate (BER): &lt; {metrics.bitErrorRate.toExponential(2)}</span>
              <span>Lightweight FEC Margin: +6.4 dB</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
