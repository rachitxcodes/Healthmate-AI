import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Navbar() {
  // ✅ ALL HOOKS AT TOP (ALWAYS CALLED)
  const location = useLocation();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ✅ AFTER hooks — safe conditional rendering
  if (loading) return null;

  return (
    <nav className="fixed top-0 w-full bg-[#0A1324] text-white px-6 py-4 z-50">
      <div className="flex justify-between items-center">
        <Link to="/" className="font-bold text-xl">
          HealthMate
        </Link>

        <div className="space-x-4">
          {session ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-red-400"
              >
                Logout
              </button>
            </>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
