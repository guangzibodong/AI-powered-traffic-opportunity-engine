import { BarChart3, FileText, LayoutDashboard, PackageSearch, Plug, Settings, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Tasks", icon: FileText },
  { label: "Opportunities", icon: Sparkles },
  { label: "Products", icon: PackageSearch },
  { label: "Performance", icon: BarChart3 },
  { label: "Integrations", icon: Plug },
  { label: "Settings", icon: Settings }
];

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>TrafScope</strong>
          <span>Commerce OS</span>
        </div>
        <nav className="nav-list" aria-label="Main navigation">
          {navItems.map((item) => (
            <button className={`nav-button ${item.active ? "active" : ""}`} key={item.label} type="button">
              <item.icon aria-hidden="true" size={18} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

