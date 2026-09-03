import React, { useState } from 'react';
import { DRIVER_CODE_SNIPPETS, MOCK_TERMINAL_COMMANDS, CodeSnippet } from '../data/driverCodeSnippets';
import { RegisterMapViewer } from './RegisterMapViewer';
import { 
  Terminal, 
  Copy, 
  Check, 
  Download, 
  FileCode, 
  Play, 
  Cpu, 
  RefreshCw,
  Server,
  Layers,
  Database,
  Sliders
} from 'lucide-react';

export const DriverWorkbench: React.FC = () => {
  const [workbenchView, setWorkbenchView] = useState<'regmap' | 'sdk'>('regmap');
  const [selectedSnippetId, setSelectedSnippetId] = useState<string>('hal_header');
  const [copied, setCopied] = useState<boolean>(false);
  
  // Interactive Terminal State
  const [terminalHistory, setTerminalHistory] = useState<Array<{ command: string; output: string }>>([
    {
      command: 'kimi-smi',
      output: MOCK_TERMINAL_COMMANDS['kimi-smi']
    }
  ]);
  const [currentInput, setCurrentInput] = useState<string>('');

  const selectedSnippet: CodeSnippet = 
    DRIVER_CODE_SNIPPETS.find(s => s.id === selectedSnippetId) || DRIVER_CODE_SNIPPETS[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedSnippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecuteCommand = (cmdStr?: string) => {
    const cmd = (cmdStr || currentInput).trim();
    if (!cmd) return;

    if (cmd === 'clear') {
      setTerminalHistory([]);
      setCurrentInput('');
      return;
    }

    if (cmd === 'help') {
      setTerminalHistory(prev => [
        ...prev,
        {
          command: cmd,
          output: `Available Kimi-PAU CLI Commands:
  kimi-regmap                          - Dump BAR0 MMIO Hardware Register Map & status
  kimi-smi                             - Display Photonic Device Telemetry & Optical Link State
  kimi-diag --test-optics              - Run hardware optical link diagnostics & loss checks
  kimi-weights --status                - Inspect non-volatile hardware-stored weights
  kimi-benchmark --batch 16 --seq 4096 - Run optical inference latency benchmark
  clear                                - Clear terminal screen`
        }
      ]);
      setCurrentInput('');
      return;
    }

    const output = MOCK_TERMINAL_COMMANDS[cmd] || `kimi-cli: command not found: ${cmd}. Type 'help' for valid options.`;
    setTerminalHistory(prev => [...prev, { command: cmd, output }]);
    setCurrentInput('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" /> Kimi-PAU Driver Stack &amp; Developer SDK
          </h3>
          <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
            Production-grade drivers bridging host AI pipelines (PyTorch, vLLM, SGLang, Triton) to the silicon photonic core via high-speed PCIe Gen 6.0 x16 / CXL 3.1 DMA rings, hardware MMIO registers, and non-volatile PCM weight control.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-3 py-1.5 rounded-lg bg-cyan-950/80 text-cyan-300 border border-cyan-700/50">
            Kernel: Linux 6.8+
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-700/50">
            PyTorch 2.4+ / CUDA 12.4
          </span>
        </div>
      </div>

      {/* Sub-navigation Tabs between Register Map and Code/Terminal SDK */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-1">
        <div className="flex items-center gap-2">
          <button
            id="btn-subtab-regmap"
            onClick={() => setWorkbenchView('regmap')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-mono font-medium transition-all flex items-center gap-2 cursor-pointer ${
              workbenchView === 'regmap'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold shadow-md shadow-cyan-500/10'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800'
            }`}
          >
            <Database className="w-4 h-4 text-cyan-400" />
            <span>Interactive Register Map (BAR0 MMIO)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              Live Inspector
            </span>
          </button>

          <button
            id="btn-subtab-sdk"
            onClick={() => setWorkbenchView('sdk')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-mono font-medium transition-all flex items-center gap-2 cursor-pointer ${
              workbenchView === 'sdk'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold shadow-md shadow-cyan-500/10'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800'
            }`}
          >
            <FileCode className="w-4 h-4 text-cyan-400" />
            <span>C++ Kernel Driver Code &amp; Shell</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>PCIe Base: <code className="text-cyan-400">BAR0 (0x3800_0000)</code></span>
        </div>
      </div>

      {/* Main View Display */}
      {workbenchView === 'regmap' ? (
        <RegisterMapViewer />
      ) : (
        /* Codebase Inspector & Interactive Terminal Grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Code Snippets & Architecture Tabs */}
          <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              {/* Snippet Selection Tabs */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4 overflow-x-auto">
                <div className="flex gap-1.5 scrollbar-none">
                  {DRIVER_CODE_SNIPPETS.map(snip => (
                    <button
                      key={snip.id}
                      onClick={() => setSelectedSnippetId(snip.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 shrink-0 ${
                        selectedSnippetId === snip.id
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-600/60 font-bold'
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      {snip.filename}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pl-2">
                  <button
                    onClick={handleCopy}
                    className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono flex items-center gap-1 transition-all cursor-pointer"
                    title="Copy code"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Snippet Header Details */}
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                    {selectedSnippet.title}
                    <span className="text-[11px] font-normal text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                      {selectedSnippet.filename}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">
                    {selectedSnippet.description}
                  </p>
                </div>

                {selectedSnippet.id === 'register_map' && (
                  <button
                    onClick={() => setWorkbenchView('regmap')}
                    className="px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono shrink-0 cursor-pointer"
                  >
                    Open Interactive Viewer →
                  </button>
                )}
              </div>

              {/* Code Box with Syntax-Style Display */}
              <div className="bg-slate-900/90 rounded-xl border border-slate-800/80 p-4 max-h-[460px] overflow-y-auto font-mono text-xs text-slate-200 leading-relaxed shadow-inner">
                <pre className="whitespace-pre font-mono text-xs selection:bg-cyan-500 selection:text-slate-950">
                  <code>{selectedSnippet.code}</code>
                </pre>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Location: <code>/{selectedSnippet.filename}</code></span>
              <span className="text-emerald-400">Production Ready • Zero Compilation Warnings</span>
            </div>
          </div>

          {/* Right: Live Interactive Terminal (kimi-smi & diag) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Interactive Shell Terminal */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 font-mono shadow-2xl flex flex-col h-[400px]">
              {/* Terminal Top Window Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                  <span className="text-xs text-slate-400 ml-2">root@kimi-rack01:~# (Kimi-PAU Shell)</span>
                </div>

                <div className="text-[11px] text-cyan-400 font-mono">
                  PCIe Gen6 x16 [Active]
                </div>
              </div>

              {/* Terminal Output Area */}
              <div className="flex-1 overflow-y-auto py-3 space-y-3 text-xs leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
                {terminalHistory.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="text-cyan-400 flex items-center gap-1.5">
                      <span className="text-slate-500">$</span>
                      <span className="font-bold">{item.command}</span>
                    </div>
                    <pre className="text-slate-300 whitespace-pre-wrap font-mono text-[11px] bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                      {item.output}
                    </pre>
                  </div>
                ))}
              </div>

              {/* Terminal Input Line */}
              <form 
                onSubmit={(e) => { e.preventDefault(); handleExecuteCommand(); }}
                className="pt-3 border-t border-slate-800 flex items-center gap-2 shrink-0"
              >
                <span className="text-cyan-400 text-xs font-bold">$</span>
                <input
                  type="text"
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  placeholder="Type 'kimi-regmap', 'kimi-smi', 'kimi-diag --test-optics'..."
                  className="flex-1 bg-transparent text-xs text-white focus:outline-none placeholder-slate-600 font-mono"
                />
                <button
                  type="submit"
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Quick Action Commands Launcher */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" /> Quick Driver Diagnostic Shortcuts
              </h4>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <button
                  onClick={() => handleExecuteCommand('kimi-regmap')}
                  className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-cyan-300 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                  <span className="truncate">kimi-regmap</span>
                </button>

                <button
                  onClick={() => handleExecuteCommand('kimi-smi')}
                  className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-blue-300 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Server className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                  <span className="truncate">kimi-smi</span>
                </button>

                <button
                  onClick={() => handleExecuteCommand('kimi-diag --test-optics')}
                  className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-emerald-300 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                  <span className="truncate">kimi-diag (Optics)</span>
                </button>

                <button
                  onClick={() => handleExecuteCommand('kimi-weights --status')}
                  className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-purple-300 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 shrink-0 text-purple-400" />
                  <span className="truncate">kimi-weights</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
