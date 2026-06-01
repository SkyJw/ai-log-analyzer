import type { BootSession } from "../types";

type BootTimelineProps = {
  sessions: BootSession[];
};

export function BootTimeline({ sessions }: BootTimelineProps) {
  if (sessions.length === 0) {
    return <p style={{ color: "#6b7280" }}>暂无启动重建结果</p>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", minWidth: "920px", width: "100%" }}>
        <thead style={{ background: "#f9fafb" }}>
          <tr>
            <HeaderCell>序号</HeaderCell>
            <HeaderCell>启动状态</HeaderCell>
            <HeaderCell>异常阶段</HeaderCell>
            <HeaderCell>是否复位</HeaderCell>
            <HeaderCell>关键现象</HeaderCell>
            <HeaderCell>置信度</HeaderCell>
            <HeaderCell>证据文件</HeaderCell>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.session_id}>
              <BodyCell>{session.display_name}</BodyCell>
              <BodyCell>{session.final_state}</BodyCell>
              <BodyCell>{session.abnormal_stage ?? "-"}</BodyCell>
              <BodyCell>{session.reset_detected ? "是" : "否"}</BodyCell>
              <BodyCell>{session.key_events.length ? session.key_events.join("；") : "-"}</BodyCell>
              <BodyCell>{session.confidence}</BodyCell>
              <BodyCell>
                {session.evidence_files.length ? session.evidence_files.join("，") : "-"}
              </BodyCell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        borderBottom: "1px solid #e5e7eb",
        color: "#4b5563",
        fontSize: "0.78rem",
        padding: "0.75rem",
        textAlign: "left",
      }}
    >
      {children}
    </th>
  );
}

function BodyCell({ children }: { children: React.ReactNode }) {
  return (
    <td
      style={{
        borderBottom: "1px solid #f3f4f6",
        fontSize: "0.9rem",
        padding: "0.8rem 0.75rem",
        verticalAlign: "top",
      }}
    >
      {children}
    </td>
  );
}
