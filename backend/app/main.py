from fastapi import FastAPI

from app.api import routes_cases, routes_review, routes_tasks

app = FastAPI(title="AI Log Analyzer", version="0.1.0")
app.include_router(routes_tasks.router)
app.include_router(routes_review.router)
app.include_router(routes_cases.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
