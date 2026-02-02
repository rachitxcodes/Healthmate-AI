import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ChatAssistant from "../components/ChatAssistant";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [fullName, setFullName] = useState<string>("");

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setFullName(data.full_name);
      }
    };

    fetchProfile();
  }, [user]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1324] via-[#0B1B33] to-[#0A1324] text-white">
      <main className="max-w-7xl mx-auto px-6 py-28 space-y-10">
        
        {/* 👋 Welcome Section */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_0_30px_-10px_rgba(0,0,0,0.5)]"
        >
          <h1 className="text-2xl font-bold text-cyan-300 mb-2">
            👋 Welcome back, {fullName || "User"}
          </h1>
          <p className="text-white/80 text-sm mb-6">
            Your HealthMate AI Summary for Today
          </p>

          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div className="bg-white/[0.08] rounded-xl p-4 border border-white/10">
              <p className="text-white/70">🩺 Risk Level</p>
              <h3 className="text-lg font-semibold text-green-400">
                Low (Stable)
              </h3>
            </div>

            <div className="bg-white/[0.08] rounded-xl p-4 border border-white/10">
              <p className="text-white/70">💊 Medications Scheduled</p>
              <h3 className="text-lg font-semibold text-blue-400">
                2 Today
              </h3>
            </div>

            <div className="bg-white/[0.08] rounded-xl p-4 border border-white/10">
              <p className="text-white/70">🩸 Last Report Uploaded</p>
              <h3 className="text-lg font-semibold text-yellow-400">
                2 days ago
              </h3>
            </div>
          </div>
        </motion.section>

        {/* 📊 Health Trends */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_0_30px_-10px_rgba(0,0,0,0.5)]"
        >
          <h2 className="text-xl font-semibold text-cyan-300 mb-4">
            📊 Health Trends
          </h2>
          <div className="h-[200px] bg-white/[0.04] border border-white/10 rounded-xl flex items-center justify-center text-white/50">
            [ Graphs showing glucose, cholesterol, heart rate ]
          </div>
        </motion.section>

        {/* 💊 Medication Planner */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_0_30px_-10px_rgba(0,0,0,0.5)]"
        >
          <h2 className="text-xl font-semibold text-cyan-300 mb-4">
            💊 Medication Planner
          </h2>
          <ul className="space-y-3">
            <li className="flex items-center justify-between bg-white/[0.05] p-3 rounded-xl">
              <span>Metformin 500mg — 9:00 AM</span>
              <div className="w-1/3 h-2 bg-white/[0.2] rounded-full">
                <div className="h-full bg-green-400 rounded-full w-[80%]" />
              </div>
            </li>
            <li className="flex items-center justify-between bg-white/[0.05] p-3 rounded-xl">
              <span>Atorvastatin — 8:00 PM</span>
              <div className="w-1/3 h-2 bg-white/[0.2] rounded-full">
                <div className="h-full bg-yellow-400 rounded-full w-[50%]" />
              </div>
            </li>
          </ul>
        </motion.section>

        {/* 🧬 Reports Section */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_0_30px_-10px_rgba(0,0,0,0.5)]"
        >
          <h2 className="text-xl font-semibold text-cyan-300 mb-4">
            🧬 Reports
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-white/[0.05] p-3 rounded-xl">
              <span>Blood Test - 7 Nov 2025</span>
              <button className="text-sm text-cyan-300 hover:text-cyan-200">
                View Insights →
              </button>
            </div>
            <div className="flex items-center justify-between bg-white/[0.05] p-3 rounded-xl">
              <span>ECG - 5 Nov 2025</span>
              <button className="text-sm text-cyan-300 hover:text-cyan-200">
                View Insights →
              </button>
            </div>
          </div>
        </motion.section>

        {/* 🤖 Ask AI */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
          className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-3xl p-6 text-center shadow-[0_0_30px_-10px_rgba(0,0,0,0.5)]"
        >
          <h2 className="text-xl font-semibold text-cyan-300 mb-3">
            🤖 Ask AI
          </h2>
          <p className="text-white/80 text-sm mb-4">
            Need advice? Chat instantly with your HealthMate AI companion.
          </p>
          <Link
            to="/ai-companion"
            className="inline-block px-6 py-2 rounded-xl bg-white text-slate-900 font-semibold hover:bg-slate-200 transition"
          >
            Open AI Chat →
          </Link>
        </motion.section>
      </main>

      <ChatAssistant />
    </div>
  );
}
