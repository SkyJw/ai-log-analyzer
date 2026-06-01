# AI Log Analyzer 部署说明

## 部署目标

本部署方案面向 MVP 内网验证环境，提供一个可复现的 Docker Compose 运行方式：

- 后端：FastAPI + Uvicorn，监听 `8000`。
- 前端：Nginx 托管静态文件，监听 `8080`。
- API 反代：前端容器将 `/api/` 和 `/health` 转发到后端容器。
- 数据卷：`ai_log_analyzer_data` 挂载到 `/app/backend/data`，用于 SQLite 数据库和上传日志存储。

该方案适合单机内网试运行，不包含复杂权限、HTTPS 证书托管、集中日志、CI/CD 和多副本编排。

## 快速部署

1. 准备 Docker 和 Docker Compose，并确认 Docker Desktop Linux engine 已启动。

```powershell
docker --version
docker-compose --version
docker-compose config
```

`docker-compose config` 应能输出解析后的服务配置。若提示找不到
`dockerDesktopLinuxEngine`，先启动 Docker Desktop，再重新执行部署命令。

2. 复制环境变量模板：

```powershell
Copy-Item .env.example .env
```

3. 按需编辑 `.env`。本地 MVP 验证可保留 fake provider：

```text
AI_LOG_ANALYZER_MODEL_PROVIDER=fake
```

4. 构建并启动：

```powershell
docker compose --env-file .env up --build -d
```

如果当前 Docker CLI 没有 `docker compose` 子命令，可使用兼容命令：

```powershell
docker-compose --env-file .env up --build -d
```

5. 打开前端：

```text
http://127.0.0.1:8080
```

后端健康检查：

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

或通过前端 Nginx 入口检查：

```powershell
Invoke-RestMethod http://127.0.0.1:8080/health
```

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `AI_LOG_ANALYZER_MODEL_PROVIDER` | `fake` | 模型提供方。MVP 自动化测试和内网冒烟优先使用 `fake`。 |
| `AI_LOG_ANALYZER_STORAGE_DIR` | `/app/backend/data/storage` | 上传日志和解压结果存储目录。 |
| `AI_LOG_ANALYZER_DATABASE_URL` | `sqlite:////app/backend/data/ai_log_analyzer.db` | SQLite 数据库路径。 |
| `AI_LOG_ANALYZER_MINIMAX_API_KEY` | 空 | MiniMax API key。使用 `minimax` provider 时必填。 |
| `AI_LOG_ANALYZER_MINIMAX_BASE_URL` | `https://api.minimax.chat/v1` | MiniMax API 地址。 |
| `AI_LOG_ANALYZER_MINIMAX_MODEL` | `MiniMax-M2.7` | MiniMax 模型名。 |

MiniMax 手动集成环境示例：

```text
AI_LOG_ANALYZER_MODEL_PROVIDER=minimax
AI_LOG_ANALYZER_MINIMAX_API_KEY=<your-api-key>
AI_LOG_ANALYZER_MINIMAX_BASE_URL=https://api.minimax.chat/v1
AI_LOG_ANALYZER_MINIMAX_MODEL=MiniMax-M2.7
```

注意：当前 `MiniMaxModelProvider` 仍是接口占位，真实 API 调用需要后续实现后再切换生产流量。

## 验证

部署前在本机运行完整验证：

```powershell
cd backend
python -m pytest -q
cd ..\frontend
npm test -- --run
npm run build
```

容器启动后检查服务状态：

```powershell
docker compose ps
docker compose logs backend
docker compose logs frontend
```

兼容命令：

```powershell
docker-compose ps
docker-compose logs backend
docker-compose logs frontend
```

### WSL2 原生 Docker 验证

如果 Windows Docker Desktop 不可用，但 WSL2 发行版内安装了原生 Docker，可以直接在 WSL2 中验证：

```powershell
wsl.exe -l -v
wsl.exe -d <DistroName> -e bash -lc "docker --version && docker compose version"
wsl.exe -d <DistroName> -e bash -lc "cd /mnt/e/Project/ai-log-analyzer && docker compose config"
wsl.exe -d <DistroName> -e bash -lc "cd /mnt/e/Project/ai-log-analyzer && docker compose build"
```

如果 Windows 挂载目录中存在权限异常的测试缓存，例如 `backend/.pytest_cache` 或
`backend/.pytest_tmp`，Docker build 可能在读取 build context 时失败。仓库的
`.dockerignore` 已排除这些目录；若仍因历史缓存权限异常失败，可在一个干净 worktree
或干净 clone 中执行 WSL2 构建验证。

如果基础镜像拉取失败并出现 `TLS handshake timeout`，先确认 WSL2 Docker 的 registry
或 mirror 网络可用，再重试：

```powershell
wsl.exe -d <DistroName> -e bash -lc "curl -I --connect-timeout 10 https://registry-1.docker.io/v2/ || true"
wsl.exe -d <DistroName> -e bash -lc "docker pull python:3.12-slim"
wsl.exe -d <DistroName> -e bash -lc "docker pull node:22-alpine"
wsl.exe -d <DistroName> -e bash -lc "docker pull nginx:1.27-alpine"
```

上传 demo 日志包进行冒烟：

```powershell
Compress-Archive -Path backend/tests/fixtures/demo_logs/snapshot_0/* -DestinationPath demo_logs.zip -Force
curl.exe -X POST "http://127.0.0.1:8080/api/tasks" `
  -F "question=Why did the board fail to boot normally after upgrade?" `
  -F "archive=@demo_logs.zip;type=application/zip"
```

预期返回包含：

- `status` 为 `completed`
- `snapshot_count` 为 `1`
- 至少一个 `boot_sessions`
- 至少一个 `diagnosis_findings`

## 数据与备份

Compose 使用命名卷：

```text
ai_log_analyzer_data -> /app/backend/data
```

该目录包含：

- SQLite 数据库：`/app/backend/data/ai_log_analyzer.db`
- 上传文件和解压结果：`/app/backend/data/storage`

备份建议：

```powershell
docker run --rm `
  -v ai-log-analyzer_ai_log_analyzer_data:/data `
  -v ${PWD}:/backup `
  alpine tar czf /backup/ai-log-analyzer-data.tgz -C /data .
```

恢复时先停止服务，再将备份解压回同名数据卷。

## 运维注意事项

- 不要把 `.env` 提交到仓库，仓库只保留 `.env.example`。
- 单机 MVP 默认暴露 `8000` 和 `8080`，内网部署时应通过防火墙或反向代理限制访问范围。
- 生产环境应在外层网关启用 HTTPS、访问控制和审计。
- 上传日志可能包含敏感信息，数据卷备份需要按内部敏感数据策略处理。
- 当前任务执行是同步 MVP 形态，不适合高并发或长时间批量分析；后续应引入队列、任务状态持久化和超时控制。
- 当前前端静态构建通过 Nginx 反代后端，若后续引入正式路由，仍需保留 `try_files $uri /index.html`。
