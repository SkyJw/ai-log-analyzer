from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.schemas import ApprovedCaseView
from app.workers.task_runner import task_runner

router = APIRouter(prefix="/api/review", tags=["review"])


class ApproveTaskRequest(BaseModel):
    reviewer: str
    final_effective_conclusion: str
    diagnosis_process: str | None = None
    solution_or_next_action: str | None = None
    applicable_conditions: str | None = None
    non_applicable_conditions: str | None = None


@router.post("/tasks/{task_id}/approve", response_model=ApprovedCaseView)
def approve_task(task_id: str, payload: ApproveTaskRequest) -> ApprovedCaseView:
    approved = task_runner.approve_case(
        task_id=task_id,
        reviewer=payload.reviewer,
        final_effective_conclusion=payload.final_effective_conclusion,
        diagnosis_process=payload.diagnosis_process,
        solution_or_next_action=payload.solution_or_next_action,
        applicable_conditions=payload.applicable_conditions,
        non_applicable_conditions=payload.non_applicable_conditions,
    )
    if approved is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return approved
