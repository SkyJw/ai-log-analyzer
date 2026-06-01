import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createCase, listCases } from "../api/cases";
import { getTask } from "../api/tasks";
import { CaseListPage } from "./CaseListPage";
import { ReviewTaskPage } from "./ReviewTaskPage";

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
        title: "Linux driver probe failure diagnosis",
        summary: "driver probe failed",
        confidence: "medium",
        evidence: [],
        next_checks: ["检查 power/reset/clock/pinmux"],
      },
    ],
  })),
}));

vi.mock("../api/cases", () => ({
  createCase: vi.fn(async () => ({
    case_id: "case-1",
    original_question: "升级后为什么没有正常启动？",
    problem_tags: ["driver_probe_failure"],
    final_effective_conclusion: "probe failed",
    key_evidence_fragments: ["kernel.log"],
    source_analysis_task_id: "task-1",
    reviewer: "engineer",
    status: "active",
  })),
  listCases: vi.fn(async () => [
    {
      case_id: "case-1",
      original_question: "升级后为什么没有正常启动？",
      problem_tags: ["driver_probe_failure"],
      final_effective_conclusion: "probe failed",
      key_evidence_fragments: ["kernel.log"],
      source_analysis_task_id: "task-1",
      reviewer: "engineer",
      status: "active",
    },
  ]),
}));

describe("ReviewTaskPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders review context and submits approval form", async () => {
    render(<ReviewTaskPage taskId="task-1" />);

    expect(await screen.findByText("升级后为什么没有正常启动？")).toBeInTheDocument();
    expect(screen.getByText("直接回答：kernel 阶段驱动 probe 失败。")).toBeInTheDocument();
    expect(screen.getByText("Linux driver probe failure diagnosis")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("审核人"), { target: { value: "engineer" } });
    fireEvent.change(screen.getByLabelText("有效结论"), { target: { value: "probe failed" } });
    fireEvent.change(screen.getByLabelText("诊断过程"), { target: { value: "checked kernel" } });
    fireEvent.change(screen.getByLabelText("解决方案或下一步"), {
      target: { value: "collect device tree" },
    });
    fireEvent.change(screen.getByLabelText("适用条件"), { target: { value: "same driver" } });
    fireEvent.change(screen.getByLabelText("不适用条件"), { target: { value: "no probe fail" } });
    fireEvent.click(screen.getByRole("button", { name: "确认入库" }));

    await waitFor(() => expect(createCase).toHaveBeenCalledOnce());
    expect(createCase).toHaveBeenCalledWith(
      "task-1",
      expect.objectContaining({
        reviewer: "engineer",
        final_effective_conclusion: "probe failed",
      }),
    );
    expect(await screen.findByText("已入库：case-1")).toBeInTheDocument();
  });

  it("loads task by id", async () => {
    render(<ReviewTaskPage taskId="task-1" />);

    await waitFor(() => expect(getTask).toHaveBeenCalledWith("task-1"));
  });
});

describe("CaseListPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders approved cases with enabled status", async () => {
    render(<CaseListPage />);

    expect(await screen.findByText("升级后为什么没有正常启动？")).toBeInTheDocument();
    expect(screen.getByText("driver_probe_failure")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(listCases).toHaveBeenCalledOnce();
  });
});
