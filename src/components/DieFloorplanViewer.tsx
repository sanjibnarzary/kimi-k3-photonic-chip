import React, { useState } from 'react';
import { 
  PHOTONIC_DIE_BLOCKS, 
  CHIP_GENERAL_SPECS 
} from '../data/kimiK3Specs';
import { PhotonicBlock } from '../types/photonic';
import { 
  Info, 
  Eye, 
  Layers, 
  Activity, 
  Cpu, 
  Sparkles,
  Play,
  Pause
} from 'lucide-react';

export const DieFloorplanViewer: React.FC = () => {
  const [selectedBlockId, setSelectedBlockId] = useState<string>('pcm_weight_matrix');
  const [isSimulatingLight, setIsSimulatingLight] = useState<boolean>(true);
  const [activeCrossSection, setActiveCrossSection] = useState<'waveguide' | 'pcm_cell' | 'mrm'>('pcm_cell');

  const selectedBlock: PhotonicBlock = 
    PHOTONIC_DIE_BLOCKS.find(b => b.id === selectedBlockId) || PHOTONIC_DIE_BLOCKS[4];

  return (
    <div className="space-y-6">
      {/* Top Banner Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
          <div className="text-xs font-medium text-slate-400">Silicon Substrate</div>
          <div className="text-sm font-bold text-white mt-1">300mm Monolithic SOI + Si3N4</div>
          <div className="text-[11px] text-cyan-400 font-mono mt-0.5">Dual-layer optical routing stack</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
          <div className="text-xs font-medium text-slate-400">Hardware Weight Storage</div>
          <div className="text-sm font-bold text-emerald-400 mt-1">Sb2Se3 Phase-Change Matrix</div>
          <div className="text-[11px] text-slate-300 font-mono mt-0.5">Zero static DRAM refresh power</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
          <div className="text-xs font-medium text-slate-400">Interconnect &amp; Packaging</div>
          <div className="text-sm font-bold text-blue-400 mt-1">CPO 64λ WDM Optical Ribbon</div>
          <div className="text-[11px] text-slate-300 font-mono mt-0.5">14.33 Tbps / die @ UCIe 2.0</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
          <div className="text-xs font-medium text-slate-400">Optical Core Latency</div>
          <div className="text-sm font-bold text-amber-400 mt-1">0.14 ns Optical Delay</div>
          <div className="text-[11px] text-slate-300 font-mono mt-0.5">46.8 TOPS/W peak efficiency</div>
        </div>
      </div>

      {/* Main Floorplan Die Canvas & Block Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Die Schematic */}
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                Kimi-PAU Die Floorplan (12.4mm x 9.8mm)
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSimulatingLight(!isSimulatingLight)}
                className={`text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono border transition-all ${
                  isSimulatingLight 
                    ? 'bg-cyan-950/60 text-cyan-300 border-cyan-700/50' 
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                {isSimulatingLight ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {isSimulatingLight ? 'Wavefront Active' : 'Wavefront Paused'}
              </button>
            </div>
          </div>

          {/* SVG Silicon Die Layout */}
          <div className="relative w-full aspect-[940/400] bg-slate-900/60 rounded-xl border border-slate-800/80 p-2 overflow-hidden shadow-inner">
            <svg
              viewBox="0 0 940 400"
              className="w-full h-full select-none"
            >
              {/* Background Silicon Grid Pattern */}
              <defs>
                <pattern id="dieGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                </pattern>
                
                {/* Glow Filter for Light Wavefront */}
                <filter id="opticalGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>

                <linearGradient id="laserGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.4" />
                </linearGradient>

                <linearGradient id="modGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#0891b2" stopOpacity="0.3" />
                </linearGradient>

                <linearGradient id="pcmGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#047857" stopOpacity="0.35" />
                </linearGradient>

                <linearGradient id="detectorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#6d28d9" stopOpacity="0.3" />
                </linearGradient>
              </defs>

              <rect width="940" height="400" fill="#0b0f19" />
              <rect width="940" height="400" fill="url(#dieGrid)" />

              {/* Silicon Guard Ring & Edge Facets */}
              <rect x="8" y="8" width="924" height="384" fill="none" stroke="#334155" strokeWidth="1.5" strokeDasharray="4 2" />

              {/* Optical Waveguide Paths (Low-Loss Si3N4 Bus) */}
              <g stroke="#38bdf8" strokeWidth="1.5" opacity="0.6" fill="none">
                <path d="M 110 50 L 180 50 L 330 50" />
                <path d="M 110 90 L 180 90 L 330 90" />
                <path d="M 110 130 L 180 130 L 330 130" />
                <path d="M 110 170 L 180 170 L 330 170" />

                {/* Modulator to PCM Matrix routing */}
                <path d="M 440 60 L 450 60" />
                <path d="M 440 100 L 450 100" />
                <path d="M 440 140 L 450 140" />
                <path d="M 440 180 L 450 180" />
                <path d="M 440 220 L 450 220" />

                {/* Matrix crossbar outputs to WDM Demux */}
                <path d="M 710 70 L 720 70" />
                <path d="M 710 120 L 720 120" />
                <path d="M 710 170 L 720 170" />
                <path d="M 710 220 L 720 220" />

                {/* Demux to Detector array */}
                <path d="M 820 80 L 830 80" />
                <path d="M 820 140 L 830 140" />
                <path d="M 820 200 L 830 200" />
              </g>

              {/* Animated Optical Wavefront Photons */}
              {isSimulatingLight && (
                <g fill="#38bdf8" filter="url(#opticalGlow)">
                  <circle cx="210" cy="50" r="3" className="animate-pulse">
                    <animate attributeName="cx" from="110" to="330" dur="1.2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="260" cy="90" r="3" className="animate-pulse">
                    <animate attributeName="cx" from="110" to="330" dur="1.2s" begin="0.2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="240" cy="130" r="3" className="animate-pulse">
                    <animate attributeName="cx" from="110" to="330" dur="1.2s" begin="0.4s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="290" cy="170" r="3" className="animate-pulse">
                    <animate attributeName="cx" from="110" to="330" dur="1.2s" begin="0.6s" repeatCount="indefinite" />
                  </circle>

                  {/* Core Matrix Pulses */}
                  <circle cx="580" cy="120" r="3.5" fill="#34d399">
                    <animate attributeName="cx" from="450" to="710" dur="0.9s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="580" cy="180" r="3.5" fill="#34d399">
                    <animate attributeName="cx" from="450" to="710" dur="0.9s" begin="0.3s" repeatCount="indefinite" />
                  </circle>
                </g>
              )}

              {/* Block Rectangles */}
              {PHOTONIC_DIE_BLOCKS.map(block => {
                const isSelected = selectedBlockId === block.id;
                let fillColor = '#1e293b';
                let strokeColor = '#475569';
                let badgeText = '';

                if (block.category === 'laser') {
                  fillColor = 'url(#laserGrad)';
                  strokeColor = isSelected ? '#f87171' : '#dc2626';
                  badgeText = '64-WDM LASER';
                } else if (block.category === 'modulator') {
                  fillColor = 'url(#modGrad)';
                  strokeColor = isSelected ? '#38bdf8' : '#0284c7';
                  badgeText = 'MRM BANK';
                } else if (block.category === 'weight_core') {
                  fillColor = 'url(#pcmGrad)';
                  strokeColor = isSelected ? '#34d399' : '#059669';
                  badgeText = 'NON-VOLATILE PCM WEIGHTS';
                } else if (block.category === 'detector') {
                  fillColor = 'url(#detectorGrad)';
                  strokeColor = isSelected ? '#c084fc' : '#7c3aed';
                  badgeText = 'GE PIN / TIA';
                } else if (block.category === 'interconnect') {
                  fillColor = '#1e293b';
                  strokeColor = isSelected ? '#38bdf8' : '#3b82f6';
                  badgeText = 'CPO / UCIe';
                } else if (block.category === 'control') {
                  fillColor = '#1e1b4b';
                  strokeColor = isSelected ? '#a5b4fc' : '#4f46e5';
                  badgeText = 'THERMAL PLL';
                }

                return (
                  <g
                    key={block.id}
                    onClick={() => setSelectedBlockId(block.id)}
                    className="cursor-pointer transition-all duration-150"
                  >
                    <rect
                      x={block.coordinates.x}
                      y={block.coordinates.y}
                      width={block.coordinates.width}
                      height={block.coordinates.height}
                      rx="6"
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? '2.5' : '1.2'}
                      filter={isSelected ? 'url(#opticalGlow)' : undefined}
                      className="hover:opacity-90 transition-opacity"
                    />

                    {/* Block Label text */}
                    <text
                      x={block.coordinates.x + 8}
                      y={block.coordinates.y + 18}
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {badgeText || block.name.slice(0, 14)}
                    </text>

                    {/* Secondary detail inside block */}
                    {block.coordinates.height >= 80 && (
                      <text
                        x={block.coordinates.x + 8}
                        y={block.coordinates.y + 34}
                        fill="#94a3b8"
                        fontSize="8.5"
                        fontFamily="monospace"
                      >
                        {block.lossPenaltyDb > 0 ? `-${block.lossPenaltyDb} dB` : 'Active Control'}
                      </text>
                    )}

                    {/* Micro-Ring Rings visual details inside Modulator block */}
                    {block.id === 'mrm_modulator_bank' && (
                      <g stroke="#38bdf8" strokeWidth="1.5" fill="none" opacity="0.8">
                        <circle cx={block.coordinates.x + 35} cy={block.coordinates.y + 60} r="14" />
                        <circle cx={block.coordinates.x + 75} cy={block.coordinates.y + 60} r="14" />
                        <circle cx={block.coordinates.x + 35} cy={block.coordinates.y + 110} r="14" />
                        <circle cx={block.coordinates.x + 75} cy={block.coordinates.y + 110} r="14" />
                        <circle cx={block.coordinates.x + 35} cy={block.coordinates.y + 160} r="14" />
                        <circle cx={block.coordinates.x + 75} cy={block.coordinates.y + 160} r="14" />
                        <circle cx={block.coordinates.x + 35} cy={block.coordinates.y + 210} r="14" />
                        <circle cx={block.coordinates.x + 75} cy={block.coordinates.y + 210} r="14" />
                      </g>
                    )}

                    {/* Non-Volatile PCM Optical Crossbar Grid inside weight core */}
                    {block.id === 'pcm_weight_matrix' && (
                      <g stroke="#10b981" strokeWidth="0.8" opacity="0.7">
                        {Array.from({ length: 9 }).map((_, i) => (
                          <line
                            key={`h-${i}`}
                            x1={block.coordinates.x + 15}
                            y1={block.coordinates.y + 45 + i * 23}
                            x2={block.coordinates.x + block.coordinates.width - 15}
                            y2={block.coordinates.y + 45 + i * 23}
                          />
                        ))}
                        {Array.from({ length: 9 }).map((_, i) => (
                          <line
                            key={`v-${i}`}
                            x1={block.coordinates.x + 20 + i * 26}
                            y1={block.coordinates.y + 40}
                            x2={block.coordinates.x + 20 + i * 26}
                            y2={block.coordinates.y + block.coordinates.height - 15}
                          />
                        ))}
                        {/* Phase Change Material optical cross points */}
                        {Array.from({ length: 6 }).map((_, r) =>
                          Array.from({ length: 6 }).map((_, c) => (
                            <rect
                              key={`pcm-dot-${r}-${c}`}
                              x={block.coordinates.x + 24 + c * 38}
                              y={block.coordinates.y + 50 + r * 34}
                              width="5"
                              height="5"
                              fill="#34d399"
                              rx="1"
                            />
                          ))
                        )}
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Interactive Legend Bar */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-500"></span> DFB Comb Laser
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500"></span> MRM Modulators
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Non-Volatile Weights (PCM)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-purple-500"></span> Ge Photodetector/TIA
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              Click any silicon block to inspect photonic layer parameters
            </div>
          </div>
        </div>

        {/* Selected Block Technical Dossier */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
                Subsystem Inspection
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300">
                {selectedBlock.category.toUpperCase()}
              </span>
            </div>

            <div className="mt-4">
              <h3 className="text-base font-bold text-white leading-snug">
                {selectedBlock.name}
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {selectedBlock.description}
              </p>
            </div>

            {/* Performance Metric Pills */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-2.5">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Insertion Loss</div>
                <div className="text-sm font-bold text-amber-400 font-mono mt-0.5">
                  {selectedBlock.lossPenaltyDb > 0 ? `-${selectedBlock.lossPenaltyDb} dB` : '0.00 dB (Lossless)'}
                </div>
              </div>
              <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-2.5">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Propagation Delay</div>
                <div className="text-sm font-bold text-cyan-400 font-mono mt-0.5">
                  {selectedBlock.latencyPs} ps
                </div>
              </div>
            </div>

            {/* Technical Specifications Table */}
            <div className="mt-4 space-y-1.5 bg-slate-950/60 border border-slate-800 rounded-lg p-3">
              <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-cyan-400" /> Physical &amp; Optical Parameters
              </div>
              {Object.entries(selectedBlock.technicalSpecs).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-xs py-1 border-b border-slate-900 last:border-0">
                  <span className="text-slate-400">{key}</span>
                  <span className="font-mono text-slate-200 font-medium text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cross-Section Waveguide Mode Inspector */}
          <div className="mt-5 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-medium text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" /> Cross-Section Micrograph
              </span>
              <div className="flex gap-1 text-[10px] font-mono">
                <button
                  onClick={() => setActiveCrossSection('pcm_cell')}
                  className={`px-1.5 py-0.5 rounded ${
                    activeCrossSection === 'pcm_cell' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  PCM Cell
                </button>
                <button
                  onClick={() => setActiveCrossSection('waveguide')}
                  className={`px-1.5 py-0.5 rounded ${
                    activeCrossSection === 'waveguide' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Si3N4 Bus
                </button>
                <button
                  onClick={() => setActiveCrossSection('mrm')}
                  className={`px-1.5 py-0.5 rounded ${
                    activeCrossSection === 'mrm' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  MRM Ring
                </button>
              </div>
            </div>

            {/* Microscopic Cross-Section Diagram */}
            <div className="bg-slate-950 rounded-lg p-2.5 border border-slate-800 text-xs font-mono">
              {activeCrossSection === 'pcm_cell' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-emerald-400">
                    <span>Non-Volatile Sb2Se3 Optical Film</span>
                    <span>15nm thickness</span>
                  </div>
                  <div className="w-full h-3 bg-emerald-500/30 rounded border border-emerald-500/60 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/40 via-cyan-500/60 to-emerald-500/40"></div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>Silicon Core (220nm x 450nm)</span>
                    <span>Δneff = 0.082 (Phase Shift)</span>
                  </div>
                  <div className="w-full h-6 bg-slate-800 rounded border border-slate-700 flex items-center justify-center text-[10px] text-cyan-300">
                    Optical Mode Field (TE00)
                  </div>
                  <div className="w-full h-3 bg-slate-900 rounded text-[9px] text-slate-500 flex items-center justify-center">
                    SiO2 Lower Cladding (2.0 um)
                  </div>
                </div>
              )}

              {activeCrossSection === 'waveguide' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-cyan-400">
                    <span>SiO2 Upper Cladding (3.0 um)</span>
                    <span>Loss &lt; 0.08 dB/cm</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded"></div>
                  <div className="w-full h-8 bg-slate-900 border border-cyan-500/50 rounded flex items-center justify-center text-cyan-300 text-[11px]">
                    Si3N4 Core (800nm x 300nm)
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded"></div>
                </div>
              )}

              {activeCrossSection === 'mrm' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-blue-400">
                    <span>Micro-Ring PN Depletion Diode</span>
                    <span>65 GHz (112 Gbps PAM4)</span>
                  </div>
                  <div className="flex gap-1 h-7">
                    <div className="w-1/2 bg-blue-900/60 border border-blue-600 rounded flex items-center justify-center text-[10px] text-blue-300">
                      P+ Doped Region
                    </div>
                    <div className="w-1/2 bg-red-900/60 border border-red-600 rounded flex items-center justify-center text-[10px] text-red-300">
                      N+ Doped Region
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 text-center">
                    Energy: 6.2 fJ/bit • Drive Voltage: 0.85 Vpp
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
