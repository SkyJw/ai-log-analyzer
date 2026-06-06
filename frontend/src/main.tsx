import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";

import { AppLayout } from "./components/AppLayout";
import { CaseListPage } from "./pages/CaseListPage";
import { NewTaskPage } from "./pages/NewTaskPage";
import { ReviewTaskPage } from "./pages/ReviewTaskPage";
import { TaskListPage } from "./pages/TaskListPage";
import { TaskProgressPage } from "./pages/TaskProgressPage";
import { TaskResultPage } from "./pages/TaskResultPage";
import "./styles.css";

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/tasks" replace />} />
            <Route path="/tasks" element={<TaskListRoute />} />
            <Route path="/tasks/new" element={<NewTaskRoute />} />
            <Route path="/tasks/:taskId/progress" element={<TaskProgressRoute />} />
            <Route path="/tasks/:taskId" element={<TaskResultRoute />} />
            <Route path="/tasks/:taskId/review" element={<ReviewTaskRoute />} />
            <Route path="/cases" element={<CaseListPage />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function TaskListRoute() {
  const navigate = useNavigate();
  return (
    <TaskListPage
      onReviewTask={(taskId) => navigate(`/tasks/${taskId}/review`)}
      onViewProgress={(taskId) => navigate(`/tasks/${taskId}/progress`)}
      onViewResult={(taskId) => navigate(`/tasks/${taskId}`)}
    />
  );
}

function NewTaskRoute() {
  const navigate = useNavigate();
  return <NewTaskPage onCreated={(taskId) => navigate(`/tasks/${taskId}/progress`)} />;
}

function TaskProgressRoute() {
  const { taskId } = useParams();
  if (!taskId) {
    return <Navigate to="/tasks" replace />;
  }
  return <TaskProgressPage taskId={taskId} />;
}

function TaskResultRoute() {
  const { taskId } = useParams();
  if (!taskId) {
    return <Navigate to="/tasks" replace />;
  }
  return <TaskResultPage taskId={taskId} />;
}

function ReviewTaskRoute() {
  const { taskId } = useParams();
  if (!taskId) {
    return <Navigate to="/tasks" replace />;
  }
  return <ReviewTaskPage taskId={taskId} />;
}

const rootElement = document.getElementById("root");

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
