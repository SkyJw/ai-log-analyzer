import { Send } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { createFollowUp, getTask } from "../api/tasks";
import { BootTimeline } from "../components/BootTimeline";
import { EvidenceSnippet } from "../components/EvidenceSnippet";
import { Button, ErrorState, LoadingState, PageHeader, Panel } from "../components/ui";
import type { FollowUpMessage } from "../types";

type TaskResultPageProps = {
  taskId: string;
};

export function TaskResultPage({ taskId }: TaskResultPageProps) {
  const [followUps, setFollowUps] = useState<FollowUpMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: task, isLoading, error: loadError } = useQuery({
    queryKey: ["tasks", taskId],
    queryFn: () => getTask(taskId),
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) {
      return;
    }

    setIsSubmitting(true);
    try {
      const reply = await createFollowUp(taskId, trimmed);
      setFollowUps((items) => [...items, reply]);
      setQuestion("");
      setError(null);
    } catch {
      setError("提交追问失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <LoadingState label="正在加载分析结果..." />;
  }

  if (loadError || !task) {
    return <ErrorState label="加载分析结果失败" />;
  }

  if (task.status !== "completed") {
    return (
      <section>
        <PageHeader title="分析结果" description="任务尚未完成，请先查看进度。" />
        <Link className="button primary" to={`/tasks/${task.task_id}/progress`}>查看进度</Link>
      </section>
    );
  }

  const allEvidence = task.diagnosis_findings.flatMap((finding) => finding.evidence);

  return (
    <section className="grid">
      <PageHeader
        title="分析结果"
        description={task.question}
        actions={<Link className="button" to={`/tasks/${task.task_id}/review`}>审核入库</Link>}
      />

      <Panel title="针对用户问题的直接回答">
        <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{task.final_answer ?? "暂无最终回答"}</p>
      </Panel>

      <Panel title="最近启动概览">
        <BootTimeline sessions={task.boot_sessions} />
      </Panel>

      <Panel title="主动诊断发现">
        <div className="grid">
          {task.diagnosis_findings.map((finding) => (
            <article className="panel" key={finding.finding_id}>
              <h3 style={{ fontSize: "0.98rem", margin: "0 0 0.4rem" }}>{finding.title}</h3>
              <p style={{ margin: "0 0 0.5rem" }}>{finding.summary}</p>
              <p className="muted" style={{ margin: "0 0 0.5rem" }}>
                模板：{finding.playbook_id} / 置信度：{finding.confidence}
              </p>
              {finding.next_checks.length ? (
                <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                  {finding.next_checks.map((check) => (
                    <li key={check}>{check}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
          {task.diagnosis_findings.length === 0 ? <p className="muted">暂无诊断发现</p> : null}
        </div>
      </Panel>

      <Panel title="证据与分析范围">
        <div className="grid">
          {allEvidence.length ? (
            allEvidence.map((evidence) => (
              <EvidenceSnippet key={evidence.snippet_id} evidence={evidence} />
            ))
          ) : (
            <p className="muted" style={{ margin: 0 }}>暂无证据片段</p>
          )}
        </div>
      </Panel>

      <Panel title="追问问答">
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>追问问题</span>
            <textarea
              aria-label="追问问题"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={3}
            />
          </label>
          <Button className="primary" disabled={isSubmitting} type="submit">
            <Send size={16} />
            <span>提交追问</span>
          </Button>
        </form>
        {error ? <p className="alert">{error}</p> : null}
        <div className="grid" style={{ marginTop: "0.85rem" }}>
          {followUps.map((message) => (
            <article className="panel" key={message.message_id}>
              <p style={{ margin: 0 }}>{message.content}</p>
              {message.cited_evidence.length ? (
                <p className="muted" style={{ fontSize: "0.82rem", margin: "0.45rem 0 0" }}>
                  引用证据：{message.cited_evidence.join("；")}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </Panel>
    </section>
  );
}
