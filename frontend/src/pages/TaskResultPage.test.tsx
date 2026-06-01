import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createFollowUp, getTask } from "../api/tasks";
import { TaskResultPage } from "./TaskResultPage";

vi.mock("../api/tasks", () => ({
  getTask: vi.fn(async () => ({
    task_id: "task-1",
    question: "升级后为什么没有正常启动？",
    status: "completed",
    snapshot_count: 1,
    final_answer: "直接回答：kernel 阶段驱动 probe 失败。",
    boot_sessions: [
      {
        session_id: "snapshot-0",
        snapshot_index: 0,
        display_name: "最近第 1 次启动",
        final_state: "abnormal",
        abnormal_stage: "kernel",
        reset_detected: true,
        confidence: "medium",
        evidence_files: ["kernel.log"],
        key_events: ["kernel: driver probe failure"],
        missing_information: [],
      },
    ],
    diagnosis_findings: [
      {
        finding_id: "finding-0",
        playbook_id: "driver_probe_failure",
        related_boot_session_id: "snapshot-0",
        title: "Linux driver probe failure diagnosis",
        summary: "driver probe failed",
        confidence: "medium",
        evidence: [
          {
            snippet_id: "ev-1",
            source_file: "kernel.log",
            boot_session_id: "snapshot-0",
            content: "probe of sensor failed with error -110",
            strength: "strong",
            line_start: 42,
            line_end: 45,
          },
        ],
        next_checks: ["检查 power/reset/clock/pinmux"],
      },
    ],
  })),
  createFollowUp: vi.fn(async () => ({
    message_id: "follow-1",
    role: "assistant",
    content: "需要补充 device tree 和电源时序日志。",
    cited_evidence: ["kernel.log:42-45"],
  })),
}));

describe("TaskResultPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders final answer, boot table, findings, evidence, and follow-up input", async () => {
    render(<TaskResultPage taskId="task-1" />);

    expect(await screen.findByText("直接回答：kernel 阶段驱动 probe 失败。")).toBeInTheDocument();
    expect(screen.getByText("最近第 1 次启动")).toBeInTheDocument();
    expect(screen.getByText("abnormal")).toBeInTheDocument();
    expect(screen.getByText("kernel: driver probe failure")).toBeInTheDocument();
    expect(screen.getByText("Linux driver probe failure diagnosis")).toBeInTheDocument();
    expect(screen.getByText("probe of sensor failed with error -110")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("追问问题"), {
      target: { value: "还需要补哪些日志？" },
    });
    fireEvent.click(screen.getByRole("button", { name: "提交追问" }));

    await waitFor(() => expect(createFollowUp).toHaveBeenCalledOnce());
    expect(createFollowUp).toHaveBeenCalledWith("task-1", "还需要补哪些日志？");
    expect(await screen.findByText("需要补充 device tree 和电源时序日志。")).toBeInTheDocument();
  });

  it("loads task by id", async () => {
    render(<TaskResultPage taskId="task-1" />);

    await waitFor(() => expect(getTask).toHaveBeenCalledWith("task-1"));
  });
});
