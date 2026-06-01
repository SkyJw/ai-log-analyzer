import type { BootSession } from "../types";

type BootTimelineProps = {
  sessions: BootSession[];
};

export function BootTimeline({ sessions }: BootTimelineProps) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", minWidth: "760px", width: "100%" }}>
        <thead>
          <tr>
            {["序号", "启动状态", "异常阶段", "是否复位", "关键现象", "置信度", "证据文件"].map(
              (heading) => (
                <th key={heading} style={headerStyle}>
                  {heading}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.session_id}>
              <td style={cellStyle}>{session.display_name}</td>
              <td style={cellStyle}>{session.final_state}</td>
              <td style={cellStyle}>{session.abnormal_stage ?? "-"}</td>
              <td style={cellStyle}>{session.reset_detected ? "是" : "否"}</td>
              <td style={cellStyle}>{session.key_events.join("；") || "-"}</td>
              <td style={cellStyle}>{session.confidence}</td>
              <td style={cellStyle}>{session.evidence_files.join("；") || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  borderBottom: "1px solid #e5e7eb",
  color: "#4b5563",
  fontSize: "0.78rem",
  padding: "0.7rem",
  textAlign: "left",
};

const cellStyle: React.CSSProperties = {
  borderBottom: "1px solid #f3f4f6",
  fontSize: "0.88rem",
  padding: "0.75rem 0.7rem",
};
