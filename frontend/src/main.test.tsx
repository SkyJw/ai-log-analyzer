import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./main";

vi.mock("./api/tasks", () => ({
  createFollowUp: vi.fn(),
  createTask: vi.fn(async () => ({
    task_id: "task-1",
    question: "升级后为什么没有正常启动？",
    status: "queued",
    current_stage: "save_upload",
    progress_percent: 5,
    status_message: "已保存上传文件，等待开始分析",
    snapshot_count: 0,
    boot_sessions: [],
    diagnosis_findings: [],
  })),
  getTask: vi.fn(async () => ({
    task_id: "task-1",
    question: "升级后为什么没有正常启动？",
    status: "running",
    current_stage: "run_diagnosis",
    progress_percent: 78,
    status_message: "正在执行诊断模板",
    snapshot_count: 0,
    boot_sessions: [],
    diagnosis_findings: [],
  })),
  listTasks: vi.fn(async () => [
    {
      task_id: "task-1",
      question: "升级后为什么没有正常启动？",
      status: "running",
      current_stage: "run_diagnosis",
      progress_percent: 78,
      status_message: "正在执行诊断模板",
      snapshot_count: 0,
      boot_sessions: [],
      diagnosis_findings: [],
      created_at: "2026-06-01T00:00:00Z",
    },
  ]),
}));

vi.mock("./api/cases", () => ({
  createCase: vi.fn(),
  listCases: vi.fn(async () => []),
}));

describe("App routes", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    window.history.pushState({}, "", "/");
  });

  it("renders the routed task shell", async () => {
    window.history.pushState({}, "", "/tasks");

    render(<App />);

    expect(screen.getByRole("navigation")).toHaveTextContent("分析任务");
    expect(await screen.findByRole("heading", { name: "分析任务" })).toBeInTheDocument();
    expect(screen.getByText("升级后为什么没有正常启动？")).toBeInTheDocument();
  });

  it("submits a new task and navigates to the progress route", async () => {
    window.history.pushState({}, "", "/tasks/new");
    render(<App />);

    fireEvent.change(screen.getByLabelText("用户问题"), {
      target: { value: "升级后为什么没有正常启动？" },
    });
    fireEvent.change(screen.getByLabelText("日志压缩包"), {
      target: {
        files: [new File(["log"], "logs.zip", { type: "application/zip" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "提交分析" }));

    expect(await screen.findByRole("heading", { name: "分析进度" })).toBeInTheDocument();
    expect(await screen.findByText("正在执行诊断模板")).toBeInTheDocument();
    await waitFor(() => expect(window.location.pathname).toBe("/tasks/task-1/progress"));
  });
});
