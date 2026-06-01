import { apiFetch } from "./client";
import type { AnalysisTask, CreateTaskInput, FollowUpMessage } from "../types";

export function listTasks(): Promise<AnalysisTask[]> {
  return apiFetch<AnalysisTask[]>("/api/tasks");
}

export function getTask(taskId: string): Promise<AnalysisTask> {
  return apiFetch<AnalysisTask>(`/api/tasks/${taskId}`);
}

export function createTask(input: CreateTaskInput): Promise<AnalysisTask> {
  const formData = new FormData();
  formData.append("question", input.question);
  formData.append("archive", input.archive);
  appendOptional(formData, "board_model", input.board_model);
  appendOptional(formData, "chip_model", input.chip_model);
  appendOptional(formData, "software_version", input.software_version);
  appendOptional(formData, "problem_context", input.problem_context);
  appendOptional(formData, "expected_behavior", input.expected_behavior);

  return apiFetch<AnalysisTask>("/api/tasks", {
    method: "POST",
    body: formData,
  });
}

export function createFollowUp(taskId: string, question: string): Promise<FollowUpMessage> {
  return apiFetch<FollowUpMessage>(`/api/tasks/${taskId}/follow-ups`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });
}

function appendOptional(formData: FormData, key: string, value?: string) {
  if (value) {
    formData.append(key, value);
  }
}
