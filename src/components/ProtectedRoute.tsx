import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/useAuth";
import { canAccessPermission, type PermissionKey } from "@/lib/role-permissions";

interface ProtectedRouteProps {
  requiredPermission?: PermissionKey;
}

export default function ProtectedRoute({ requiredPermission }: ProtectedRouteProps) {
  const { user, membership, profile, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs">Cargando permisos...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  const userRole = membership?.role || profile?.role || "cajero";

  // Si se exige un permiso específico y el rol no lo tiene
  if (requiredPermission && !canAccessPermission(userRole, requiredPermission)) {
    if (userRole === "cajero") return <Navigate to="/caja" replace />;
    if (userRole === "cocina") return <Navigate to="/kot" replace />;
    if (userRole === "mesero") return <Navigate to="/mesas" replace />;
    return <Navigate to="/caja" replace />;
  }

  return <Outlet />;
}
