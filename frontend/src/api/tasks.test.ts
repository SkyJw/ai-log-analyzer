import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "./client";
import { createCase, listCases } from "./cases";
import { createFollowUp, createTask, getTask, listTasks } from "./tasks";

const taskResponse = {
  task_id: "task-1",
  question: "升级后为什么没有正常启动？",
  status: "completed",
  package_type: "single_snapshot_archive",
  snapshot_count: 1,
  final_answer: "fake answer",
  boot_sessions: [],
  diagnosis_findings: [],
};

function mockJsonResponse(payload: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(payload),
  } as Response);
}

describe("task API client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists analysis tasks", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      await mockJsonResponse([taskResponse]),
    );

    const tasks = await listTasks();

    expect(fetchMock).toHaveBeenCalledWith("/api/tasks", undefined);
    expect(tasks[0].task_id).toBe("task-1");
  });

  it("creates an analysis task using multipart form data", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      await mockJsonResponse(taskResponse),
    );
    const archive = new File(["log"], "logs.zip", { type: "application/zip" });

    const task = await createTask({ question: "why", archive });

    const [, init] = fetchMock.mock.calls[0];
    expect(fetchMock).toHaveBeenCalledWith("/api/tasks", expect.any(Object));
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
    expect(task.task_id).toBe("task-1");
  });

  it("gets one task and creates a follow-up question", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(await mockJsonResponse(taskResponse))
      .mockResolvedValueOnce(
        await mockJsonResponse({
          message_id: "m1",
          role: "assistant",
          content: "answer",
          cited_evidence: ["kernel.log"],
        }),
      );

    const task = await getTask("task-1");
    const followUp = await createFollowUp("task-1", "还需要哪些日志？");

    expect(task.task_id).toBe("task-1");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/tasks/task-1/follow-ups");
    expect(fetchMock.mock.calls[1][1]?.method).toBe("POST");
    expect(followUp.cited_evidence).toEqual(["kernel.log"]);
  });

  it("creates and lists approved cases", async () => {
    const approved = {
      case_id: "case-1",
      original_question: "why",
      problem_tags: ["driver_probe_failure"],
      final_effective_conclusion: "probe failed",
      key_evidence_fragments: ["kernel.log"],
      source_analysis_task_id: "task-1",
      reviewer: "engineer",
      status: "active",
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(await mockJsonResponse(approved))
      .mockResolvedValueOnce(await mockJsonResponse([approved]));

    const created = await createCase("task-1", {
      reviewer: "engineer",
      final_effective_conclusion: "probe failed",
    });
    const cases = await listCases();

    expect(fetchMock.mock.calls[0][0]).toBe("/api/review/tasks/task-1/approve");
    expect(created.case_id).toBe("case-1");
    expect(cases).toHaveLength(1);
  });

  it("throws ApiError when the backend returns an error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      await mockJsonResponse({ detail: "Task not found" }, false, 404),
    );

    await expect(getTask("missing")).rejects.toMatchObject<ApiError>({
      status: 404,
      message: "Task not found",
    });
  });
});
