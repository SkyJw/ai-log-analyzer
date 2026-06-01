import { Database, FilePlus2, ListChecks } from "lucide-react";
import type { ReactNode } from "react";

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f6f8fb",
        color: "#172033",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <header
        style={{
          alignItems: "center",
          background: "#111827",
          color: "white",
          display: "flex",
          gap: "2rem",
          padding: "0.85rem 1.25rem",
        }}
      >
        <strong style={{ fontSize: "1rem", whiteSpace: "nowrap" }}>AI Log Analyzer</strong>
        <nav
          aria-label="主导航"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <NavItem icon={<ListChecks size={16} />} label="分析任务" />
          <NavItem icon={<FilePlus2 size={16} />} label="新建分析" />
          <NavItem icon={<Database size={16} />} label="已入库案例" />
        </nav>
      </header>
      <main style={{ margin: "0 auto", maxWidth: "1180px", padding: "1.25rem" }}>{children}</main>
    </div>
  );
}

function NavItem({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button
      type="button"
      style={{
        alignItems: "center",
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.18)",
        borderRadius: "6px",
        color: "white",
        display: "inline-flex",
        gap: "0.4rem",
        minHeight: "34px",
        padding: "0.35rem 0.65rem",
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
