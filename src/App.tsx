/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { SimulationState } from './types/photonic';
import { calculateSimulationMetrics } from './utils/photonicCalculations';
import { Header } from './components/Header';
import { DieFloorplanViewer } from './components/DieFloorplanViewer';
import { OpticalGemmSimulator } from './components/OpticalGemmSimulator';
import { LossBudgetCalculator } from './components/LossBudgetCalculator';
import { DriverWorkbench } from './components/DriverWorkbench';
import { ArchitectureWhitepaper } from './components/ArchitectureWhitepaper';
import { Radio, ShieldCheck, Terminal, Cpu, BookOpen, Layers } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'floorplan' | 'simulator' | 'loss' | 'driver' | 'docs'>('simulator');
  
  const [simulationState, setSimulationState] = useState<SimulationState>({
    batchSize: 16,
    sequenceLength: 4096,
    selectedLayerId: 'k3_moe_expert_ffn',
    laserWavelengthNm: 1550.12,
    laserOpticalPowerDbm: 7.5,
    matrixRadix: 64,
    opticalBaudRateGbaud: 56,
    modulatorEnergyFjPerBit: 6.2,
    waveguideLossDbPerCm: 0.07,
    waveguideLengthCm: 5.5,
    pcmWeightExtinctionRatioDb: 12.0,
    thermalStabilizerActive: true,
    precisionMode: 'Optical-Analog-8bit',
  });

  const metrics = useMemo(() => {
    return calculateSimulationMetrics(simulationState);
  }, [simulationState]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Header & Live Telemetry Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        metrics={metrics}
        thermalLocked={simulationState.thermalStabilizerActive}
      />

      {/* Main Interactive Workspace Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:py-8">
        {activeTab === 'floorplan' && <DieFloorplanViewer />}
        {activeTab === 'simulator' && (
          <OpticalGemmSimulator
            state={simulationState}
            setState={setSimulationState}
            metrics={metrics}
          />
        )}
        {activeTab === 'loss' && (
          <LossBudgetCalculator
            state={simulationState}
            setState={setSimulationState}
            metrics={metrics}
          />
        )}
        {activeTab === 'driver' && <DriverWorkbench />}
        {activeTab === 'docs' && <ArchitectureWhitepaper />}
      </main>

      {/* Engineering System Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-4 text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400 font-semibold">Kimi-PAU K3-X1</span>
            <span>• 300mm SOI + Low-Loss Si3N4 Heterogeneous Silicon Photonics</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>128B Hardware PCM Weights</span>
            <span>•</span>
            <span>14.33 Tbps / Die CPO Optical WDM</span>
            <span>•</span>
            <span className="text-emerald-400">0.00 mW Static DRAM Standby</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

