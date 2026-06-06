import { CheckCircle2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { createCase } from "../api/cases";
import { getTask } from "../api/tasks";
import { BootTimeline } from "../components/BootTimeline";
import { EvidenceSnippet } from "../components/EvidenceSnippet";
import { Button, FormField, LoadingState, PageHeader, Panel, ErrorState } from "../components/ui";
import type { ApprovedCase, ApproveCaseInput } from "../types";

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
  const [form, setForm] = useState<ApproveCaseInput>(emptyForm);
  const [approvedCase, setApprovedCase] = useState<ApprovedCase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: task, isLoading, error: loadError } = useQuery({
    queryKey: ["tasks", taskId],
    queryFn: () => getTask(taskId),
  });

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

  if (isLoading) {
    return <LoadingState label="正在加载审核任务..." />;
  }

  if (loadError || !task) {
    return <ErrorState label="加载审核任务失败" />;
  }

  const evidence = task.diagnosis_findings.flatMap((finding) => finding.evidence);
  const evidenceFiles = new Set(task.boot_sessions.flatMap((session) => session.evidence_files));

  return (
    <section className="grid">
      <PageHeader title="审核入库" description={task.question} />

      <div className="two-column">
        <div className="grid">
          <Panel title="最终回答">
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{task.final_answer ?? "暂无最终回答"}</p>
          </Panel>
          <Panel title="启动重建结果">
            <BootTimeline sessions={task.boot_sessions} />
          </Panel>
          <Panel title="诊断发现">
            <div className="grid">
              {task.diagnosis_findings.map((finding) => (
                <article className="panel" key={finding.finding_id}>
                  <h3 style={{ fontSize: "0.98rem", margin: "0 0 0.35rem" }}>{finding.title}</h3>
                  <p style={{ margin: "0 0 0.4rem" }}>{finding.summary}</p>
                  <p className="muted" style={{ margin: 0 }}>
                    模板：{finding.playbook_id} / 置信度：{finding.confidence}
                  </p>
                </article>
              ))}
            </div>
          </Panel>
          <Panel title="关键证据">
            <div className="grid">
              {evidence.length ? (
                evidence.map((item) => <EvidenceSnippet key={item.snippet_id} evidence={item} />)
              ) : (
                <p className="muted" style={{ margin: 0 }}>
                  {Array.from(evidenceFiles).join("；") || "暂无证据片段"}
                </p>
              )}
            </div>
          </Panel>
        </div>

        <Panel title="入库审核表单">
          <form className="form-grid" onSubmit={handleSubmit}>
            <TextField label="审核人" value={form.reviewer} onChange={(value) => updateField("reviewer", value)} />
            <TextField
              label="有效结论"
              value={form.final_effective_conclusion}
              onChange={(value) => updateField("final_effective_conclusion", value)}
            />
            <TextAreaField label="诊断过程" value={form.diagnosis_process ?? ""} onChange={(value) => updateField("diagnosis_process", value)} />
            <TextAreaField
              label="解决方案或下一步"
              value={form.solution_or_next_action ?? ""}
              onChange={(value) => updateField("solution_or_next_action", value)}
            />
            <TextAreaField label="适用条件" value={form.applicable_conditions ?? ""} onChange={(value) => updateField("applicable_conditions", value)} />
            <TextAreaField
              label="不适用条件"
              value={form.non_applicable_conditions ?? ""}
              onChange={(value) => updateField("non_applicable_conditions", value)}
            />
            <Button className="primary" disabled={isSubmitting} type="submit">
              <CheckCircle2 size={16} />
              <span>确认入库</span>
            </Button>
            {error ? <p className="alert">{error}</p> : null}
            {approvedCase ? <p style={{ margin: 0 }}>已入库：{approvedCase.case_id}</p> : null}
          </form>
        </Panel>
      </div>
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
    <FormField label={label}>
      <input aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} />
    </FormField>
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
    <FormField label={label}>
      <textarea aria-label={label} rows={3} value={value} onChange={(event) => onChange(event.target.value)} />
    </FormField>
  );
}
