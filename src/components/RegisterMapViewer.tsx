import React, { useState, useMemo } from 'react';
import { 
  HARDWARE_REGISTERS, 
  HardwareRegister, 
  RegisterBitfield 
} from '../data/hardwareRegisterMap';
import { 
  Cpu, 
  Terminal, 
  Layers, 
  Search, 
  ArrowRight, 
  Play, 
  RotateCcw, 
  Copy, 
  Check, 
  Sliders, 
  ShieldCheck, 
  FileCode, 
  CheckCircle2, 
  HelpCircle,
  Hash,
  Database
} from 'lucide-react';

interface SimulatedRegState {
  [offsetHex: string]: number;
}

interface MmioLog {
  id: string;
  time: string;
  type: 'READ' | 'WRITE';
  offset: string;
  regName: string;
  valueHex: string;
  decodedMeaning: string;
}

export const RegisterMapViewer: React.FC = () => {
  const [selectedRegOffset, setSelectedRegOffset] = useState<string>('0x0024');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Offset calculator interactive input
  const [calcInputHex, setCalcInputHex] = useState<string>('0x0024');

  // Simulated Register Values in Hardware
  const [regValues, setRegValues] = useState<SimulatedRegState>(() => {
    const init: SimulatedRegState = {};
    HARDWARE_REGISTERS.forEach(reg => {
      init[reg.offsetHex] = reg.resetU32;
    });
    return init;
  });

  // Simulated MMIO Transaction Log
  const [mmioLogs, setMmioLogs] = useState<MmioLog[]>([
    {
      id: 'log-1',
      time: '0.00124s',
      type: 'READ',
      offset: '0x0000',
      regName: 'PAU_MAGIC_SIGNATURE',
      valueHex: '0x4B335041',
      decodedMeaning: 'Kernel probe verified ASCII "K3PA"'
    },
    {
      id: 'log-2',
      time: '0.00281s',
      type: 'WRITE',
      offset: '0x0020',
      regName: 'PAU_THERMAL_PLL_CTRL',
      valueHex: '0x00000001',
      decodedMeaning: 'Micro-heater closed-loop PLL tracking enabled'
    },
    {
      id: 'log-3',
      time: '0.00419s',
      type: 'READ',
      offset: '0x0024',
      regName: 'PAU_THERMAL_PLL_STATUS',
      valueHex: '0x00003303',
      decodedMeaning: 'PLL_LOCKED=1, PHASE_MARGIN_OK=1, PWM_DUTY=20%'
    }
  ]);

  const categories = [
    'All',
    'System & IRQ',
    'Optical Laser Comb',
    'Thermal PLL & Heaters',
    'PCM Weight Array',
    'GEMM & Doorbell',
    'Analog Telemetry'
  ];

  const filteredRegisters = useMemo(() => {
    return HARDWARE_REGISTERS.filter(reg => {
      const matchCat = activeCategory === 'All' || reg.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || 
        reg.name.toLowerCase().includes(q) || 
        reg.offsetHex.toLowerCase().includes(q) ||
        reg.description.toLowerCase().includes(q) ||
        `mmio_regs_[${reg.indexU32}]`.includes(q);
      return matchCat && matchQuery;
    });
  }, [activeCategory, searchQuery]);

  const activeRegister: HardwareRegister = 
    HARDWARE_REGISTERS.find(r => r.offsetHex === selectedRegOffset) || HARDWARE_REGISTERS[0];

  const currentU32Value = regValues[activeRegister.offsetHex] ?? activeRegister.resetU32;

  // Toggle single bit in the 32-bit register
  const handleToggleBit = (bitIndex: number) => {
    const mask = (1 << bitIndex) >>> 0;
    const newVal = ((currentU32Value ^ mask) >>> 0);
    setRegValues(prev => ({
      ...prev,
      [activeRegister.offsetHex]: newVal
    }));

    // Log the write operation
    const hexStr = '0x' + newVal.toString(16).toUpperCase().padStart(8, '0');
    addMmioLog('WRITE', activeRegister.offsetHex, activeRegister.name, hexStr, `Toggled bit [${bitIndex}] -> ${Boolean(newVal & mask) ? '1' : '0'}`);
  };

  const handleSimulateRead = (reg: HardwareRegister) => {
    const val = regValues[reg.offsetHex] ?? reg.resetU32;
    const hexStr = '0x' + (val >>> 0).toString(16).toUpperCase().padStart(8, '0');
    addMmioLog('READ', reg.offsetHex, reg.name, hexStr, `Host C++ MMIO read returned ${hexStr}`);
  };

  const handleSimulateWriteDoorbell = () => {
    addMmioLog('WRITE', '0x0050', 'PAU_DOORBELL_START', '0x00000001', 'Fired 56 Gbaud PAM4 optical wavefront through non-volatile matrix');
    // Simulate optical completion interrupt
    setTimeout(() => {
      setRegValues(prev => ({
        ...prev,
        '0x0008': (prev['0x0008'] || 0) | 0x01
      }));
      addMmioLog('READ', '0x0008', 'PAU_IRQ_STATUS', '0x00000001', 'HARDWARE MSI-X IRQ: Optical GEMM Complete (0.14 ns propagation)');
    }, 400);
  };

  const handleResetRegs = () => {
    const reset: SimulatedRegState = {};
    HARDWARE_REGISTERS.forEach(r => {
      reset[r.offsetHex] = r.resetU32;
    });
    setRegValues(reset);
    addMmioLog('WRITE', '0x0000', 'ALL_REGISTERS', '0x00000000', 'Hardware reset assertion: all MMIO registers restored to default values');
  };

  const addMmioLog = (type: 'READ' | 'WRITE', offset: string, regName: string, valueHex: string, decodedMeaning: string) => {
    const newLog: MmioLog = {
      id: 'log-' + Math.random().toString(36).substring(2, 9),
      time: '+' + (Math.random() * 0.005 + 0.001).toFixed(5) + 's',
      type,
      offset,
      regName,
      valueHex,
      decodedMeaning
    };
    setMmioLogs(prev => [newLog, ...prev.slice(0, 19)]);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Convert current register value to 32 binary bits array [31..0]
  const bitsArray = useMemo(() => {
    const arr: number[] = [];
    for (let i = 31; i >= 0; i--) {
      arr.push((currentU32Value >> i) & 1);
    }
    return arr;
  }, [currentU32Value]);

  // Offset calculator helper
  const parsedCalcOffset = useMemo(() => {
    let clean = calcInputHex.trim().toLowerCase();
    if (clean.startsWith('0x')) clean = clean.substring(2);
    const dec = parseInt(clean, 16);
    if (isNaN(dec)) return null;
    return {
      hex: '0x' + dec.toString(16).toUpperCase().padStart(4, '0'),
      dec,
      u32Index: Math.floor(dec / 4),
      remainderBytes: dec % 4,
      cacheline: Math.floor(dec / 64),
      cachelineOffset: dec % 64,
      matchingReg: HARDWARE_REGISTERS.find(r => r.offsetDec === dec)
    };
  }, [calcInputHex]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
              PCIe BAR0 &amp; CXL 3.1 Hardware Register Map
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
            <span>Base: <code className="text-cyan-300">0xFFFF_8000_1234_0000</code></span>
            <span>Range: <code className="text-purple-300">1 MB (BAR0)</code></span>
            <span>Alignment: <code className="text-emerald-300">32-bit (4-byte)</code></span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white font-mono flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              C++ Kernel MMIO Offset Visualizer
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-4xl leading-relaxed">
              Maps high-level C++ HAL pointers (<code className="text-cyan-300 font-mono">mmio_regs_[offset / 4]</code>) and Linux Kernel calls (<code className="text-emerald-300 font-mono">ioread32(bar0 + offset)</code>) directly to hardware AXI4-Lite registers in the Kimi K3 optical matrix core.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSimulateWriteDoorbell}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-xs font-mono flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer transition-all"
              title="Trigger optical GEMM doorbell write"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Trigger Doorbell MMIO
            </button>
            <button
              onClick={handleResetRegs}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
              title="Reset all registers to silicon default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>

        {/* Visual Memory Ribbon */}
        <div className="pt-2 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>BAR0 Memory Layout (0x0000 - 0x00A0)</span>
            <span className="text-slate-500">Click any block to inspect register</span>
          </div>
          <div className="h-6 w-full bg-slate-950 rounded-lg p-1 border border-slate-800 flex gap-1 overflow-x-auto scrollbar-none">
            {HARDWARE_REGISTERS.map((reg) => {
              const isSelected = reg.offsetHex === selectedRegOffset;
              const colorClass = 
                reg.category === 'System & IRQ' ? 'bg-blue-600/60 hover:bg-blue-500 border-blue-400' :
                reg.category === 'Optical Laser Comb' ? 'bg-amber-600/60 hover:bg-amber-500 border-amber-400' :
                reg.category === 'Thermal PLL & Heaters' ? 'bg-emerald-600/60 hover:bg-emerald-500 border-emerald-400' :
                reg.category === 'PCM Weight Array' ? 'bg-purple-600/60 hover:bg-purple-500 border-purple-400' :
                reg.category === 'GEMM & Doorbell' ? 'bg-rose-600/60 hover:bg-rose-500 border-rose-400' :
                'bg-cyan-600/60 hover:bg-cyan-500 border-cyan-400';

              return (
                <button
                  key={reg.offsetHex}
                  onClick={() => setSelectedRegOffset(reg.offsetHex)}
                  title={`${reg.offsetHex}: ${reg.name} (${reg.category})`}
                  className={`h-full flex-1 min-w-[24px] rounded transition-all flex items-center justify-center text-[9px] font-mono text-white ${colorClass} ${
                    isSelected ? 'ring-2 ring-white font-bold' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  {reg.offsetHex.substring(2)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout: Register Explorer & Live Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Register Table & Filters (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search register by name, offset, or C++ index..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <span className="text-xs font-mono text-slate-400 shrink-0">
              Showing {filteredRegisters.length} / {HARDWARE_REGISTERS.length} Registers
            </span>
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

          {/* Registers Table */}
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto rounded-xl border border-slate-800/80 scrollbar-thin scrollbar-thumb-slate-800">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900 text-slate-400 text-[11px] uppercase tracking-wider sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Byte Offset</th>
                  <th className="py-2.5 px-2">C++ Index</th>
                  <th className="py-2.5 px-3">Register Name</th>
                  <th className="py-2.5 px-2">Access</th>
                  <th className="py-2.5 px-3">Value</th>
                  <th className="py-2.5 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRegisters.map((reg) => {
                  const isSelected = reg.offsetHex === selectedRegOffset;
                  const currentVal = regValues[reg.offsetHex] ?? reg.resetU32;
                  const currentHex = '0x' + (currentVal >>> 0).toString(16).toUpperCase().padStart(8, '0');

                  const accessBadgeClass = 
                    reg.access === 'RO' ? 'bg-blue-950 text-blue-400 border-blue-800' :
                    reg.access === 'RW' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
                    reg.access === 'WO' ? 'bg-amber-950 text-amber-400 border-amber-800' :
                    'bg-purple-950 text-purple-400 border-purple-800';

                  return (
                    <tr
                      key={reg.offsetHex}
                      onClick={() => setSelectedRegOffset(reg.offsetHex)}
                      className={`cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-cyan-950/40 text-white font-semibold' 
                          : 'hover:bg-slate-900/80 text-slate-300'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-bold text-cyan-400">
                        {reg.offsetHex}
                      </td>
                      <td className="py-2.5 px-2 text-slate-400">
                        [{reg.indexU32}]
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col">
                          <span className={`${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                            {reg.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal truncate max-w-xs">
                            {reg.category}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] border ${accessBadgeClass}`}>
                          {reg.access}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {currentHex}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSimulateRead(reg);
                            setSelectedRegOffset(reg.offsetHex);
                          }}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] border border-slate-700 transition-all cursor-pointer"
                          title="Simulate C++ Read"
                        >
                          Read
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Interactive C++ Offset & Cacheline Calculator Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-300 font-bold border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1.5">
                <Hash className="w-4 h-4 text-cyan-400" />
                Memory Offset &amp; C++ Index Calculator
              </span>
              <span className="text-[11px] text-slate-500 font-normal">Byte Offset ↔ Pointer Arithmetic</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-slate-400 text-[11px]">Byte Offset:</span>
                <input
                  type="text"
                  value={calcInputHex}
                  onChange={(e) => setCalcInputHex(e.target.value)}
                  placeholder="e.g. 0x0024"
                  className="w-28 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-cyan-300 text-xs font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              {parsedCalcOffset ? (
                <div className="flex-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                  <span className="p-1.5 bg-slate-950 rounded border border-slate-800">
                    Decimal: <strong className="text-emerald-400">{parsedCalcOffset.dec}</strong>
                  </span>
                  <span className="p-1.5 bg-slate-950 rounded border border-slate-800">
                    <code className="text-cyan-300">mmio_regs_[{parsedCalcOffset.u32Index}]</code>
                  </span>
                  <span className="p-1.5 bg-slate-950 rounded border border-slate-800">
                    Cacheline: <strong className="text-purple-400">#{parsedCalcOffset.cacheline}</strong> (Byte +{parsedCalcOffset.cachelineOffset})
                  </span>
                  {parsedCalcOffset.matchingReg && (
                    <button
                      onClick={() => setSelectedRegOffset(parsedCalcOffset.matchingReg!.offsetHex)}
                      className="px-2 py-1 bg-cyan-950 text-cyan-300 rounded border border-cyan-700 hover:bg-cyan-900 transition-all"
                    >
                      Inspect {parsedCalcOffset.matchingReg.name}
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-rose-400 text-xs">Invalid hex offset</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Register Bitfield & Driver Code Mapping (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Register Inspector Header */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    {activeRegister.offsetHex}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    Index [{activeRegister.indexU32}]
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {activeRegister.access}
                  </span>
                </div>
                <h4 className="text-base font-bold text-white font-mono mt-1">
                  {activeRegister.name}
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {activeRegister.description}
                </p>
              </div>

              <button
                onClick={() => handleSimulateRead(activeRegister)}
                className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                title="Execute read from this register"
              >
                <Terminal className="w-3.5 h-3.5" />
                Read
              </button>
            </div>

            {/* Live Register Value Inspector (Hex / Dec / Binary) */}
            <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>SIMULATED HARDWARE VALUE:</span>
                <span className="text-slate-500 text-[11px]">Click bits below to toggle</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-500">HEX</div>
                  <div className="text-xs font-bold text-cyan-300 mt-0.5 truncate">
                    0x{(currentU32Value >>> 0).toString(16).toUpperCase().padStart(8, '0')}
                  </div>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-500">DECIMAL</div>
                  <div className="text-xs font-bold text-emerald-300 mt-0.5 truncate">
                    {currentU32Value >>> 0}
                  </div>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-500">RESET VALUE</div>
                  <div className="text-xs font-bold text-slate-400 mt-0.5 truncate">
                    {activeRegister.resetVal}
                  </div>
                </div>
              </div>

              {/* 32-Bit Interactive Bitfield Grid */}
              <div className="pt-2 space-y-1.5">
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Bit 31 (MSB)</span>
                  <span>Bit 16</span>
                  <span>Bit 0 (LSB)</span>
                </div>
                <div className="grid grid-cols-16 gap-1 p-2 bg-slate-950 rounded-lg border border-slate-800">
                  {bitsArray.map((bitVal, idx) => {
                    const bitIndex = 31 - idx;
                    const isHigh = bitVal === 1;
                    return (
                      <button
                        key={bitIndex}
                        onClick={() => handleToggleBit(bitIndex)}
                        title={`Bit [${bitIndex}]: ${isHigh ? '1' : '0'} (Click to toggle)`}
                        className={`h-7 rounded flex flex-col items-center justify-center transition-all cursor-pointer ${
                          isHigh 
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/50' 
                            : 'bg-slate-900 text-slate-500 hover:bg-slate-800'
                        }`}
                      >
                        <span className="text-[9px] leading-none">{isHigh ? '1' : '0'}</span>
                        <span className="text-[7px] text-slate-400 leading-none mt-0.5">{bitIndex}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bitfield Breakdown Table */}
            <div className="space-y-2">
              <div className="text-xs font-mono font-bold text-slate-300 flex items-center justify-between">
                <span>Bitfield Definitions [31:0]</span>
                <span className="text-[11px] text-slate-500 font-normal">
                  {activeRegister.bitfields.length} Sub-field{activeRegister.bitfields.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-1.5">
                {activeRegister.bitfields.map((bf, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800/80 flex flex-col gap-1 text-xs font-mono"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-400 font-bold">{bf.bits}</span>
                        <span className="text-white font-semibold">{bf.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {bf.access}
                        </span>
                        <span className="text-slate-500">Reset: {bf.reset}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {bf.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Driver Code Cross-Reference */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="text-xs font-mono font-bold text-slate-300 flex items-center justify-between">
                <span>Hardware &amp; Driver Cross-References</span>
                <span className="text-[10px] text-emerald-400">Zero-Overhead MMIO</span>
              </div>

              {/* C++ HAL Access */}
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="text-cyan-400 font-bold">1. C++ Userspace Driver (HAL)</span>
                  <button 
                    onClick={() => handleCopy(activeRegister.cppDriverSnippet)}
                    className="text-slate-400 hover:text-white"
                  >
                    {copiedText === activeRegister.cppDriverSnippet ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <pre className="text-[11px] text-slate-200 font-mono overflow-x-auto whitespace-pre">
                  {activeRegister.cppDriverSnippet}
                </pre>
              </div>

              {/* Linux Kernel Access */}
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="text-emerald-400 font-bold">2. Linux Kernel Driver (PCIe BAR0)</span>
                  <button 
                    onClick={() => handleCopy(activeRegister.kernelCSnippet)}
                    className="text-slate-400 hover:text-white"
                  >
                    {copiedText === activeRegister.kernelCSnippet ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <pre className="text-[11px] text-slate-200 font-mono overflow-x-auto whitespace-pre">
                  {activeRegister.kernelCSnippet}
                </pre>
              </div>

              {/* Verilog RTL Decoder */}
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="text-purple-400 font-bold">3. Verilog RTL AXI-Lite Decoder</span>
                  <button 
                    onClick={() => handleCopy(activeRegister.verilogSnippet)}
                    className="text-slate-400 hover:text-white"
                  >
                    {copiedText === activeRegister.verilogSnippet ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <pre className="text-[11px] text-slate-200 font-mono overflow-x-auto whitespace-pre">
                  {activeRegister.verilogSnippet}
                </pre>
              </div>
            </div>
          </div>

          {/* Live PCIe & CXL MMIO Transaction Log */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white">PCIe / CXL MMIO Bus Trace</span>
              </div>
              <span className="text-[11px] text-slate-500">Sub-10ns MMIO Post</span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
              {mmioLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2 rounded bg-slate-900/80 border border-slate-800/80 flex flex-col gap-0.5 text-[11px]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-1 rounded text-[9px] font-bold ${
                        log.type === 'READ' ? 'bg-blue-950 text-blue-400' : 'bg-emerald-950 text-emerald-400'
                      }`}>
                        {log.type}
                      </span>
                      <span className="text-cyan-300">{log.offset}</span>
                      <span className="text-slate-300 font-bold">{log.regName}</span>
                    </div>
                    <span className="text-slate-500 text-[10px]">{log.time}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 text-[10px]">
                    <span className="text-purple-300">{log.valueHex}</span>
                    <span className="truncate max-w-xs">{log.decodedMeaning}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
