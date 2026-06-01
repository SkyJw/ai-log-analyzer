import { apiFetch } from "./client";
import type { ApprovedCase, ApproveCaseInput } from "../types";

export function listCases(): Promise<ApprovedCase[]> {
  return apiFetch<ApprovedCase[]>("/api/cases");
}

export function createCase(taskId: string, input: ApproveCaseInput): Promise<ApprovedCase> {
  return apiFetch<ApprovedCase>(`/api/review/tasks/${taskId}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}
