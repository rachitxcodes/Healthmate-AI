import { useState } from "react";
import { motion } from "framer-motion";
import Page from "../components/Page";
import BackgroundAura from "../components/BackgroundAura";
import GlassCard from "../components/GlassCard";
import Field from "../components/Field";
import PrimaryButton from "../components/PrimaryButton";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else if (data.session) {
      navigate("/dashboard"); // ✅ CORRECT
    }

    setLoading(false);
  };

  return (
    <Page>
      <div className="relative flex min-h-screen items-center justify-center">
        <BackgroundAura />

        <GlassCard>
          <motion.h1 className="text-center font-semibold">
            HealthMate AI
          </motion.h1>

          <motion.form onSubmit={handleLogin} className="mt-6 space-y-4">
            <Field label="Email" value={email} onChange={(e:any)=>setEmail(e.target.value)} />
            <Field label="Password" type="password" value={password} onChange={(e:any)=>setPassword(e.target.value)} />

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <PrimaryButton type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </PrimaryButton>
          </motion.form>

          <div className="mt-4 text-center text-xs">
            No account? <Link to="/signup">Create one</Link>
          </div>
        </GlassCard>
      </div>
    </Page>
  );
}
