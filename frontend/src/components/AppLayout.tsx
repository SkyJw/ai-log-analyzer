import { Database, FilePlus2, ListChecks } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <strong className="app-brand">AI Log Analyzer</strong>
        <nav aria-label="主导航" className="app-nav">
          <NavItem icon={<ListChecks size={16} />} label="分析任务" to="/tasks" />
          <NavItem icon={<FilePlus2 size={16} />} label="新建分析" to="/tasks/new" />
          <NavItem icon={<Database size={16} />} label="已入库案例" to="/cases" />
        </nav>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}

function NavItem({ icon, label, to }: { icon: ReactNode; label: string; to: string }) {
  return (
    <NavLink className={({ isActive }) => `nav-link${isActive ? " active" : ""}`} to={to}>
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}
