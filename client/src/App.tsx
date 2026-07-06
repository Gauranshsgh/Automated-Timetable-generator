import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores';
import Layout from './components/Layout';
import LoginPage from './features/auth/LoginPage';
import DashboardPage from './features/dashboard/DashboardPage';
import WizardPage from './features/wizard/WizardPage';
import GenerationPage from './features/generation/GenerationPage';
import TimetablePage from './features/timetable/TimetablePage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="wizard" element={<WizardPage />} />
        <Route path="wizard/:institutionId" element={<WizardPage />} />
        <Route path="generate/:institutionId" element={<GenerationPage />} />
        <Route path="timetable/:versionId" element={<TimetablePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
