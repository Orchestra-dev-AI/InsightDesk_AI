interface StatusBadgeProps {
  status: "operational" | "degraded" | "offline" | "streaming" | "connected";
  label?: string;
  className?: string;
}

const statusConfig: Record<
  StatusBadgeProps["status"],
  { bg: string; text: string; dot: string; pulse: boolean }
> = {
  operational: {
    bg: "bg-[var(--green-glow)]",
    text: "text-[var(--green)]",
    dot: "bg-[var(--green)]",
    pulse: true,
  },
  connected: {
    bg: "bg-[var(--cyan-glow)]",
    text: "text-[var(--cyan)]",
    dot: "bg-[var(--cyan)]",
    pulse: true,
  },
  streaming: {
    bg: "bg-[var(--violet-glow)]",
    text: "text-[var(--violet)]",
    dot: "bg-[var(--violet)]",
    pulse: true,
  },
  degraded: {
    bg: "bg-[var(--amber-glow)]",
    text: "text-[var(--amber)]",
    dot: "bg-[var(--amber)]",
    pulse: false,
  },
  offline: {
    bg: "bg-[var(--red-glow)]",
    text: "text-[var(--red)]",
    dot: "bg-[var(--red)]",
    pulse: false,
  },
};

export function StatusBadge({
  status,
  label,
  className = "",
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const displayLabel = label ?? status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${config.bg} ${config.text} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${config.dot} ${
          config.pulse ? "pulse-live" : ""
        }`}
      />
      {displayLabel}
    </span>
  );
}
