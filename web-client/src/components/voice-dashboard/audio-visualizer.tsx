"use client";

import { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  stream: MediaStream | null;
  bargeIn?: boolean;
  className?: string;
}

export function AudioVisualizer({
  stream,
  bargeIn = false,
  className = "",
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stream) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, w, h);

      const barWidth = (w / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * h * 0.85;

        const gradient = ctx.createLinearGradient(x, h, x, h - barHeight);
        if (bargeIn) {
          gradient.addColorStop(0, "rgba(239, 68, 68, 0.8)");
          gradient.addColorStop(1, "rgba(239, 68, 68, 0.2)");
        } else {
          gradient.addColorStop(0, "rgba(0, 240, 255, 0.8)");
          gradient.addColorStop(1, "rgba(168, 85, 247, 0.3)");
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(x, h - barHeight, barWidth - 1, barHeight);

        x += barWidth;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
      audioCtx.close();
    };
  }, [stream, bargeIn]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={400}
        height={100}
        className="w-full h-24 rounded-lg bg-[var(--bg-surface)]"
      />
      {bargeIn && (
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-[var(--red-glow)] text-[var(--red)] text-[10px] font-bold uppercase animate-pulse">
          Barge-In Detected
        </div>
      )}
    </div>
  );
}
