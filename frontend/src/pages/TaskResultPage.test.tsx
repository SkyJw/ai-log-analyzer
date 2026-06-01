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
    package_type: "single_snapshot_archive",
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
        evidence_files: ["kernel_history.log:10-12"],
        key_events: ["kernel: driver probe failure"],
        missing_information: ["userspace evidence"],
      },
    ],
    diagnosis_findings: [
      {
        finding_id: "finding-0",
        playbook_id: "driver_probe_failure",
        related_boot_session_id: "snapshot-0",
        title: "Linux driver probe failure diagnosis",
        summary: "driver_probe_failure",
        confidence: "medium",
        evidence: [
          {
            snippet_id: "evidence-0",
            source_file: "kernel_history.log",
            content: "probe failed with error -110",
            strength: "strong",
            line_start: 10,
            line_end: 12,
          },
        ],
        next_checks: ["检查 power/reset/clock/pinmux"],
      },
    ],
  })),
  createFollowUp: vi.fn(async () => ({
    message_id: "m1",
    role: "assistant",
    content: "需要补充 bootloader 日志。",
    cited_evidence: ["kernel_history.log"],
  })),
}));

describe("TaskResultPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders answer, boot overview, findings, evidence, and follow-up input", async () => {
    render(<TaskResultPage taskId="task-1" />);

    expect(await screen.findByText("直接回答：kernel 阶段驱动 probe 失败。")).toBeInTheDocument();
    expect(screen.getByText("最近第 1 次启动")).toBeInTheDocument();
    expect(screen.getByText("abnormal")).toBeInTheDocument();
    expect(screen.getByText("kernel")).toBeInTheDocument();
    expect(screen.getByText("是")).toBeInTheDocument();
    expect(screen.getByText("Linux driver probe failure diagnosis")).toBeInTheDocument();
    expect(screen.getByText("probe failed with error -110")).toBeInTheDocument();
    expect(screen.getByLabelText("追问")).toBeInTheDocument();
  });

  it("submits follow-up questions bound to the task", async () => {
    render(<TaskResultPage taskId="task-1" />);
    await screen.findByText("直接回答：kernel 阶段驱动 probe 失败。");

    fireEvent.change(screen.getByLabelText("追问"), {
      target: { value: "还需要哪些日志？" },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送追问" }));

    await waitFor(() => expect(createFollowUp).toHaveBeenCalledWith("task-1", "还需要哪些日志？"));
    expect(await screen.findByText("需要补充 bootloader 日志。")).toBeInTheDocument();
  });

  it("loads the task by id", async () => {
    render(<TaskResultPage taskId="task-1" />);

    await waitFor(() => expect(getTask).toHaveBeenCalledWith("task-1"));
  });
});
