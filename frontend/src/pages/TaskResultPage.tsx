import { Send } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { createFollowUp, getTask } from "../api/tasks";
import { BootTimeline } from "../components/BootTimeline";
import { EvidenceSnippet } from "../components/EvidenceSnippet";
import type { AnalysisTask, FollowUpMessage } from "../types";

type TaskResultPageProps = {
  taskId: string;
};

export function TaskResultPage({ taskId }: TaskResultPageProps) {
  const [task, setTask] = useState<AnalysisTask | null>(null);
  const [followUps, setFollowUps] = useState<FollowUpMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getTask(taskId)
      .then((result) => {
        if (active) {
          setTask(result);
          setError(null);
        }
      })
      .catch(() => {
        if (active) {
          setError("加载分析结果失败");
        }
      });

    return () => {
      active = false;
    };
  }, [taskId]);

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

  if (error && !task) {
    return <p>{error}</p>;
  }

  if (!task) {
    return <p>加载中</p>;
  }

  const allEvidence = task.diagnosis_findings.flatMap((finding) => finding.evidence);

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <h1 style={{ fontSize: "1.35rem", margin: 0 }}>分析结果</h1>

      <Panel title="针对用户问题的直接回答">
        <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{task.final_answer ?? "暂无最终回答"}</p>
      </Panel>

      <Panel title="最近启动概览">
        <BootTimeline sessions={task.boot_sessions} />
      </Panel>

      <Panel title="主动诊断发现">
        <div style={{ display: "grid", gap: "0.8rem" }}>
          {task.diagnosis_findings.map((finding) => (
            <article
              key={finding.finding_id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "0.85rem",
              }}
            >
              <h3 style={{ fontSize: "1rem", margin: "0 0 0.4rem" }}>{finding.title}</h3>
              <p style={{ color: "#374151", margin: "0 0 0.5rem" }}>{finding.summary}</p>
              <p style={{ color: "#6b7280", margin: "0 0 0.5rem" }}>
                {finding.playbook_id} / {finding.confidence}
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
        </div>
      </Panel>

      <Panel title="证据与分析范围">
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {allEvidence.length ? (
            allEvidence.map((evidence) => (
              <EvidenceSnippet key={evidence.snippet_id} evidence={evidence} />
            ))
          ) : (
            <p style={{ color: "#6b7280", margin: 0 }}>暂无证据片段</p>
          )}
        </div>
      </Panel>

      <Panel title="追问问答">
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>追问问题</span>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={3}
              style={{
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                font: "inherit",
                padding: "0.65rem",
              }}
            />
          </label>
          <button
            disabled={isSubmitting}
            type="submit"
            style={{
              alignItems: "center",
              background: "#0891b2",
              border: "1px solid #0e7490",
              borderRadius: "6px",
              color: "white",
              display: "inline-flex",
              gap: "0.4rem",
              justifySelf: "start",
              minHeight: "36px",
              padding: "0.45rem 0.8rem",
            }}
          >
            <Send size={16} />
            <span>提交追问</span>
          </button>
        </form>
        {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
        <div style={{ display: "grid", gap: "0.65rem", marginTop: "0.85rem" }}>
          {followUps.map((message) => (
            <article
              key={message.message_id}
              style={{
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "0.75rem",
              }}
            >
              <p style={{ margin: 0 }}>{message.content}</p>
              {message.cited_evidence.length ? (
                <p style={{ color: "#6b7280", fontSize: "0.82rem", margin: "0.45rem 0 0" }}>
                  引用证据：{message.cited_evidence.join("，")}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function Panel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section
      style={{
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "1rem",
      }}
    >
      <h2 style={{ fontSize: "1rem", margin: "0 0 0.75rem" }}>{title}</h2>
      {children}
    </section>
  );
}
