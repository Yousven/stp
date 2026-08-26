import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useLayout } from "../hooks/useLayout";
import { DesktopShell } from "./DesktopShell";

/**
 * Sisselogimist nõudev leht. Ühtlasi otsustab siin, kumb raamistik lehe
 * ümber käib — telefoniliides ilma püsiva menüüta või arvutiliides
 * külgmenüüga. Kuna kõik sisulehed käivad siit läbi, ei pea ükski leht
 * seda ise teadma.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const layout = useLayout();

  if (loading) return <div className="page-loading">...</div>;
  if (!user) return <Navigate to="/login" replace />;

  if (layout === "desktop") return <DesktopShell>{children}</DesktopShell>;
  return <>{children}</>;
}
