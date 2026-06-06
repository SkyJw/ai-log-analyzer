from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.models.schemas import AnalysisTaskCreate, AnalysisTaskView, FollowUpQuestionCreate
from app.workers.task_runner import FollowUpMessageView, task_runner

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.post("", response_model=AnalysisTaskView)
def create_task(
    question: str = Form(...),
    archive: UploadFile = File(...),
    board_model: str | None = Form(None),
    chip_model: str | None = Form(None),
    software_version: str | None = Form(None),
    problem_context: str | None = Form(None),
    expected_behavior: str | None = Form(None),
) -> AnalysisTaskView:
    payload = AnalysisTaskCreate(
        question=question,
        board_model=board_model,
        chip_model=chip_model,
        software_version=software_version,
        problem_context=problem_context,
        expected_behavior=expected_behavior,
    )
    return task_runner.create_task(payload, archive.filename or "upload.zip", archive.file)


@router.get("", response_model=list[AnalysisTaskView])
def list_tasks() -> list[AnalysisTaskView]:
    return task_runner.store.list_tasks()


@router.get("/{task_id}", response_model=AnalysisTaskView)
def get_task(task_id: str) -> AnalysisTaskView:
    task = task_runner.store.get_task_view(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


class FollowUpResponse(BaseModel):
    message_id: str
    role: str
    content: str
    cited_evidence: list[str]


@router.post("/{task_id}/follow-ups", response_model=FollowUpResponse)
def create_follow_up(
    task_id: str,
    payload: FollowUpQuestionCreate,
) -> FollowUpMessageView:
    message = task_runner.answer_follow_up(task_id, payload.question)
    if message is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return message
