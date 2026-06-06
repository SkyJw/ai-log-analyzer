import { Eye, LoaderCircle, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { listTasks } from "../api/tasks";
import { StatusBadge } from "../components/StatusBadge";
import { Button, EmptyState, ErrorState, LoadingState, PageHeader } from "../components/ui";
import type { AnalysisTask } from "../types";

type TaskListPageProps = {
  onReviewTask?: (taskId: string) => void;
  onViewProgress?: (taskId: string) => void;
  onViewResult?: (taskId: string) => void;
};

export function TaskListPage({ onReviewTask, onViewProgress, onViewResult }: TaskListPageProps) {
  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ["tasks"],
    queryFn: listTasks,
    refetchInterval: (query) => {
      const items = query.state.data ?? [];
      return items.some((task) => task.status === "queued" || task.status === "running")
        ? 1500
        : false;
    },
  });

  if (isLoading) {
    return <LoadingState label="正在加载任务..." />;
  }

  if (error) {
    return <ErrorState label="任务列表加载失败" />;
  }

  return (
    <section>
      <PageHeader
        title="分析任务"
        description="查看日志分析任务状态，运行中的任务可进入真实进度页。"
      />
      {tasks.length === 0 ? (
        <EmptyState label="暂无任务，请先新建一次日志分析。" />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>问题摘要</th>
                <th>状态</th>
                <th>当前阶段</th>
                <th>进度</th>
                <th>包类型</th>
                <th>快照数</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.task_id}>
                  <td>{task.question}</td>
                  <td><StatusBadge status={task.status} /></td>
                  <td>{task.status_message ?? stageLabel(task.current_stage)}</td>
                  <td>{task.progress_percent ?? 0}%</td>
                  <td>{task.package_type ?? "-"}</td>
                  <td>{task.snapshot_count}</td>
                  <td>{formatDate(task.created_at)}</td>
                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                      {isActive(task) ? (
                        <Button onClick={() => onViewProgress?.(task.task_id)} type="button">
                          <LoaderCircle size={15} />
                          <span>查看进度</span>
                        </Button>
                      ) : (
                        <Button onClick={() => onViewResult?.(task.task_id)} type="button">
                          <Eye size={15} />
                          <span>查看结果</span>
                        </Button>
                      )}
                      <Button
                        disabled={task.status !== "completed"}
                        onClick={() => onReviewTask?.(task.task_id)}
                        type="button"
                      >
                        <ShieldCheck size={15} />
                        <span>审核入库</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function isActive(task: AnalysisTask) {
  return task.status === "queued" || task.status === "running";
}

function stageLabel(stage?: string | null) {
  const labels: Record<string, string> = {
    save_upload: "保存上传",
    extract_archive: "解压日志包",
    detect_package: "识别输入包类型",
    match_whitelist: "匹配白名单日志",
    reconstruct_boot: "重建启动过程",
    run_diagnosis: "执行诊断模板",
    generate_answer: "生成用户回答",
    completed: "分析完成",
  };
  return stage ? labels[stage] ?? stage : "-";
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString();
}
