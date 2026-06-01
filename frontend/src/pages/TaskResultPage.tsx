import { useEffect, useState } from "react";

import { createFollowUp, getTask } from "../api/tasks";
import { BootTimeline } from "../components/BootTimeline";
import { EvidenceSnippet } from "../components/EvidenceSnippet";
import type { AnalysisTask, FollowUpMessage } from "../types";

type TaskResultPageProps = {
  taskId: string;
};

export function TaskResultPage({ taskId }: TaskResultPageProps) {
  const [task, setTask] = useState<AnalysisTask | null>(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<FollowUpMessage[]>([]);

  useEffect(() => {
    void getTask(taskId).then(setTask);
  }, [taskId]);

  async function handleFollowUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) {
      return;
    }
    const message = await createFollowUp(taskId, question);
    setMessages((current) => [...current, message]);
    setQuestion("");
  }

  if (!task) {
    return <p>加载中</p>;
  }

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <h1 style={{ fontSize: "1.35rem", margin: 0 }}>分析结果</h1>
      <Panel title="针对用户问题的直接回答">
        <p>{task.final_answer}</p>
      </Panel>
      <Panel title="最近启动概览">
        <BootTimeline sessions={task.boot_sessions} />
      </Panel>
      <Panel title="主动诊断发现">
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {task.diagnosis_findings.map((finding) => (
            <article key={finding.finding_id}>
              <h3 style={{ margin: "0 0 0.35rem" }}>{finding.title}</h3>
              <p>{finding.summary}</p>
              <p>置信度：{finding.confidence}</p>
              <p>下一步：{finding.next_checks.join("；") || "-"}</p>
            </article>
          ))}
        </div>
      </Panel>
      <Panel title="证据与分析范围">
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {task.diagnosis_findings.flatMap((finding) =>
            finding.evidence.map((evidence) => (
              <EvidenceSnippet key={evidence.snippet_id} evidence={evidence} />
            )),
          )}
        </div>
      </Panel>
      <Panel title="追问问答">
        <form onSubmit={handleFollowUp} style={{ display: "grid", gap: "0.5rem" }}>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>追问</span>
            <input
              aria-label="追问"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
          </label>
          <button type="submit">发送追问</button>
        </form>
        {messages.map((message) => (
          <p key={message.message_id}>{message.content}</p>
        ))}
      </Panel>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "1rem",
      }}
    >
      <h2 style={{ fontSize: "1rem", marginTop: 0 }}>{title}</h2>
      {children}
    </section>
  );
}
