import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./main";

vi.mock("./api/tasks", () => ({
  createFollowUp: vi.fn(),
  createTask: vi.fn(),
  getTask: vi.fn(),
  listTasks: vi.fn(async () => []),
}));

vi.mock("./api/cases", () => ({
  createCase: vi.fn(),
  listCases: vi.fn(async () => []),
}));

describe("App", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the task-oriented shell", async () => {
    render(<App />);

    expect(screen.getByRole("navigation")).toHaveTextContent("分析任务");
    expect(await screen.findByRole("heading", { name: "分析任务" })).toBeInTheDocument();
  });

  it("switches between primary app pages from navigation", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /新建分析/ }));
    expect(screen.getByRole("heading", { name: "新建分析" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /已入库案例/ }));
    expect(await screen.findByRole("heading", { name: "已入库案例" })).toBeInTheDocument();
  });
});
