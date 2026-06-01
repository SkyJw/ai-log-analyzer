import { useQuery } from "@tanstack/react-query";

import { listTasks } from "../api/tasks";
import { StatusBadge } from "../components/StatusBadge";

export function TaskListPage() {
  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ["tasks"],
    queryFn: listTasks,
  });

  if (isLoading) {
    return <p>加载中</p>;
  }

  if (error) {
    return <p>加载失败</p>;
  }

  return (
    <section>
      <div
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <h1 style={{ fontSize: "1.35rem", margin: 0 }}>分析任务</h1>
      </div>
      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          overflowX: "auto",
        }}
      >
        <table style={{ borderCollapse: "collapse", minWidth: "860px", width: "100%" }}>
          <thead style={{ background: "#f9fafb" }}>
            <tr>
              <HeaderCell>问题摘要</HeaderCell>
              <HeaderCell>状态</HeaderCell>
              <HeaderCell>包类型</HeaderCell>
              <HeaderCell>快照数</HeaderCell>
              <HeaderCell>创建时间</HeaderCell>
              <HeaderCell>入库状态</HeaderCell>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.task_id}>
                <BodyCell>{task.question}</BodyCell>
                <BodyCell>
                  <StatusBadge status={task.status} />
                </BodyCell>
                <BodyCell>{task.package_type ?? "-"}</BodyCell>
                <BodyCell>{task.snapshot_count}</BodyCell>
                <BodyCell>{formatDate(task.created_at)}</BodyCell>
                <BodyCell>未入库</BodyCell>
              </tr>
            ))}
            {tasks.length === 0 ? (
              <tr>
                <BodyCell colSpan={6}>暂无任务</BodyCell>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
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

function BodyCell({
  children,
  colSpan,
}: {
  children: React.ReactNode;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      style={{
        borderBottom: "1px solid #f3f4f6",
        fontSize: "0.9rem",
        padding: "0.8rem 0.75rem",
      }}
    >
      {children}
    </td>
  );
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString();
}
