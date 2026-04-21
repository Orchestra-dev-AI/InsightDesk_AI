"use client";

import { Wifi, WifiOff, Volume2, VolumeX } from "lucide-react";
import { SessionStatus } from "@/lib/types/voice";

interface WebRTCControlsProps {
  status: SessionStatus;
  isMuted: boolean;
  onStart: () => void;
  onStop: () => void;
  onMuteToggle: () => void;
}

const statusLabels: Record<SessionStatus, string> = {
  [SessionStatus.INITIALIZING]: "Initializing…",
  [SessionStatus.NEGOTIATING]: "Negotiating…",
  [SessionStatus.CONNECTED]: "Connected",
  [SessionStatus.STREAMING]: "Streaming",
  [SessionStatus.DISCONNECTED]: "Disconnected",
  [SessionStatus.ERROR]: "Error",
};

const statusColors: Record<SessionStatus, string> = {
  [SessionStatus.INITIALIZING]: "text-[var(--amber)]",
  [SessionStatus.NEGOTIATING]: "text-[var(--amber)]",
  [SessionStatus.CONNECTED]: "text-[var(--green)]",
  [SessionStatus.STREAMING]: "text-[var(--cyan)]",
  [SessionStatus.DISCONNECTED]: "text-[var(--text-muted)]",
  [SessionStatus.ERROR]: "text-[var(--red)]",
};

export function WebRTCControls({
  status,
  isMuted,
  onStart,
  onStop,
  onMuteToggle,
}: WebRTCControlsProps) {
  const isActive =
    status === SessionStatus.CONNECTED || status === SessionStatus.STREAMING;
  const isConnecting =
    status === SessionStatus.INITIALIZING ||
    status === SessionStatus.NEGOTIATING;

  return (
    <div className="glass-card-static p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          WebRTC Session
        </h3>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isActive
                ? "bg-[var(--green)] pulse-live"
                : isConnecting
                ? "bg-[var(--amber)] pulse-live"
                : "bg-[var(--text-muted)]"
            }`}
          />
          <span
            className={`text-xs font-medium ${statusColors[status]}`}
          >
            {statusLabels[status]}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {!isActive && !isConnecting ? (
          <button
            onClick={onStart}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[var(--cyan)] to-[var(--violet)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Wifi className="w-4 h-4" />
            Start Session
          </button>
        ) : (
          <button
            onClick={onStop}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--red-glow)] text-[var(--red)] border border-[var(--red)] border-opacity-30 text-sm font-semibold hover:bg-[var(--red)] hover:text-white transition-all"
          >
            <WifiOff className="w-4 h-4" />
            End Session
          </button>
        )}

        <button
          onClick={onMuteToggle}
          disabled={!isActive}
          className={`p-2.5 rounded-lg border transition-all ${
            isMuted
              ? "bg-[var(--red-glow)] border-[var(--red)] border-opacity-30 text-[var(--red)]"
              : "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          } disabled:opacity-40 disabled:cursor-not-allowed`}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
