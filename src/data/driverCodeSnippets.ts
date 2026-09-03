export interface CodeSnippet {
  id: string;
  title: string;
  filename: string;
  language: string;
  category: 'kernel' | 'hal_cpp' | 'pytorch' | 'python' | 'registers';
  description: string;
  code: string;
}

export const DRIVER_CODE_SNIPPETS: CodeSnippet[] = [
  {
    id: 'hal_header',
    title: 'C++ Hardware Abstraction Layer (HAL) Header',
    filename: 'include/kimi_pau_driver.h',
    language: 'cpp',
    category: 'hal_cpp',
    description: 'Core user-space driver API for device initialization, laser comb alignment, non-volatile PCM weight programming, and sub-nanosecond optical GEMM dispatch.',
    code: `/**
 * @file kimi_pau_driver.h
 * @brief High-Performance User-Space Driver for Kimi-PAU K3 Photonic Acceleration Unit
 * @version 3.1.0-photon
 * @copyright (c) 2026 Kimi Photonic Hardware Systems. All rights reserved.
 */

#ifndef KIMI_PAU_DRIVER_H_
#define KIMI_PAU_DRIVER_H_

#include <cstdint>
#include <cstddef>
#include <memory>
#include <string>
#include <vector>

namespace kimi::photonic {

// Error status codes for optical hardware operations
enum class PauStatus : int32_t {
    OK = 0,
    DEVICE_NOT_FOUND = -1,
    LASER_LOCK_FAILED = -2,
    THERMAL_DRIFT_EXCEEDED = -3,
    PCM_WRITE_VERIFY_FAILED = -4,
    DMA_RING_OVERFLOW = -5,
    INVALID_WAVELENGTH_GRID = -6,
    CPO_LINK_DOWN = -7
};

// Hardware configuration descriptor
struct PauConfig {
    uint32_t pcie_device_id = 0x8942;
    uint32_t optical_die_count = 16;
    double laser_comb_power_dbm = 7.5;
    uint32_t wdm_channels = 64;
    double target_wavelength_nm = 1550.12;
    bool enable_auto_thermal_pll = true;
    bool enable_cpo_low_power_idle = false;
};

// Weight quantization & optical cell attenuation mapping
struct PcmWeightMatrix {
    uint32_t matrix_id;
    uint32_t rows;
    uint32_t cols;
    const float* weight_data; // FP32 or FP8 activations to program into PCM
    uint8_t pcm_optical_levels = 16; // 4-bit to 8-bit optical transmission states
};

// Real-time chip telemetry
struct PauTelemetry {
    float die_temperature_c;
    float laser_comb_osnr_db;
    float waveguide_loss_margin_db;
    uint64_t total_optical_mac_ops;
    float current_power_draw_watts;
    float optical_interconnect_tbps;
    bool thermal_pll_locked;
};

class PauDevice {
public:
    static std::shared_ptr<PauDevice> Open(int device_index = 0);
    virtual ~PauDevice() = default;

    // Device lifecycle
    virtual PauStatus Initialize(const PauConfig& config) = 0;
    virtual PauStatus CalibrateOpticalComb() = 0;
    virtual PauStatus LockThermalPhaseLoops() = 0;

    // Hardware-stored weight programming (zero DRAM static retention)
    virtual PauStatus ProgramWeightCore(const PcmWeightMatrix& weights) = 0;
    virtual PauStatus VerifyPcmTransmissionProfile(uint32_t matrix_id, float* out_loss_db) = 0;

    // Ultra-low-latency Optical In-Memory Matrix Multiplication
    // Direct zero-copy dispatch to high-speed Micro-Ring Modulators
    virtual PauStatus DispatchOpticalGemm(
        uint32_t matrix_id,
        const float* d_input_activations,
        uint32_t batch_size,
        uint32_t in_features,
        float* d_output_activations,
        uint32_t out_features,
        void* stream_handle = nullptr
    ) = 0;

    // Telemetry and diagnostics
    virtual PauStatus ReadTelemetry(PauTelemetry& out_telemetry) = 0;
    virtual const char* GetStatusString(PauStatus status) = 0;
};

} // namespace kimi::photonic

#endif // KIMI_PAU_DRIVER_H_`
  },
  {
    id: 'hal_impl',
    title: 'C++ Driver Implementation & Register MMIO',
    filename: 'src/kimi_pau_driver.cpp',
    language: 'cpp',
    category: 'hal_cpp',
    description: 'Hardware dispatch layer interfacing with Linux character device `/dev/kimi_pau0`, MMIO registers, and zero-copy circular DMA rings.',
    code: `/**
 * @file kimi_pau_driver.cpp
 * @brief User-Space Implementation for Kimi-PAU Hardware Interface
 */

#include "kimi_pau_driver.h"
#include <fcntl.h>
#include <unistd.h>
#include <sys/mman.h>
#include <sys/ioctl.h>
#include <cstring>
#include <iostream>
#include <chrono>

#define KIMI_PAU_DEV_PATH "/dev/kimi_pau0"
#define KIMI_IOCTL_MAGIC 'K'
#define KIMI_IOCTL_LOCK_LASER   _IO(KIMI_IOCTL_MAGIC, 0x01)
#define KIMI_IOCTL_PROGRAM_PCM  _IOW(KIMI_IOCTL_MAGIC, 0x02, uint64_t)
#define KIMI_IOCTL_READ_TELEMETRY _IOR(KIMI_IOCTL_MAGIC, 0x03, struct PauTelemetry)

namespace kimi::photonic {

class PauDeviceImpl : public PauDevice {
private:
    int fd_ = -1;
    PauConfig config_;
    volatile uint32_t* mmio_regs_ = nullptr;
    size_t mmio_size_ = 0x100000; // 1MB register map

public:
    PauDeviceImpl() = default;
    ~PauDeviceImpl() override {
        if (mmio_regs_) munmap((void*)mmio_regs_, mmio_size_);
        if (fd_ >= 0) close(fd_);
    }

    PauStatus Initialize(const PauConfig& config) override {
        config_ = config;
        fd_ = open(KIMI_PAU_DEV_PATH, O_RDWR | O_SYNC);
        if (fd_ < 0) {
            std::cerr << "[KIMI-PAU] Error: Failed to open " << KIMI_PAU_DEV_PATH << std::endl;
            return PauStatus::DEVICE_NOT_FOUND;
        }

        // Map BAR0 MMIO space
        void* addr = mmap(nullptr, mmio_size_, PROT_READ | PROT_WRITE, MAP_SHARED, fd_, 0);
        if (addr == MAP_FAILED) {
            return PauStatus::DEVICE_NOT_FOUND;
        }
        mmio_regs_ = static_cast<volatile uint32_t*>(addr);

        // Verify hardware magic signature
        uint32_t magic = mmio_regs_[0x00 / 4];
        if (magic != 0x4B335041) { // ASCII "K3PA"
            return PauStatus::DEVICE_NOT_FOUND;
        }

        // Initialize thermal loop and laser frequency comb
        return CalibrateOpticalComb();
    }

    PauStatus CalibrateOpticalComb() override {
        // Assert Laser Power Enable bit in Control Register
        mmio_regs_[0x10 / 4] |= (1 << 0); // REG_CTRL_LASER_EN

        // Write optical power level (dBm fixed-point)
        uint32_t power_raw = static_cast<uint32_t>(config_.laser_comb_power_dbm * 100.0f);
        mmio_regs_[0x18 / 4] = power_raw;

        // Trigger ioctl calibration
        if (ioctl(fd_, KIMI_IOCTL_LOCK_LASER) < 0) {
            return PauStatus::LASER_LOCK_FAILED;
        }

        return LockThermalPhaseLoops();
    }

    PauStatus LockThermalPhaseLoops() override {
        // Enable on-die closed-loop micro-heater PLLs
        mmio_regs_[0x20 / 4] = 0x00000001; // REG_THERMAL_PLL_ENABLE

        // Wait for lock bit (max 100ms)
        for (int i = 0; i < 100; ++i) {
            if (mmio_regs_[0x24 / 4] & 0x01) { // REG_THERMAL_PLL_STATUS_LOCKED
                return PauStatus::OK;
            }
            usleep(1000);
        }
        return PauStatus::THERMAL_DRIFT_EXCEEDED;
    }

    PauStatus ProgramWeightCore(const PcmWeightMatrix& weights) override {
        // Multi-level optical pulse programming:
        // Sets Sb2Se3 phase state (amorphous to crystalline ratios)
        // to encode weight transmission factors directly into optical waveguide crossbars.
        std::cout << "[KIMI-PAU] Programming Non-Volatile Weights: Matrix ID "
                  << weights.matrix_id << " (" << weights.rows << "x" << weights.cols << ")" << std::endl;

        // Pass DMA descriptor to kernel driver for zero-jitter write pulses
        if (ioctl(fd_, KIMI_IOCTL_PROGRAM_PCM, &weights) < 0) {
            return PauStatus::PCM_WRITE_VERIFY_FAILED;
        }
        return PauStatus::OK;
    }

    PauStatus VerifyPcmTransmissionProfile(uint32_t matrix_id, float* out_loss_db) override {
        mmio_regs_[0x30 / 4] = matrix_id;
        mmio_regs_[0x34 / 4] = 0x1; // Trigger optical read-verify test pulse
        usleep(500);
        *out_loss_db = static_cast<float>(mmio_regs_[0x38 / 4]) / 1000.0f;
        return PauStatus::OK;
    }

    PauStatus DispatchOpticalGemm(
        uint32_t matrix_id,
        const float* d_input_activations,
        uint32_t batch_size,
        uint32_t in_features,
        float* d_output_activations,
        uint32_t out_features,
        void* stream_handle
    ) override {
        // Sub-picosecond analog propagation through optical core:
        // 1. Electronic activations -> MRM optical modulators (56 Gbaud PAM4)
        // 2. Light propagates through Non-Volatile PCM matrix (zero DRAM latency)
        // 3. WDM Demux -> Germanium Photodetector -> TIA -> Output ADC
        
        // Write descriptors to hardware submission queue
        mmio_regs_[0x40 / 4] = matrix_id;
        mmio_regs_[0x44 / 4] = batch_size;
        mmio_regs_[0x48 / 4] = in_features;
        mmio_regs_[0x4C / 4] = out_features;
        
        // Ring hardware optical doorbell
        mmio_regs_[0x50 / 4] = 0x1;
        return PauStatus::OK;
    }

    PauStatus ReadTelemetry(PauTelemetry& out_telemetry) override {
        if (ioctl(fd_, KIMI_IOCTL_READ_TELEMETRY, &out_telemetry) < 0) {
            // Fallback to direct MMIO read
            out_telemetry.die_temperature_c = static_cast<float>(mmio_regs_[0x80 / 4]) / 10.0f;
            out_telemetry.laser_comb_osnr_db = static_cast<float>(mmio_regs_[0x84 / 4]) / 10.0f;
            out_telemetry.waveguide_loss_margin_db = 14.2f;
            out_telemetry.total_optical_mac_ops = mmio_regs_[0x90 / 4];
            out_telemetry.current_power_draw_watts = 28.4f;
            out_telemetry.optical_interconnect_tbps = 14.33f;
            out_telemetry.thermal_pll_locked = true;
        }
        return PauStatus::OK;
    }

    const char* GetStatusString(PauStatus status) override {
        switch (status) {
            case PauStatus::OK: return "Optical Link Ready (0.00 mW Static Retention)";
            case PauStatus::DEVICE_NOT_FOUND: return "Photonic PCIe/CXL Host Not Detected";
            case PauStatus::LASER_LOCK_FAILED: return "WDM Frequency Comb Lock Timeout";
            case PauStatus::THERMAL_DRIFT_EXCEEDED: return "Waveguide Phase Drift Beyond PLL Threshold";
            case PauStatus::PCM_WRITE_VERIFY_FAILED: return "Sb2Se3 PCM Weight Verification Failed";
            default: return "Unknown Photonic Fault";
        }
    }
};

std::shared_ptr<PauDevice> PauDevice::Open(int device_index) {
    auto dev = std::make_shared<PauDeviceImpl>();
    PauConfig default_cfg;
    if (dev->Initialize(default_cfg) == PauStatus::OK) {
        return dev;
    }
    return nullptr;
}

} // namespace kimi::photonic`
  },
  {
    id: 'linux_kernel_driver',
    title: 'Linux Kernel PCIe & CXL Optical Driver',
    filename: 'drivers/pci/kimi_pau_pci.c',
    language: 'c',
    category: 'kernel',
    description: 'Linux kernel 6.x PCI Express device driver handling BAR0/BAR2 resource allocation, coherent CXL memory mapping, circular DMA rings, and optical phase drift workqueues.',
    code: `/*
 * Kimi-PAU K3-X1 Silicon Photonics PCIe / CXL Driver
 * Copyright (c) 2026 Kimi Systems, Inc.
 * SPDX-License-Identifier: GPL-2.0
 */

#include <linux/module.h>
#include <linux/pci.h>
#include <linux/cdev.h>
#include <linux/fs.h>
#include <linux/uaccess.h>
#include <linux/interrupt.h>
#include <linux/dma-mapping.h>
#include <linux/workqueue.h>

#define DRV_NAME "kimi_pau"
#define PCI_VENDOR_ID_KIMI 0x1E88
#define PCI_DEVICE_ID_K3X1 0x8942

struct kimi_pau_dev {
    struct pci_dev *pdev;
    void __iomem *bar0;
    void __iomem *bar2;
    dev_t devt;
    struct cdev cdev;
    struct device *class_dev;
    
    /* DMA Ring Buffers for High-Speed Activation Movement */
    dma_addr_t dma_rx_phys;
    void *dma_rx_virt;
    dma_addr_t dma_tx_phys;
    void *dma_tx_virt;

    /* Thermal drift & Optical PLL background monitor */
    struct delayed_work thermal_monitor_work;
    spinlock_t lock;
};

static struct class *kimi_pau_class;

/* Thermal monitoring worker: runs every 50ms to verify optical phase lock */
static void kimi_thermal_monitor_work_fn(struct work_struct *work)
{
    struct kimi_pau_dev *kdev = container_of(to_delayed_work(work),
                                             struct kimi_pau_dev,
                                             thermal_monitor_work);
    u32 pll_status;
    unsigned long flags;

    spin_lock_irqsave(&kdev->lock, flags);
    pll_status = ioread32(kdev->bar0 + 0x24);
    if (!(pll_status & 0x01)) {
        pr_warn_ratelimited("%s: Warning: Photonic core phase drift detected, re-tuning micro-heaters\\n", DRV_NAME);
        iowrite32(0x01, kdev->bar0 + 0x20); // re-trigger PLL lock
    }
    spin_unlock_irqrestore(&kdev->lock, flags);

    schedule_delayed_work(&kdev->thermal_monitor_work, msecs_to_jiffies(50));
}

static irqreturn_t kimi_pau_irq_handler(int irq, void *data)
{
    struct kimi_pau_dev *kdev = data;
    u32 irq_status = ioread32(kdev->bar0 + 0x08);

    if (irq_status & 0x01) {
        /* Optical Matrix Multiply Operation Complete */
        iowrite32(0x01, kdev->bar0 + 0x0C); // ACK interrupt
        return IRQ_HANDLED;
    }
    return IRQ_NONE;
}

static int kimi_pau_probe(struct pci_dev *pdev, const struct pci_device_id *ent)
{
    struct kimi_pau_dev *kdev;
    int err;

    err = pcim_enable_device(pdev);
    if (err) return err;

    pci_set_master(pdev);
    err = dma_set_mask_and_coherent(&pdev->dev, DMA_BIT_MASK(64));
    if (err) return err;

    kdev = devm_kzalloc(&pdev->dev, sizeof(*kdev), GFP_KERNEL);
    if (!kdev) return -ENOMEM;

    kdev->pdev = pdev;
    spin_lock_init(&kdev->lock);

    /* Map BAR0 (Registers) and BAR2 (Optical Weight Scratchpad) */
    kdev->bar0 = pcim_iomap(pdev, 0, 0);
    if (!kdev->bar0) return -ENOMEM;

    /* Allocate coherent DMA buffers for activation streaming (16MB) */
    kdev->dma_rx_virt = dma_alloc_coherent(&pdev->dev, 16 * 1024 * 1024,
                                           &kdev->dma_rx_phys, GFP_KERNEL);
    kdev->dma_tx_virt = dma_alloc_coherent(&pdev->dev, 16 * 1024 * 1024,
                                           &kdev->dma_tx_phys, GFP_KERNEL);

    /* Request MSI-X Interrupt */
    err = pci_alloc_irq_vectors(pdev, 1, 4, PCI_IRQ_MSIX | PCI_IRQ_MSI);
    if (err < 0) return err;

    err = devm_request_irq(&pdev->dev, pci_irq_vector(pdev, 0),
                           kimi_pau_irq_handler, 0, DRV_NAME, kdev);
    if (err) return err;

    INIT_DELAYED_WORK(&kdev->thermal_monitor_work, kimi_thermal_monitor_work_fn);
    schedule_delayed_work(&kdev->thermal_monitor_work, msecs_to_jiffies(100));

    pci_set_drvdata(pdev, kdev);
    pr_info("%s: Kimi-PAU Photonic Accelerator initialized successfully (PCIe Gen6 x16 / CXL 3.1)\\n", DRV_NAME);
    return 0;
}

static void kimi_pau_remove(struct pci_dev *pdev)
{
    struct kimi_pau_dev *kdev = pci_get_drvdata(pdev);
    cancel_delayed_work_sync(&kdev->thermal_monitor_work);
    dma_free_coherent(&pdev->dev, 16 * 1024 * 1024, kdev->dma_rx_virt, kdev->dma_rx_phys);
    dma_free_coherent(&pdev->dev, 16 * 1024 * 1024, kdev->dma_tx_virt, kdev->dma_tx_phys);
    pr_info("%s: Kimi-PAU device unloaded cleanly\\n", DRV_NAME);
}

static const struct pci_device_id kimi_pau_ids[] = {
    { PCI_DEVICE(PCI_VENDOR_ID_KIMI, PCI_DEVICE_ID_K3X1) },
    { 0, }
};
MODULE_DEVICE_TABLE(pci, kimi_pau_ids);

static struct pci_driver kimi_pau_pci_driver = {
    .name = DRV_NAME,
    .id_table = kimi_pau_ids,
    .probe = kimi_pau_probe,
    .remove = kimi_pau_remove,
};

module_pci_driver(kimi_pau_pci_driver);
MODULE_AUTHOR("Kimi Photonic Architecture Lab");
MODULE_DESCRIPTION("Host Driver for Kimi-PAU K3 Optical Matrix Accelerator");
MODULE_LICENSE("GPL");`
  },
  {
    id: 'pytorch_custom_op',
    title: 'PyTorch C++ & CUDA Optical Tensor Extension',
    filename: 'csrc/kimi_photonic_ops.cpp',
    language: 'cpp',
    category: 'pytorch',
    description: 'Custom PyTorch C++ bindings interfacing directly with `torch.autograd` and vLLM/SGLang model serving for zero-DRAM GEMM inference.',
    code: `/**
 * @file kimi_photonic_ops.cpp
 * @brief PyTorch C++ Custom Operators for Kimi-PAU Optical In-Memory Matrix Core
 */

#include <torch/extension.h>
#include <vector>
#include "kimi_pau_driver.h"

static std::shared_ptr<kimi::photonic::PauDevice> g_pau_device = nullptr;

void ensure_pau_initialized() {
    if (!g_pau_device) {
        g_pau_device = kimi::photonic::PauDevice::Open(0);
        TORCH_CHECK(g_pau_device != nullptr, "Failed to initialize Kimi-PAU Silicon Photonic Device");
    }
}

/**
 * @brief Flash In-Built Weights into Non-Volatile Photonic Phase-Change Memory
 */
void program_k3_hardware_weights(int64_t matrix_id, torch::Tensor weights) {
    ensure_pau_initialized();
    TORCH_CHECK(weights.is_contiguous(), "Weights tensor must be contiguous");
    
    kimi::photonic::PcmWeightMatrix pcm_desc;
    pcm_desc.matrix_id = static_cast<uint32_t>(matrix_id);
    pcm_desc.rows = weights.size(0);
    pcm_desc.cols = weights.size(1);
    pcm_desc.weight_data = weights.data_ptr<float>();
    pcm_desc.pcm_optical_levels = 16; // 8-bit equivalent optical attenuation

    auto status = g_pau_device->ProgramWeightCore(pcm_desc);
    TORCH_CHECK(status == kimi::photonic::PauStatus::OK, "Failed to write hardware weights to optical core");
}

/**
 * @brief Optical GEMM Forward Pass
 * Activations propagate through the photonic core at the speed of light in silicon (c/n_eff).
 * Zero DRAM bandwidth consumed for model parameters.
 */
torch::Tensor photonic_linear_forward(
    torch::Tensor input_activations,
    int64_t matrix_id,
    int64_t out_features
) {
    ensure_pau_initialized();
    
    auto batch_size = input_activations.size(0);
    auto in_features = input_activations.size(1);

    auto output = torch::empty({batch_size, out_features}, input_activations.options());

    // Dispatch to micro-ring optical modulators
    auto status = g_pau_device->DispatchOpticalGemm(
        static_cast<uint32_t>(matrix_id),
        input_activations.data_ptr<float>(),
        static_cast<uint32_t>(batch_size),
        static_cast<uint32_t>(in_features),
        output.data_ptr<float>(),
        static_cast<uint32_t>(out_features)
    );

    TORCH_CHECK(status == kimi::photonic::PauStatus::OK, "Optical GEMM dispatch error");
    return output;
}

PYBIND11_MODULE(TORCH_EXTENSION_NAME, m) {
    m.def("program_weights", &program_k3_hardware_weights, "Program Kimi K3 weights into Non-Volatile Photonic PCM");
    m.def("optical_linear", &photonic_linear_forward, "Perform zero-DRAM Optical Matrix Multiplication on Kimi-PAU");
}`
  },
  {
    id: 'python_serving_runtime',
    title: 'Python Kimi K3 Real-Time Serving Wrapper',
    filename: 'kimi_k3_photonic_infer.py',
    language: 'python',
    category: 'python',
    description: 'High-level Python serving engine compatible with HuggingFace, vLLM, and Triton Inference Server with real-time optical telemetry reporting.',
    code: `"""
Kimi K3 Photonic Acceleration Serving Engine
Integrates hardware-stored non-volatile optical weights with real-time serving.
"""

import torch
import torch.nn as nn
from typing import Optional, Dict, Any
import kimi_photonic_ops # C++ extension

class KimiPhotonicLinear(nn.Module):
    """
    Drop-in replacement for torch.nn.Linear using Kimi-PAU Optical Core.
    Weights are retained in physical PCM phase-states; no DRAM bandwidth needed!
    """
    def __init__(self, in_features: int, out_features: int, matrix_id: int):
        super().__init__()
        self.in_features = in_features
        self.out_features = out_features
        self.matrix_id = matrix_id
        self._is_flashed = False

    def flash_weights_to_silicon(self, initial_weights: torch.Tensor):
        """Crystallize / amorphize optical PCM cells at hardware level."""
        print(f"[KIMI-PAU] Flashing {self.in_features}x{self.out_features} weights into Optical Cell ID {self.matrix_id}")
        kimi_photonic_ops.program_weights(self.matrix_id, initial_weights.float().contiguous())
        self._is_flashed = True

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        orig_shape = x.shape
        x_flat = x.view(-1, self.in_features)
        
        # Sub-nanosecond optical domain matrix multiplication
        out_flat = kimi_photonic_ops.optical_linear(x_flat, self.matrix_id, self.out_features)
        return out_flat.view(*orig_shape[:-1], self.out_features)


class KimiK3MoEPhotonicLayer(nn.Module):
    """
    Kimi K3 Mixture-of-Experts Layer with Optical Router & Hardware-Flushed Experts.
    """
    def __init__(self, hidden_dim: int = 8192, ffn_dim: int = 14336, num_experts: int = 64, top_k: int = 8):
        super().__init__()
        self.hidden_dim = hidden_dim
        self.ffn_dim = ffn_dim
        self.num_experts = num_experts
        self.top_k = top_k
        
        # Optical Router / Gate (Matrix ID: 100)
        self.gate = KimiPhotonicLinear(hidden_dim, num_experts, matrix_id=100)
        
        # Non-volatile optical experts (Stored in optical die mesh)
        self.experts_gate_up = nn.ModuleList([
            KimiPhotonicLinear(hidden_dim, 2 * ffn_dim, matrix_id=200 + i)
            for i in range(num_experts)
        ])
        self.experts_down = nn.ModuleList([
            KimiPhotonicLinear(ffn_dim, hidden_dim, matrix_id=400 + i)
            for i in range(num_experts)
        ])

    def forward(self, hidden_states: torch.Tensor) -> torch.Tensor:
        # 1. Optical routing (Gate weights stored directly on photonic chip)
        router_logits = self.gate(hidden_states)
        routing_weights, selected_experts = torch.topk(router_logits, self.top_k, dim=-1)
        routing_weights = torch.softmax(routing_weights, dim=-1)

        # 2. Parallel optical expert dispatch
        final_output = torch.zeros_like(hidden_states)
        for k in range(self.top_k):
            expert_idx = selected_experts[..., k]
            # Zero DRAM penalty: All 64 experts permanently reside on optical chiplets!
            expert_gate_up = self.experts_gate_up[expert_idx[0].item()](hidden_states)
            gate, up = expert_gate_up.chunk(2, dim=-1)
            activated = torch.nn.functional.silu(gate) * up
            expert_out = self.experts_down[expert_idx[0].item()](activated)
            final_output += routing_weights[..., k:k+1] * expert_out

        return final_output

if __name__ == "__main__":
    print("Initializing Kimi K3 Photonic Runtime...")
    moe_layer = KimiK3MoEPhotonicLayer()
    sample_tokens = torch.randn(1, 128, 8192) # 128 tokens, 8192 hidden dim
    print("Serving tokens through optical silicon...")
    result = moe_layer(sample_tokens)
    print(f"Inference complete. Output shape: {result.shape}")
    print("Optical Power Consumption: 14.8 W (vs 350 W electronic GPU baseline)")`
  },
  {
    id: 'register_map',
    title: 'MMIO Hardware Register Specification',
    filename: 'docs/hardware_registers.md',
    language: 'markdown',
    category: 'registers',
    description: 'Complete 32-bit/64-bit Memory-Mapped I/O (MMIO) register map for BAR0 control space, optical comb tuning, thermal PLL, and optical matrix dispatch.',
    code: `# Kimi-PAU K3 Hardware Register Map (BAR0: 0x0000_0000 - 0x0010_0000)

| Offset   | Register Name           | Access | Reset Val    | Functional Description |
| :------- | :---------------------- | :----: | :----------: | :------------------------------------------------------------- |
| \`0x0000\` | \`PAU_MAGIC_SIGNATURE\`   | RO     | \`0x4B335041\` | Hardware identifier string ("K3PA").                          |
| \`0x0004\` | \`PAU_CHIP_REVISION\`     | RO     | \`0x00030100\` | Silicon revision (v3.1 Tapeout, 300mm SOI + Si3N4 stack).     |
| \`0x0008\` | \`PAU_IRQ_STATUS\`        | RW1C   | \`0x00000000\` | Optical interrupt status (Bit 0: GEMM Done, Bit 1: Phase Trip).|
| \`0x000C\` | \`PAU_IRQ_ACK\`           | WO     | \`0x00000000\` | Write 1 to clear active photonic interrupt lines.              |
| \`0x0010\` | \`PAU_CTRL_LASER\`        | RW     | \`0x00000000\` | Bit 0: Laser Enable, Bit 1: 64-WDM Comb Mode, Bit 2: Low-Pwr.   |
| \`0x0018\` | \`PAU_LASER_POWER_DBM\`   | RW     | \`0x000002EE\` | Fixed-point optical target power (+7.50 dBm = 750).            |
| \`0x0020\` | \`PAU_THERMAL_PLL_CTRL\`  | RW     | \`0x00000001\` | Micro-ring heater closed-loop feedback enable.                 |
| \`0x0024\` | \`PAU_THERMAL_PLL_STATUS\`| RO     | \`0x00000001\` | Bit 0: Locked, Bit 1: Phase Error Margin OK, Bit 2: Overtemp.  |
| \`0x0030\` | \`PAU_PCM_MATRIX_ID\`     | RW     | \`0x00000000\` | Target Non-Volatile Optical Matrix ID (0 to 1024).             |
| \`0x0034\` | \`PAU_PCM_CMD_VERIFY\`    | WO     | \`0x00000000\` | Trigger optical read-verify test pulse across Sb2Se3 array.    |
| \`0x0038\` | \`PAU_PCM_LOSS_METRIC\`   | RO     | \`0x00000000\` | Optical attenuation measurement in milli-dB (0.001 dB res).    |
| \`0x0040\` | \`PAU_DISPATCH_MATRIX\`   | WO     | \`0x00000000\` | Active hardware matrix selector for current GEMM step.         |
| \`0x0044\` | \`PAU_DISPATCH_BATCH\`    | WO     | \`0x00000001\` | Batch size for input activation modulation.                    |
| \`0x0048\` | \`PAU_DISPATCH_DIM_IN\`   | WO     | \`0x00002000\` | Input feature dimension (e.g. 8192).                          |
| \`0x004C\` | \`PAU_DISPATCH_DIM_OUT\`  | WO     | \`0x00003800\` | Output feature dimension (e.g. 14336).                         |
| \`0x0050\` | \`PAU_DOORBELL_START\`    | WO     | \`0x00000000\` | Write 1 to launch optical propagation wavefront.               |
| \`0x0080\` | \`PAU_TELEMETRY_TEMP\`    | RO     | \`0x000001AC\` | Current die temperature in 0.1°C (0x1AC = 42.8°C).             |
| \`0x0084\` | \`PAU_TELEMETRY_OSNR\`    | RO     | \`0x0000017C\` | Optical Signal-to-Noise Ratio (38.0 dB = 380).                 |
| \`0x0090\` | \`PAU_TELEMETRY_MAC_OPS\` | RO     | \`0x00000000\` | 64-bit cumulative optical MAC operations executed.             |
`
  }
];

export const MOCK_TERMINAL_COMMANDS: { [cmd: string]: string } = {
  'kimi-smi': `+---------------------------------------------------------------------------------------+
| KIMI-SMI 3.1.0-photon             Driver Version: 550.64.02   CPO-Optical: Active     |
|-------------------------------------+-----------------------+-------------------------|
| GPU/PAU  Name                Rev    | Bus-Id       Link-WDM | Volatile Optical-Memory |
| Fan  Temp   Perf    Pwr:Usage/Cap   | Memory-Usage          | GPU-Util  Optic-Phase   |
|=====================================+=======================+=========================|
|   0  Kimi-PAU K3-X1 (16-Die) Rev A  | 00000000:03:00.0  64λ |  Non-Volatile (Zero DRAM)|
|  0%   41.8C    P0      28W / 65W    | 128B Weights [Active] |     98%    Locked 0.012r|
+-------------------------------------+-----------------------+-------------------------+
| Processes:                                                                            |
|  GPU   GI   CI        PID   Type   Process name                             Pau-Mem   |
|=======================================================================================|
|    0   N/A  N/A     48102      C   /opt/kimi/bin/kimi-vllm-serving          Flushed   |
+---------------------------------------------------------------------------------------+`,

  'kimi-diag --test-optics': `[INFO] Probing Photonic Link on /dev/kimi_pau0 (PCIe Gen6 x16 / CXL 3.1)...
[PASS] Heterogeneous DFB Micro-Comb Laser: Locked @ 1550.12nm (64 WDM carriers)
[PASS] Optical Output Power: +7.52 dBm per channel (Target: +7.50 dBm)
[PASS] Inverse Taper Edge Couplers: Insertion Loss = 0.42 dB / facet (Spec < 0.45 dB)
[PASS] Si3N4 Low-Loss Waveguide Bus: Loss = 0.068 dB / cm (Spec < 0.08 dB/cm)
[PASS] Micro-Ring Modulator Bank: 56 Gbaud PAM4 eye opened, ER = 9.85 dB, 6.1 fJ/bit
[PASS] Sb2Se3 Optical Non-Volatile Weight Cells: 16-level transmission verified
[PASS] Germanium PIN Photodetectors: Responsivity = 1.05 A/W, BW = 72 GHz
[PASS] Closed-Loop Thermal PLL: Locked (Phase residual < 0.014 rad)
================================================================================
ALL OPTICAL SUBSYSTEMS OPERATIONAL. ZERO DRAM READ BANDWIDTH BOTTLENECK.`,

  'kimi-weights --status': `[KIMI-PAU WEIGHT INVENTORY]
Storage Mechanism: Sb2Se3 Optical Phase-Change Multi-Level Cells (Non-Volatile)
Static Retention Power: 0.00 mW (No DRAM refresh, zero standby leakage)
Total Hardware Parameter Slots: 128,000,000,000 (128 Billion Weights)
Active Allocation:
  - Matrix ID 100: Kimi K3 MoE Router Softmax (8192 x 64) -> LOCKED [0.000 dB drift]
  - Matrix ID 200..263: MoE SwiGLU Expert Gate/Up (8192 x 14336) -> FLASHED
  - Matrix ID 400..463: MoE SwiGLU Expert Down (14336 x 8192) -> FLASHED
  - Matrix ID 500..531: Attention QKV Projections (8192 x 24576) -> FLASHED
Weight Verification CRC: 0xE82B_934A [OK]`,

  'kimi-benchmark --batch 16 --seq 4096': `[KIMI-PAU BENCHMARK ENGINE v3.1]
Workload: Kimi K3 MoE 128k Context Token Generation
Batch Size: 16 | Sequence Context: 4,096 tokens | Precision: Optical 8-bit Analog
--------------------------------------------------------------------------------
Phase 1: Input Activation Electro-Optic Modulation (MRM)  : 0.18 ns
Phase 2: Speed-of-Light Optical In-Memory Matrix Multiply : 0.14 ns
Phase 3: Germanium Photodetector + TIA Opto-Electric Conv : 0.08 ns
Phase 4: Co-Packaged Optics (CPO) Host Data Movement     : 0.85 ns
--------------------------------------------------------------------------------
Total Photonic Per-Token Latency : 1.25 microseconds
Baseline Electronic GPU (B200)   : 14.80 microseconds
SPEEDUP FACTOR                   : 11.84x FASTER
DRAM Read Traffic Saved          : 256.0 GB/s per token
Optical Energy Efficiency        : 44.2 TOPS / Watt (Electronic GPU: 3.8 TOPS/W)`,

  'kimi-regmap': `[KIMI-PAU BAR0 MMIO HARDWARE REGISTER DUMP]
Base Physical: 0x0000000038000000 | Linux VMA: 0xffff800012340000
Offset  | C++ Pointer Index | Register Name            | Access | Value (Hex) | Decoded Status
--------+-------------------+--------------------------+--------+-------------+------------------------------------
0x0000  | mmio_regs_[0]     | PAU_MAGIC_SIGNATURE      | RO     | 0x4B335041  | ASCII "K3PA" (Silicon Verified)
0x0004  | mmio_regs_[1]     | PAU_CHIP_REVISION        | RO     | 0x00030100  | v3.1.0 Monolithic Tapeout
0x0008  | mmio_regs_[2]     | PAU_IRQ_STATUS           | RW1C   | 0x00000000  | Idle (No Pending IRQs)
0x0010  | mmio_regs_[4]     | PAU_CTRL_LASER           | RW     | 0x00000003  | Laser EN=1, 64-WDM Grid=1
0x0018  | mmio_regs_[6]     | PAU_LASER_POWER_DBM      | RW     | 0x000002EE  | Target: +7.50 dBm / Carrier
0x0020  | mmio_regs_[8]     | PAU_THERMAL_PLL_CTRL     | RW     | 0x00000001  | Micro-Heater Closed-Loop EN=1
0x0024  | mmio_regs_[9]     | PAU_THERMAL_PLL_STATUS   | RO     | 0x00003303  | PLL Locked, Margin OK, Duty 20%
0x0030  | mmio_regs_[12]    | PAU_PCM_MATRIX_ID        | RW     | 0x00000064  | Target: Matrix ID 100 (Router)
0x0038  | mmio_regs_[14]    | PAU_PCM_LOSS_METRIC      | RO     | 0x00003778  | Extinction Dynamic Range: 14.20 dB
0x0040  | mmio_regs_[16]    | PAU_DISPATCH_MATRIX      | RW     | 0x00000064  | Active Optical Matrix: 100
0x0044  | mmio_regs_[17]    | PAU_DISPATCH_BATCH       | RW     | 0x00000010  | Batch Size: 16 tokens
0x0048  | mmio_regs_[18]    | PAU_DISPATCH_DIM_IN      | RW     | 0x00002000  | Hidden Dimension K: 8192
0x004C  | mmio_regs_[19]    | PAU_DISPATCH_DIM_OUT     | RW     | 0x00003800  | Projection Dimension N: 14336
0x0050  | mmio_regs_[20]    | PAU_DOORBELL_START       | WO     | 0x00000000  | Ready for Sub-ns GEMM Pulse
0x0080  | mmio_regs_[32]    | PAU_TELEMETRY_TEMP       | RO     | 0x000001A2  | Optical Die Temp: 41.8°C
0x0084  | mmio_regs_[33]    | PAU_TELEMETRY_OSNR       | RO     | 0x0000017C  | WDM Comb OSNR: 38.0 dB
0x0090  | mmio_regs_[36]    | PAU_TELEMETRY_MAC_OPS    | RO     | 0x008CA000  | Total Optical MACs: 9,216,000`
};
