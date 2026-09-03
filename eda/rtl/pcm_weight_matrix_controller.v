// =============================================================================
// Project: Kimi-PAU K3-X1 Silicon Photonics Acceleration Unit
// Module:  pcm_weight_matrix_controller
// File:    pcm_weight_matrix_controller.v
// Purpose: Hardware finite state machine controlling non-volatile electro-thermal
//          programming of Antimony Selenide (Sb2Se3) optical phase-change weight cells.
// Target:  TSMC 300mm Monolithic SOI + Low-Loss Si3N4 Photonic PDK
// =============================================================================

`timescale 1ps / 1fs

module pcm_weight_matrix_controller #(
    parameter integer MATRIX_DIM = 64,
    parameter integer DATA_WIDTH = 8
)(
    input  wire                   clk,
    input  wire                   rst_n,

    // Host Programming Request
    input  wire                   prog_en,
    input  wire                   prog_req,
    input  wire [5:0]             prog_target_row,
    input  wire [5:0]             prog_target_col,
    input  wire [DATA_WIDTH-1:0]  prog_target_val, // 0 = fully amorphized (transparent), 255 = fully crystalline

    // Analog Electro-Thermal Pulse Driver Control Bus
    output reg  [5:0]             pcm_row_addr,
    output reg  [5:0]             pcm_col_addr,
    output reg                    pcm_pulse_trig,
    output reg  [1:0]             pcm_pulse_mode,         // 00: IDLE, 01: Crystallize, 10: Amorphize, 11: Optical Read/Verify
    output reg  [11:0]            pcm_pulse_amplitude_mv, // 0 to 1800 mV DAC setpoint
    output reg  [15:0]            pcm_pulse_duration_ps,  // Pulse width in picoseconds
    output wire                   pcm_busy,
    output reg                    pcm_write_done,
    input  wire [DATA_WIDTH-1:0]  pcm_verify_adc_val      // Optical transmission level from Photodiode ADC
);

    // -------------------------------------------------------------------------
    // FSM States
    // -------------------------------------------------------------------------
    localparam [2:0]
        STATE_IDLE          = 3'b000,
        STATE_READ_INITIAL  = 3'b001,
        STATE_PULSE_GEN     = 3'b010,
        STATE_THERMAL_COOL  = 3'b011,
        STATE_READ_VERIFY   = 3'b100,
        STATE_DONE          = 3'b101,
        STATE_ERROR         = 3'b110;

    reg [2:0] state, state_next;
    reg [7:0] retry_count;
    reg [15:0] cool_down_timer;

    localparam integer MAX_RETRIES = 5;
    localparam integer COOL_DOWN_CYCLES = 64; // Guard time between laser/thermal pulses

    assign pcm_busy = (state != STATE_IDLE);

    // -------------------------------------------------------------------------
    // FSM State Register
    // -------------------------------------------------------------------------
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            state           <= STATE_IDLE;
            pcm_row_addr    <= 6'd0;
            pcm_col_addr    <= 6'd0;
            retry_count     <= 8'd0;
            cool_down_timer <= 16'd0;
        end else begin
            state <= state_next;

            if (state == STATE_IDLE && prog_req && prog_en) begin
                pcm_row_addr <= prog_target_row;
                pcm_col_addr <= prog_target_col;
                retry_count  <= 8'd0;
            end else if (state == STATE_READ_VERIFY && state_next == STATE_PULSE_GEN) begin
                retry_count <= retry_count + 1'b1;
            end

            if (state == STATE_THERMAL_COOL) begin
                cool_down_timer <= cool_down_timer + 1'b1;
            end else begin
                cool_down_timer <= 16'd0;
            end
        end
    end

    // -------------------------------------------------------------------------
    // Next-State Logic & Electro-Thermal Pulse Generation
    // -------------------------------------------------------------------------
    always @(*) begin
        state_next              = state;
        pcm_pulse_trig          = 1'b0;
        pcm_pulse_mode          = 2'b00;
        pcm_pulse_amplitude_mv  = 12'd0;
        pcm_pulse_duration_ps   = 16'd0;
        pcm_write_done          = 1'b0;

        case (state)
            STATE_IDLE: begin
                if (prog_en && prog_req) begin
                    state_next = STATE_READ_INITIAL;
                end
            end

            // Optical Read-Verify before pulsing to check if value already matches
            STATE_READ_INITIAL: begin
                pcm_pulse_mode          = 2'b11; // Verify mode
                pcm_pulse_amplitude_mv  = 12'd200; // Low read probe power
                pcm_pulse_duration_ps   = 16'd2000;
                pcm_pulse_trig          = 1'b1;
                
                // If close enough to target, finish immediately
                if (pcm_verify_adc_val >= (prog_target_val - 2) && 
                    pcm_verify_adc_val <= (prog_target_val + 2)) begin
                    state_next = STATE_DONE;
                end else begin
                    state_next = STATE_PULSE_GEN;
                end
            end

            // Generate precise electro-thermal annealing / amorphizing pulse
            STATE_PULSE_GEN: begin
                pcm_pulse_trig = 1'b1;

                if (prog_target_val < pcm_verify_adc_val) begin
                    // Target is more amorphous: Melt-quench pulse (High amplitude, ultra-short ~500 ps)
                    pcm_pulse_mode          = 2'b10; // Amorphize
                    pcm_pulse_amplitude_mv  = 12'd1650; // 1.65 V exceeds Sb2Se3 melting point Tm (885 K)
                    pcm_pulse_duration_ps   = 16'd800;  // 800 ps quick quench into glassy phase
                end else begin
                    // Target is more crystalline: Anneal pulse (Moderate amplitude, longer ~20 ns)
                    pcm_pulse_mode          = 2'b01; // Crystallize
                    pcm_pulse_amplitude_mv  = 12'd980;  // 0.98 V warms between Tg (473 K) and Tm
                    pcm_pulse_duration_ps   = 16'd25000; // 25 ns thermal incubation
                end

                state_next = STATE_THERMAL_COOL;
            end

            // Wait for waveguide & PCM thermal equilibrium
            STATE_THERMAL_COOL: begin
                if (cool_down_timer >= COOL_DOWN_CYCLES) begin
                    state_next = STATE_READ_VERIFY;
                end
            end

            // Read-Verify check with ADC feedback
            STATE_READ_VERIFY: begin
                pcm_pulse_mode          = 2'b11;
                pcm_pulse_amplitude_mv  = 12'd200;
                pcm_pulse_duration_ps   = 16'd2000;
                pcm_pulse_trig          = 1'b1;

                if (pcm_verify_adc_val >= (prog_target_val - 4) && 
                    pcm_verify_adc_val <= (prog_target_val + 4)) begin
                    state_next = STATE_DONE;
                end else if (retry_count >= MAX_RETRIES) begin
                    state_next = STATE_ERROR;
                end else begin
                    state_next = STATE_PULSE_GEN;
                end
            end

            STATE_DONE: begin
                pcm_write_done = 1'b1;
                if (!prog_req) state_next = STATE_IDLE;
            end

            STATE_ERROR: begin
                pcm_write_done = 1'b0;
                if (!prog_req) state_next = STATE_IDLE;
            end

            default: state_next = STATE_IDLE;
        endcase
    end

endmodule
