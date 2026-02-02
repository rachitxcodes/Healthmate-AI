import { useState } from "react";
import { motion } from "framer-motion";
import Page from "../components/Page";
import BackgroundAura from "../components/BackgroundAura";
import GlassCard from "../components/GlassCard";
import Field from "../components/Field";
import PrimaryButton from "../components/PrimaryButton";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Signup() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // 1️⃣ Create auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      if (!data.user) {
        setMessage("Signup failed. Please try again.");
        return;
      }

      // 2️⃣ Insert profile row
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: data.user.id,      // must match auth.uid()
          full_name: fullName,
          email: email,
        });

      if (profileError) {
        console.error("Profile insert error:", profileError);
        setMessage("Account created, but profile setup failed.");
        return;
      }

      // 3️⃣ Success
      setMessage("✅ Account created successfully! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1200);

    } catch (err) {
      console.error("Signup Error:", err);
      setMessage("⚠️ Error creating account.");
    } finally {
      setLoading(false);
      setFullName("");
      setEmail("");
      setPassword("");
    }
  }

  return (
    <Page>
      <div className="relative flex min-h-screen items-center justify-center">
        <BackgroundAura />

        <GlassCard>
          <motion.h1
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center font-semibold text-slate-800 text-xl"
          >
            Create your account
          </motion.h1>

          <motion.form
            onSubmit={handleSignup}
            className="mt-6 space-y-4"
          >
            <Field
              label="Full Name"
              required
              value={fullName}
              onChange={(e: any) => setFullName(e.target.value)}
            />

            <Field
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e: any) => setEmail(e.target.value)}
            />

            <Field
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e: any) => setPassword(e.target.value)}
            />

            {message && (
              <p className="text-center text-sm text-slate-600">
                {message}
              </p>
            )}

            <PrimaryButton type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Account"}
            </PrimaryButton>
          </motion.form>

          <div className="mt-4 text-center text-xs text-slate-500">
            Already have an account?{" "}
            <Link to="/login" className="hover:underline">
              Sign in
            </Link>
          </div>
        </GlassCard>
      </div>
    </Page>
  );
}
