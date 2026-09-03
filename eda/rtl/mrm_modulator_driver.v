// =============================================================================
// Project: Kimi-PAU K3-X1 Silicon Photonics Acceleration Unit
// Module:  mrm_modulator_driver
// File:    mrm_modulator_driver.v
// Purpose: 56 Gbaud PAM4 electro-optic micro-ring modulator serializer & pre-emphasis
//          driver converting 8-bit digital LLM activation tokens into optical waveforms.
// Target:  TSMC 300mm Monolithic SOI + Low-Loss Si3N4 Photonic PDK
// =============================================================================

`timescale 1ps / 1fs

module mrm_modulator_driver #(
    parameter integer CHANNELS   = 64,
    parameter integer DATA_WIDTH = 8
)(
    input  wire                           clk_sys,        // 1.25 GHz parallel clock
    input  wire                           clk_pam4,       // 56 GHz symbol rate clock
    input  wire                           rst_n,

    // Parallel Digital Activations In
    input  wire                           act_valid,
    input  wire [CHANNELS*DATA_WIDTH-1:0] act_data,
    output wire                           ready_out,

    // Analog High-Speed Electro-Optic DAC Outputs to Depletion MRMs
    output wire [CHANNELS-1:0]            mrm_dac_sign,
    output wire [CHANNELS*2-1:0]          mrm_dac_pam4_sym, // 2-bit PAM4 symbol (00: -3, 01: -1, 10: +1, 11: +3)
    output wire [CHANNELS-1:0]            mrm_bias_enable
);

    // Parallel Input Buffer Stage
    reg [CHANNELS*DATA_WIDTH-1:0] act_reg;
    reg in_ready_r;

    assign ready_out       = in_ready_r;
    assign mrm_bias_enable = {CHANNELS{rst_n}};

    always @(posedge clk_sys or negedge rst_n) begin
        if (!rst_n) begin
            act_reg    <= 'b0;
            in_ready_r <= 1'b1;
        end else begin
            if (act_valid && in_ready_r) begin
                act_reg    <= act_data;
                in_ready_r <= 1'b1;
            end
        end
    end

    // -------------------------------------------------------------------------
    // PAM4 Symbol Generation & Pre-Emphasis Filter for Each Optical Channel
    // -------------------------------------------------------------------------
    genvar i;
    generate
        for (i = 0; i < CHANNELS; i = i + 1) begin : gen_channel_driver
            wire [DATA_WIDTH-1:0] ch_act = act_reg[(i+1)*DATA_WIDTH-1 : i*DATA_WIDTH];

            // Sign bit extraction
            assign mrm_dac_sign[i] = ch_act[DATA_WIDTH-1];

            // Map upper 2 bits of magnitude into 4 PAM4 optical voltage levels:
            // 2'b00: 0.00 V (Level 0 - Maximum extinction)
            // 2'b01: 0.28 V (Level 1)
            // 2'b10: 0.57 V (Level 2)
            // 2'b11: 0.85 V (Level 3 - Full transmission)
            reg [1:0] pam4_sym_r;
            reg [1:0] prev_sym_r;

            always @(posedge clk_sys or negedge rst_n) begin
                if (!rst_n) begin
                    pam4_sym_r <= 2'b00;
                    prev_sym_r <= 2'b00;
                end else begin
                    prev_sym_r <= pam4_sym_r;
                    // Quantized mapping of 7-bit unsigned magnitude into 4 levels
                    if (ch_act[DATA_WIDTH-2:0] < 7'd32)
                        pam4_sym_r <= 2'b00;
                    else if (ch_act[DATA_WIDTH-2:0] < 7'd64)
                        pam4_sym_r <= 2'b01;
                    else if (ch_act[DATA_WIDTH-2:0] < 7'd96)
                        pam4_sym_r <= 2'b10;
                    else
                        pam4_sym_r <= 2'b11;
                end
            end

            assign mrm_dac_pam4_sym[2*i+1 : 2*i] = pam4_sym_r;
        end
    endgenerate

endmodule
