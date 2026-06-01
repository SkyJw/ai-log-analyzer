import { CheckCircle2 } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

import { createCase } from "../api/cases";
import { getTask } from "../api/tasks";
import { BootTimeline } from "../components/BootTimeline";
import { EvidenceSnippet } from "../components/EvidenceSnippet";
import type { AnalysisTask, ApprovedCase, ApproveCaseInput } from "../types";

type ReviewTaskPageProps = {
  taskId: string;
};

const emptyForm: ApproveCaseInput = {
  reviewer: "",
  final_effective_conclusion: "",
  diagnosis_process: "",
  solution_or_next_action: "",
  applicable_conditions: "",
  non_applicable_conditions: "",
};

export function ReviewTaskPage({ taskId }: ReviewTaskPageProps) {
  const [task, setTask] = useState<AnalysisTask | null>(null);
  const [form, setForm] = useState<ApproveCaseInput>(emptyForm);
  const [approvedCase, setApprovedCase] = useState<ApprovedCase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          setError("加载审核任务失败");
        }
      });

    return () => {
      active = false;
    };
  }, [taskId]);

  function updateField(field: keyof ApproveCaseInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const created = await createCase(taskId, form);
      setApprovedCase(created);
      setError(null);
    } catch {
      setError("确认入库失败");
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

  const evidence = task.diagnosis_findings.flatMap((finding) => finding.evidence);
  const evidenceFiles = new Set(task.boot_sessions.flatMap((session) => session.evidence_files));

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <h1 style={{ fontSize: "1.35rem", margin: 0 }}>审核入库</h1>

      <Panel title="原始问题">
        <p style={{ margin: 0 }}>{task.question}</p>
      </Panel>

      <Panel title="最终回答">
        <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{task.final_answer ?? "暂无最终回答"}</p>
      </Panel>

      <Panel title="启动重建结果">
        <BootTimeline sessions={task.boot_sessions} />
      </Panel>

      <Panel title="诊断发现">
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {task.diagnosis_findings.map((finding) => (
            <article
              key={finding.finding_id}
              style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "0.8rem" }}
            >
              <h3 style={{ fontSize: "1rem", margin: "0 0 0.35rem" }}>{finding.title}</h3>
              <p style={{ margin: "0 0 0.4rem" }}>{finding.summary}</p>
              <p style={{ color: "#6b7280", margin: 0 }}>
                playbook：{finding.playbook_id} / 置信度：{finding.confidence}
              </p>
            </article>
          ))}
        </div>
      </Panel>

      <Panel title="关键证据">
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {evidence.length ? (
            evidence.map((item) => <EvidenceSnippet key={item.snippet_id} evidence={item} />)
          ) : (
            <p style={{ color: "#6b7280", margin: 0 }}>
              {Array.from(evidenceFiles).join("，") || "暂无证据片段"}
            </p>
          )}
        </div>
      </Panel>

      <Panel title="模型与模板版本">
        <p style={{ margin: "0 0 0.4rem" }}>模型版本：未记录</p>
        <p style={{ margin: 0 }}>
          诊断模板：{task.diagnosis_findings.map((finding) => finding.playbook_id).join("，") || "-"}
        </p>
      </Panel>

      <Panel title="追问历史">
        <p style={{ color: "#6b7280", margin: 0 }}>暂无追问历史</p>
      </Panel>

      <Panel title="入库审核表单">
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.8rem" }}>
          <TextField
            label="审核人"
            value={form.reviewer}
            onChange={(value) => updateField("reviewer", value)}
          />
          <TextField
            label="有效结论"
            value={form.final_effective_conclusion}
            onChange={(value) => updateField("final_effective_conclusion", value)}
          />
          <TextAreaField
            label="诊断过程"
            value={form.diagnosis_process ?? ""}
            onChange={(value) => updateField("diagnosis_process", value)}
          />
          <TextAreaField
            label="解决方案或下一步"
            value={form.solution_or_next_action ?? ""}
            onChange={(value) => updateField("solution_or_next_action", value)}
          />
          <TextAreaField
            label="适用条件"
            value={form.applicable_conditions ?? ""}
            onChange={(value) => updateField("applicable_conditions", value)}
          />
          <TextAreaField
            label="不适用条件"
            value={form.non_applicable_conditions ?? ""}
            onChange={(value) => updateField("non_applicable_conditions", value)}
          />
          <button
            disabled={isSubmitting}
            type="submit"
            style={{
              alignItems: "center",
              background: "#047857",
              border: "1px solid #065f46",
              borderRadius: "6px",
              color: "white",
              display: "inline-flex",
              gap: "0.4rem",
              justifySelf: "start",
              minHeight: "36px",
              padding: "0.45rem 0.8rem",
            }}
          >
            <CheckCircle2 size={16} />
            <span>确认入库</span>
          </button>
          {error ? <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p> : null}
          {approvedCase ? <p style={{ margin: 0 }}>已入库：{approvedCase.case_id}</p> : null}
        </form>
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

function TextField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label style={{ display: "grid", gap: "0.35rem" }}>
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "6px",
          font: "inherit",
          padding: "0.55rem 0.65rem",
        }}
      />
    </label>
  );
}

function TextAreaField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label style={{ display: "grid", gap: "0.35rem" }}>
      <span>{label}</span>
      <textarea
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "6px",
          font: "inherit",
          padding: "0.55rem 0.65rem",
        }}
      />
    </label>
  );
}
