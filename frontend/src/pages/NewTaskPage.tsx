import { useState } from "react";

import { createTask } from "../api/tasks";

type NewTaskPageProps = {
  onCreated?: (taskId: string) => void;
};

export function NewTaskPage({ onCreated }: NewTaskPageProps) {
  const [question, setQuestion] = useState("");
  const [archive, setArchive] = useState<File | null>(null);
  const [boardModel, setBoardModel] = useState("");
  const [chipModel, setChipModel] = useState("");
  const [softwareVersion, setSoftwareVersion] = useState("");
  const [problemContext, setProblemContext] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = [];
    if (!question.trim()) {
      nextErrors.push("用户问题必填");
    }
    if (!archive) {
      nextErrors.push("日志压缩包必填");
    }
    setErrors(nextErrors);
    if (nextErrors.length > 0 || !archive) {
      return;
    }

    setSubmitting(true);
    try {
      const task = await createTask({
        question,
        archive,
        board_model: boardModel,
        chip_model: chipModel,
        software_version: softwareVersion,
        problem_context: problemContext,
        expected_behavior: expectedBehavior,
      });
      onCreated?.(task.task_id);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <h1 style={{ fontSize: "1.35rem" }}>新建分析</h1>
      <form
        onSubmit={handleSubmit}
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          display: "grid",
          gap: "0.9rem",
          maxWidth: "760px",
          padding: "1rem",
        }}
      >
        <Field label="用户问题">
          <textarea
            aria-label="用户问题"
            rows={4}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
        </Field>
        <Field label="日志压缩包">
          <input
            aria-label="日志压缩包"
            type="file"
            accept=".zip,.tar,.gz,.tgz,.7z"
            onChange={(event) => setArchive(event.target.files?.[0] ?? null)}
          />
        </Field>
        <Field label="板卡型号">
          <input
            aria-label="板卡型号"
            value={boardModel}
            onChange={(event) => setBoardModel(event.target.value)}
          />
        </Field>
        <Field label="芯片型号">
          <input
            aria-label="芯片型号"
            value={chipModel}
            onChange={(event) => setChipModel(event.target.value)}
          />
        </Field>
        <Field label="软件版本">
          <input
            aria-label="软件版本"
            value={softwareVersion}
            onChange={(event) => setSoftwareVersion(event.target.value)}
          />
        </Field>
        <Field label="问题发生背景">
          <input
            aria-label="问题发生背景"
            value={problemContext}
            onChange={(event) => setProblemContext(event.target.value)}
          />
        </Field>
        <Field label="期望现象">
          <input
            aria-label="期望现象"
            value={expectedBehavior}
            onChange={(event) => setExpectedBehavior(event.target.value)}
          />
        </Field>
        {errors.length > 0 ? (
          <div role="alert" style={{ color: "#991b1b", display: "grid", gap: "0.25rem" }}>
            {errors.map((error) => (
              <span key={error}>{error}</span>
            ))}
          </div>
        ) : null}
        <button type="submit" disabled={submitting}>
          提交分析
        </button>
      </form>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: "0.35rem" }}>
      <span style={{ color: "#374151", fontSize: "0.86rem", fontWeight: 700 }}>{label}</span>
      {children}
    </label>
  );
}
