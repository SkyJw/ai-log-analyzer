import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { AppLayout } from "../components/AppLayout";
import { TaskListPage } from "./TaskListPage";

vi.mock("../api/tasks", () => ({
  listTasks: vi.fn(async () => [
    {
      task_id: "task-1",
      question: "升级后为什么没有正常启动？",
      status: "running",
      current_stage: "run_diagnosis",
      progress_percent: 78,
      status_message: "正在执行诊断模板",
      package_type: null,
      snapshot_count: 0,
      final_answer: null,
      boot_sessions: [],
      diagnosis_findings: [],
      created_at: "2026-06-01T00:00:00Z",
    },
  ]),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("TaskListPage", () => {
  it("renders navigation, running task data, and progress action", async () => {
    const onReviewTask = vi.fn();
    const onViewProgress = vi.fn();
    const onViewResult = vi.fn();

    renderWithProviders(
      <AppLayout>
        <TaskListPage
          onReviewTask={onReviewTask}
          onViewProgress={onViewProgress}
          onViewResult={onViewResult}
        />
      </AppLayout>,
    );

    expect(screen.getByRole("navigation")).toHaveTextContent("分析任务");
    expect(screen.getByRole("navigation")).toHaveTextContent("新建分析");
    expect(screen.getByRole("navigation")).toHaveTextContent("已入库案例");

    expect(await screen.findByText("升级后为什么没有正常启动？")).toBeInTheDocument();
    expect(screen.getByText("分析中")).toBeInTheDocument();
    expect(screen.getByText("正在执行诊断模板")).toBeInTheDocument();
    expect(screen.getByText("78%")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "查看进度" }));

    expect(onViewProgress).toHaveBeenCalledWith("task-1");
    expect(onViewResult).not.toHaveBeenCalled();
    expect(onReviewTask).not.toHaveBeenCalled();
  });
});
