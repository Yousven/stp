import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useT } from "../i18n";
import { Icon, type IconName } from "./Icon";
import { LanguagePicker } from "./LanguagePicker";

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  adminOnly?: boolean;
}

/**
 * Arvutiliidese raam: püsiv külgmenüü + sisuala.
 *
 * Telefonis on navigeerimine paanidena dashboardil, sest ekraanil ei ole
 * ruumi püsivale menüüle. Arvutis on vastupidi: haldustöö tähendab pidevat
 * liikumist objektide, kasutajate ja arvete vahel, ja iga kord dashboardile
 * tagasi minemine oleks tüütu.
 */
export function DesktopShell({ children }: { children: ReactNode }) {
  const d = useT();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";

  const groups: { label: string; items: NavItem[] }[] = [
    {
      label: d.dashboard.everydaySection,
      items: [
        { to: "/dashboard", label: d.desktop.overview, icon: "chart" },
        { to: "/history", label: d.dashboard.history, icon: "history" },
        { to: "/absences", label: d.dashboard.absences, icon: "calendar" },
      ],
    },
    {
      label: d.dashboard.adminSection,
      items: [
        { to: "/admin/objects", label: d.dashboard.manageObjects, icon: "building", adminOnly: true },
        { to: "/admin/users", label: d.dashboard.manageUsers, icon: "users", adminOnly: true },
        { to: "/admin/requests", label: d.dashboard.joinRequests, icon: "userPlus", adminOnly: true },
        { to: "/admin/team-performance", label: d.dashboard.teamOverview, icon: "chart", adminOnly: true },
        { to: "/admin/work-types", label: d.dashboard.workTypes, icon: "tag", adminOnly: true },
        { to: "/admin/clients", label: d.dashboard.clients, icon: "briefcase", adminOnly: true },
        { to: "/admin/billing", label: d.dashboard.billing, icon: "euro", adminOnly: true },
        { to: "/admin/invoices", label: d.dashboard.invoices, icon: "invoice", adminOnly: true },
        { to: "/admin/reports", label: d.dashboard.reports, icon: "report", adminOnly: true },
        { to: "/admin/settings", label: d.dashboard.settings, icon: "settings", adminOnly: true },
        { to: "/admin/subscription", label: d.dashboard.subscription, icon: "card", adminOnly: true },
      ],
    },
  ];

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="desktop-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">{d.login.appName}</div>

        <nav className="sidebar-nav">
          {groups.map((group) => {
            const items = group.items.filter((item) => !item.adminOnly || isAdmin);
            if (items.length === 0) return null;
            return (
              <div key={group.label}>
                <p className="section-label">{group.label}</p>
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `sidebar-link ${isActive ? "sidebar-link--active" : ""}`}
                  >
                    <Icon name={item.icon} size={20} />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <LanguagePicker />
          <button className="btn btn-secondary" onClick={handleLogout}>
            <Icon name="logout" size={20} />
            {d.login.logout}
          </button>
        </div>
      </aside>

      <main className="desktop-content">{children}</main>
    </div>
  );
}
