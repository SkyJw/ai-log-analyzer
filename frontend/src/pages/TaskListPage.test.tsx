import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppLayout } from "../components/AppLayout";
import { TaskListPage } from "./TaskListPage";

vi.mock("../api/tasks", () => ({
  listTasks: vi.fn(async () => [
    {
      task_id: "task-1",
      question: "鍗囩骇鍚庝负浠€涔堟病鏈夋甯稿惎鍔紵",
      status: "completed",
      package_type: "single_snapshot_archive",
      snapshot_count: 1,
      final_answer: "fake answer",
      boot_sessions: [],
      diagnosis_findings: [],
      created_at: "2026-06-01T00:00:00Z",
    },
  ]),
}));

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("TaskListPage", () => {
  it("renders engineering navigation and task list data", async () => {
    const onReviewTask = vi.fn();
    const onViewResult = vi.fn();

    renderWithQuery(
      <AppLayout>
        <TaskListPage onReviewTask={onReviewTask} onViewResult={onViewResult} />
      </AppLayout>,
    );

    expect(screen.getByRole("navigation")).toHaveTextContent("分析任务");
    expect(screen.getByRole("navigation")).toHaveTextContent("新建分析");
    expect(screen.getByRole("navigation")).toHaveTextContent("已入库案例");

    expect(await screen.findByText("鍗囩骇鍚庝负浠€涔堟病鏈夋甯稿惎鍔紵")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();
    expect(screen.getByText("single_snapshot_archive")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("未入库")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "查看结果" }));
    fireEvent.click(screen.getByRole("button", { name: "审核入库" }));

    expect(onViewResult).toHaveBeenCalledWith("task-1");
    expect(onReviewTask).toHaveBeenCalledWith("task-1");
  });
});
