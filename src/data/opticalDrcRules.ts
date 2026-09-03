// =============================================================================
// Project: Kimi-PAU K3-X1 Silicon Photonics Acceleration Unit
// File:    opticalDrcRules.ts
// Purpose: Design Rule Checking (DRC) constraint rules & layout validation data
//          for monolithic silicon photonics tapeout verification.
// =============================================================================

export type DrcSeverity = 'FATAL' | 'WARNING' | 'PASS';

export type DrcCategory = 
  | 'Waveguide Geometry'
  | 'Optical Coupling & Gaps'
  | 'Phase-Change Material (PCM)'
  | 'Thermal & Metal Keep-Out'
  | 'Foundry DFM & CMP';

export interface OpticalDrcRule {
  id: string;
  name: string;
  category: DrcCategory;
  layer: string;
  layerGds: string;
  foundrySpec: string;
  limitExpression: string;
  nominalValue: number;
  measuredValue: number;
  unit: string;
  margin: string;
  status: DrcSeverity;
  physicalRisk: string;
  drcCheckLogic: string;
  coordinateLocation: string;
  suggestedFix: string;
}

export interface InjectedViolationPreset {
  id: string;
  title: string;
  ruleId: string;
  category: DrcCategory;
  badValue: number;
  unit: string;
  affectedComponent: string;
  coordinate: string;
  physicalFailureMode: string;
  tapeoutBlockerReason: string;
}

export const OPTICAL_DRC_RULES: OpticalDrcRule[] = [
  {
    id: 'DRC_OPT_WG_01_BEND',
    name: 'Minimum Waveguide Bend Radius',
    category: 'Waveguide Geometry',
    layer: 'SI_WAVEGUIDE',
    layerGds: '1/0',
    foundrySpec: 'TSMC Photonic PDK v3.1 Rule WG.R.1',
    limitExpression: 'Radius R ≥ 5.0 µm',
    nominalValue: 5.0,
    measuredValue: 5.20,
    unit: 'µm',
    margin: '+0.20 µm (+4.0%)',
    status: 'PASS',
    physicalRisk: 'Radiative mode conversion into SiO2 cladding; optical insertion loss escalates exponentially (>3.5 dB/90° bend) if R < 5.0 µm.',
    drcCheckLogic: 'geometry.extract_curves().assert_min_curvature_radius(5.0 * um)',
    coordinateLocation: 'X: 3840.12 µm, Y: 2194.50 µm (Router Bank #2)',
    suggestedFix: 'Increase Euler bend transition parameter p=1.0 or relax pitch to allow R ≥ 5.5 µm.'
  },
  {
    id: 'DRC_OPT_GAP_02_COUPLER',
    name: 'Directional Coupler & MZI Gap',
    category: 'Optical Coupling & Gaps',
    layer: 'SI_WAVEGUIDE',
    layerGds: '1/0',
    foundrySpec: 'TSMC Photonic PDK v3.1 Rule WG.S.1',
    limitExpression: 'Coupling Gap G ≥ 180 nm',
    nominalValue: 180,
    measuredValue: 205,
    unit: 'nm',
    margin: '+25 nm (+13.9%)',
    status: 'PASS',
    physicalRisk: 'Sub-180nm gaps suffer from optical proximity bridging during 193nm ArF immersion lithography, fusing adjacent waveguides and shorting channels.',
    drcCheckLogic: 'layers[1/0].space_less_than(0.180 * um).assert_empty()',
    coordinateLocation: 'X: 1920.40 µm, Y: 1104.20 µm (64-Ch WDM Interleaver)',
    suggestedFix: 'Re-synthesize coupler interaction length L with wider coupling gap G = 210 nm.'
  },
  {
    id: 'DRC_OPT_PITCH_03_XOVER',
    name: 'Optical Bus Waveguide Spacing',
    category: 'Optical Coupling & Gaps',
    layer: 'SI_WAVEGUIDE',
    layerGds: '1/0',
    foundrySpec: 'TSMC Photonic PDK v3.1 Rule WG.S.2',
    limitExpression: 'Center Pitch P ≥ 2.00 µm',
    nominalValue: 2.00,
    measuredValue: 2.40,
    unit: 'µm',
    margin: '+0.40 µm (+20.0%)',
    status: 'PASS',
    physicalRisk: 'Evanescent field overlap induces inter-channel optical crosstalk higher than -40 dB over 10 mm bus runs, degrading token SNR.',
    drcCheckLogic: 'waveguide_bus.center_to_center_distance().assert_min(2.0 * um)',
    coordinateLocation: 'X: 4110.00 µm, Y: 2850.30 µm (K=8192 High-Bandwidth Bus)',
    suggestedFix: 'Insert shallow sub-surface oxide trench isolation or increase bus track pitch.'
  },
  {
    id: 'DRC_OPT_TAPER_04_ANGLE',
    name: 'Adiabatic Taper Half-Angle',
    category: 'Waveguide Geometry',
    layer: 'SI_WAVEGUIDE / SI3N4_BUS',
    layerGds: '1/0, 2/0',
    foundrySpec: 'TSMC Photonic PDK v3.1 Rule WG.T.1',
    limitExpression: 'Taper Angle θ ≤ 1.50°',
    nominalValue: 1.50,
    measuredValue: 1.15,
    unit: '°',
    margin: '+0.35° (+23.3%)',
    status: 'PASS',
    physicalRisk: 'Non-adiabatic taper slopes excite TE0 to higher-order TE1/TM0 spatial modes, generating phase turbulence and inter-symbol interference.',
    drcCheckLogic: 'tapers.compute_flair_half_angle().assert_max(1.50 * deg)',
    coordinateLocation: 'X: 2450.80 µm, Y: 1620.10 µm (Si-to-Si3N4 Interlayer Tap)',
    suggestedFix: 'Extend taper axial transition length from 45 µm to 65 µm.'
  },
  {
    id: 'DRC_OPT_PCM_05_ENCLOSURE',
    name: 'Sb2Se3 PCM Active Layer Enclosure',
    category: 'Phase-Change Material (PCM)',
    layer: 'PCM_SB2SE3 over SI_WAVEGUIDE',
    layerGds: '20/0 over 1/0',
    foundrySpec: 'TSMC Photonic NVM Addendum Rule PCM.E.1',
    limitExpression: 'Enclosure E ≥ 60 nm',
    nominalValue: 60,
    measuredValue: 85,
    unit: 'nm',
    margin: '+25 nm (+41.7%)',
    status: 'PASS',
    physicalRisk: 'Misaligned or under-enclosed PCM patch exhibits sidewall edge scattering (>1.2 dB loss) and micro-fracture thermal delamination during phase switching.',
    drcCheckLogic: 'layers[20/0].enclosure_by(layers[1/0]).assert_min(0.060 * um)',
    coordinateLocation: 'X: 3120.00 µm, Y: 4410.50 µm (Matrix Cell W[128,64])',
    suggestedFix: 'Expand PCM deposition mask boundary by 25 nm around the silicon rib core.'
  },
  {
    id: 'DRC_OPT_HEAT_06_CLEARANCE',
    name: 'Micro-Heater Metal Optical Keep-Out',
    category: 'Thermal & Metal Keep-Out',
    layer: 'HEATER_TI_PT to SI_WAVEGUIDE',
    layerGds: '30/0 to 1/0',
    foundrySpec: 'TSMC Photonic PDK v3.1 Rule HTR.S.1',
    limitExpression: 'Clearance D ≥ 1.50 µm',
    nominalValue: 1.50,
    measuredValue: 1.80,
    unit: 'µm',
    margin: '+0.30 µm (+20.0%)',
    status: 'PASS',
    physicalRisk: 'Lossy metal proximity induces catastrophic plasmonic absorption loss of the evanescent optical tail (>2.8 dB/mm), blinding the photodetectors.',
    drcCheckLogic: 'layers[30/0].distance_to(layers[1/0]).assert_min(1.50 * um)',
    coordinateLocation: 'X: 1850.20 µm, Y: 3200.75 µm (MRM Thermal PLL Bank #4)',
    suggestedFix: 'Shift Ti/Pt heater resistor track 300 nm outward from the optical core axis.'
  },
  {
    id: 'DRC_OPT_GRAT_07_PERIOD',
    name: 'Grating Coupler Pitch & Etch Duty',
    category: 'Waveguide Geometry',
    layer: 'SI_GRATING_ETCH',
    layerGds: '3/0',
    foundrySpec: 'TSMC Photonic PDK v3.1 Rule GC.P.1',
    limitExpression: 'Pitch Λ = 630 ± 3 nm, Duty 50 ± 1.5%',
    nominalValue: 630,
    measuredValue: 630.2,
    unit: 'nm',
    margin: '+0.2 nm (0.03% dev)',
    status: 'PASS',
    physicalRisk: 'Pitch drift detunes the Bragg reflection angle away from 10° fiber array launch, causing 4.5 dB fiber coupling insertion penalty.',
    drcCheckLogic: 'gratings.measure_pitch().assert_within_bounds(627 * nm, 633 * nm)',
    coordinateLocation: 'X: 500.00 µm, Y: 5800.00 µm (Fiber I/O Array Port #1)',
    suggestedFix: 'Apply proximity effect correction (PEC) dose adjustment on e-beam / immersion reticle.'
  },
  {
    id: 'DRC_DFM_CMP_08_DENSITY',
    name: 'Pattern Density Uniformity (CMP DFM)',
    category: 'Foundry DFM & CMP',
    layer: 'SI_WAVEGUIDE + DUMMY_TILES',
    layerGds: '1/0, 99/0',
    foundrySpec: 'TSMC Photonic DFM Rule DFM.CMP.1',
    limitExpression: 'Density 30.0% ≤ D ≤ 65.0%',
    nominalValue: 45.0,
    measuredValue: 44.8,
    unit: '%',
    margin: '-0.2% (Center of window)',
    status: 'PASS',
    physicalRisk: 'Severe oxide dishing or dielectric erosion during Chemical-Mechanical Polishing, altering waveguide thickness and core effective refractive index neff.',
    drcCheckLogic: 'density_checker.window(50 * um, 50 * um).assert_range(0.30, 0.65)',
    coordinateLocation: 'Full Die Area (35.96 mm² Grid Analysis)',
    suggestedFix: 'Run automated dummy tile fill script `eda/scripts/fill_optical_dummies.py`.'
  },
  {
    id: 'DRC_OPT_TRENCH_09_KEEPOUT',
    name: 'Deep Oxide Trench Stress Keep-Out',
    category: 'Thermal & Metal Keep-Out',
    layer: 'TRENCH_UNDERCUT to ACTIVE_CELLS',
    layerGds: '35/0 to 20/0',
    foundrySpec: 'TSMC Photonic PDK v3.1 Rule TRN.K.1',
    limitExpression: 'Keep-Out Distance K ≥ 8.0 µm',
    nominalValue: 8.0,
    measuredValue: 10.5,
    unit: 'µm',
    margin: '+2.5 µm (+31.2%)',
    status: 'PASS',
    physicalRisk: 'Silicon mechanical stress and thermal contraction near undercut cavities induces stress-induced birefringence, scrambling light polarization.',
    drcCheckLogic: 'layers[35/0].distance_to(layers[20/0]).assert_min(8.0 * um)',
    coordinateLocation: 'X: 4720.60 µm, Y: 3890.10 µm (Thermal Isolation Perimeter)',
    suggestedFix: 'Retract deep trench etch mask boundary by 2.0 µm away from optical cores.'
  },
  {
    id: 'DRC_OPT_FACET_10_DICING',
    name: 'Hermetic Facet Edge Dicing Margin',
    category: 'Foundry DFM & CMP',
    layer: 'SI_FACET to WAFER_DICING_STREET',
    layerGds: '1/0 to 60/0',
    foundrySpec: 'TSMC Photonic Assembly Rule PKG.DIC.1',
    limitExpression: 'Facet Clearance C ≥ 25.0 µm',
    nominalValue: 25.0,
    measuredValue: 32.0,
    unit: 'µm',
    margin: '+7.0 µm (+28.0%)',
    status: 'PASS',
    physicalRisk: 'Micro-chipping and ragged facet sidewalls during stealth dicing blade saw, causing catastrophic optical coupling failure (>8 dB loss).',
    drcCheckLogic: 'layers[1/0].distance_to_boundary().assert_min(25.0 * um)',
    coordinateLocation: 'Die Perimeter (West / East Optical I/O Facets)',
    suggestedFix: 'Increase silicon edge seal setback ring from 25 µm to 35 µm.'
  },
  {
    id: 'DRC_OPT_WIDTH_11_MINIMUM',
    name: 'Minimum Waveguide Feature Width',
    category: 'Waveguide Geometry',
    layer: 'SI_WAVEGUIDE Tip & Core',
    layerGds: '1/0',
    foundrySpec: 'TSMC Photonic PDK v3.1 Rule WG.W.1',
    limitExpression: 'Feature Width Wmin ≥ 120 nm',
    nominalValue: 120,
    measuredValue: 150,
    unit: 'nm',
    margin: '+30 nm (+25.0%)',
    status: 'PASS',
    physicalRisk: 'Sub-120nm photoresist lines collapse during wet chemical development, resulting in broken optical tapers and open circuits.',
    drcCheckLogic: 'layers[1/0].width_less_than(0.120 * um).assert_empty()',
    coordinateLocation: 'X: 1240.50 µm, Y: 950.30 µm (Inverse Taper Spot-Size Converter)',
    suggestedFix: 'Blunt inverse taper tip width to 150 nm or utilize dual-stage multi-layer taper.'
  },
  {
    id: 'DRC_OPT_IMPLANT_12_OVERLAP',
    name: 'PN Junction Heavy Implant Keep-Out',
    category: 'Thermal & Metal Keep-Out',
    layer: 'IMP_P_PLUS / IMP_N_PLUS to CORE',
    layerGds: '4/0, 5/0 to 1/0',
    foundrySpec: 'TSMC Photonic PDK v3.1 Rule IMP.S.1',
    limitExpression: 'P+/N+ Keep-Out S ≥ 350 nm',
    nominalValue: 350,
    measuredValue: 420,
    unit: 'nm',
    margin: '+70 nm (+20.0%)',
    status: 'PASS',
    physicalRisk: 'Heavy dopant diffusion into guided optical mode causes extreme free-carrier absorption (>6.5 dB/cm), lowering modulator Q-factor.',
    drcCheckLogic: 'layers[4/0, 5/0].distance_to_optical_center().assert_min(0.350 * um)',
    coordinateLocation: 'X: 2800.10 µm, Y: 1450.60 µm (56 Gbaud PAM4 MRM Modulator)',
    suggestedFix: 'Shift P+ and N+ contact window implant mask edges 50 nm further from optical centerline.'
  }
];

export const INJECTED_VIOLATIONS: InjectedViolationPreset[] = [
  {
    id: 'tight_bend',
    title: 'Tight Waveguide Bend Violation (R = 3.80 µm)',
    ruleId: 'DRC_OPT_WG_01_BEND',
    category: 'Waveguide Geometry',
    badValue: 3.80,
    unit: 'µm',
    affectedComponent: 'Optical Routing Crossbar Bank #2 (Cell [42, 18])',
    coordinate: 'X: 3840.12 µm, Y: 2194.50 µm',
    physicalFailureMode: 'Extreme radiative loss (5.2 dB/turn). Mode leaking into SiO2 oxide cladding will blind adjacent photodetectors.',
    tapeoutBlockerReason: 'FATAL DRC: Minimum bend radius 5.00 µm violated by -1.20 µm. Foundry mask reticle generator will reject GDSII layer 1/0.'
  },
  {
    id: 'sub_diffraction_gap',
    title: 'Sub-Diffraction Coupler Gap (G = 135 nm)',
    ruleId: 'DRC_OPT_GAP_02_COUPLER',
    category: 'Optical Coupling & Gaps',
    badValue: 135,
    unit: 'nm',
    affectedComponent: '64-Channel WDM De-Interleaver Splitter',
    coordinate: 'X: 1920.40 µm, Y: 1104.20 µm',
    physicalFailureMode: 'Immersion photoresist bridging: Silicon waveguides fuse during etching, causing 100% optical short-circuit between channels 14 and 15.',
    tapeoutBlockerReason: 'FATAL DRC: Minimum spacing 180 nm violated by -45 nm. Violates TSMC DUV immersion pitch design rule.'
  },
  {
    id: 'pcm_under_enclosure',
    title: 'PCM Sb2Se3 Under-Enclosure (E = 32 nm)',
    ruleId: 'DRC_OPT_PCM_05_ENCLOSURE',
    category: 'Phase-Change Material (PCM)',
    badValue: 32,
    unit: 'nm',
    affectedComponent: 'Optical Weight Matrix Core (Cell W[128, 64])',
    coordinate: 'X: 3120.00 µm, Y: 4410.50 µm',
    physicalFailureMode: 'Asymmetric mode absorption and severe sidewall scattering (2.4 dB excess loss); high risk of film delamination during laser crystallization.',
    tapeoutBlockerReason: 'FATAL DRC: Active PCM enclosure 60 nm violated by -28 nm. NVM layer registration error.'
  },
  {
    id: 'heater_plasmonic_short',
    title: 'Heater Metal Plasmonic Proximity (D = 0.95 µm)',
    ruleId: 'DRC_OPT_HEATER_CLEARANCE',
    category: 'Thermal & Metal Keep-Out',
    badValue: 0.95,
    unit: 'µm',
    affectedComponent: 'Thermal PLL Micro-Heater Ring Resonator #4',
    coordinate: 'X: 1850.20 µm, Y: 3200.75 µm',
    physicalFailureMode: 'Evanescent field couples directly into lossy titanium/platinum metal, introducing 4.1 dB/mm plasmonic attenuation.',
    tapeoutBlockerReason: 'FATAL DRC: Heater keep-out 1.50 µm violated by -0.55 µm. Thermal tuning metal overlaps evanescent tail.'
  }
];
