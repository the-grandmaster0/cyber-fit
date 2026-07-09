import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-black flex items-center justify-center">
        <div className="text-cyber-cyan-400 font-mono text-lg animate-pulse">AUTHENTICATING...</div>
      </div>
    );
  }

  // Redirect unauthenticated users to home page (not /login).
  // This prevents a race condition where ProtectedRoute fires a render-level
  // redirect to /login at the same time AuthContext imperatively navigates to /
  // on SIGNED_OUT — the home page handles showing the login option via the CTA.
  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}
