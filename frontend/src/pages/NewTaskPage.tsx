import { FileArchive, Send } from "lucide-react";
import { useState } from "react";

import { createTask } from "../api/tasks";
import { Button, ErrorState, FormField, PageHeader, Panel } from "../components/ui";

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
  const [submitError, setSubmitError] = useState<string | null>(null);

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
    setSubmitError(null);
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
    } catch {
      setSubmitError("提交失败，请检查后端服务或稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <PageHeader
        title="新建分析"
        description="上传日志包并填写问题背景，任务创建后会进入真实进度页。"
      />
      <form className="two-column" onSubmit={handleSubmit}>
        <Panel title="问题与上下文">
          <div className="form-grid">
            <FormField label="用户问题">
              <textarea
                aria-label="用户问题"
                rows={4}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="例如：升级后为什么没有从预期启动区启动？"
              />
            </FormField>
            <div style={{ display: "grid", gap: "0.8rem", gridTemplateColumns: "repeat(3, 1fr)" }}>
              <FormField label="板卡型号">
                <input
                  aria-label="板卡型号"
                  value={boardModel}
                  onChange={(event) => setBoardModel(event.target.value)}
                />
              </FormField>
              <FormField label="芯片型号">
                <input
                  aria-label="芯片型号"
                  value={chipModel}
                  onChange={(event) => setChipModel(event.target.value)}
                />
              </FormField>
              <FormField label="软件版本">
                <input
                  aria-label="软件版本"
                  value={softwareVersion}
                  onChange={(event) => setSoftwareVersion(event.target.value)}
                />
              </FormField>
            </div>
            <FormField label="问题发生背景">
              <input
                aria-label="问题发生背景"
                value={problemContext}
                onChange={(event) => setProblemContext(event.target.value)}
                placeholder="升级、重启、偶现复位等"
              />
            </FormField>
            <FormField label="期望现象">
              <input
                aria-label="期望现象"
                value={expectedBehavior}
                onChange={(event) => setExpectedBehavior(event.target.value)}
                placeholder="期望启动区、服务状态或业务表现"
              />
            </FormField>
          </div>
        </Panel>

        <div className="grid">
          <Panel title="日志包">
            <div className="form-grid">
              <FormField label="日志压缩包">
                <input
                  aria-label="日志压缩包"
                  type="file"
                  accept=".zip,.tar,.gz,.tgz,.7z"
                  onChange={(event) => setArchive(event.target.files?.[0] ?? null)}
                />
              </FormField>
              <div className="panel" style={{ background: "#f8fafc" }}>
                <div style={{ alignItems: "center", display: "flex", gap: "0.6rem" }}>
                  <FileArchive size={20} />
                  <div>
                    <strong>{archive ? archive.name : "未选择文件"}</strong>
                    <p className="muted" style={{ margin: "0.2rem 0 0" }}>
                      {archive ? `${formatFileSize(archive.size)} · 系统自动识别包类型` : "支持 zip、tar、gz、tgz、7z"}
                    </p>
                  </div>
                </div>
              </div>
              {errors.length > 0 ? (
                <div className="alert" role="alert">
                  {errors.map((error) => (
                    <div key={error}>{error}</div>
                  ))}
                </div>
              ) : null}
              {submitError ? <ErrorState label={submitError} /> : null}
              <Button className="primary" disabled={submitting} type="submit">
                <Send size={16} />
                <span>{submitting ? "正在创建任务..." : "提交分析"}</span>
              </Button>
            </div>
          </Panel>
          <Panel title="提交后流程">
            <ol className="progress-list">
              {[
                "保存上传文件",
                "解压日志包",
                "识别输入包类型",
                "匹配白名单日志",
                "重建启动过程",
                "执行诊断模板",
                "生成用户回答",
              ].map((stage, index) => (
                <li className="progress-step" key={stage}>
                  <span className="step-dot">{index + 1}</span>
                  <span>{stage}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </form>
    </section>
  );
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
