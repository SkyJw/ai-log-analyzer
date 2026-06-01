from pathlib import Path

import yaml


PROJECT_ROOT = Path(__file__).resolve().parents[2]


def test_docker_compose_defines_backend_frontend_and_persistent_storage() -> None:
    compose_path = PROJECT_ROOT / "docker-compose.yml"
    assert compose_path.exists()

    compose = yaml.safe_load(compose_path.read_text(encoding="utf-8"))
    services = compose["services"]

    assert {"backend", "frontend"}.issubset(services)
    assert services["backend"]["build"]["dockerfile"] == "backend/Dockerfile"
    assert services["backend"]["ports"] == ["8000:8000"]
    assert "ai_log_analyzer_data:/app/backend/data" in services["backend"]["volumes"]
    assert services["frontend"]["build"]["dockerfile"] == "frontend/Dockerfile"
    assert services["frontend"]["ports"] == ["8080:80"]
    assert services["frontend"]["depends_on"] == ["backend"]
    assert "ai_log_analyzer_data" in compose["volumes"]


def test_container_files_include_runtime_contracts() -> None:
    backend_dockerfile = (PROJECT_ROOT / "backend" / "Dockerfile").read_text(encoding="utf-8")
    frontend_dockerfile = (PROJECT_ROOT / "frontend" / "Dockerfile").read_text(encoding="utf-8")
    nginx_conf = (PROJECT_ROOT / "frontend" / "nginx.conf").read_text(encoding="utf-8")

    assert "uvicorn" in backend_dockerfile
    assert "app.main:app" in backend_dockerfile
    assert "HEALTHCHECK" in backend_dockerfile
    assert "npm ci" in frontend_dockerfile
    assert "npm run build" in frontend_dockerfile
    assert "proxy_pass http://backend:8000" in nginx_conf
    assert "try_files $uri /index.html" in nginx_conf


def test_environment_example_and_deployment_doc_cover_required_operations() -> None:
    env_example = (PROJECT_ROOT / ".env.example").read_text(encoding="utf-8")
    deployment_doc = (PROJECT_ROOT / "docs" / "deployment.md").read_text(encoding="utf-8")

    required_env = [
        "AI_LOG_ANALYZER_MODEL_PROVIDER=fake",
        "AI_LOG_ANALYZER_STORAGE_DIR=/app/backend/data/storage",
        "AI_LOG_ANALYZER_DATABASE_URL=sqlite:////app/backend/data/ai_log_analyzer.db",
        "AI_LOG_ANALYZER_MINIMAX_API_KEY=",
    ]
    for item in required_env:
        assert item in env_example

    required_doc_sections = [
        "## 部署目标",
        "## 快速部署",
        "## 环境变量",
        "## 验证",
        "## 数据与备份",
        "## 运维注意事项",
    ]
    for section in required_doc_sections:
        assert section in deployment_doc
