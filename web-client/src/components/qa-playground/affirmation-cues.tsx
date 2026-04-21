"use client";

import { useState, useRef, useCallback } from "react";
import { MessageCircle, Play, Pause } from "lucide-react";

const AFFIRMATION_CUES = [
  { text: "uh-huh", duration: 400 },
  { text: "yes", duration: 350 },
  { text: "right", duration: 300 },
  { text: "okay", duration: 350 },
  { text: "mm-hmm", duration: 500 },
  { text: "I see", duration: 450 },
  { text: "sure", duration: 300 },
  { text: "got it", duration: 400 },
];

type CadenceMode = "random" | "fixed";

interface AffirmationCuesProps {
  onCueTriggered?: (cue: string) => void;
  className?: string;
}

export function AffirmationCues({
  onCueTriggered,
  className = "",
}: AffirmationCuesProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [cadence, setCadence] = useState<CadenceMode>("random");
  const [intervalMs, setIntervalMs] = useState(3000);
  const [selectedCues, setSelectedCues] = useState<Set<number>>(
    new Set(AFFIRMATION_CUES.map((_, i) => i))
  );
  const [lastCue, setLastCue] = useState<string | null>(null);
  const [cueCount, setCueCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fireCue = useCallback(() => {
    const indices = Array.from(selectedCues);
    if (indices.length === 0) return;
    const idx = indices[Math.floor(Math.random() * indices.length)];
    const cue = AFFIRMATION_CUES[idx];
    setLastCue(cue.text);
    setCueCount((c) => c + 1);
    onCueTriggered?.(cue.text);
  }, [selectedCues, onCueTriggered]);

  const scheduleNext = useCallback(() => {
    const delay =
      cadence === "random"
        ? intervalMs + (Math.random() - 0.5) * intervalMs * 0.6
        : intervalMs;

    timerRef.current = setTimeout(() => {
      fireCue();
      scheduleNext();
    }, delay);
  }, [cadence, intervalMs, fireCue]);

  const startCues = useCallback(() => {
    setIsRunning(true);
    setCueCount(0);
    fireCue(); // Fire immediately
    scheduleNext();
  }, [fireCue, scheduleNext]);

  const stopCues = useCallback(() => {
    setIsRunning(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const toggleCue = (index: number) => {
    const next = new Set(selectedCues);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedCues(next);
  };

  return (
    <div className={`glass-card-static p-6 ${className}`}>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-[var(--violet)]" />
        Affirmation Cue Injector
      </h3>

      {/* Cue Selection */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {AFFIRMATION_CUES.map((cue, i) => (
          <button
            key={i}
            onClick={() => toggleCue(i)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all border ${
              selectedCues.has(i)
                ? "bg-[var(--violet-glow)] border-[var(--violet)] border-opacity-30 text-[var(--violet)]"
                : "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-muted)]"
            }`}
          >
            &quot;{cue.text}&quot;
          </button>
        ))}
      </div>

      {/* Cadence Controls */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block mb-1">
            Cadence
          </label>
          <div className="flex gap-1">
            {(["random", "fixed"] as CadenceMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setCadence(mode)}
                className={`flex-1 px-2 py-1.5 rounded text-[11px] font-medium border transition-all ${
                  cadence === mode
                    ? "bg-[var(--cyan-glow)] border-[var(--border-active)] text-[var(--cyan)]"
                    : "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-muted)]"
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block mb-1">
            Interval
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="1000"
              max="8000"
              step="500"
              value={intervalMs}
              onChange={(e) => setIntervalMs(parseInt(e.target.value))}
              className="flex-1 h-1 appearance-none bg-[var(--bg-surface)] rounded accent-[var(--violet)] cursor-pointer"
            />
            <span className="text-[11px] font-mono text-[var(--text-secondary)] w-10 text-right">
              {(intervalMs / 1000).toFixed(1)}s
            </span>
          </div>
        </div>
      </div>

      {/* Controls + Status */}
      <div className="flex items-center justify-between">
        <button
          onClick={isRunning ? stopCues : startCues}
          disabled={selectedCues.size === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 ${
            isRunning
              ? "bg-[var(--red-glow)] text-[var(--red)] border border-[var(--red)] border-opacity-30"
              : "bg-gradient-to-r from-[var(--violet)] to-[var(--cyan)] text-white"
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-3.5 h-3.5" /> Stop
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" /> Start
            </>
          )}
        </button>

        <div className="text-right">
          {lastCue && (
            <p className="text-xs text-[var(--violet)]">
              Last: &quot;{lastCue}&quot;
            </p>
          )}
          <p className="text-[10px] text-[var(--text-muted)]">
            Fired: {cueCount} cues
          </p>
        </div>
      </div>
    </div>
  );
}
