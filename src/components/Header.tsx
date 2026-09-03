import React from 'react';
import { 
  Cpu, 
  Zap, 
  Activity, 
  Layers, 
  Terminal, 
  BookOpen, 
  ShieldCheck, 
  Radio, 
  Flame,
  Gauge
} from 'lucide-react';
import { SimulationMetrics } from '../types/photonic';

interface HeaderProps {
  activeTab: 'floorplan' | 'simulator' | 'loss' | 'driver' | 'docs';
  setActiveTab: (tab: 'floorplan' | 'simulator' | 'loss' | 'driver' | 'docs') => void;
  metrics: SimulationMetrics;
  thermalLocked: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  activeTab, 
  setActiveTab, 
  metrics,
  thermalLocked 
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50 text-slate-100">
      {/* Top Banner: Status & Chip Identity */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 text-cyan-400 shadow-lg shadow-cyan-500/10">
            <Radio className="w-6 h-6 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Kimi-PAU <span className="text-cyan-400 font-mono text-sm bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">K3-X1</span>
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                <ShieldCheck className="w-3.5 h-3.5" /> Hardware-Level Weights Stored
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono truncate">
              Non-Volatile Optical In-Memory Matrix Core • 64λ WDM Silicon Photonics • CPO / UCIe
            </p>
          </div>
        </div>

        {/* Live Optical Telemetry Badges */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono">
          <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Active Pwr</span>
              <span className="font-semibold text-slate-200">{metrics.opticalPowerWatts} W</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Speedup</span>
              <span className="font-semibold text-cyan-300">{metrics.speedupFactor}x vs GPU</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Efficiency</span>
              <span className="font-semibold text-emerald-300">{metrics.energyEfficiencyTopsPerWatt} TOPS/W</span>
            </div>
          </div>

          <div className={`border rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 ${
            thermalLocked 
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' 
              : 'bg-amber-950/40 border-amber-800/60 text-amber-300 animate-pulse'
          }`}>
            <Flame className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold">
              {thermalLocked ? 'PLL Locked' : 'Tuning Phase'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 flex overflow-x-auto scrollbar-none border-t border-slate-800/80">
        <nav className="flex space-x-1 py-1" aria-label="Tabs">
          <button
            id="tab-floorplan"
            onClick={() => setActiveTab('floorplan')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'floorplan'
                ? 'bg-cyan-500/15 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Silicon Die &amp; Floorplan</span>
          </button>

          <button
            id="tab-simulator"
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'simulator'
                ? 'bg-cyan-500/15 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Optical GEMM &amp; Latency Engine</span>
          </button>

          <button
            id="tab-loss"
            onClick={() => setActiveTab('loss')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'loss'
                ? 'bg-cyan-500/15 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Loss Budget &amp; Link Margin</span>
          </button>

          <button
            id="tab-driver"
            onClick={() => setActiveTab('driver')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'driver'
                ? 'bg-cyan-500/15 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Driver Suite &amp; Production SDK</span>
          </button>

          <button
            id="tab-docs"
            onClick={() => setActiveTab('docs')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'docs'
                ? 'bg-cyan-500/15 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Architecture Specification</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
