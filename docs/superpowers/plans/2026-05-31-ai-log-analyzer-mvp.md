# AI Log Analyzer MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first usable intranet MVP for uploading communication-board log archives, reconstructing boot sessions, running playbook-based diagnosis, answering the user's question, and approving useful results into a local knowledge set.

**Architecture:** Use a deterministic backend workflow as the main spine, with controlled model calls only for log fact extraction, playbook analysis, final dynamic answer, follow-up Q&A, and approved-case summarization. The frontend is an engineering tool interface centered on analysis tasks: create task, watch progress, inspect boot overview, read diagnosis findings, ask follow-up questions, and approve cases.

**Tech Stack:** Python 3.11+, FastAPI, SQLAlchemy, SQLite for MVP, Pydantic, pytest, React + TypeScript + Vite, TanStack Query, Vitest, YAML configuration files, local filesystem object storage, MiniMax M2.7 model adapter with fake provider for tests.

---

## File Structure

```text
backend/
  app/
    main.py
    api/
      routes_tasks.py
      routes_review.py
      routes_cases.py
    core/
      config.py
      database.py
      storage.py
    models/
      db.py
      schemas.py
    services/
      archive_service.py
      whitelist_service.py
      segment_service.py
      boot_reconstruction_service.py
      playbook_service.py
      model_gateway.py
      diagnosis_workflow.py
      case_service.py
    workers/
      task_runner.py
  tests/
    fixtures/
      sample_snapshot_0/
      sample_snapshot_1/
    test_archive_service.py
    test_whitelist_service.py
    test_boot_reconstruction_service.py
    test_diagnosis_workflow.py
frontend/
  src/
    api/
      client.ts
      tasks.ts
      cases.ts
    components/
      AppLayout.tsx
      StatusBadge.tsx
      EvidenceSnippet.tsx
      BootTimeline.tsx
    pages/
      TaskListPage.tsx
      NewTaskPage.tsx
      TaskProgressPage.tsx
      TaskResultPage.tsx
      ReviewTaskPage.tsx
      CaseListPage.tsx
    types.ts
    main.tsx
configs/
  log_whitelist/
    kernel_history.yaml
    bootloader_current.yaml
    userspace_startup.yaml
  diagnosis_playbooks/
    boot_region_abnormal.yaml
    driver_probe_failure.yaml
    userspace_service_startup.yaml
docs/
  superpowers/
    specs/
    plans/
```

## Phase 1: Backend Core

### Task 1: Project Scaffold

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/app/main.py`
- Create: `backend/app/core/config.py`
- Create: `backend/app/core/database.py`
- Create: `backend/app/core/storage.py`
- Create: `backend/app/models/db.py`
- Create: `backend/app/models/schemas.py`
- Create: `frontend/package.json`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `README.md`

- [ ] **Step 1: Create backend package and dependencies**

Use `backend/pyproject.toml`:

```toml
[project]
name = "ai-log-analyzer-backend"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
  "fastapi>=0.111.0",
  "uvicorn[standard]>=0.30.0",
  "pydantic>=2.7.0",
  "pydantic-settings>=2.2.0",
  "sqlalchemy>=2.0.0",
  "python-multipart>=0.0.9",
  "pyyaml>=6.0.1",
  "httpx>=0.27.0"
]

[project.optional-dependencies]
dev = [
  "pytest>=8.2.0",
  "pytest-asyncio>=0.23.0",
  "ruff>=0.5.0"
]

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]
```

- [ ] **Step 2: Create FastAPI entrypoint**

Use `backend/app/main.py`:

```python
from fastapi import FastAPI

app = FastAPI(title="AI Log Analyzer", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
```

- [ ] **Step 3: Create frontend scaffold**

Use `frontend/package.json`:

```json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "lint": "eslint src"
  },
  "dependencies": {
    "@vitejs/plugin-react": "latest",
    "vite": "latest",
    "typescript": "latest",
    "react": "latest",
    "react-dom": "latest",
    "@tanstack/react-query": "latest",
    "lucide-react": "latest"
  },
  "devDependencies": {
    "vitest": "latest",
    "@testing-library/react": "latest",
    "@testing-library/jest-dom": "latest",
    "eslint": "latest"
  }
}
```

- [ ] **Step 4: Verify scaffold**

Run:

```powershell
cd backend
python -m pip install -e ".[dev]"
python -m pytest
```

Expected: pytest starts and reports no tests collected or all tests passing.

- [ ] **Step 5: Commit**

```powershell
git add backend frontend README.md
git commit -m "chore: scaffold backend and frontend"
```

### Task 2: Database Models And API Schemas

**Files:**
- Modify: `backend/app/models/db.py`
- Modify: `backend/app/models/schemas.py`
- Modify: `backend/app/core/database.py`
- Test: `backend/tests/test_models.py`

- [ ] **Step 1: Add failing schema tests**

Create tests that verify an analysis task can represent the three-layer result:

```python
from app.models.schemas import AnalysisTaskCreate, BootSessionView


def test_analysis_task_create_requires_question():
    task = AnalysisTaskCreate(question="升级后没有从预期启动区启动")
    assert task.question


def test_boot_session_view_contains_evidence():
    session = BootSessionView(
        session_id="s0",
        snapshot_index=0,
        display_name="最近第 1 次启动",
        final_state="abnormal",
        abnormal_stage="kernel",
        reset_detected=True,
        confidence="medium",
        evidence_files=["boot.log"],
    )
    assert session.snapshot_index == 0
    assert session.evidence_files == ["boot.log"]
```

- [ ] **Step 2: Implement Pydantic schemas**

Define `AnalysisTaskCreate`, `AnalysisTaskView`, `BootSessionView`, `DiagnosisFindingView`, `EvidenceSnippetView`, `ApprovedCaseView`, and `FollowUpQuestionCreate`.

- [ ] **Step 3: Implement SQLAlchemy tables**

Create tables for:

- `analysis_tasks`
- `uploaded_files`
- `boot_sessions`
- `diagnosis_findings`
- `evidence_snippets`
- `follow_up_messages`
- `approved_cases`

- [ ] **Step 4: Run tests**

```powershell
cd backend
python -m pytest tests/test_models.py -v
```

Expected: all model/schema tests pass.

- [ ] **Step 5: Commit**

```powershell
git add backend/app/models backend/app/core/database.py backend/tests/test_models.py
git commit -m "feat: add task and diagnosis data models"
```

### Task 3: Archive Intake And Snapshot Detection

**Files:**
- Create: `backend/app/services/archive_service.py`
- Test: `backend/tests/test_archive_service.py`

- [ ] **Step 1: Write failing tests**

Cover:

- Multi-snapshot archive detects inner suffixes `0`, `1`, `2`.
- Single snapshot archive is treated as `snapshot_index = 0`.
- Unsafe paths are rejected.

- [ ] **Step 2: Implement archive service**

Implement:

- Safe extraction.
- Extracted size limit.
- Nested archive detection.
- `multi_snapshot_archive` and `single_snapshot_archive` classification.
- Snapshot metadata output.

- [ ] **Step 3: Run tests**

```powershell
cd backend
python -m pytest tests/test_archive_service.py -v
```

Expected: archive tests pass.

- [ ] **Step 4: Commit**

```powershell
git add backend/app/services/archive_service.py backend/tests/test_archive_service.py
git commit -m "feat: detect uploaded log archive snapshots"
```

### Task 4: Whitelist Matching And Log Segmentation

**Files:**
- Create: `configs/log_whitelist/kernel_history.yaml`
- Create: `configs/log_whitelist/bootloader_current.yaml`
- Create: `configs/log_whitelist/userspace_startup.yaml`
- Create: `backend/app/services/whitelist_service.py`
- Create: `backend/app/services/segment_service.py`
- Test: `backend/tests/test_whitelist_service.py`

- [ ] **Step 1: Write failing tests**

Tests should verify:

- Whitelisted file is classified as `analyzed`.
- Unknown file is classified as `ignored`.
- `multi_boot_split` creates candidate segments using boot markers.
- Candidate segments carry tags such as `kernel`, `reset`, `driver_probe`, or `noise`.

- [ ] **Step 2: Add sample whitelist configs**

Add YAML configs for kernel retained logs, current bootloader logs, and userspace startup logs.

- [ ] **Step 3: Implement whitelist loader and matcher**

Implement path pattern matching, source type, parser name, max size, scope strategy, boot markers, extractors, and related playbooks.

- [ ] **Step 4: Implement segment service**

Implement rule-based candidate slicing:

- boot marker split
- keyword window extraction
- tail extraction
- basic segment scoring

- [ ] **Step 5: Run tests**

```powershell
cd backend
python -m pytest tests/test_whitelist_service.py -v
```

Expected: whitelist and segmentation tests pass.

- [ ] **Step 6: Commit**

```powershell
git add configs/log_whitelist backend/app/services/whitelist_service.py backend/app/services/segment_service.py backend/tests/test_whitelist_service.py
git commit -m "feat: add whitelist matching and log segmentation"
```

### Task 5: Boot Reconstruction Service

**Files:**
- Create: `backend/app/services/boot_reconstruction_service.py`
- Test: `backend/tests/test_boot_reconstruction_service.py`

- [ ] **Step 1: Write failing tests**

Tests should verify:

- Snapshot `0` becomes "最近第 1 次启动".
- Snapshot `1` becomes "最近第 2 次启动".
- Kernel segment with reset keyword marks `reset_detected = True`.
- Missing userspace evidence results in `final_state = "unknown"` or `"abnormal"` based on available evidence.

- [ ] **Step 2: Implement deterministic reconstruction**

Implement an MVP rule engine that:

- Aggregates segments by snapshot.
- Infers stages present.
- Detects reset/watchdog keywords.
- Computes final state.
- Records strong and weak evidence.

- [ ] **Step 3: Run tests**

```powershell
cd backend
python -m pytest tests/test_boot_reconstruction_service.py -v
```

Expected: boot reconstruction tests pass.

- [ ] **Step 4: Commit**

```powershell
git add backend/app/services/boot_reconstruction_service.py backend/tests/test_boot_reconstruction_service.py
git commit -m "feat: reconstruct boot sessions from log segments"
```

### Task 6: Model Gateway

**Files:**
- Create: `backend/app/services/model_gateway.py`
- Test: `backend/tests/test_model_gateway.py`

- [ ] **Step 1: Write failing tests**

Tests should verify:

- Fake provider returns deterministic JSON.
- MiniMax provider is selected by config but not called in unit tests.
- Business code calls the provider through `analyze`, `chat`, `summarize`, and `embed`.

- [ ] **Step 2: Implement provider interface**

Create:

- `ModelProvider` protocol.
- `FakeModelProvider`.
- `MiniMaxModelProvider`.
- `ModelGateway`.

- [ ] **Step 3: Run tests**

```powershell
cd backend
python -m pytest tests/test_model_gateway.py -v
```

Expected: model gateway tests pass without real MiniMax credentials.

- [ ] **Step 4: Commit**

```powershell
git add backend/app/services/model_gateway.py backend/tests/test_model_gateway.py
git commit -m "feat: add pluggable model gateway"
```

### Task 7: Playbook Diagnosis Workflow

**Files:**
- Create: `configs/diagnosis_playbooks/boot_region_abnormal.yaml`
- Create: `configs/diagnosis_playbooks/driver_probe_failure.yaml`
- Create: `configs/diagnosis_playbooks/userspace_service_startup.yaml`
- Create: `backend/app/services/playbook_service.py`
- Create: `backend/app/services/diagnosis_workflow.py`
- Test: `backend/tests/test_diagnosis_workflow.py`

- [ ] **Step 1: Write failing tests**

Tests should verify:

- Related playbooks are selected from whitelist results and boot facts.
- Diagnosis findings include playbook ID, related boot session, evidence, confidence, and next checks.
- Final answer starts with a direct response to the user's question.

- [ ] **Step 2: Implement playbook loader**

Load active YAML playbooks from `configs/diagnosis_playbooks`.

- [ ] **Step 3: Implement diagnosis workflow**

Workflow:

```text
segments + boot sessions + user question
  -> AI fact extraction for high-value segments
  -> playbook selection
  -> AI playbook analysis
  -> AI final dynamic answer
```

- [ ] **Step 4: Run tests**

```powershell
cd backend
python -m pytest tests/test_diagnosis_workflow.py -v
```

Expected: diagnosis workflow tests pass using fake model provider.

- [ ] **Step 5: Commit**

```powershell
git add configs/diagnosis_playbooks backend/app/services/playbook_service.py backend/app/services/diagnosis_workflow.py backend/tests/test_diagnosis_workflow.py
git commit -m "feat: run playbook-based diagnosis workflow"
```

### Task 8: Task Runner And REST APIs

**Files:**
- Create: `backend/app/api/routes_tasks.py`
- Create: `backend/app/api/routes_review.py`
- Create: `backend/app/api/routes_cases.py`
- Create: `backend/app/workers/task_runner.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_api_tasks.py`

- [ ] **Step 1: Write failing API tests**

Tests should cover:

- `POST /api/tasks` creates an analysis task.
- `GET /api/tasks` lists tasks.
- `GET /api/tasks/{id}` returns task result.
- `POST /api/tasks/{id}/follow-ups` creates a grounded follow-up answer.
- `POST /api/review/tasks/{id}/approve` creates an approved case.

- [ ] **Step 2: Implement API routes**

Implement upload handling, task creation, task list, result read, follow-up Q&A, review approval, and case list endpoints.

- [ ] **Step 3: Implement synchronous MVP task runner**

For MVP, run analysis synchronously or with a simple background task. Keep the interface ready for future queue workers.

- [ ] **Step 4: Run tests**

```powershell
cd backend
python -m pytest tests/test_api_tasks.py -v
```

Expected: API tests pass.

- [ ] **Step 5: Commit**

```powershell
git add backend/app/api backend/app/workers backend/app/main.py backend/tests/test_api_tasks.py
git commit -m "feat: expose analysis task APIs"
```

## Phase 2: Frontend MVP

### Task 9: Frontend Types And API Client

**Files:**
- Create: `frontend/src/types.ts`
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/api/tasks.ts`
- Create: `frontend/src/api/cases.ts`
- Test: `frontend/src/api/tasks.test.ts`

- [ ] **Step 1: Define shared frontend types**

Create TypeScript types for task, boot session, diagnosis finding, evidence snippet, follow-up message, and approved case.

- [ ] **Step 2: Implement API client**

Wrap `fetch` with JSON handling, upload handling, and error normalization.

- [ ] **Step 3: Run frontend tests**

```powershell
cd frontend
npm install
npm test
```

Expected: API tests pass.

- [ ] **Step 4: Commit**

```powershell
git add frontend/src/types.ts frontend/src/api frontend/package-lock.json
git commit -m "feat: add frontend API client"
```

### Task 10: App Layout And Task List

**Files:**
- Create: `frontend/src/components/AppLayout.tsx`
- Create: `frontend/src/components/StatusBadge.tsx`
- Create: `frontend/src/pages/TaskListPage.tsx`
- Modify: `frontend/src/main.tsx`
- Test: `frontend/src/pages/TaskListPage.test.tsx`

- [ ] **Step 1: Build engineering-tool layout**

Use a compact top navigation:

- 分析任务
- 新建分析
- 已入库案例

Avoid a marketing landing page. The first screen should be task-oriented.

- [ ] **Step 2: Build task list**

Show:

- user question summary
- status
- package type
- snapshot count
- created time
- approved case state

- [ ] **Step 3: Run tests**

```powershell
cd frontend
npm test
```

Expected: task list renders mocked tasks.

- [ ] **Step 4: Commit**

```powershell
git add frontend/src/components frontend/src/pages/TaskListPage.tsx frontend/src/main.tsx
git commit -m "feat: add task list frontend"
```

### Task 11: New Task And Progress Pages

**Files:**
- Create: `frontend/src/pages/NewTaskPage.tsx`
- Create: `frontend/src/pages/TaskProgressPage.tsx`
- Test: `frontend/src/pages/NewTaskPage.test.tsx`

- [ ] **Step 1: Build new task form**

Fields:

- 用户问题
- 日志压缩包
- 板卡型号
- 芯片型号
- 软件版本
- 问题发生背景
- 期望现象

- [ ] **Step 2: Build progress page**

Show ordered stages:

```text
解压日志包 -> 识别输入包类型 -> 匹配白名单日志 -> 重建启动过程 -> 执行诊断模板 -> 回答用户问题
```

- [ ] **Step 3: Run tests**

```powershell
cd frontend
npm test
```

Expected: form validates required question and archive fields.

- [ ] **Step 4: Commit**

```powershell
git add frontend/src/pages/NewTaskPage.tsx frontend/src/pages/TaskProgressPage.tsx
git commit -m "feat: add task creation and progress UI"
```

### Task 12: Result Page, Boot Timeline, Evidence, And Follow-Up Q&A

**Files:**
- Create: `frontend/src/components/BootTimeline.tsx`
- Create: `frontend/src/components/EvidenceSnippet.tsx`
- Create: `frontend/src/pages/TaskResultPage.tsx`
- Test: `frontend/src/pages/TaskResultPage.test.tsx`

- [ ] **Step 1: Build result page sections**

Order:

1. 针对用户问题的直接回答
2. 最近启动概览
3. 主动诊断发现
4. 证据与分析范围
5. 追问问答

- [ ] **Step 2: Build boot overview table**

Columns:

```text
序号 | 启动状态 | 异常阶段 | 是否复位 | 关键现象 | 置信度 | 证据文件
```

- [ ] **Step 3: Build evidence snippets**

Show source file, line range or segment ID, evidence text, and evidence strength.

- [ ] **Step 4: Build follow-up panel**

Bind follow-up questions to the current task ID.

- [ ] **Step 5: Run tests**

```powershell
cd frontend
npm test
```

Expected: result page renders answer, boot table, diagnosis findings, evidence snippets, and follow-up input.

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/components/BootTimeline.tsx frontend/src/components/EvidenceSnippet.tsx frontend/src/pages/TaskResultPage.tsx
git commit -m "feat: add analysis result UI"
```

### Task 13: Review And Case Pages

**Files:**
- Create: `frontend/src/pages/ReviewTaskPage.tsx`
- Create: `frontend/src/pages/CaseListPage.tsx`
- Test: `frontend/src/pages/ReviewTaskPage.test.tsx`

- [ ] **Step 1: Build review page**

Show:

- original question
- final answer
- boot reconstruction result
- diagnosis findings
- key evidence
- model and playbook versions
- follow-up history

- [ ] **Step 2: Build approval form**

Fields:

- final effective conclusion
- diagnosis process
- solution or next action
- applicable conditions
- non-applicable conditions

- [ ] **Step 3: Build case list**

Show approved cases with enable/disable status.

- [ ] **Step 4: Run tests**

```powershell
cd frontend
npm test
```

Expected: engineer can fill approval form and submit approval request in mocked API tests.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/pages/ReviewTaskPage.tsx frontend/src/pages/CaseListPage.tsx
git commit -m "feat: add review and approved case UI"
```

## Phase 3: Integration And Verification

### Task 14: End-To-End Demo Fixture

**Files:**
- Create: `backend/tests/fixtures/demo_logs/snapshot_0/boot.log`
- Create: `backend/tests/fixtures/demo_logs/snapshot_0/kernel_history.log`
- Create: `backend/tests/fixtures/demo_logs/snapshot_0/startup.log`
- Create: `backend/tests/test_e2e_demo.py`

- [ ] **Step 1: Create demo logs**

Create a small fixture that simulates:

- selected boot region differs from expected region
- kernel boot starts
- userspace does not fully start
- reset keyword appears

- [ ] **Step 2: Write E2E test**

Test full path:

```text
archive -> whitelist -> segmentation -> boot reconstruction -> diagnosis -> final answer
```

- [ ] **Step 3: Run backend full tests**

```powershell
cd backend
python -m pytest -v
```

Expected: all backend tests pass.

- [ ] **Step 4: Run frontend full tests and build**

```powershell
cd frontend
npm test
npm run build
```

Expected: frontend tests and production build pass.

- [ ] **Step 5: Commit**

```powershell
git add backend/tests frontend
git commit -m "test: add end-to-end demo coverage"
```

### Task 15: Local Run Documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document setup**

README should include:

- backend install
- frontend install
- model provider config
- running backend
- running frontend
- running tests
- uploading demo log package

- [ ] **Step 2: Verify commands**

Run:

```powershell
cd backend
python -m pytest -v
cd ..\frontend
npm test
npm run build
```

Expected: all checks pass.

- [ ] **Step 3: Commit**

```powershell
git add README.md
git commit -m "docs: add local development guide"
```

## MVP Technical Decisions

- Use SQLite for MVP local persistence; migrate to PostgreSQL when multi-user concurrency or deployment policy requires it.
- Use local filesystem for uploaded logs in MVP; migrate to internal object storage when deployment environment is known.
- Use fake model provider in automated tests; MiniMax M2.7 is exercised only in configured integration environments.
- Keep task runner synchronous or FastAPI background-task based in MVP; introduce a queue only after real task duration requires it.
