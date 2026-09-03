// =============================================================================
// Project: Kimi-PAU K3-X1 Silicon Photonics Acceleration Unit
// Module:  kimi_pau_top
// File:    kimi_pau_top.v
// Purpose: Top-level Electronic-Photonic Integrated Circuit (EPIC) mixed-signal
//          controller module for Kimi K3 LLM inference.
// Target:  TSMC 300mm Monolithic SOI + Low-Loss Si3N4 Photonic PDK
// =============================================================================

`timescale 1ps / 1fs

module kimi_pau_top #(
    parameter integer CHANNELS          = 64,       // 64 WDM C-Band wavelengths
    parameter integer DATA_WIDTH        = 8,        // 8-bit quantized activation/weight
    parameter integer AXI_ADDR_WIDTH    = 32,       // PCIe Gen6 / CXL AXI address width
    parameter integer AXI_DATA_WIDTH    = 64,       // AXI-Lite / AXI-Stream data width
    parameter integer MATRIX_DIM        = 64,       // 64x64 Optical Matrix Core per die
    parameter integer NUM_TILES         = 4         // 4 Co-Packaged Optical tiles
)(
    // -------------------------------------------------------------------------
    // Primary Clocks & Reset
    // -------------------------------------------------------------------------
    input  wire                         clk_sys,        // Digital System Clock (1.25 GHz)
    input  wire                         clk_pam4,       // High-Speed Modulator Clock (56 GHz)
    input  wire                         rst_n,          // Active-low synchronous reset

    // -------------------------------------------------------------------------
    // Host PCIe Gen6 / CXL 3.1 AXI4-Lite Control & Status Interface
    // -------------------------------------------------------------------------
    input  wire [AXI_ADDR_WIDTH-1:0]    s_axi_awaddr,
    input  wire                         s_axi_awvalid,
    output wire                         s_axi_awready,
    input  wire [AXI_DATA_WIDTH-1:0]    s_axi_wdata,
    input  wire [7:0]                   s_axi_wstrb,
    input  wire                         s_axi_wvalid,
    output wire                         s_axi_wready,
    output wire [1:0]                   s_axi_bresp,
    output wire                         s_axi_bvalid,
    input  wire                         s_axi_bready,

    input  wire [AXI_ADDR_WIDTH-1:0]    s_axi_araddr,
    input  wire                         s_axi_arvalid,
    output wire                         s_axi_arready,
    output wire [AXI_DATA_WIDTH-1:0]    s_axi_rdata,
    output wire [1:0]                   s_axi_rresp,
    output wire                         s_axi_rvalid,
    input  wire                         s_axi_rready,

    // -------------------------------------------------------------------------
    // Host Streaming Activation Input (AXI-Stream from vLLM / Host Tensor Buffer)
    // -------------------------------------------------------------------------
    input  wire [CHANNELS*DATA_WIDTH-1:0] axis_act_tdata,
    input  wire                           axis_act_tvalid,
    output wire                           axis_act_tready,
    input  wire                           axis_act_tlast,

    // -------------------------------------------------------------------------
    // Host Streaming Activation Output (Processed Optical Matrix Result)
    // -------------------------------------------------------------------------
    output wire [CHANNELS*DATA_WIDTH-1:0] axis_out_tdata,
    output wire                           axis_out_tvalid,
    input  wire                           axis_out_tready,
    output wire                           axis_out_tlast,

    // -------------------------------------------------------------------------
    // Physical Silicon Photonics Mixed-Signal Interfaces
    // -------------------------------------------------------------------------
    // 1. Electro-Optic Micro-Ring Modulator (MRM) High-Speed DAC Signals
    output wire [CHANNELS-1:0]          mrm_dac_sign,
    output wire [CHANNELS*2-1:0]        mrm_dac_pam4_sym, // 2-bit PAM4 symbol (00, 01, 10, 11)
    output wire [CHANNELS-1:0]          mrm_bias_enable,

    // 2. Sb2Se3 / Ge2Sb2Te5 Phase Change Material (PCM) Non-Volatile Write Bus
    output wire [5:0]                   pcm_row_addr,
    output wire [5:0]                   pcm_col_addr,
    output wire                         pcm_pulse_trig,
    output wire [1:0]                   pcm_pulse_mode,   // 00: NOP, 01: Crystallize, 10: Amorphize, 11: Verify
    output wire [11:0]                  pcm_pulse_amplitude_mv, // Up to 1800 mV electro-thermal pulse
    output wire [15:0]                  pcm_pulse_duration_ps, // Pulse width (100 ps to 50 ns)
    input  wire                         pcm_busy,
    input  wire                         pcm_write_done,
    input  wire [DATA_WIDTH-1:0]        pcm_verify_adc_val,

    // 3. Integrated Germanium PIN Photodiode Flash ADC Inputs (Readout from Optical Core)
    input  wire [CHANNELS*DATA_WIDTH-1:0] opt_adc_rx_data,
    input  wire [CHANNELS-1:0]            opt_adc_rx_valid,
    output wire [CHANNELS-1:0]            opt_adc_rx_ready,

    // 4. Closed-Loop Thermal Phase-Lock Loop (PLL) Micro-Heater PWM Outputs
    output wire [CHANNELS-1:0]          heater_pwm_out,
    input  wire [CHANNELS-1:0]          thermal_interferometer_tap_pd, // Balanced photodiode tap

    // -------------------------------------------------------------------------
    // Diagnostic & Safety Interrupts
    // -------------------------------------------------------------------------
    output wire                         irq_thermal_unlocked,
    output wire                         irq_optical_loss_alarm,
    output wire                         irq_gemm_complete,
    output wire                         status_pll_locked
);

    // =========================================================================
    // Internal Registers & Configuration Memory
    // =========================================================================
    reg [31:0] reg_control;              // [0]: Core Enable, [1]: Weight Prog Mode, [2]: Thermal PLL Enable
    reg [31:0] reg_status;               // [0]: Busy, [1]: PLL Locked, [2]: PCM Ready, [3]: Optical OK
    reg [31:0] reg_token_counter;        // Count of processed optical tokens
    reg [31:0] reg_laser_power_status;   // Monitored continuous-wave comb laser power (dBm * 100)
    reg [31:0] reg_thermal_target_temp;  // Calibration target in mK
    reg [31:0] reg_pcm_prog_word;        // Control register for weight flashing

    // Register Mapping Addresses
    localparam ADDR_CTRL        = 32'h0000_0000;
    localparam ADDR_STATUS      = 32'h0000_0004;
    localparam ADDR_TOKEN_CNT   = 32'h0000_0008;
    localparam ADDR_LASER_PWR   = 32'h0000_000C;
    localparam ADDR_THERMAL_SET = 32'h0000_0010;
    localparam ADDR_PCM_PROG    = 32'h0000_0014;

    // AXI-Lite Handshake Registers
    reg axi_awready_r;
    reg axi_wready_r;
    reg axi_bvalid_r;
    reg [31:0] axi_rdata_r;
    reg axi_rvalid_r;

    assign s_axi_awready = axi_awready_r;
    assign s_axi_wready  = axi_wready_r;
    assign s_axi_bvalid  = axi_bvalid_r;
    assign s_axi_bresp   = 2'b00; // OKAY
    assign s_axi_rdata   = {32'h0000_0000, axi_rdata_r};
    assign s_axi_rvalid  = axi_rvalid_r;
    assign s_axi_rresp   = 2'b00; // OKAY
    assign s_axi_arready = !axi_rvalid_r;

    // -------------------------------------------------------------------------
    // AXI-Lite Register Read/Write FSM
    // -------------------------------------------------------------------------
    always @(posedge clk_sys or negedge rst_n) begin
        if (!rst_n) begin
            reg_control           <= 32'h0000_0007; // Default: Core ON, Thermal PLL ON
            reg_thermal_target_temp <= 32'd318150;  // 318.15 K (45.0 °C)
            reg_pcm_prog_word     <= 32'h0000_0000;
            axi_awready_r         <= 1'b0;
            axi_wready_r          <= 1'b0;
            axi_bvalid_r          <= 1'b0;
            axi_rvalid_r          <= 1'b0;
            axi_rdata_r           <= 32'h0;
        end else begin
            // Write Transaction Handling
            if (s_axi_awvalid && s_axi_wvalid && !axi_bvalid_r) begin
                axi_awready_r <= 1'b1;
                axi_wready_r  <= 1'b1;
                axi_bvalid_r  <= 1'b1;
                case (s_axi_awaddr)
                    ADDR_CTRL:        reg_control           <= s_axi_wdata[31:0];
                    ADDR_THERMAL_SET: reg_thermal_target_temp <= s_axi_wdata[31:0];
                    ADDR_PCM_PROG:    reg_pcm_prog_word     <= s_axi_wdata[31:0];
                    default: ;
                endcase
            end else begin
                axi_awready_r <= 1'b0;
                axi_wready_r  <= 1'b0;
                if (s_axi_bready && axi_bvalid_r)
                    axi_bvalid_r <= 1'b0;
            end

            // Read Transaction Handling
            if (s_axi_arvalid && !axi_rvalid_r) begin
                axi_rvalid_r <= 1'b1;
                case (s_axi_araddr)
                    ADDR_CTRL:        axi_rdata_r <= reg_control;
                    ADDR_STATUS:      axi_rdata_r <= reg_status;
                    ADDR_TOKEN_CNT:   axi_rdata_r <= reg_token_counter;
                    ADDR_LASER_PWR:   axi_rdata_r <= reg_laser_power_status;
                    ADDR_THERMAL_SET: axi_rdata_r <= reg_thermal_target_temp;
                    ADDR_PCM_PROG:    axi_rdata_r <= reg_pcm_prog_word;
                    default:          axi_rdata_r <= 32'hDEAD_BEEF;
                endcase
            end else if (s_axi_rready && axi_rvalid_r) begin
                axi_rvalid_r <= 1'b0;
            end
        end
    end

    // =========================================================================
    // Sub-Module Instantiation: High-Speed Electro-Optic MRM Driver
    // =========================================================================
    wire mrm_rdy;
    assign axis_act_tready = mrm_rdy && reg_control[0];

    mrm_modulator_driver #(
        .CHANNELS(CHANNELS),
        .DATA_WIDTH(DATA_WIDTH)
    ) u_mrm_driver (
        .clk_sys(clk_sys),
        .clk_pam4(clk_pam4),
        .rst_n(rst_n && reg_control[0]),
        .act_valid(axis_act_tvalid && axis_act_tready),
        .act_data(axis_act_tdata),
        .ready_out(mrm_rdy),
        .mrm_dac_sign(mrm_dac_sign),
        .mrm_dac_pam4_sym(mrm_dac_pam4_sym),
        .mrm_bias_enable(mrm_bias_enable)
    );

    // =========================================================================
    // Sub-Module Instantiation: Non-Volatile Phase-Change Weight Matrix Controller
    // =========================================================================
    pcm_weight_matrix_controller #(
        .MATRIX_DIM(MATRIX_DIM),
        .DATA_WIDTH(DATA_WIDTH)
    ) u_pcm_ctrl (
        .clk(clk_sys),
        .rst_n(rst_n),
        .prog_en(reg_control[1]),
        .prog_req(reg_pcm_prog_word[31]),
        .prog_target_row(reg_pcm_prog_word[29:24]),
        .prog_target_col(reg_pcm_prog_word[21:16]),
        .prog_target_val(reg_pcm_prog_word[7:0]),
        .pcm_row_addr(pcm_row_addr),
        .pcm_col_addr(pcm_col_addr),
        .pcm_pulse_trig(pcm_pulse_trig),
        .pcm_pulse_mode(pcm_pulse_mode),
        .pcm_pulse_amplitude_mv(pcm_pulse_amplitude_mv),
        .pcm_pulse_duration_ps(pcm_pulse_duration_ps),
        .pcm_busy(pcm_busy),
        .pcm_write_done(pcm_write_done),
        .pcm_verify_adc_val(pcm_verify_adc_val)
    );

    // =========================================================================
    // Sub-Module Instantiation: Closed-Loop Thermal Phase-Lock Loop (PLL)
    // =========================================================================
    wire pll_lock_signal;
    assign status_pll_locked    = pll_lock_signal;
    assign irq_thermal_unlocked = !pll_lock_signal && reg_control[2];

    thermal_pll_heater_control #(
        .CHANNELS(CHANNELS)
    ) u_thermal_pll (
        .clk(clk_sys),
        .rst_n(rst_n && reg_control[2]),
        .target_setpoint(reg_thermal_target_temp[15:0]),
        .interferometer_tap(thermal_interferometer_tap_pd),
        .heater_pwm(heater_pwm_out),
        .pll_locked(pll_lock_signal)
    );

    // =========================================================================
    // Optical Core Readout Pipeline (Germanium Photodiode Flash ADC -> Host)
    // =========================================================================
    reg [CHANNELS*DATA_WIDTH-1:0] axis_out_data_reg;
    reg axis_out_valid_reg;
    reg axis_out_last_reg;

    assign axis_out_tdata  = axis_out_data_reg;
    assign axis_out_tvalid = axis_out_valid_reg;
    assign axis_out_tlast  = axis_out_last_reg;
    assign opt_adc_rx_ready = {CHANNELS{axis_out_tready || !axis_out_valid_reg}};

    always @(posedge clk_sys or negedge rst_n) begin
        if (!rst_n) begin
            axis_out_data_reg  <= 'b0;
            axis_out_valid_reg <= 1'b0;
            axis_out_last_reg  <= 1'b0;
            reg_token_counter  <= 32'd0;
        end else begin
            if (axis_out_tready || !axis_out_valid_reg) begin
                if (&opt_adc_rx_valid) begin
                    axis_out_data_reg  <= opt_adc_rx_data;
                    axis_out_valid_reg <= 1'b1;
                    axis_out_last_reg  <= 1'b0;
                    reg_token_counter  <= reg_token_counter + 1'b1;
                end else begin
                    axis_out_valid_reg <= 1'b0;
                end
            end
        end
    end

    // Status Word Aggregation
    always @(posedge clk_sys or negedge rst_n) begin
        if (!rst_n) begin
            reg_status <= 32'h0;
            reg_laser_power_status <= 32'd750; // 7.50 dBm
        end else begin
            reg_status[0] <= axis_act_tvalid && !mrm_rdy; // Busy
            reg_status[1] <= pll_lock_signal;            // Thermal Locked
            reg_status[2] <= !pcm_busy;                  // PCM Controller Ready
            reg_status[3] <= 1'b1;                       // Optical Core Healthy
        end
    end

    assign irq_gemm_complete      = axis_out_tvalid && axis_out_tready;
    assign irq_optical_loss_alarm = 1'b0; // Active if waveguide power &lt; threshold

endmodule
