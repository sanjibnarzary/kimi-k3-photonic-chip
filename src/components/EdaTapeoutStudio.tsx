import React, { useState } from 'react';
import { 
  FileCode, 
  Cpu, 
  CheckCircle2, 
  Copy, 
  Download, 
  Check, 
  Layers, 
  Activity, 
  Play, 
  Pause, 
  RotateCcw, 
  Terminal, 
  ShieldCheck, 
  ExternalLink,
  Flame,
  Binary
} from 'lucide-react';
import { EDA_FILES_DATA, EdaFileRecord } from '../data/edaFilesData';
import { OpticalDrcChecklist } from './OpticalDrcChecklist';

export const EdaTapeoutStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'drc_qa' | 'codebase' | 'simulation' | 'foundry_spec'>('drc_qa');
  const [selectedFileId, setSelectedFileId] = useState<string>('verilog_top');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [copied, setCopied] = useState<boolean>(false);
  const [simPlaying, setSimPlaying] = useState<boolean>(true);
  const [simCycle, setSimCycle] = useState<number>(14);

  const selectedFile = EDA_FILES_DATA.find(f => f.id === selectedFileId) || EDA_FILES_DATA[0];

  const categories = ['All', 'RTL (Verilog)', 'Verilog-A (Analog)', 'Constraints & Scripts', 'Layout (GDS/OASIS)', 'Foundry Tapeout Spec'];

  const filteredFiles = activeCategory === 'All' 
    ? EDA_FILES_DATA 
    : EDA_FILES_DATA.filter(f => f.category === activeCategory);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = (file: EdaFileRecord) => {
    const blob = new Blob([file.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllBundle = () => {
    // Generate unified package manifest text
    const bundleText = EDA_FILES_DATA.map(f => `// =============================================================================\n// FILE: ${f.path}\n// PURPOSE: ${f.description}\n// =============================================================================\n\n${f.code}\n\n`).join('\n');
    const blob = new Blob([bundleText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'kimi_pau_k3_eda_tapeout_bundle.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>EDA SYNTHESIS, VERILOG RTL &amp; FOUNDRY FABRICATION PACKAGE</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Process: TSMC 300mm Monolithic SOI + Low-Loss Si3N4</span>
            <span className="text-emerald-400 font-semibold">DRC/LVS: SIGN-OFF CLEAN</span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              Electronic-Photonic Tapeout Studio
              <span className="text-xs font-mono bg-cyan-950 text-cyan-400 px-2.5 py-1 rounded-full border border-cyan-800">
                10 Production EDA Files
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Synthesizeable Verilog RTL modules, Verilog-A analog behavioral models for Cadence Spectre / PrimeSim, Synopsys SDC timing constraints, automated synthesis TCL scripts, GDSFactory photonic mask generators, and official foundry tapeout manifests.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setActiveTab('drc_qa')}
              className={`px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer border ${
                activeTab === 'drc_qa'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Validate DRC Layout</span>
            </button>

            <button
              id="download-eda-bundle-btn"
              onClick={handleDownloadAllBundle}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Bundle</span>
            </button>
          </div>
        </div>

        {/* Quick Sign-off Verification Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-mono">Setup / Hold Slack</div>
            <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">+112 ps / +28 ps</div>
          </div>
          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-mono">Silicon Die Size</div>
            <div className="text-sm font-bold text-cyan-400 font-mono mt-0.5">5.80 × 6.20 mm (35.96 mm²)</div>
          </div>
          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-mono">Hardware Weight Cells</div>
            <div className="text-sm font-bold text-purple-400 font-mono mt-0.5">4,096 Non-Volatile Cells</div>
          </div>
          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-mono">CPO Interposer Pitch</div>
            <div className="text-sm font-bold text-amber-400 font-mono mt-0.5">100 µm Micro-Bumps</div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3 font-mono text-xs">
        <button
          onClick={() => setActiveTab('drc_qa')}
          className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer border ${
            activeTab === 'drc_qa'
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/60 font-bold shadow-md shadow-emerald-950/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>DRC Quality Assurance</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
            12 Rules
          </span>
        </button>

        <button
          onClick={() => setActiveTab('codebase')}
          className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer border ${
            activeTab === 'codebase'
              ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/60 font-bold shadow-md shadow-cyan-950/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-800'
          }`}
        >
          <FileCode className="w-4 h-4 text-cyan-400" />
          <span>EDA RTL &amp; Analog Files</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800">
            10 Files
          </span>
        </button>

        <button
          onClick={() => setActiveTab('simulation')}
          className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer border ${
            activeTab === 'simulation'
              ? 'bg-purple-950/60 text-purple-300 border-purple-500/60 font-bold shadow-md shadow-purple-950/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-800'
          }`}
        >
          <Activity className="w-4 h-4 text-purple-400" />
          <span>Mixed-Signal Simulation</span>
        </button>

        <button
          onClick={() => setActiveTab('foundry_spec')}
          className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer border ${
            activeTab === 'foundry_spec'
              ? 'bg-amber-950/60 text-amber-300 border-amber-500/60 font-bold shadow-md shadow-amber-950/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-800'
          }`}
        >
          <Layers className="w-4 h-4 text-amber-400" />
          <span>Foundry Mask Stack &amp; Sign-Off</span>
        </button>
      </div>

      {/* VIEW 1: DRC QUALITY ASSURANCE CHECKLIST */}
      {activeTab === 'drc_qa' && (
        <OpticalDrcChecklist />
      )}

      {/* VIEW 2: EDA CODEBASE & RTL/SPICE/GDS VIEWER */}
      {activeTab === 'codebase' && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: File Explorer & Category Filter */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-mono text-slate-300">
              <span className="font-semibold flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-cyan-400" /> Tapeout Files Tree
              </span>
              <span className="text-slate-500">{filteredFiles.length} files</span>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all ${
                    activeCategory === cat
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Files List */}
            <div className="space-y-1.5 pt-1">
              {filteredFiles.map((file) => {
                const isSelected = file.id === selectedFile.id;
                return (
                  <button
                    key={file.id}
                    onClick={() => setSelectedFileId(file.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500/50 shadow-md shadow-cyan-500/5'
                        : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-mono font-bold ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                        {file.name}
                      </span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {file.language}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 line-clamp-2 leading-tight">
                      {file.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Compilation Commands Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs font-mono">
            <div className="text-slate-300 font-bold flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" /> Foundry EDA Tool Commands
            </div>
            <div className="space-y-2 text-[11px] text-slate-400 pt-1">
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500"># 1. RTL Simulation (Icarus Verilog):</span>
                <div className="text-cyan-300 mt-0.5 select-all">iverilog -o pau_sim eda/rtl/*.v &amp;&amp; vvp pau_sim</div>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500"># 2. Logic Synthesis (Synopsys DC):</span>
                <div className="text-purple-300 mt-0.5 select-all">dc_shell -f eda/scripts/kimi_pau_synth.tcl</div>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500"># 3. Mask Generation (GDSFactory):</span>
                <div className="text-emerald-300 mt-0.5 select-all">python3 eda/layout/kimi_photonic_pcell.py</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Active Code Inspector */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            {/* File Meta Header & Actions */}
            <div className="bg-slate-900 px-5 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                    {selectedFile.name}
                    <span className="text-[10px] text-slate-400 font-normal">({selectedFile.path})</span>
                  </div>
                  <div className="text-[11px] text-slate-400">{selectedFile.category}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Copy to clipboard"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  onClick={() => handleDownloadFile(selectedFile)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Download this file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>

            {/* Code Body with Syntax Highlighting Frame */}
            <div className="p-4 bg-slate-950 overflow-x-auto max-h-[580px] font-mono text-xs leading-relaxed text-slate-200 scrollbar-thin">
              <pre className="text-slate-300 font-mono">
                {selectedFile.code}
              </pre>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* VIEW 3: INTERACTIVE MIXED-SIGNAL WAVEFORM SIMULATION */}
      {activeTab === 'simulation' && (
      <section className="bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Mixed-Signal Verilog Co-Simulation Waveform
                <span className="text-xs font-mono font-normal text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                  Cadence Spectre / Verilog Testbench Output
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Co-simulating AXI-Lite registers, Sb2Se3 electro-thermal non-volatile pulses, 56 Gbaud PAM4 optical waveforms, and photodetector readouts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSimPlaying(!simPlaying)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              {simPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{simPlaying ? 'Pause' : 'Resume'}</span>
            </button>
            <button
              onClick={() => setSimCycle(0)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              title="Reset Simulation Time"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Oscilloscope / Waveform Grid */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-6 space-y-5 font-mono text-xs">
          {/* Signal 1: clk_sys (1.25 GHz) */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="w-48 text-slate-400 font-semibold truncate flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span>clk_sys (1.25 GHz)</span>
            </div>
            <div className="flex-1 bg-slate-950 rounded-lg p-2 border border-slate-800 flex items-center justify-between text-cyan-400 font-bold overflow-hidden">
              <span className="tracking-widest">_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_</span>
            </div>
          </div>

          {/* Signal 2: rst_n */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="w-48 text-slate-400 font-semibold truncate flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>rst_n (Sync Reset)</span>
            </div>
            <div className="flex-1 bg-slate-950 rounded-lg p-2 border border-slate-800 flex items-center text-emerald-400 font-bold">
              <span className="text-slate-600 mr-4">__</span>
              <span>¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯ (READY)</span>
            </div>
          </div>

          {/* Signal 3: pcm_pulse_amplitude_mv (Non-Volatile Electro-Thermal Write Pulse) */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="w-48 text-slate-400 font-semibold truncate flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              <span>pcm_pulse_mv (Sb2Se3)</span>
            </div>
            <div className="flex-1 bg-slate-950 rounded-lg p-2 border border-slate-800 flex items-center gap-2 text-purple-400 font-bold overflow-hidden">
              <span className="text-slate-600">0mV ──</span>
              <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800 text-[11px] text-purple-300">
                [ 1650 mV Melt-Quench (800 ps) ]
              </span>
              <span className="text-slate-600">───</span>
              <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-800 text-[11px] text-blue-300">
                [ 980 mV Anneal (25 ns) ]
              </span>
              <span className="text-slate-600">───</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-[10px] text-emerald-300">
                [ 200mV Verify ]
              </span>
              <span className="text-emerald-400 text-xs ml-auto">Δn = +0.83 (Stored Permanently)</span>
            </div>
          </div>

          {/* Signal 4: mrm_dac_pam4_sym (56 Gbaud Optical Drive Levels) */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="w-48 text-slate-400 font-semibold truncate flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>mrm_pam4_sym [0..3]</span>
            </div>
            <div className="flex-1 bg-slate-950 rounded-lg p-2 border border-slate-800 flex items-center gap-1.5 text-amber-400 font-bold overflow-hidden">
              <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-[10px] text-slate-300">L0 (0.00V)</span>
              <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-[10px] text-amber-300">L3 (0.85V)</span>
              <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-[10px] text-amber-200">L1 (0.28V)</span>
              <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-[10px] text-amber-300">L2 (0.57V)</span>
              <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-[10px] text-amber-300">L3 (0.85V)</span>
              <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-[10px] text-slate-300">L0 (0.00V)</span>
              <span className="text-slate-500 ml-auto text-[11px]">112 Gbps / Wavelength</span>
            </div>
          </div>

          {/* Signal 5: opt_adc_rx_data (Optical Matrix Dot Product Readout) */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="w-48 text-slate-400 font-semibold truncate flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <span>opt_adc_rx_data</span>
            </div>
            <div className="flex-1 bg-slate-950 rounded-lg p-2 border border-slate-800 flex items-center justify-between text-blue-300 font-bold">
              <span>0x12 ─ 0x8F ─ 0xC4 ─ 0x3E ─ 0x77 ─ 0xAA ─ 0xF1 ─ 0x42 ─ 0x99</span>
              <span className="text-emerald-400 text-[11px]">0.14 ns Optical Delay</span>
            </div>
          </div>

          {/* Signal 6: Thermal PLL Status */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="w-48 text-slate-400 font-semibold truncate flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>status_pll_locked</span>
            </div>
            <div className="flex-1 bg-slate-950 rounded-lg p-2 border border-slate-800 flex items-center justify-between text-emerald-400 font-bold">
              <span>HIGH (Heater Duty Cycle: 50.8% • Phase Jitter: 0.012 rad)</span>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-[10px] border border-emerald-800">LOCKED</span>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* VIEW 4: FOUNDRY FABRICATION & MASK SPEC SHEET */}
      {activeTab === 'foundry_spec' && (
      <section className="bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Foundry Tapeout Specification &amp; Mask Stack
            </h3>
            <p className="text-xs text-slate-400">
              Fabrication design rules, material layers, and physical verification sign-off for TSMC 300mm Monolithic Silicon Photonics.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          {/* Lithography Layer Stack */}
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-3">
            <div className="text-cyan-400 font-bold flex items-center justify-between border-b border-slate-800 pb-2">
              <span>GDSII / OASIS MASK LAYER TABLE</span>
              <span>10 LAYERS</span>
            </div>
            <div className="space-y-1.5 text-slate-300 text-[11px]">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Layer 1/0: SI_WAVEGUIDE</span>
                <span className="text-cyan-300">220nm Crystalline Silicon Core (450nm)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Layer 2/0: SI3N4_BUS</span>
                <span className="text-cyan-300">400nm Low-Loss Si3N4 Bus (&lt;0.08 dB/cm)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Layer 4/0 &amp; 5/0: IMP_P/N_PLUS</span>
                <span className="text-amber-300">Boron / Phosphorus MRM PN Junctions</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Layer 20/0: PCM_SB2SE3</span>
                <span className="text-purple-300 font-bold">25nm Antimony Selenide (Non-Volatile)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Layer 30/0: HEATER_TI_PT</span>
                <span className="text-emerald-300">Titanium/Platinum Micro-Heaters</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Layer 50/0: CPO_PADS</span>
                <span className="text-blue-300">100µm Pitch Micro-Bumps for 2.5D CPO</span>
              </div>
            </div>
          </div>

          {/* Physical Design Sign-off Criteria */}
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-3">
            <div className="text-emerald-400 font-bold flex items-center justify-between border-b border-slate-800 pb-2">
              <span>EDA PHYSICAL SIGNOFF CHECKLIST</span>
              <button
                onClick={() => setActiveTab('drc_qa')}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline cursor-pointer font-normal"
              >
                Open Full DRC Validator →
              </button>
            </div>
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-300">Design Rule Check (DRC):</span>
                <button
                  onClick={() => setActiveTab('drc_qa')}
                  className="text-emerald-400 font-bold flex items-center gap-1 hover:text-emerald-300 cursor-pointer transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> PASSED (12 Rules Clean) → View
                </button>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-300">Layout Versus Schematic (LVS):</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> PASSED (Netlist Matched)
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-300">Optical Waveguide Bend Check:</span>
                <button
                  onClick={() => setActiveTab('drc_qa')}
                  className="text-emerald-400 font-bold flex items-center gap-1 hover:text-emerald-300 cursor-pointer transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> R ≥ 5.0 µm (0 Radiation Loss) → Verify
                </button>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-300">Static Timing Analysis (STA):</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> +112 ps Slack @ 1.25 GHz
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-300">PCM Thermal Crosstalk Simulation:</span>
                <button
                  onClick={() => setActiveTab('drc_qa')}
                  className="text-emerald-400 font-bold flex items-center gap-1 hover:text-emerald-300 cursor-pointer transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> &lt; 0.002 dB/cell drift → Verify Keep-Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}
    </div>
  );
};
