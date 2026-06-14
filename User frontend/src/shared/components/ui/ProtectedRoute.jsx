import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function ProtectedRoute({ children, allowedRole }) {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRole && user?.role !== allowedRole) {
    // Redirect unauthorized users to home page
    return <Navigate to="/" replace />;
  }

  return children;
}
