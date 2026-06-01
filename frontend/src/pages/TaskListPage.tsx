import { Eye, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { listTasks } from "../api/tasks";
import { StatusBadge } from "../components/StatusBadge";

type TaskListPageProps = {
  onReviewTask?: (taskId: string) => void;
  onViewResult?: (taskId: string) => void;
};

export function TaskListPage({ onReviewTask, onViewResult }: TaskListPageProps) {
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
        <table style={{ borderCollapse: "collapse", minWidth: "960px", width: "100%" }}>
          <thead style={{ background: "#f9fafb" }}>
            <tr>
              <HeaderCell>问题摘要</HeaderCell>
              <HeaderCell>状态</HeaderCell>
              <HeaderCell>包类型</HeaderCell>
              <HeaderCell>快照数</HeaderCell>
              <HeaderCell>创建时间</HeaderCell>
              <HeaderCell>入库状态</HeaderCell>
              <HeaderCell>操作</HeaderCell>
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
                <BodyCell>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                    <RowAction label="查看结果" icon={<Eye size={15} />} onClick={() => onViewResult?.(task.task_id)} />
                    <RowAction
                      label="审核入库"
                      icon={<ShieldCheck size={15} />}
                      onClick={() => onReviewTask?.(task.task_id)}
                    />
                  </div>
                </BodyCell>
              </tr>
            ))}
            {tasks.length === 0 ? (
              <tr>
                <BodyCell colSpan={7}>暂无任务</BodyCell>
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
        verticalAlign: "top",
      }}
    >
      {children}
    </td>
  );
}

function RowAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        alignItems: "center",
        background: "white",
        border: "1px solid #d1d5db",
        borderRadius: "6px",
        color: "#172033",
        display: "inline-flex",
        gap: "0.3rem",
        minHeight: "32px",
        padding: "0.3rem 0.55rem",
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString();
}
