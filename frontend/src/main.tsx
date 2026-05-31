import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import React from "react";
import ReactDOM from "react-dom/client";

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
        <Activity aria-hidden="true" size={32} />
        <h1>AI Log Analyzer</h1>
        <p>Communication board boot log reconstruction and AI diagnosis.</p>
      </main>
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
