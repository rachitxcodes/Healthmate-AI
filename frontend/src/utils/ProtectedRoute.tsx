import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * ProtectedRoute ensures that only authenticated users
 * can access private pages like Dashboard, UploadReport, etc.
 */
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-surface text-slate-500">
        <div className="h-8 w-8 rounded-full border-4 border-rose-100 border-t-rose-500 animate-spin" />
        <p className="text-sm font-semibold">Checking your session...</p>
      </div>
    );
  }

  // If user is not logged in → redirect to Welcome page
  if (!session || !user) {
    return <Navigate to="/" replace />;
  }

  // If logged in → show the page content
  return <>{children}</>;
}
