import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { usePushNotifications } from "./hooks/usePushNotifications";
import { LoginPage } from "./pages/LoginPage";
import { RegisterOrganizationPage } from "./pages/RegisterOrganizationPage";
import { RequestAccessPage } from "./pages/RequestAccessPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { PendingRequestsPage } from "./pages/PendingRequestsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { StartWorkPage } from "./pages/StartWorkPage";
import { EndWorkPage } from "./pages/EndWorkPage";
import { HistoryPage } from "./pages/HistoryPage";
import { AdminObjectsPage } from "./pages/AdminObjectsPage";
import { ObjectFormPage } from "./pages/ObjectFormPage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { UserFormPage } from "./pages/UserFormPage";
import { TeamPerformancePage } from "./pages/TeamPerformancePage";
import { SettingsPage } from "./pages/SettingsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { AbsencesPage } from "./pages/AbsencesPage";
import { CostCodesPage } from "./pages/CostCodesPage";
import { BillingPage } from "./pages/BillingPage";
import { SubscriptionPage } from "./pages/SubscriptionPage";
import { OnboardingPage } from "./pages/OnboardingPage";

/**
 * Peab olema AuthProvideri JA Routeri sees, kuna registreerimine sõltub
 * sisselogitud kasutajast ja teavitusel klõpsamine navigeerib.
 */
function PushNotificationBridge() {
  const { user } = useAuth();
  usePushNotifications(user !== null);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <PushNotificationBridge />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterOrganizationPage />} />
        <Route path="/join" element={<RequestAccessPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
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
          path="/admin/objects"
          element={
            <ProtectedRoute>
              <AdminObjectsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/objects/new"
          element={
            <ProtectedRoute>
              <ObjectFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/objects/:id/edit"
          element={
            <ProtectedRoute>
              <ObjectFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users/new"
          element={
            <ProtectedRoute>
              <UserFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users/:id/edit"
          element={
            <ProtectedRoute>
              <UserFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/team-performance"
          element={
            <ProtectedRoute>
              <TeamPerformancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/requests"
          element={
            <ProtectedRoute>
              <PendingRequestsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/absences"
          element={
            <ProtectedRoute>
              <AbsencesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/cost-codes"
          element={
            <ProtectedRoute>
              <CostCodesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/billing"
          element={
            <ProtectedRoute>
              <BillingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/subscription"
          element={
            <ProtectedRoute>
              <SubscriptionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
