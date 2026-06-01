import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useState } from "react";
import ReactDOM from "react-dom/client";

import { AppLayout, type AppView } from "./components/AppLayout";
import { CaseListPage } from "./pages/CaseListPage";
import { NewTaskPage } from "./pages/NewTaskPage";
import { ReviewTaskPage } from "./pages/ReviewTaskPage";
import { TaskListPage } from "./pages/TaskListPage";
import { TaskResultPage } from "./pages/TaskResultPage";

const queryClient = new QueryClient();

type DetailView = "result" | "review";
type CurrentView = AppView | DetailView;

export function App() {
  const [currentView, setCurrentView] = useState<CurrentView>("tasks");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  function openTask(taskId: string, view: DetailView) {
    setSelectedTaskId(taskId);
    setCurrentView(view);
  }

  function navigate(view: AppView) {
    setCurrentView(view);
    if (view !== "tasks") {
      setSelectedTaskId(null);
    }
  }

  const navView: AppView =
    currentView === "new" || currentView === "cases" ? currentView : "tasks";

  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout activeView={navView} onNavigate={navigate}>
        {currentView === "tasks" ? (
          <TaskListPage
            onReviewTask={(taskId) => openTask(taskId, "review")}
            onViewResult={(taskId) => openTask(taskId, "result")}
          />
        ) : null}
        {currentView === "new" ? (
          <NewTaskPage onCreated={(taskId) => openTask(taskId, "result")} />
        ) : null}
        {currentView === "cases" ? <CaseListPage /> : null}
        {currentView === "result" && selectedTaskId ? (
          <TaskResultPage taskId={selectedTaskId} />
        ) : null}
        {currentView === "review" && selectedTaskId ? (
          <ReviewTaskPage taskId={selectedTaskId} />
        ) : null}
      </AppLayout>
    </QueryClientProvider>
  );
}

const rootElement = document.getElementById("root");

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
