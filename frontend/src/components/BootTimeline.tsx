import type { BootSession } from "../types";

type BootTimelineProps = {
  sessions: BootSession[];
};

export function BootTimeline({ sessions }: BootTimelineProps) {
  if (sessions.length === 0) {
    return <p className="muted" style={{ margin: 0 }}>暂无启动重建结果</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>序号</th>
            <th>启动状态</th>
            <th>异常阶段</th>
            <th>是否复位</th>
            <th>关键现象</th>
            <th>置信度</th>
            <th>证据文件</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.session_id}>
              <td>{session.display_name}</td>
              <td>{session.final_state}</td>
              <td>{session.abnormal_stage ?? "-"}</td>
              <td>{session.reset_detected ? "是" : "否"}</td>
              <td>{session.key_events.length ? session.key_events.join("；") : "-"}</td>
              <td>{session.confidence}</td>
              <td>{session.evidence_files.length ? session.evidence_files.join("；") : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
