import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { getTask } from "../api/tasks";
import { StatusBadge } from "../components/StatusBadge";
import { ErrorState, LoadingState, PageHeader, Panel } from "../components/ui";
import type { AnalysisTask } from "../types";

type TaskProgressPageProps = {
  taskId: string;
};

const stages = [
  { id: "save_upload", label: "保存上传文件" },
  { id: "extract_archive", label: "解压日志包" },
  { id: "detect_package", label: "识别输入包类型" },
  { id: "match_whitelist", label: "匹配白名单日志" },
  { id: "reconstruct_boot", label: "重建启动过程" },
  { id: "run_diagnosis", label: "执行诊断模板" },
  { id: "generate_answer", label: "生成用户回答" },
  { id: "completed", label: "分析完成" },
];

export function TaskProgressPage({ taskId }: TaskProgressPageProps) {
  const { data: task, error, isLoading } = useQuery({
    queryKey: ["tasks", taskId],
    queryFn: () => getTask(taskId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "queued" || status === "running" ? 1500 : false;
    },
  });

  if (isLoading) {
    return <LoadingState label="正在读取任务进度..." />;
  }

  if (error || !task) {
    return <ErrorState label="任务进度加载失败" />;
  }

  return (
    <section>
      <PageHeader
        title="分析进度"
        description="后端正在按确定性工作流更新真实阶段，页面会自动轮询。"
        actions={<StatusBadge status={task.status} />}
      />
      <div className="two-column">
        <Panel title="当前状态">
          <div className="grid">
            <div>
              <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
                <strong>{task.status_message ?? stageLabel(task.current_stage)}</strong>
                <strong>{task.progress_percent}%</strong>
              </div>
              <div className="progress-bar" style={{ marginTop: "0.65rem" }}>
                <div className="progress-fill" style={{ width: `${task.progress_percent}%` }} />
              </div>
            </div>
            <p className="muted" style={{ margin: 0 }}>{task.question}</p>
            {task.status === "failed" ? (
              <div className="alert" role="alert">
                <AlertTriangle size={16} />
                <span>{task.error_message ?? "分析失败，请检查日志包或后端服务。"}</span>
              </div>
            ) : null}
            {task.status === "completed" ? (
              <ResultLink taskId={task.task_id} />
            ) : null}
          </div>
        </Panel>
        <Panel title="阶段时间线">
          <ProgressTimeline task={task} />
        </Panel>
      </div>
    </section>
  );
}

function ProgressTimeline({ task }: { task: AnalysisTask }) {
  const currentIndex = Math.max(
    0,
    stages.findIndex((stage) => stage.id === task.current_stage),
  );
  return (
    <ol className="progress-list">
      {stages.map((stage, index) => {
        const state = index < currentIndex || task.status === "completed" ? "done" : index === currentIndex ? "current" : "";
        return (
          <li aria-current={state === "current" ? "step" : undefined} className={`progress-step ${state}`} key={stage.id}>
            <span className="step-dot">{index < currentIndex || task.status === "completed" ? <CheckCircle2 size={14} /> : index + 1}</span>
            <span>{stage.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function stageLabel(stage?: string | null) {
  return stages.find((item) => item.id === stage)?.label ?? "等待更新";
}

function ResultLink({ taskId }: { taskId: string }) {
  return (
    <Link className="button primary" to={`/tasks/${taskId}`}>
      查看分析结果
    </Link>
  );
}
