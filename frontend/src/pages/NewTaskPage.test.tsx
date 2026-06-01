import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createTask } from "../api/tasks";
import { NewTaskPage } from "./NewTaskPage";
import { TaskProgressPage } from "./TaskProgressPage";

vi.mock("../api/tasks", () => ({
  createTask: vi.fn(async () => ({
    task_id: "task-1",
    question: "why",
    status: "completed",
    snapshot_count: 1,
    boot_sessions: [],
    diagnosis_findings: [],
  })),
}));

describe("NewTaskPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("validates required question and archive fields", async () => {
    render(<NewTaskPage />);

    fireEvent.click(screen.getByRole("button", { name: "提交分析" }));

    expect(await screen.findByText("用户问题必填")).toBeInTheDocument();
    expect(screen.getByText("日志压缩包必填")).toBeInTheDocument();
  });

  it("submits question, archive, and optional context", async () => {
    const onCreated = vi.fn();
    render(<NewTaskPage onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText("用户问题"), {
      target: { value: "升级后为什么没有正常启动？" },
    });
    fireEvent.change(screen.getByLabelText("板卡型号"), { target: { value: "board-a" } });
    fireEvent.change(screen.getByLabelText("芯片型号"), { target: { value: "chip-a" } });
    fireEvent.change(screen.getByLabelText("软件版本"), { target: { value: "v1.0" } });
    fireEvent.change(screen.getByLabelText("问题发生背景"), { target: { value: "升级" } });
    fireEvent.change(screen.getByLabelText("期望现象"), { target: { value: "进入 A 区" } });
    fireEvent.change(screen.getByLabelText("日志压缩包"), {
      target: {
        files: [new File(["log"], "logs.zip", { type: "application/zip" })],
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "提交分析" }));

    await waitFor(() => expect(createTask).toHaveBeenCalledOnce());
    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        question: "升级后为什么没有正常启动？",
        board_model: "board-a",
        chip_model: "chip-a",
        software_version: "v1.0",
        problem_context: "升级",
        expected_behavior: "进入 A 区",
      }),
    );
    expect(onCreated).toHaveBeenCalledWith("task-1");
  });
});

describe("TaskProgressPage", () => {
  it("renders ordered analysis stages", () => {
    render(<TaskProgressPage currentStageIndex={2} snapshotCount={3} />);

    expect(screen.getByText("解压日志包")).toBeInTheDocument();
    expect(screen.getByText("识别输入包类型")).toBeInTheDocument();
    expect(screen.getByText("已识别 3 次启动快照")).toBeInTheDocument();
    expect(screen.getByText("匹配白名单日志")).toBeInTheDocument();
    expect(screen.getByText("重建启动过程")).toBeInTheDocument();
    expect(screen.getByText("执行诊断模板")).toBeInTheDocument();
    expect(screen.getByText("回答用户问题")).toBeInTheDocument();
    expect(screen.getByText("分析完成")).toBeInTheDocument();
  });
});
