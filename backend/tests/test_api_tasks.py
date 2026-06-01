from io import BytesIO
from zipfile import ZipFile

from fastapi.testclient import TestClient

from app.main import app


def zip_bytes(files: dict[str, str]) -> bytes:
    buffer = BytesIO()
    with ZipFile(buffer, "w") as archive:
        for name, content in files.items():
            archive.writestr(name, content)
    return buffer.getvalue()


def create_completed_task(client: TestClient) -> dict[str, object]:
    response = client.post(
        "/api/tasks",
        data={"question": "升级后为什么没有正常启动？"},
        files={
            "archive": (
                "logs.zip",
                zip_bytes(
                    {
                        "kernel_history.log": "\n".join(
                            [
                                "Linux version 6.1.0",
                                "driver foo probe failed with error -110",
                                "watchdog reset detected",
                            ]
                        )
                    }
                ),
                "application/zip",
            )
        },
    )
    assert response.status_code == 200
    return response.json()


def test_post_tasks_creates_analysis_task() -> None:
    client = TestClient(app)

    payload = create_completed_task(client)

    assert payload["task_id"]
    assert payload["status"] == "completed"
    assert payload["package_type"] == "single_snapshot_archive"
    assert payload["snapshot_count"] == 1
    assert payload["boot_sessions"][0]["final_state"] == "abnormal"
    assert payload["diagnosis_findings"][0]["playbook_id"] == "driver_probe_failure"


def test_get_tasks_lists_created_tasks() -> None:
    client = TestClient(app)
    created = create_completed_task(client)

    response = client.get("/api/tasks")

    assert response.status_code == 200
    assert any(task["task_id"] == created["task_id"] for task in response.json())


def test_get_task_returns_task_result() -> None:
    client = TestClient(app)
    created = create_completed_task(client)

    response = client.get(f"/api/tasks/{created['task_id']}")

    assert response.status_code == 200
    assert response.json()["task_id"] == created["task_id"]
    assert response.json()["final_answer"]


def test_follow_up_question_returns_grounded_answer() -> None:
    client = TestClient(app)
    created = create_completed_task(client)

    response = client.post(
        f"/api/tasks/{created['task_id']}/follow-ups",
        json={"question": "还需要补充哪些日志？"},
    )

    assert response.status_code == 200
    assert response.json()["role"] == "assistant"
    assert response.json()["content"]
    assert response.json()["cited_evidence"]


def test_review_approval_creates_approved_case() -> None:
    client = TestClient(app)
    created = create_completed_task(client)

    response = client.post(
        f"/api/review/tasks/{created['task_id']}/approve",
        json={
            "reviewer": "board-engineer",
            "final_effective_conclusion": "kernel driver probe failed",
            "diagnosis_process": "checked kernel evidence",
            "solution_or_next_action": "collect device tree",
            "applicable_conditions": "same board and driver",
            "non_applicable_conditions": "no kernel probe failure",
        },
    )

    assert response.status_code == 200
    approved = response.json()
    assert approved["source_analysis_task_id"] == created["task_id"]
    assert approved["status"] == "active"

    cases = client.get("/api/cases")
    assert cases.status_code == 200
    assert any(case["case_id"] == approved["case_id"] for case in cases.json())
