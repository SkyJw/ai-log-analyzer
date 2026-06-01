import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { App } from "./main";

vi.mock("./api/tasks", () => ({
  listTasks: vi.fn(async () => []),
}));

describe("App", () => {
  it("renders the task-oriented shell", async () => {
    render(<App />);

    expect(screen.getByRole("navigation")).toHaveTextContent("分析任务");
    expect(await screen.findByRole("heading", { name: "分析任务" })).toBeInTheDocument();
  });
});
