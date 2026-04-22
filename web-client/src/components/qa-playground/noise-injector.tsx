"use client";

import { useRef, useState, useCallback } from "react";

type NoiseType = "white" | "pink" | "brown" | "ambient";

interface NoiseInjectorProps {
  onStreamReady?: (stream: MediaStream) => void;
  className?: string;
}

const noiseProfiles: {
  label: string;
  type: NoiseType;
  dbTarget: number;
}[] = [
  { label: "Office (55 dB)", type: "ambient", dbTarget: 55 },
  { label: "Café (60 dB)", type: "pink", dbTarget: 60 },
  { label: "Street (65 dB)", type: "brown", dbTarget: 65 },
  { label: "White Noise", type: "white", dbTarget: 60 },
];

export function NoiseInjector({ onStreamReady, className = "" }: NoiseInjectorProps) {
  const [activeProfile, setActiveProfile] = useState<number | null>(null);
  const [volume, setVolume] = useState(0.3);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | AudioWorkletNode | OscillatorNode | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  const generateNoiseBuffer = useCallback(
    (ctx: AudioContext, type: NoiseType): AudioBuffer => {
      const sampleRate = ctx.sampleRate;
      const duration = 10; // 10 second loop
      const length = sampleRate * duration;
      const buffer = ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);

      if (type === "white" || type === "ambient") {
        for (let i = 0; i < length; i++) {
          data[i] = Math.random() * 2 - 1;
        }
      } else if (type === "pink") {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        }
      } else if (type === "brown") {
        let lastOut = 0;
        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = data[i];
          data[i] *= 3.5;
        }
      }

      return buffer;
    },
    []
  );

  const startNoise = useCallback(
    (profileIndex: number) => {
      stopNoise();

      const profile = noiseProfiles[profileIndex];
      const ctx = new AudioContext({ sampleRate: 48000 });
      audioCtxRef.current = ctx;

      const gain = ctx.createGain();
      gain.gain.value = volume;
      gainRef.current = gain;

      const dest = ctx.createMediaStreamDestination();
      destRef.current = dest;

      const buffer = generateNoiseBuffer(ctx, profile.type);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gain);
      gain.connect(dest);
      gain.connect(ctx.destination); // Also play locally for feedback
      source.start();

      sourceRef.current = source;
      setActiveProfile(profileIndex);
      setIsPlaying(true);

      if (onStreamReady) onStreamReady(dest.stream);
    },
    [volume, generateNoiseBuffer, onStreamReady]
  );

  const stopNoise = useCallback(() => {
    try {
      if (sourceRef.current && "stop" in sourceRef.current) {
        (sourceRef.current as AudioBufferSourceNode).stop();
      }
    } catch { /* already stopped */ }
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    sourceRef.current = null;
    gainRef.current = null;
    destRef.current = null;
    setIsPlaying(false);
    setActiveProfile(null);
  }, []);

  // Update gain in real-time
  const handleVolumeChange = useCallback(
    (v: number) => {
      setVolume(v);
      if (gainRef.current) gainRef.current.gain.value = v;
    },
    []
  );

  return (
    <div className={`glass-card-static p-6 ${className}`}>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
        Noise Injection Engine
      </h3>

      {/* Noise Profile Selector */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        {noiseProfiles.map((p, i) => (
          <button
            key={i}
            onClick={() => (isPlaying && activeProfile === i ? stopNoise() : startNoise(i))}
            className={`px-3 py-2.5 rounded-lg text-xs font-medium transition-all border ${
              activeProfile === i
                ? "bg-[var(--cyan-glow)] border-[var(--border-active)] text-[var(--cyan)]"
                : "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-glass)] hover:text-[var(--text-primary)]"
            }`}
          >
            <div>{p.label}</div>
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
              {p.type} · {p.dbTarget} dB
            </div>
          </button>
        ))}
      </div>

      {/* Volume Control */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--text-muted)]">Injection Volume</span>
          <span className="font-mono text-[var(--text-secondary)]">
            {Math.round(volume * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none bg-[var(--bg-surface)] accent-[var(--cyan)] cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
          <span>Silent</span>
          <span>55 dB</span>
          <span>65 dB</span>
        </div>
      </div>

      {/* Status & Stop Button */}
      {isPlaying && (
        <div className="mt-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-[var(--red)] pulse-live" />
            <span className="text-[var(--red)] font-medium">
              Injecting: {noiseProfiles[activeProfile!].label}
            </span>
          </div>
          <button
            onClick={stopNoise}
            className="w-full py-2 rounded-lg bg-[var(--red-glow)] border border-[var(--red)] border-opacity-30 text-[var(--red)] text-xs font-bold hover:bg-[var(--red)] hover:text-white transition-all"
          >
            Turn Off Noise
          </button>
        </div>
      )}
    </div>
  );
}
