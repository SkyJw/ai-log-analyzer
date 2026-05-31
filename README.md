# AI Log Analyzer

AI Log Analyzer is an MVP for communication board log investigation. It will
reconstruct recent boot processes from scattered logs, classify boot outcomes,
and support AI-assisted diagnosis with evidence-backed follow-up answers.

## Backend

```powershell
cd backend
python -m pip install -e ".[dev]"
python -m uvicorn app.main:app --reload
```

Health check:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

Run backend tests:

```powershell
cd backend
python -m pytest
```

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

Run frontend tests:

```powershell
cd frontend
npm test -- --run
```
