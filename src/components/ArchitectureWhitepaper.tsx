import React from 'react';
import { 
  BookOpen, 
  Cpu, 
  Zap, 
  Radio, 
  ShieldCheck, 
  Layers, 
  Server, 
  FileText,
  Binary
} from 'lucide-react';
import { CHIP_GENERAL_SPECS } from '../data/kimiK3Specs';

export const ArchitectureWhitepaper: React.FC = () => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Title & Document Meta Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>TECHNICAL SPECIFICATION &amp; WHITEPAPER</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Doc ID: KIMI-PAU-K3-ARCH-v3.1</span>
            <span>Rev: 2026.09</span>
          </div>
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Kimi-PAU K3-X1: Silicon Photonics In-Memory Optical Computing Architecture for Real-Time LLM Serving
          </h2>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            A comprehensive micro-architectural specification for accelerating the Kimi K3 Mixture-of-Experts (MoE) LLM using non-volatile optical phase-change weight matrices, ultra-low-loss Si3N4 waveguides, high-bandwidth optical interconnects, and sub-nanosecond optical linear algebra.
          </p>
        </div>

        {/* Executive Spec Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-mono">Weight Retention</div>
            <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">0.00 mW (Non-Volatile)</div>
          </div>
          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-mono">Optical Bandwidth</div>
            <div className="text-sm font-bold text-cyan-400 font-mono mt-0.5">14.33 Tbps / Die</div>
          </div>
          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-mono">Modulator Energy</div>
            <div className="text-sm font-bold text-blue-400 font-mono mt-0.5">6.2 fJ / bit</div>
          </div>
          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-mono">Optical Delay</div>
            <div className="text-sm font-bold text-amber-400 font-mono mt-0.5">0.14 ns / tile</div>
          </div>
        </div>
      </div>

      {/* Section 1: Memory Bottleneck Elimination */}
      <section className="bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">
            1. The LLM Memory Wall &amp; Hardware-Stored Optical In-Memory Weights
          </h3>
        </div>

        <div className="text-xs sm:text-sm text-slate-300 space-y-3 leading-relaxed">
          <p>
            Autoregressive Large Language Model (LLM) decoding—including the Kimi K3 architecture—is fundamentally memory-bandwidth bound during token generation ($M=1$). In conventional von Neumann architectures (such as NVIDIA H100/B200 or custom TPUs), generating a single token requires streaming hundreds of gigabytes of weight matrices from off-chip High Bandwidth Memory (HBM3e) to SRAM register files. Over <strong>85% of total server power and latency</strong> is squandered in DRAM PHY signaling and memory access stalls.
          </p>
          <p>
            The <strong>Kimi-PAU K3-X1</strong> breaks this bottleneck by implementing <em>Photonic In-Memory Computing (P-IMC)</em>. Model weights are stored directly at the physical silicon hardware layer using <strong>Antimony Selenide (Sb2Se3) and Germanium-Antimony-Telluride (Ge2Sb2Te5) Phase Change Materials (PCM)</strong> deposited above Silicon-on-Insulator optical waveguides.
          </p>
        </div>

        {/* Mathematical Formulation Callout */}
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 font-mono text-xs text-slate-300 space-y-2">
          <div className="text-cyan-400 font-bold flex items-center gap-2">
            <Binary className="w-4 h-4" /> Non-Volatile Phase-Change Optical Modulation Formula
          </div>
          <div className="p-3 bg-slate-950 rounded-lg text-slate-200 overflow-x-auto">
            Δn_eff + i·Δk = (n_crys - n_amorph) · f_cryst + i·(k_crys - k_amorph) · f_cryst
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            Where f_cryst in [0, 1] represents the programmable crystallization fraction of the Sb2Se3 cell. 
            Because Sb2Se3 possesses an ultra-low absorption coefficient (k_amorph &lt; 10^-5) at telecommunication C-Band (1550 nm), weights produce pure, lossless phase shifts without static thermal dissipation.
          </p>
        </div>
      </section>

      {/* Section 2: Optical Interconnect & Modulators */}
      <section className="bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">
            2. High-Bandwidth Interconnects &amp; Sub-10 fJ/bit Optical Modulators
          </h3>
        </div>

        <div className="text-xs sm:text-sm text-slate-300 space-y-3 leading-relaxed">
          <p>
            To seamlessly interface with existing AI processing clusters (such as GPU servers running vLLM or Triton), the Kimi-PAU integrates <strong>Co-Packaged Optics (CPO)</strong> over a 2.5D glass interposer substrate with Universal Chiplet Interconnect Express (UCIe 2.0 Optical) and PCIe Gen 6.0 x16 / CXL 3.1.
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-300 pl-2">
            <li>
              <strong>Depletion-Mode Micro-Ring Modulators (MRM):</strong> Operating at 56 Gbaud PAM4 (112 Gbps per wavelength) with a drive voltage of only 0.85 Vpp and an ultra-low dynamic energy consumption of <strong>6.2 fJ / bit</strong>.
            </li>
            <li>
              <strong>64-Channel Wavelength Division Multiplexing (WDM):</strong> A single optical fiber carries 64 distinct optical wavelengths spaced at 50 GHz across the telecommunication C-Band (1530 nm to 1565 nm), yielding an aggregate optical bandwidth of <strong>14.33 Tbps per silicon die</strong>.
            </li>
            <li>
              <strong>Shoreline Density:</strong> Reaching 1.8 Tbps / mm die edge, overcoming traditional electrical copper trace distance and pin-count limitations.
            </li>
          </ul>
        </div>
      </section>

      {/* Section 3: Minimizing Optical Loss & Signal Integrity */}
      <section className="bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">
            3. Advanced Silicon Photonics Signal Loss Minimization &amp; Thermal Drift Control
          </h3>
        </div>

        <div className="text-xs sm:text-sm text-slate-300 space-y-3 leading-relaxed">
          <p>
            A critical obstacle in large-scale optical matrix accelerators is cumulative optical insertion loss and temperature sensitivity (dn/dT ≈ 1.86 × 10^-4 K^-1 for silicon). The Kimi-PAU resolves this through three physical layer innovations:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <h4 className="font-bold text-white text-xs uppercase font-mono">Stoichiometric Si3N4 Bus</h4>
              <p className="text-xs text-slate-400 mt-1">
                LPCVD-deposited Silicon Nitride achieves sub-0.08 dB/cm propagation loss and zero two-photon absorption at high optical laser powers.
              </p>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <h4 className="font-bold text-white text-xs uppercase font-mono">Inverse Taper Facets</h4>
              <p className="text-xs text-slate-400 mt-1">
                Sub-wavelength spot-size converters couple laser power into the chip with &lt; 0.45 dB loss per facet and &gt; 42 dB return loss.
              </p>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <h4 className="font-bold text-white text-xs uppercase font-mono">Thermal Phase-Lock PLL</h4>
              <p className="text-xs text-slate-400 mt-1">
                Closed-loop micro-heaters maintain optical resonance alignment across a 65°C rack ambient swing with phase jitter &lt; 0.015 rad.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Production Deployment Architecture */}
      <section className="bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Server className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">
            4. Production Server Deployment &amp; Kimi K3 Cluster Topology
          </h3>
        </div>

        <div className="text-xs sm:text-sm text-slate-300 space-y-3 leading-relaxed">
          <p>
            In production datacenter environments, <strong>8x Kimi-PAU accelerators</strong> are housed in a standard 1U Open Compute Project (OCP) server chassis, connected via Co-Packaged Optics directly to a central optical circuit switch (OCS):
          </p>
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex justify-between border-b border-slate-800 pb-1.5 text-slate-400">
              <span>RACK DEPLOYMENT PARAMETER</span>
              <span>1U CHASSIS METRIC</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-300">Total Kimi-PAU Accelerators:</span>
              <span className="text-cyan-300 font-bold">8x K3-X1 PCI Express / CXL Cards</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-300">In-Built Optical Parameter Capacity:</span>
              <span className="text-emerald-300 font-bold">1.024 Trillion Weights (Non-Volatile)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-300">Max Sustained Optical Token Rate:</span>
              <span className="text-white font-bold">820,000 tokens / second</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-300">Chassis Active Power Consumption:</span>
              <span className="text-amber-300 font-bold">380 W (vs 6,400 W for 8x H100 chassis)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-300">Cluster Optical Interconnect Fabric:</span>
              <span className="text-blue-300 font-bold">229.3 Tbps All-to-All Optical Mesh</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
