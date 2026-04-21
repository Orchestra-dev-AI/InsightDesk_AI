"use client";

import { useState, useEffect } from "react";

interface HardwareInfo {
  tier: "m5_pro_48gb" | "m5_pro_64gb" | "unknown" | "detecting";
  label: string;
  maxModelParams: string;
  expectedThroughput: string;
  memoryGB: number | null;
  hasGPU: boolean;
  platform: string;
}

export function useHardwareDetect(): HardwareInfo {
  const [info, setInfo] = useState<HardwareInfo>({
    tier: "detecting",
    label: "Detecting…",
    maxModelParams: "—",
    expectedThroughput: "—",
    memoryGB: null,
    hasGPU: false,
    platform: "",
  });

  useEffect(() => {
    const detect = async () => {
      const platform = navigator.platform || "Unknown";
      const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? null;
      let hasGPU = false;

      // Check WebGPU availability
      try {
        if ("gpu" in navigator) {
          const gpu = await (navigator as unknown as { gpu: { requestAdapter: () => Promise<unknown> } }).gpu.requestAdapter();
          hasGPU = !!gpu;
        }
      } catch {
        hasGPU = false;
      }

      // Tier classification based on platform + memory
      const isMac = platform.toLowerCase().includes("mac");
      let tier: HardwareInfo["tier"] = "unknown";
      let label = "Standard Hardware";
      let maxModelParams = "7B-13B (Cloud)";
      let expectedThroughput = "N/A (Cloud API)";

      if (isMac && memory && memory >= 64) {
        tier = "m5_pro_64gb";
        label = "Apple M5 Pro — 64GB Unified";
        maxModelParams = "70B (Llama 3.3)";
        expectedThroughput = "18-24 t/s";
      } else if (isMac && memory && memory >= 48) {
        tier = "m5_pro_48gb";
        label = "Apple M5 Pro — 48GB Unified";
        maxModelParams = "32B (Qwen 2.5)";
        expectedThroughput = "42-50 t/s";
      } else if (isMac) {
        tier = "m5_pro_48gb";
        label = "Apple Silicon (Detected)";
        maxModelParams = "32B (Qwen 2.5)";
        expectedThroughput = "42-50 t/s";
      }

      setInfo({
        tier,
        label,
        maxModelParams,
        expectedThroughput,
        memoryGB: memory,
        hasGPU,
        platform,
      });
    };

    detect();
  }, []);

  return info;
}
