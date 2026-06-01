type StatusBadgeProps = {
  status: string;
};

const statusColors: Record<string, { background: string; color: string }> = {
  completed: { background: "#dcfce7", color: "#166534" },
  failed: { background: "#fee2e2", color: "#991b1b" },
  running: { background: "#dbeafe", color: "#1e40af" },
  pending: { background: "#fef3c7", color: "#92400e" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const colors = statusColors[status] ?? { background: "#e5e7eb", color: "#374151" };

  return (
    <span
      style={{
        background: colors.background,
        borderRadius: "999px",
        color: colors.color,
        display: "inline-block",
        fontSize: "0.75rem",
        fontWeight: 700,
        lineHeight: 1,
        minWidth: "72px",
        padding: "0.35rem 0.5rem",
        textAlign: "center",
      }}
    >
      {status}
    </span>
  );
}
