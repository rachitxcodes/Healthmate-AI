import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import FeatureTiles from "../components/FeatureTile";
import heroVideo from "../assets/FrontendVid.mp4";

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1324] via-[#0B1B33] to-[#0A1324] text-white">
      {/* 🌟 Glassmorphic Navbar */}
      <Navbar />

      {/* HERO SECTION */}
      <main className="relative mx-auto max-w-7xl px-6 pt-40 pb-20"> {/* 🧭 Added more top padding */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          {/* LEFT: Text Section */}
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-[44px] leading-tight sm:text-[56px] font-semibold tracking-tight"
            >
              HEALTHMATE AI
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="mt-3 text-[1rem] font-semibold tracking-[0.22em] text-cyan-300/90"
            >
              DECODE. PREDICT. PREVENT.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-5 max-w-xl text-white/85 text-[0.95rem] leading-relaxed"
            >
              Your personal AI-powered wellness companion — upload reports, decode symptoms,
              predict risks early, and build reliable, healthier routines with confidence.
            </motion.p>

            {/* CTA BUTTONS */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-8 flex flex-wrap gap-4"
            >
              {/* ✅ Get Started → Goes to Login */}
              <button
                onClick={() => navigate("/login")}
                className="px-6 py-3 rounded-xl font-semibold text-slate-900 bg-white hover:bg-slate-200 transition"
              >
                Get Started
              </button>

              {/* ✅ Explore → Goes to Signup */}
              <Link
                to="/signup"
                className="px-6 py-3 rounded-xl font-medium border border-white/20 bg-white/5 hover:bg-white/10 transition text-white/90"
              >
                Explore →
              </Link>
            </motion.div>
          </div>

          {/* RIGHT: Blended Hero Video */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="
              relative overflow-hidden rounded-[36px]
              bg-gradient-to-tr from-white/[0.06] to-white/[0.02]
              backdrop-blur-2xl border border-white/[0.08]
              shadow-[0_0_60px_-12px_rgba(0,200,255,0.3)]
            "
          >
            <video
              className="
                w-full h-full object-cover rounded-[36px]
                mix-blend-overlay opacity-[0.95]
              "
              autoPlay
              muted
              loop
              playsInline
              src={heroVideo}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A1324]/50 to-transparent pointer-events-none" />
          </motion.div>
        </div>
      </main>

      {/* FEATURE SECTION */}
      <section className="mt-10">
        <FeatureTiles />
      </section>
    </div>
  );
}
