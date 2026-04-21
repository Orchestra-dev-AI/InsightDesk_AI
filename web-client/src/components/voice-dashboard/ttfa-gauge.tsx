"use client";

interface TTFAGaugeProps {
  value: number | null;
  size?: number;
}

export function TTFAGauge({ value, size = 160 }: TTFAGaugeProps) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Target: <300ms. Max display: 600ms
  const maxVal = 600;
  const clamped = value !== null ? Math.min(value, maxVal) : 0;
  const pct = clamped / maxVal;
  const offset = circumference * (1 - pct);

  const getColor = () => {
    if (value === null) return "var(--text-muted)";
    if (value <= 200) return "var(--green)";
    if (value <= 300) return "var(--amber)";
    return "var(--red)";
  };

  const getLabel = () => {
    if (value === null) return "—";
    if (value <= 200) return "Excellent";
    if (value <= 300) return "On Target";
    return "Above Target";
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          className="gauge-track"
          strokeWidth="8"
        />
        {/* Fill */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 0.6s ease, stroke 0.3s ease",
            filter: `drop-shadow(0 0 8px ${getColor()})`,
          }}
        />
        {/* Center text */}
        <text
          x={center}
          y={center - 6}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-[var(--text-primary)] text-2xl font-bold font-mono"
          style={{ transform: "rotate(90deg)", transformOrigin: "center" }}
        >
          {value !== null ? Math.round(value) : "—"}
        </text>
        <text
          x={center}
          y={center + 16}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-[var(--text-muted)] text-[10px] font-medium uppercase"
          style={{ transform: "rotate(90deg)", transformOrigin: "center" }}
        >
          ms
        </text>
      </svg>
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Time to First Audio
        </p>
        <p
          className="text-xs font-medium mt-0.5"
          style={{ color: getColor() }}
        >
          {getLabel()}
        </p>
      </div>
    </div>
  );
}
