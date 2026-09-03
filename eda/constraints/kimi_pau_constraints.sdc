# ==============================================================================
# Project: Kimi-PAU K3-X1 Silicon Photonics Acceleration Unit
# File:    kimi_pau_constraints.sdc
# Purpose: Synopsys Design Constraints (SDC) for Electronic-Photonic Synthesis
# Foundry: TSMC 300mm Monolithic SOI / Si3N4 Photonic Co-Integration PDK
# ==============================================================================

# 1. Primary Clock Definitions
create_clock -name clk_sys   -period 0.800 [get_ports clk_sys]   ;# 1.25 GHz System Clock
create_clock -name clk_pam4  -period 0.017857 [get_ports clk_pam4] ;# 56 GHz PAM4 Symbol Clock

# 2. Clock Uncertainty & Jitter (Optical DAC requires sub-picosecond jitter)
set_clock_uncertainty 0.020 [get_clocks clk_sys]
set_clock_uncertainty 0.002 [get_clocks clk_pam4]

set_clock_transition 0.040 [get_clocks clk_sys]
set_clock_transition 0.005 [get_clocks clk_pam4]

# 3. Asynchronous Clock Domains
set_clock_groups -asynchronous \
    -group [get_clocks clk_sys] \
    -group [get_clocks clk_pam4]

# 4. Input / Output Delays (PCIe Gen6 / CXL 3.1 & Photonic Front-End)
set_input_delay  -clock clk_sys -max 0.250 [get_ports {s_axi_* axis_act_*}]
set_input_delay  -clock clk_sys -min 0.050 [get_ports {s_axi_* axis_act_*}]

set_output_delay -clock clk_sys -max 0.250 [get_ports {s_axi_* axis_out_*}]
set_output_delay -clock clk_sys -min 0.050 [get_ports {s_axi_* axis_out_*}]

# High-Speed MRM Modulator DAC Output Delays (Sub-picosecond skew across 64 channels)
set_output_delay -clock clk_pam4 -max 0.006 [get_ports {mrm_dac_*}]
set_output_delay -clock clk_pam4 -min 0.001 [get_ports {mrm_dac_*}]

# 5. Multicycle Paths for Non-Volatile PCM Electro-Thermal Annealing Cycles
# PCM pulses span tens of nanoseconds; relax digital timing paths to 64 clock cycles
set_multicycle_path -setup 64 -from [get_pins u_pcm_ctrl/*] -to [get_ports {pcm_pulse_*}]
set_multicycle_path -hold  63 -from [get_pins u_pcm_ctrl/*] -to [get_ports {pcm_pulse_*}]

# 6. Thermal Micro-Heater PWM Paths (Relaxed Asynchronous Outputs)
set_false_path -to [get_ports {heater_pwm_out[*]}]
set_false_path -from [get_ports {thermal_interferometer_tap_pd[*]}]

# 7. Design Rule Constraints (Max Capacitance & Transition)
set_max_fanout 16 [current_design]
set_max_transition 0.050 [current_design]
set_max_capacitance 0.025 [all_outputs]
