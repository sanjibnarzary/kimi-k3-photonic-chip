import React, { useState, useMemo } from 'react';
import { 
  OPTICAL_DRC_RULES, 
  INJECTED_VIOLATIONS, 
  OpticalDrcRule, 
  DrcCategory, 
  DrcSeverity, 
  InjectedViolationPreset 
} from '../data/opticalDrcRules';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Layers, 
  Cpu, 
  Play, 
  RotateCcw, 
  Download, 
  Copy, 
  Check, 
  Crosshair, 
  Flame, 
  Sliders, 
  FileText, 
  FileCheck, 
  Sparkles, 
  Activity,
  Maximize2
} from 'lucide-react';

export const OpticalDrcChecklist: React.FC = () => {
  const [selectedRuleId, setSelectedRuleId] = useState<string>('DRC_OPT_WG_01_BEND');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PASS' | 'FATAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeViolationPresetId, setActiveViolationPresetId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(100);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [showSignoffModal, setShowSignoffModal] = useState<boolean>(false);
  const [lastScanTimestamp, setLastScanTimestamp] = useState<string>('2026-09-03 15:11:42 UTC');

  // Compute active rules based on injected violation preset
  const activeRules: OpticalDrcRule[] = useMemo(() => {
    return OPTICAL_DRC_RULES.map(rule => {
      if (activeViolationPresetId) {
        const preset = INJECTED_VIOLATIONS.find(v => v.id === activeViolationPresetId);
        if (preset && preset.ruleId === rule.id) {
          const delta = preset.badValue - rule.nominalValue;
          const pct = ((delta / rule.nominalValue) * 100).toFixed(1);
          return {
            ...rule,
            measuredValue: preset.badValue,
            margin: `${delta > 0 ? '+' : ''}${delta.toFixed(2)} ${preset.unit} (${pct}%) VIOLATION`,
            status: 'FATAL' as DrcSeverity,
            physicalRisk: preset.physicalFailureMode,
            coordinateLocation: `${preset.coordinate} (${preset.affectedComponent})`
          };
        }
      }
      return rule;
    });
  }, [activeViolationPresetId]);

  // Derived filtered rules
  const filteredRules = useMemo(() => {
    return activeRules.filter(rule => {
      const matchCat = activeCategory === 'All' || rule.category === activeCategory;
      const matchStatus = statusFilter === 'ALL' || rule.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || 
        rule.id.toLowerCase().includes(q) || 
        rule.name.toLowerCase().includes(q) || 
        rule.layer.toLowerCase().includes(q) ||
        rule.foundrySpec.toLowerCase().includes(q) ||
        rule.limitExpression.toLowerCase().includes(q);
      return matchCat && matchStatus && matchQuery;
    });
  }, [activeRules, activeCategory, statusFilter, searchQuery]);

  const selectedRule = activeRules.find(r => r.id === selectedRuleId) || activeRules[0];
  const activeViolationPreset = INJECTED_VIOLATIONS.find(v => v.id === activeViolationPresetId);

  // Stats
  const totalRules = activeRules.length;
  const passCount = activeRules.filter(r => r.status === 'PASS').length;
  const fatalCount = activeRules.filter(r => r.status === 'FATAL').length;
  const isTapeoutReady = fatalCount === 0;

  const categories: string[] = [
    'All',
    'Waveguide Geometry',
    'Optical Coupling & Gaps',
    'Phase-Change Material (PCM)',
    'Thermal & Metal Keep-Out',
    'Foundry DFM & CMP'
  ];

  // Trigger simulated DRC verification scan
  const handleRunDrcScan = () => {
    setIsScanning(true);
    setScanProgress(0);
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          const now = new Date();
          setLastScanTimestamp(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
          return 100;
        }
        return prev + 25;
      });
    }, 150);
  };

  const handleInjectViolation = (presetId: string | null) => {
    setActiveViolationPresetId(presetId);
    if (presetId) {
      const preset = INJECTED_VIOLATIONS.find(p => p.id === presetId);
      if (preset) {
        setSelectedRuleId(preset.ruleId);
      }
    }
  };

  const handleCopySignoffHash = () => {
    const hash = 'TSMC-OIP-PHOX300-SIGNOFF-KIMI-K3-8F42A9B1D50E';
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleDownloadSignoffReport = () => {
    const lines = [
      '================================================================================',
      'TSMC 300mm MONOLITHIC SILICON PHOTONICS DRC SIGN-OFF REPORT',
      'PROJECT: Kimi-PAU K3-X1 Photonic Acceleration Unit (35.96 mm² Monolithic SOI)',
      `TIMESTAMP: ${lastScanTimestamp}`,
      `STATUS: ${isTapeoutReady ? 'DRC CLEAN - AUTHORIZED FOR PHOTOMASK TAPEOUT' : 'BLOCKED - FATAL DRC VIOLATIONS DETECTED'}`,
      `PASS COUNT: ${passCount} / ${totalRules} Rules`,
      `FATAL VIOLATIONS: ${fatalCount}`,
      '================================================================================\n',
      'RULE VERIFICATION BREAKDOWN:',
      ...activeRules.map(r => 
        `[${r.status}] ${r.id.padEnd(26)} | ${r.limitExpression.padEnd(28)} | Measured: ${r.measuredValue} ${r.unit} (${r.margin}) | Layer: ${r.layerGds}`
      ),
      '\nFOUNDRY FABRICATION AUTHORIZATION:',
      `SIGN-OFF CHECKSUM: TSMC-OIP-PHOX300-SIGNOFF-KIMI-K3-8F42A9B1D50E`,
      `PHYSICAL SIGN-OFF ENGINEER: Kimi Photonics Core Verification EDA Engine`,
      `GDSII MASK HASH: SHA256-4b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e`
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kimi_k3_optical_drc_signoff_${isTapeoutReady ? 'clean' : 'failed'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top QA Sign-Off Status Banner */}
      <div className={`rounded-2xl border p-5 sm:p-6 transition-all ${
        isTapeoutReady 
          ? 'bg-slate-900 border-emerald-500/40 shadow-xl shadow-emerald-950/20' 
          : 'bg-slate-900 border-rose-500/50 shadow-xl shadow-rose-950/30'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              isTapeoutReady 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}>
              {isTapeoutReady ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6 animate-pulse" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                  isTapeoutReady 
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                    : 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                }`}>
                  {isTapeoutReady ? 'DRC SIGN-OFF CLEAN: READY FOR TAPEOUT' : 'TAPEOUT BLOCKED: 1 FATAL DRC VIOLATION'}
                </span>
                <span className="text-xs text-slate-500 font-mono hidden sm:inline">
                  TSMC OIP Photonic PDK v3.1
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white font-mono mt-1">
                Optical Layout Design Rule Checking (DRC) Quality Assurance
              </h3>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleRunDrcScan}
              disabled={isScanning}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              title="Run full optical DRC layout scan"
            >
              <Play className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-cyan-400' : 'text-cyan-400'}`} />
              <span>{isScanning ? `Scanning (${scanProgress}%)...` : 'Run DRC Sign-Off'}</span>
            </button>

            <button
              onClick={() => setShowSignoffModal(true)}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-lg cursor-pointer ${
                isTapeoutReady
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>{isTapeoutReady ? 'Authorize Tapeout' : 'Inspect Blocker'}</span>
            </button>
          </div>
        </div>

        {/* Progress Bar for DRC Scanning */}
        {isScanning && (
          <div className="pt-3">
            <div className="flex justify-between text-[11px] font-mono text-cyan-400 pb-1">
              <span>Scanning 482,900 optical layout polygons across 10 GDSII mask layers...</span>
              <span>{scanProgress}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-150"
                style={{ width: `${scanProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Metric Badges Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 font-mono text-xs">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase">Total Rules Checked</span>
            <div className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5">
              <span>{totalRules} Rules</span>
              <span className="text-[10px] text-cyan-400 font-normal">(100% Coverage)</span>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase">Passing Constraints</span>
            <div className="text-sm font-bold text-emerald-400 mt-0.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{passCount} Clean</span>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase">Fatal Violations</span>
            <div className={`text-sm font-bold mt-0.5 flex items-center gap-1.5 ${
              fatalCount === 0 ? 'text-slate-400' : 'text-rose-400 font-extrabold'
            }`}>
              {fatalCount === 0 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
              <span>{fatalCount} Errors</span>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase">Last Sign-Off Sweep</span>
            <div className="text-xs text-slate-300 mt-1 truncate">
              {lastScanTimestamp.split(' ')[1]} (Clean)
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Violation Sandbox: Stress-Test DRC Engine */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
              DRC Constraint Validation Sandbox &amp; Defect Injection
            </h4>
          </div>
          <span className="text-[11px] text-slate-400">
            Test how the physical sign-off engine catches layout rule violations before mask tapeout
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={() => handleInjectViolation(null)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              activeViolationPresetId === null
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Golden Layout (0 Errors)</span>
          </button>

          {INJECTED_VIOLATIONS.map(preset => (
            <button
              key={preset.id}
              onClick={() => handleInjectViolation(preset.id)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                activeViolationPresetId === preset.id
                  ? 'bg-rose-950 text-rose-300 border border-rose-600 font-bold shadow-md shadow-rose-950/40'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${activeViolationPresetId === preset.id ? 'text-rose-400' : 'text-slate-500'}`} />
              <span>{preset.title.split('(')[0]}</span>
            </button>
          ))}
        </div>

        {/* Active Violation Alert Ribbon if one is injected */}
        {activeViolationPreset && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-rose-900 text-rose-200 font-bold text-[10px]">
                  ACTIVE DRC DEFECT
                </span>
                <span className="text-white font-bold">{activeViolationPreset.title}</span>
              </div>
              <p className="text-rose-300/90 text-[11px] leading-relaxed">
                {activeViolationPreset.tapeoutBlockerReason}
              </p>
            </div>
            <button
              onClick={() => handleInjectViolation(null)}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Auto-Fix &amp; Re-Route</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Rules Table / Filter (7 cols) + Selected Rule Inspector & Die Map (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Rules Filter & Table (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 font-mono">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rule ID, layer, or specification..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-all ${
                  statusFilter === 'ALL' ? 'bg-cyan-950 text-cyan-300 border border-cyan-700' : 'bg-slate-900 text-slate-400'
                }`}
              >
                All ({totalRules})
              </button>
              <button
                onClick={() => setStatusFilter('PASS')}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-all ${
                  statusFilter === 'PASS' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-slate-900 text-slate-400'
                }`}
              >
                Clean ({passCount})
              </button>
              {fatalCount > 0 && (
                <button
                  onClick={() => setStatusFilter('FATAL')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] transition-all ${
                    statusFilter === 'FATAL' ? 'bg-rose-950 text-rose-300 border border-rose-700 font-bold' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  Errors ({fatalCount})
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-all cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Rules Table */}
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto rounded-xl border border-slate-800 scrollbar-thin scrollbar-thumb-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase tracking-wider sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Rule ID &amp; Name</th>
                  <th className="py-2.5 px-2">Layer</th>
                  <th className="py-2.5 px-3">Constraint</th>
                  <th className="py-2.5 px-3">Measured</th>
                  <th className="py-2.5 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRules.map(rule => {
                  const isSelected = rule.id === selectedRule.id;
                  const isPass = rule.status === 'PASS';

                  return (
                    <tr
                      key={rule.id}
                      onClick={() => setSelectedRuleId(rule.id)}
                      className={`cursor-pointer transition-all ${
                        isSelected
                          ? isPass 
                            ? 'bg-cyan-950/40 font-semibold' 
                            : 'bg-rose-950/40 font-semibold'
                          : 'hover:bg-slate-900/80 text-slate-300'
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        {isPass ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> PASS
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-700 flex items-center gap-1 w-fit font-bold animate-pulse">
                            <XCircle className="w-3 h-3" /> FATAL
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col">
                          <span className={`text-xs ${isSelected ? 'text-white font-bold' : 'text-slate-200'}`}>
                            {rule.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            {rule.id}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-[11px] text-cyan-400">
                        {rule.layerGds}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 text-[11px]">
                        {rule.limitExpression}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col">
                          <span className={`text-xs font-bold ${isPass ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {rule.measuredValue} {rule.unit}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal truncate max-w-[120px]">
                            {rule.margin}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRuleId(rule.id);
                          }}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] border border-slate-700 transition-all cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Selected Rule Inspector & Die Radar Locator (5 cols) */}
        <div className="lg:col-span-5 space-y-4 font-mono">
          {/* Detailed Rule Inspection Card */}
          <div className={`bg-slate-950 border rounded-2xl p-5 space-y-4 transition-all ${
            selectedRule.status === 'PASS' ? 'border-slate-800' : 'border-rose-500/60 shadow-lg shadow-rose-950/20'
          }`}>
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    selectedRule.status === 'PASS' 
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                      : 'bg-rose-950 text-rose-300 border border-rose-700'
                  }`}>
                    {selectedRule.status}
                  </span>
                  <span className="text-xs text-cyan-400 font-bold">
                    {selectedRule.id}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white mt-1">
                  {selectedRule.name}
                </h4>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {selectedRule.foundrySpec}
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-[10px] text-slate-500">GDSII LAYER</div>
                <div className="text-xs font-bold text-cyan-300">{selectedRule.layerGds}</div>
              </div>
            </div>

            {/* Constraint Math & Measured Comparison */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-500">FOUNDRY RULE LIMIT</div>
                <div className="text-xs font-bold text-white mt-0.5">{selectedRule.limitExpression}</div>
              </div>
              <div className={`p-2.5 rounded-xl border ${
                selectedRule.status === 'PASS' 
                  ? 'bg-slate-900 border-slate-800' 
                  : 'bg-rose-950/40 border-rose-700/60'
              }`}>
                <div className="text-[10px] text-slate-500">CURRENT LAYOUT VALUE</div>
                <div className={`text-xs font-bold mt-0.5 ${
                  selectedRule.status === 'PASS' ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {selectedRule.measuredValue} {selectedRule.unit} ({selectedRule.margin})
                </div>
              </div>
            </div>

            {/* Physical Failure Consequence / Optical Risk */}
            <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 space-y-1 text-xs">
              <div className="text-slate-400 font-bold flex items-center gap-1.5 text-[11px]">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Physical Failure Mode &amp; Optical Impact:</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {selectedRule.physicalRisk}
              </p>
            </div>

            {/* Automated DRC Check Script Execution */}
            <div className="space-y-1 text-xs">
              <div className="text-slate-400 text-[11px] font-bold">DRC Python / GDSFactory Rule Logic:</div>
              <pre className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-cyan-300 text-[11px] overflow-x-auto whitespace-pre">
                <code>{selectedRule.drcCheckLogic}</code>
              </pre>
            </div>

            {/* Coordinate Pin Location */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
              <div className="flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-purple-400" />
                <span>Location: <code className="text-slate-200">{selectedRule.coordinateLocation}</code></span>
              </div>
            </div>
          </div>

          {/* Interactive Silicon Die Layout Minimap & Crosshair Locator */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white">Silicon Die Floorplan Locator</span>
              </div>
              <span className="text-[10px] text-slate-400">35.96 mm² (5.80 × 6.20 mm)</span>
            </div>

            {/* Die Floorplan Canvas Representation */}
            <div className="relative w-full h-56 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden p-2 flex flex-col justify-between">
              {/* Floorplan Subsystem Blocks */}
              <div className="grid grid-cols-3 gap-1.5 h-full">
                {/* Column 1: Optical I/O & Comb Laser */}
                <div className="border border-cyan-800/40 bg-cyan-950/20 rounded p-1.5 flex flex-col justify-between text-[9px] text-cyan-300">
                  <div className="font-bold border-b border-cyan-800/40 pb-0.5">West Optical Facet</div>
                  <div className="space-y-0.5 text-slate-400 text-[8px]">
                    <div>• Fiber Array V-Groove</div>
                    <div>• 64-Ch WDM Interleaver</div>
                    <div>• Spot-Size Converters</div>
                  </div>
                  <span className="text-[8px] text-cyan-500">X: 0 - 1800 µm</span>
                </div>

                {/* Column 2: PCM Weight Matrix Array */}
                <div className="border border-purple-800/40 bg-purple-950/20 rounded p-1.5 flex flex-col justify-between text-[9px] text-purple-300">
                  <div className="font-bold border-b border-purple-800/40 pb-0.5">PCM Matrix Core</div>
                  <div className="space-y-0.5 text-slate-400 text-[8px]">
                    <div>• 4096 NVM Sb2Se3 Cells</div>
                    <div>• Phase-Tuned Crossbars</div>
                    <div>• Low-Loss Si3N4 Bus</div>
                  </div>
                  <span className="text-[8px] text-purple-400">X: 1800 - 4200 µm</span>
                </div>

                {/* Column 3: Thermal PLL, Ge-PDs & CPO */}
                <div className="border border-emerald-800/40 bg-emerald-950/20 rounded p-1.5 flex flex-col justify-between text-[9px] text-emerald-300">
                  <div className="font-bold border-b border-emerald-800/40 pb-0.5">East CPO &amp; Analog</div>
                  <div className="space-y-0.5 text-slate-400 text-[8px]">
                    <div>• 64 Ge Photodetectors</div>
                    <div>• Micro-Heater Thermal PLL</div>
                    <div>• 100µm CPO Micro-Bumps</div>
                  </div>
                  <span className="text-[8px] text-emerald-500">X: 4200 - 5800 µm</span>
                </div>
              </div>

              {/* Dynamic Radar Marker for Selected Rule */}
              <div 
                className="absolute z-10 flex flex-col items-center pointer-events-none transition-all duration-300"
                style={{
                  left: selectedRule.category === 'Optical Coupling & Gaps' ? '28%' :
                        selectedRule.category === 'Phase-Change Material (PCM)' ? '52%' :
                        selectedRule.category === 'Thermal & Metal Keep-Out' ? '74%' : '44%',
                  top: selectedRule.id === 'DRC_OPT_WG_01_BEND' ? '40%' :
                       selectedRule.id === 'DRC_OPT_GRAT_07_PERIOD' ? '78%' : '35%'
                }}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center animate-ping ${
                  selectedRule.status === 'PASS' 
                    ? 'border-cyan-400 bg-cyan-400/20' 
                    : 'border-rose-500 bg-rose-500/40'
                }`}></div>
                <div className={`-mt-5 w-3 h-3 rounded-full ${
                  selectedRule.status === 'PASS' ? 'bg-cyan-400' : 'bg-rose-500'
                }`}></div>
                <span className={`text-[8px] px-1 rounded shadow-md mt-1 font-bold whitespace-nowrap ${
                  selectedRule.status === 'PASS' 
                    ? 'bg-slate-950 text-cyan-300 border border-cyan-800' 
                    : 'bg-rose-950 text-rose-300 border border-rose-600 animate-pulse'
                }`}>
                  {selectedRule.status === 'PASS' ? 'CLEAN INSPECTION' : 'DRC VIOLATION'} ({selectedRule.id})
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Grid: Sub-micron GDSII precision (1 nm database grid)</span>
              <span className="text-cyan-400 font-bold">100% Reticle Inspected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Official DRC Sign-Off Authorization Modal */}
      {showSignoffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-5 font-mono shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {isTapeoutReady ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                )}
                <h3 className="text-base font-bold text-white">
                  {isTapeoutReady ? 'Photomask Tapeout Authorization' : 'Tapeout Blocked by DRC Failure'}
                </h3>
              </div>
              <button
                onClick={() => setShowSignoffModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕ Close
              </button>
            </div>

            {isTapeoutReady ? (
              <div className="space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-200 leading-relaxed">
                  <strong>All 12 Optical Layout DRC Constraints PASSED.</strong> The physical layout satisfies TSMC 300mm Monolithic SOI &amp; Si3N4 design rules. Zero radiation loss, no evanescent crosstalk violation, and safe PCM enclosure margins verified.
                </div>

                <div className="space-y-2">
                  <div className="text-slate-400 text-[11px] font-bold">FOUNDRY SIGN-OFF TOKEN &amp; HASH:</div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-cyan-300 font-bold text-[11px]">
                    <code>TSMC-OIP-PHOX300-SIGNOFF-KIMI-K3-8F42A9B1D50E</code>
                    <button
                      onClick={handleCopySignoffHash}
                      className="text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedHash ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <div className="p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-500">Sign-Off Date:</span>
                    <div className="font-bold text-white">{lastScanTimestamp}</div>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-500">Mask Format:</span>
                    <div className="font-bold text-white">OASIS / GDSII v7.0</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 leading-relaxed">
                  <strong>FOUNDRY SIGNOFF REJECTED.</strong> Fatal optical layout violations detected in layer <code>{activeViolationPreset?.category}</code>. Photomask reticle fabrication cannot proceed due to severe physical failure risk.
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1 text-[11px]">
                  <div className="text-rose-400 font-bold">Blocker Cause:</div>
                  <div className="text-slate-300">{activeViolationPreset?.tapeoutBlockerReason}</div>
                  <div className="text-slate-500 mt-1">Coordinate: {activeViolationPreset?.coordinate}</div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowSignoffModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                Close
              </button>
              <button
                onClick={handleDownloadSignoffReport}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Official DRC Report</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
