
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { Home } from './pages/Home.jsx';
import { Login } from './pages/Login.jsx';
import { AuthCallback } from './pages/AuthCallback.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { GeneratePlan } from './pages/GeneratePlan.jsx';
import { PlanView } from './pages/PlanView.jsx';
import { Progress } from './pages/Progress.jsx';
import { Protocols } from './pages/Protocols.jsx';

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <GeneratePlan />
                </ProtectedRoute>
              }
            />
            <Route
              path="/plan"
              element={
                <ProtectedRoute>
                  <PlanView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/progress"
              element={
                <ProtectedRoute>
                  <Progress />
                </ProtectedRoute>
              }
            />
            <Route
              path="/protocols"
              element={
                <ProtectedRoute>
                  <Protocols />
                </ProtectedRoute>
              }
            />
            {/* Backward compatibility */}
            <Route path="/generate-plan" element={<Navigate to="/onboarding" replace />} />
          </Routes>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
