import { motion } from "framer-motion";
import {  ShieldCheck, Pill, Stethoscope, BrainCircuit } from "lucide-react";
import { Link } from "react-router-dom";

const tiles = [
  {
    icon:  ShieldCheck,
    title: "Health Risk Predictor",
    desc:
      "Upload blood tests, scans, or lab reports and let AI decode values, highlight anomalies, and estimate early-stage risk—well before symptoms appear.",
    to: "/risk-predictor",
  },
  {
    icon: Pill,
    title: "Smart Medication Planner",
    desc:
      "Organize prescriptions, dosages, and reminders automatically. Track adherence like a streak so you never miss a dose.",
    to: "/medication-planner",
  },
  {
    icon: Stethoscope,
    title: "AI Symptom Decoder",
    desc:
      "Describe symptoms in simple words and get medically aligned insights, likely causes, and next-step recommendations.",
    to: "/symptom-decoder",
  },
  {
    icon: BrainCircuit,
    title: "AI Health Companion",
    desc:
      "A continuous, always-learning wellness assistant that studies patterns, predicts trends, and guides you 24×7.",
    to: "/ai-companion",
  },
];

export default function FeatureTiles() {
  return (
    <section className="relative mx-auto max-w-7xl px-6 pb-20">
      {/* CLEAN Apple-style: minimal background, tiny glow accents */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-500/25 to-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -right-24 h-80 w-80 rounded-full bg-gradient-to-br from-fuchsia-500/20 to-sky-400/20 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-6"
      >
        {tiles.map(({ icon: Icon, title, desc, to }, i) => (
          <motion.article
            key={title}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55, delay: i * 0.06 }}
            className="group relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 sm:p-7
                       shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.35)]
                       hover:border-white/20 transition-transform duration-300 hover:-translate-y-1"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-white/10 border border-white/15 p-3">
                <Icon className="h-7 w-7 text-cyan-300" strokeWidth={1.75} />
              </div>
              <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
            </div>

            <p className="mt-4 text-[1.02rem] leading-relaxed text-white/85">
              {desc}
            </p>

            {/* Explore → link at bottom */}
            <div className="mt-6">
              <Link
                to={to}
                className="inline-flex items-center gap-1 text-white/90 hover:text-white font-medium"
              >
                Explore
                <span className="translate-x-0 group-hover:translate-x-0.5 transition-transform">→</span>
              </Link>
            </div>
          </motion.article>
        ))}
      </motion.div>
    </section>
  );
}
