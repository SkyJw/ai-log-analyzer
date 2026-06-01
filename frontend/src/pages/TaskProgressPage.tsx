type TaskProgressPageProps = {
  currentStageIndex?: number;
  snapshotCount?: number;
};

export function TaskProgressPage({
  currentStageIndex = 0,
  snapshotCount,
}: TaskProgressPageProps) {
  const stages = [
    "解压日志包",
    "识别输入包类型",
    snapshotCount ? `已识别 ${snapshotCount} 次启动快照` : "识别启动快照",
    "匹配白名单日志",
    "重建启动过程",
    "执行诊断模板",
    "回答用户问题",
    "分析完成",
  ];

  return (
    <section>
      <h1 style={{ fontSize: "1.35rem" }}>分析进度</h1>
      <ol
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          display: "grid",
          gap: "0.75rem",
          listStyle: "none",
          margin: 0,
          maxWidth: "680px",
          padding: "1rem",
        }}
      >
        {stages.map((stage, index) => (
          <li
            key={stage}
            aria-current={index === currentStageIndex ? "step" : undefined}
            style={{
              alignItems: "center",
              color: index <= currentStageIndex ? "#111827" : "#6b7280",
              display: "flex",
              gap: "0.65rem",
            }}
          >
            <span
              style={{
                background: index <= currentStageIndex ? "#0891b2" : "#e5e7eb",
                borderRadius: "999px",
                color: index <= currentStageIndex ? "white" : "#374151",
                display: "inline-grid",
                height: "28px",
                placeItems: "center",
                width: "28px",
              }}
            >
              {index + 1}
            </span>
            <span>{stage}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
