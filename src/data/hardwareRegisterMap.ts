export interface RegisterBitfield {
  bits: string; // e.g., "[0]", "[7:1]", "[15:8]"
  name: string;
  access: 'RO' | 'RW' | 'WO' | 'RW1C';
  reset: string;
  description: string;
  enumOptions?: { [value: number]: string };
}

export interface HardwareRegister {
  offsetHex: string; // e.g. "0x0024"
  offsetDec: number; // 36
  indexU32: number;  // 9 (offsetDec / 4)
  name: string;
  category: 'System & IRQ' | 'Optical Laser Comb' | 'Thermal PLL & Heaters' | 'PCM Weight Array' | 'GEMM & Doorbell' | 'Analog Telemetry';
  access: 'RO' | 'RW' | 'WO' | 'RW1C';
  resetVal: string;
  resetU32: number;
  description: string;
  cppDriverSnippet: string;
  kernelCSnippet: string;
  verilogSnippet: string;
  bitfields: RegisterBitfield[];
}

export const HARDWARE_REGISTERS: HardwareRegister[] = [
  {
    offsetHex: '0x0000',
    offsetDec: 0,
    indexU32: 0,
    name: 'PAU_MAGIC_SIGNATURE',
    category: 'System & IRQ',
    access: 'RO',
    resetVal: '0x4B335041',
    resetU32: 0x4B335041,
    description: 'Hardware magic identifier string ASCII "K3PA" (0x4B=\'K\', 0x33=\'3\', 0x50=\'P\', 0x41=\'A\'). Used by kernel probe to verify valid silicon response.',
    cppDriverSnippet: 'uint32_t magic = mmio_regs_[0x00 / 4]; // Must equal 0x4B335041',
    kernelCSnippet: 'u32 magic = ioread32(kdev->bar0 + 0x0000); if (magic != 0x4B335041) return -ENODEV;',
    verilogSnippet: "8'h00: s_axi_rdata <= 32'h4B335041; // \"K3PA\"",
    bitfields: [
      { bits: '[31:0]', name: 'MAGIC', access: 'RO', reset: '0x4B335041', description: 'Constant ASCII signature "K3PA" for Kimi Photonic Accelerator' }
    ]
  },
  {
    offsetHex: '0x0004',
    offsetDec: 4,
    indexU32: 1,
    name: 'PAU_CHIP_REVISION',
    category: 'System & IRQ',
    access: 'RO',
    resetVal: '0x00030100',
    resetU32: 0x00030100,
    description: 'Silicon fabrication tapeout revision: Major=3, Minor=1, Stepping=0 (TSMC 300mm Monolithic SOI + Low-Loss Si3N4).',
    cppDriverSnippet: 'uint32_t rev = mmio_regs_[0x04 / 4]; // 0x00030100 (v3.1.0)',
    kernelCSnippet: 'u32 rev = ioread32(kdev->bar0 + 0x0004);',
    verilogSnippet: "8'h04: s_axi_rdata <= 32'h00030100; // v3.1.0 Tapeout",
    bitfields: [
      { bits: '[31:24]', name: 'RESERVED', access: 'RO', reset: '0x00', description: 'Reserved' },
      { bits: '[23:16]', name: 'MAJOR_REV', access: 'RO', reset: '0x03', description: 'Major Silicon Generation (3 = Kimi K3)' },
      { bits: '[15:8]', name: 'MINOR_REV', access: 'RO', reset: '0x01', description: 'Minor Silicon Revision (1 = Tapeout Release A)' },
      { bits: '[7:0]', name: 'STEPPING', access: 'RO', reset: '0x00', description: 'Engineering stepping number' }
    ]
  },
  {
    offsetHex: '0x0008',
    offsetDec: 8,
    indexU32: 2,
    name: 'PAU_IRQ_STATUS',
    category: 'System & IRQ',
    access: 'RW1C',
    resetVal: '0x00000000',
    resetU32: 0x00000000,
    description: 'Optical and hardware interrupt status register. Write 1 to clear active interrupt bits.',
    cppDriverSnippet: 'uint32_t irq = mmio_regs_[0x08 / 4]; if (irq & 0x1) { /* Optical GEMM Complete */ }',
    kernelCSnippet: 'u32 irq_status = ioread32(kdev->bar0 + 0x0008);',
    verilogSnippet: "8'h08: s_axi_rdata <= {28'h0, pcm_verify_err, thermal_trip, dma_rx_ready, gemm_done};",
    bitfields: [
      { bits: '[0]', name: 'GEMM_DONE', access: 'RW1C', reset: '0', description: 'Optical matrix propagation complete; TIA/ADC output buffers ready' },
      { bits: '[1]', name: 'DMA_RX_READY', access: 'RW1C', reset: '0', description: 'CPO interposer DMA ring has transferred activations to host RAM' },
      { bits: '[2]', name: 'THERMAL_TRIP', access: 'RW1C', reset: '0', description: 'Silicon thermo-optic phase drift exceeded locking margin (>0.05 rad)' },
      { bits: '[3]', name: 'PCM_VERIFY_ERR', access: 'RW1C', reset: '0', description: 'Non-volatile weight transmission error outside ±1.5% tolerance' },
      { bits: '[31:4]', name: 'RESERVED', access: 'RO', reset: '0x0000000', description: 'Reserved' }
    ]
  },
  {
    offsetHex: '0x000C',
    offsetDec: 12,
    indexU32: 3,
    name: 'PAU_IRQ_ACK',
    category: 'System & IRQ',
    access: 'WO',
    resetVal: '0x00000000',
    resetU32: 0x00000000,
    description: 'Interrupt acknowledge register. Writing mask clears corresponding interrupt lines and resets MSI-X vector.',
    cppDriverSnippet: 'mmio_regs_[0x0C / 4] = 0x00000001; // ACK GEMM Done IRQ',
    kernelCSnippet: 'iowrite32(0x01, kdev->bar0 + 0x000C); // Clear IRQ line in ISR',
    verilogSnippet: "8'h0C: if (s_axi_wstrb[0]) irq_reg <= irq_reg & ~s_axi_wdata[3:0];",
    bitfields: [
      { bits: '[3:0]', name: 'IRQ_ACK_MASK', access: 'WO', reset: '0x0', description: 'Bits [3:0] written as 1 will clear the respective pending IRQ flags' },
      { bits: '[31:4]', name: 'RESERVED', access: 'RO', reset: '0x0000000', description: 'Reserved' }
    ]
  },
  {
    offsetHex: '0x0010',
    offsetDec: 16,
    indexU32: 4,
    name: 'PAU_CTRL_LASER',
    category: 'Optical Laser Comb',
    access: 'RW',
    resetVal: '0x00000000',
    resetU32: 0x00000000,
    description: 'Heterogeneous micro-comb laser master power and mode control register.',
    cppDriverSnippet: 'mmio_regs_[0x10 / 4] = 0x00000003; // Enable DFB Comb Laser + 64 WDM Lines',
    kernelCSnippet: 'iowrite32(0x03, kdev->bar0 + 0x0010);',
    verilogSnippet: "8'h10: s_axi_rdata <= {28'h0, laser_low_power, laser_comb_lock, laser_wdm_mode, laser_en};",
    bitfields: [
      { bits: '[0]', name: 'LASER_EN', access: 'RW', reset: '0', description: 'Laser bias current enable (1 = Turn on DFB comb source)' },
      { bits: '[1]', name: 'WDM_64_MODE', access: 'RW', reset: '0', description: '0 = Single carrier 1550.12nm; 1 = Full 64-carrier 100 GHz grid mode' },
      { bits: '[2]', name: 'COMB_LOCK_STATUS', access: 'RO', reset: '0', description: '1 = Soliton micro-comb locked to ITU optical grid' },
      { bits: '[3]', name: 'LOW_POWER_STANDBY', access: 'RW', reset: '0', description: '1 = Throttle laser power during token generation pauses (saves 18W)' },
      { bits: '[31:4]', name: 'RESERVED', access: 'RO', reset: '0x0000000', description: 'Reserved' }
    ]
  },
  {
    offsetHex: '0x0018',
    offsetDec: 24,
    indexU32: 6,
    name: 'PAU_LASER_POWER_DBM',
    category: 'Optical Laser Comb',
    access: 'RW',
    resetVal: '0x000002EE',
    resetU32: 0x000002EE,
    description: 'Target optical continuous-wave (CW) output power per carrier in units of 0.01 dBm (0x2EE = 750 = +7.50 dBm).',
    cppDriverSnippet: 'mmio_regs_[0x18 / 4] = 750; // Set +7.50 dBm per WDM wavelength',
    kernelCSnippet: 'iowrite32(750, kdev->bar0 + 0x0018);',
    verilogSnippet: "8'h18: s_axi_rdata <= {16'h0000, laser_target_power_dbm};",
    bitfields: [
      { bits: '[15:0]', name: 'POWER_CENTIDBM', access: 'RW', reset: '0x02EE', description: 'Optical launch power target in hundredths of a dBm (750 = +7.50 dBm)' },
      { bits: '[31:16]', name: 'RESERVED', access: 'RO', reset: '0x0000', description: 'Reserved' }
    ]
  },
  {
    offsetHex: '0x0020',
    offsetDec: 32,
    indexU32: 8,
    name: 'PAU_THERMAL_PLL_CTRL',
    category: 'Thermal PLL & Heaters',
    access: 'RW',
    resetVal: '0x00000001',
    resetU32: 0x00000001,
    description: 'Closed-loop micro-heater digital PI thermal phase-lock loop control register.',
    cppDriverSnippet: 'mmio_regs_[0x20 / 4] = 0x00000001; // Enable Closed-Loop Micro-Heater PLL',
    kernelCSnippet: 'iowrite32(0x01, kdev->bar0 + 0x0020);',
    verilogSnippet: "8'h20: s_axi_rdata <= {30'h0, pll_auto_dither, pll_enable};",
    bitfields: [
      { bits: '[0]', name: 'PLL_ENABLE', access: 'RW', reset: '1', description: '1 = Enable automatic closed-loop micro-heater PWM tracking' },
      { bits: '[1]', name: 'DITHER_TRACKING', access: 'RW', reset: '0', description: '1 = Enable dither-based phase gradient optimization for MRM resonance' },
      { bits: '[31:2]', name: 'RESERVED', access: 'RO', reset: '0x00000000', description: 'Reserved' }
    ]
  },
  {
    offsetHex: '0x0024',
    offsetDec: 36,
    indexU32: 9,
    name: 'PAU_THERMAL_PLL_STATUS',
    category: 'Thermal PLL & Heaters',
    access: 'RO',
    resetVal: '0x00003303',
    resetU32: 0x00003303,
    description: 'Status of micro-ring heater phase lock, residual phase error, and heater PWM duty cycle.',
    cppDriverSnippet: 'if (mmio_regs_[0x24 / 4] & 0x01) { /* PLL Locked */ }',
    kernelCSnippet: 'u32 pll_status = ioread32(kdev->bar0 + 0x0024); if (pll_status & 0x01) { ... }',
    verilogSnippet: "8'h24: s_axi_rdata <= {16'h0000, heater_pwm_duty, 5'b00000, overtemp, phase_ok, pll_locked};",
    bitfields: [
      { bits: '[0]', name: 'PLL_LOCKED', access: 'RO', reset: '1', description: '1 = Silicon waveguide phase locked within ±0.015 radians of ITU grid' },
      { bits: '[1]', name: 'PHASE_MARGIN_OK', access: 'RO', reset: '1', description: '1 = Phase error below trip threshold (<0.025 rad)' },
      { bits: '[2]', name: 'OVERTEMP_ALARM', access: 'RO', reset: '0', description: '1 = Die temperature exceeds 85°C safety limit' },
      { bits: '[7:3]', name: 'RESERVED', access: 'RO', reset: '0x0', description: 'Reserved' },
      { bits: '[15:8]', name: 'HEATER_PWM_DUTY', access: 'RO', reset: '0x33', description: 'Current micro-heater PWM duty cycle (0x33 = 51 / 255 = 20.0% power)' },
      { bits: '[31:16]', name: 'RESERVED', access: 'RO', reset: '0x0000', description: 'Reserved' }
    ]
  },
  {
    offsetHex: '0x0030',
    offsetDec: 48,
    indexU32: 12,
    name: 'PAU_PCM_MATRIX_ID',
    category: 'PCM Weight Array',
    access: 'RW',
    resetVal: '0x00000064',
    resetU32: 0x00000064,
    description: 'Target non-volatile Sb2Se3 phase-change memory matrix ID to program or verify (e.g. 100 = MoE Router Gate).',
    cppDriverSnippet: 'mmio_regs_[0x30 / 4] = matrix_id; // Set target hardware weight matrix',
    kernelCSnippet: 'iowrite32(matrix_id, kdev->bar0 + 0x0030);',
    verilogSnippet: "8'h30: s_axi_rdata <= pcm_matrix_id_reg;",
    bitfields: [
      { bits: '[15:0]', name: 'MATRIX_ID', access: 'RW', reset: '0x0064', description: 'Matrix identifier (0=Prompt Attention, 100=MoE Router, 200..263=MoE Gate/Up, 400..463=MoE Down)' },
      { bits: '[31:16]', name: 'RESERVED', access: 'RO', reset: '0x0000', description: 'Reserved' }
    ]
  },
  {
    offsetHex: '0x0034',
    offsetDec: 52,
    indexU32: 13,
    name: 'PAU_PCM_CMD_VERIFY',
    category: 'PCM Weight Array',
    access: 'WO',
    resetVal: '0x00000000',
    resetU32: 0x00000000,
    description: 'Trigger low-energy optical test pulse (200 mV) through Sb2Se3 cell matrix to verify multi-level transmission attenuation.',
    cppDriverSnippet: 'mmio_regs_[0x34 / 4] = 0x1; // Trigger optical read-verify test pulse',
    kernelCSnippet: 'iowrite32(0x01, kdev->bar0 + 0x0034);',
    verilogSnippet: "8'h34: if (s_axi_wdata[0]) trigger_pcm_verify <= 1'b1;",
    bitfields: [
      { bits: '[0]', name: 'TRIGGER_VERIFY', access: 'WO', reset: '0', description: 'Write 1 to fire sub-threshold optical pulse and measure optical extinction' },
      { bits: '[31:1]', name: 'RESERVED', access: 'RO', reset: '0x00000000', description: 'Reserved' }
    ]
  },
  {
    offsetHex: '0x0038',
    offsetDec: 56,
    indexU32: 14,
    name: 'PAU_PCM_LOSS_METRIC',
    category: 'PCM Weight Array',
    access: 'RO',
    resetVal: '0x00003778',
    resetU32: 0x00003778,
    description: 'Measured optical attenuation through programmed non-volatile matrix in milli-dB (0x3778 = 14,200 = 14.20 dB dynamic extinction ratio).',
    cppDriverSnippet: 'float loss_db = static_cast<float>(mmio_regs_[0x38 / 4]) / 1000.0f; // 14.200 dB',
    kernelCSnippet: 'u32 loss_milli_db = ioread32(kdev->bar0 + 0x0038);',
    verilogSnippet: "8'h38: s_axi_rdata <= pcm_measured_attenuation_milli_db;",
    bitfields: [
      { bits: '[31:0]', name: 'ATTENUATION_MILLI_DB', access: 'RO', reset: '0x00003778', description: 'Measured optical insertion attenuation in milli-dB (14,200 = 14.2 dB dynamic range across 16 levels)' }
    ]
  },
  {
    offsetHex: '0x0040',
    offsetDec: 64,
    indexU32: 16,
    name: 'PAU_DISPATCH_MATRIX',
    category: 'GEMM & Doorbell',
    access: 'RW',
    resetVal: '0x00000064',
    resetU32: 0x00000064,
    description: 'Selects the active non-volatile weight matrix for the next optical GEMM computation step.',
    cppDriverSnippet: 'mmio_regs_[0x40 / 4] = matrix_id; // Set active weight matrix for forward pass',
    kernelCSnippet: 'iowrite32(matrix_id, kdev->bar0 + 0x0040);',
    verilogSnippet: "8'h40: s_axi_rdata <= gemm_active_matrix_id;",
    bitfields: [
      { bits: '[15:0]', name: 'ACTIVE_MATRIX_ID', access: 'RW', reset: '0x0064', description: 'Target weight matrix slot to optically illuminate' },
      { bits: '[31:16]', name: 'RESERVED', access: 'RO', reset: '0x0000', description: 'Reserved' }
    ]
  },
  {
    offsetHex: '0x0044',
    offsetDec: 68,
    indexU32: 17,
    name: 'PAU_DISPATCH_BATCH',
    category: 'GEMM & Doorbell',
    access: 'RW',
    resetVal: '0x00000010',
    resetU32: 0x00000010,
    description: 'Batch size for the incoming activation tensor (number of parallel token vectors to modulate).',
    cppDriverSnippet: 'mmio_regs_[0x44 / 4] = batch_size; // e.g., 16 tokens',
    kernelCSnippet: 'iowrite32(batch_size, kdev->bar0 + 0x0044);',
    verilogSnippet: "8'h44: s_axi_rdata <= gemm_batch_size;",
    bitfields: [
      { bits: '[15:0]', name: 'BATCH_SIZE', access: 'RW', reset: '0x0010', description: 'Token batch count (1 to 256 parallel tokens in WDM slice)' },
      { bits: '[31:16]', name: 'RESERVED', access: 'RO', reset: '0x0000', description: 'Reserved' }
    ]
  },
  {
    offsetHex: '0x0048',
    offsetDec: 72,
    indexU32: 18,
    name: 'PAU_DISPATCH_DIM_IN',
    category: 'GEMM & Doorbell',
    access: 'RW',
    resetVal: '0x00002000',
    resetU32: 0x00002000,
    description: 'Input feature dimension K for GEMM operation (0x2000 = 8,192 hidden dimension).',
    cppDriverSnippet: 'mmio_regs_[0x48 / 4] = in_features; // 8192',
    kernelCSnippet: 'iowrite32(in_features, kdev->bar0 + 0x0048);',
    verilogSnippet: "8'h48: s_axi_rdata <= gemm_dim_in;",
    bitfields: [
      { bits: '[31:0]', name: 'DIM_IN', access: 'RW', reset: '0x00002000', description: 'Input activation vector length K (default 8,192)' }
    ]
  },
  {
    offsetHex: '0x004C',
    offsetDec: 76,
    indexU32: 19,
    name: 'PAU_DISPATCH_DIM_OUT',
    category: 'GEMM & Doorbell',
    access: 'RW',
    resetVal: '0x00003800',
    resetU32: 0x00003800,
    description: 'Output feature dimension N for GEMM operation (0x3800 = 14,336 intermediate SwiGLU dimension).',
    cppDriverSnippet: 'mmio_regs_[0x4C / 4] = out_features; // 14336',
    kernelCSnippet: 'iowrite32(out_features, kdev->bar0 + 0x004C);',
    verilogSnippet: "8'h4C: s_axi_rdata <= gemm_dim_out;",
    bitfields: [
      { bits: '[31:0]', name: 'DIM_OUT', access: 'RW', reset: '0x00003800', description: 'Output activation projection length N (default 14,336)' }
    ]
  },
  {
    offsetHex: '0x0050',
    offsetDec: 80,
    indexU32: 20,
    name: 'PAU_DOORBELL_START',
    category: 'GEMM & Doorbell',
    access: 'WO',
    resetVal: '0x00000000',
    resetU32: 0x00000000,
    description: 'Hardware doorbell register. Writing 1 triggers 56 Gbaud PAM4 electro-optic DAC modulation and launches light through the non-volatile crossbar.',
    cppDriverSnippet: 'mmio_regs_[0x50 / 4] = 0x1; // Ring hardware optical doorbell (sub-nanosecond GEMM)',
    kernelCSnippet: 'iowrite32(0x01, kdev->bar0 + 0x0050); // Launch optical wavefront',
    verilogSnippet: "8'h50: if (s_axi_wdata[0]) trigger_optical_gemm <= 1'b1;",
    bitfields: [
      { bits: '[0]', name: 'DOORBELL_START', access: 'WO', reset: '0', description: 'Write 1 to trigger optical matrix wavefront propagation' },
      { bits: '[1]', name: 'AUTO_DMA_FORWARD', access: 'WO', reset: '0', description: '1 = Stream ADC outputs straight to PCIe DMA Tx ring upon completion' },
      { bits: '[31:2]', name: 'RESERVED', access: 'RO', reset: '0x00000000', description: 'Reserved' }
    ]
  },
  {
    offsetHex: '0x0080',
    offsetDec: 128,
    indexU32: 32,
    name: 'PAU_TELEMETRY_TEMP',
    category: 'Analog Telemetry',
    access: 'RO',
    resetVal: '0x000001A2',
    resetU32: 0x000001A2,
    description: 'Current on-die optical interposer temperature in tenths of a degree Celsius (0x1A2 = 418 = 41.8°C).',
    cppDriverSnippet: 'float temp_c = static_cast<float>(mmio_regs_[0x80 / 4]) / 10.0f; // 41.8°C',
    kernelCSnippet: 'u32 temp_raw = ioread32(kdev->bar0 + 0x0080);',
    verilogSnippet: "8'h80: s_axi_rdata <= {16'h0000, current_die_temp_deci_c};",
    bitfields: [
      { bits: '[15:0]', name: 'TEMP_DECI_CELSIUS', access: 'RO', reset: '0x01A2', description: 'Die temperature in 0.1°C units (418 = 41.8°C)' },
      { bits: '[31:16]', name: 'RESERVED', access: 'RO', reset: '0x0000', description: 'Reserved' }
    ]
  },
  {
    offsetHex: '0x0084',
    offsetDec: 132,
    indexU32: 33,
    name: 'PAU_TELEMETRY_OSNR',
    category: 'Analog Telemetry',
    access: 'RO',
    resetVal: '0x0000017C',
    resetU32: 0x0000017C,
    description: 'Measured Optical Signal-to-Noise Ratio (OSNR) across the 64 WDM comb channels in 0.1 dB units (0x17C = 380 = 38.0 dB).',
    cppDriverSnippet: 'float osnr_db = static_cast<float>(mmio_regs_[0x84 / 4]) / 10.0f; // 38.0 dB',
    kernelCSnippet: 'u32 osnr_raw = ioread32(kdev->bar0 + 0x0084);',
    verilogSnippet: "8'h84: s_axi_rdata <= {16'h0000, measured_comb_osnr_deci_db};",
    bitfields: [
      { bits: '[15:0]', name: 'OSNR_DECI_DB', access: 'RO', reset: '0x017C', description: 'WDM carrier OSNR in tenths of a dB (380 = 38.0 dB)' },
      { bits: '[31:16]', name: 'RESERVED', access: 'RO', reset: '0x0000', description: 'Reserved' }
    ]
  },
  {
    offsetHex: '0x0090',
    offsetDec: 144,
    indexU32: 36,
    name: 'PAU_TELEMETRY_MAC_OPS',
    category: 'Analog Telemetry',
    access: 'RO',
    resetVal: '0x008CA000',
    resetU32: 0x008CA000,
    description: 'Cumulative optical multiply-accumulate (MAC) operations executed in hardware since boot (0x8CA000 = 9.216 Million MAC operations).',
    cppDriverSnippet: 'uint64_t mac_ops = mmio_regs_[0x90 / 4];',
    kernelCSnippet: 'u32 mac_ops = ioread32(kdev->bar0 + 0x0090);',
    verilogSnippet: "8'h90: s_axi_rdata <= cumulative_optical_mac_counter[31:0];",
    bitfields: [
      { bits: '[31:0]', name: 'CUMULATIVE_MACS', access: 'RO', reset: '0x008CA000', description: 'Hardware 32-bit counter of optical MACs processed at speed-of-light' }
    ]
  }
];
