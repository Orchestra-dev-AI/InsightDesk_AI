"use client";

import { FlaskConical } from "lucide-react";
import { NoiseInjector } from "@/components/qa-playground/noise-injector";
import { AffirmationCues } from "@/components/qa-playground/affirmation-cues";
import { StressResults } from "@/components/qa-playground/stress-results";
import { StatusBadge } from "@/components/ui/status-badge";

export default function QAPlaygroundPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <FlaskConical className="w-6 h-6 text-[var(--violet)]" />
            Acoustic QA Playground
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Stress-test voice robustness — noise injection, barge-in detection, affirmation cues
          </p>
        </div>
        <StatusBadge status="operational" label="Test Engine" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NoiseInjector />
        <AffirmationCues />
      </div>

      <StressResults />
    </div>
  );
}
