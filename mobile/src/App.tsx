import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { RegisterOrganizationPage } from "./pages/RegisterOrganizationPage";
import { DashboardPage } from "./pages/DashboardPage";
import { StartWorkPage } from "./pages/StartWorkPage";
import { EndWorkPage } from "./pages/EndWorkPage";
import { HistoryPage } from "./pages/HistoryPage";
import { CreateObjectPage } from "./pages/CreateObjectPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterOrganizationPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/start-work"
          element={
            <ProtectedRoute>
              <StartWorkPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/end-work"
          element={
            <ProtectedRoute>
              <EndWorkPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/objects/new"
          element={
            <ProtectedRoute>
              <CreateObjectPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
