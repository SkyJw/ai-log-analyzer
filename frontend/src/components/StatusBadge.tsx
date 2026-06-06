type StatusBadgeProps = {
  status: string;
};

const statusColors: Record<string, { background: string; color: string }> = {
  completed: { background: "#dcfce7", color: "#166534" },
  failed: { background: "#fee2e2", color: "#991b1b" },
  running: { background: "#dbeafe", color: "#1e40af" },
  queued: { background: "#fef3c7", color: "#92400e" },
};

const statusLabels: Record<string, string> = {
  completed: "已完成",
  failed: "失败",
  queued: "排队中",
  running: "分析中",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const colors = statusColors[status] ?? { background: "#e5e7eb", color: "#374151" };

  return (
    <span
      className="status-badge"
      style={{
        background: colors.background,
        color: colors.color,
      }}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}
