"use client";

import { useState, useRef, useCallback } from "react";
import { Mic } from "lucide-react";
import { TTFAGauge } from "@/components/voice-dashboard/ttfa-gauge";
import { AudioVisualizer } from "@/components/voice-dashboard/audio-visualizer";
import { WebRTCControls } from "@/components/voice-dashboard/webrtc-controls";
import { SessionTelemetry } from "@/components/voice-dashboard/session-telemetry";
import { StatusBadge } from "@/components/ui/status-badge";
import { SessionStatus } from "@/lib/types/voice";
import type { VoiceSession } from "@/lib/types/voice";
import * as api from "@/lib/api-client";

export default function VoicePage() {
  const [status, setStatus] = useState<SessionStatus>(
    SessionStatus.DISCONNECTED
  );
  const [isMuted, setIsMuted] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [bargeIn, setBargeIn] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startSession = useCallback(async () => {
    try {
      setStatus(SessionStatus.INITIALIZING);

      // Get local audio
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        },
      });
      setStream(localStream);

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        bundlePolicy: "max-bundle",
      });
      pcRef.current = pc;

      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

      setStatus(SessionStatus.NEGOTIATING);

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send to backend
      const { session_id, answer } = await api.voice.offer(offer.sdp!);
      await pc.setRemoteDescription(new RTCSessionDescription(answer as RTCSessionDescriptionInit));

      setStatus(SessionStatus.CONNECTED);

      // ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await api.voice.addIceCandidate(session_id, {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setStatus(SessionStatus.STREAMING);
        } else if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed"
        ) {
          setStatus(SessionStatus.DISCONNECTED);
        }
      };

      // Poll telemetry
      pollRef.current = setInterval(async () => {
        try {
          const s = await api.voice.getSession(session_id);
          setSession(s);
          // Simulate barge-in detection from session data
          setBargeIn(false);
        } catch {
          // Session may not exist yet
        }
      }, 1000);

      // Set initial session data
      setSession({
        session_id,
        status: SessionStatus.CONNECTED,
        ttfa_ms: null,
        jitter_ms: null,
        packet_loss_pct: null,
        mos_score: null,
      });
    } catch (err) {
      console.error("Voice session failed:", err);
      setStatus(SessionStatus.ERROR);
    }
  }, []);

  const stopSession = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (pcRef.current) pcRef.current.close();
    if (stream) stream.getTracks().forEach((t) => t.stop());

    pcRef.current = null;
    setStream(null);
    setSession(null);
    setStatus(SessionStatus.DISCONNECTED);
  }, [stream]);

  const toggleMute = useCallback(() => {
    if (stream) {
      stream.getAudioTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsMuted(!isMuted);
    }
  }, [stream, isMuted]);

  const badgeStatus =
    status === SessionStatus.STREAMING
      ? "streaming"
      : status === SessionStatus.CONNECTED
      ? "connected"
      : status === SessionStatus.ERROR
      ? "offline"
      : status === SessionStatus.DISCONNECTED
      ? "offline"
      : "degraded";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <Mic className="w-6 h-6 text-[var(--cyan)]" />
            Voice Intelligence
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            WebRTC Zero-Latency Pipeline — Target TTFA &lt; 300ms
          </p>
        </div>
        <StatusBadge status={badgeStatus} />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Controls + Visualizer */}
        <div className="lg:col-span-2 space-y-6">
          <WebRTCControls
            status={status}
            isMuted={isMuted}
            onStart={startSession}
            onStop={stopSession}
            onMuteToggle={toggleMute}
          />

          {/* Audio Waveform */}
          <div className="glass-card-static p-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
              Audio Waveform
            </h3>
            <AudioVisualizer stream={stream} bargeIn={bargeIn} />
          </div>

          {/* Session Info */}
          {session && (
            <div className="glass-card-static p-6">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                Session Details
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-[var(--text-muted)] block mb-0.5">
                    Session ID
                  </span>
                  <span className="font-mono text-[var(--text-primary)] break-all">
                    {session.session_id}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block mb-0.5">
                    Codec
                  </span>
                  <span className="font-mono text-[var(--text-primary)]">
                    Opus 48kHz
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block mb-0.5">
                    Transport
                  </span>
                  <span className="font-mono text-[var(--cyan)]">
                    WebRTC / UDP
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block mb-0.5">
                    Echo Cancellation
                  </span>
                  <span className="font-mono text-[var(--green)]">Active</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: TTFA Gauge + Telemetry */}
        <div className="space-y-6">
          <div className="glass-card-static p-6 flex justify-center">
            <TTFAGauge value={session?.ttfa_ms ?? null} />
          </div>

          <SessionTelemetry session={session} />
        </div>
      </div>
    </div>
  );
}
