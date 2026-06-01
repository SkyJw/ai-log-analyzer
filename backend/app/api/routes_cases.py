from fastapi import APIRouter

from app.models.schemas import ApprovedCaseView
from app.workers.task_runner import task_runner

router = APIRouter(prefix="/api/cases", tags=["cases"])


@router.get("", response_model=list[ApprovedCaseView])
def list_cases() -> list[ApprovedCaseView]:
    return task_runner.store.list_cases()
