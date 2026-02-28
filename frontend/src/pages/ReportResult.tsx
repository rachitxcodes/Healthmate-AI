import { Link } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/Navbar";
import { supabase } from "../supabaseClient";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/* -------------------- Types -------------------- */
interface Prediction {
  ran?: boolean;
  risk_percent?: string;
  matched_features: string[];
  missing_features: string[];
  reason?: string;
}

interface ApiResult {
  message: string;
  extracted_data: Record<string, string | number>;
  predictions?: Record<string, Prediction>;
}

export default function ReportResult() {
  // ✅ SINGLE SOURCE OF TRUTH
  const stored = sessionStorage.getItem("healthmate_report_result");
  const resultData: ApiResult | null = stored ? JSON.parse(stored) : null;

  /* -------------------- HOOKS -------------------- */
  const [editableData, setEditableData] = useState<Record<string, any>>(
    resultData?.extracted_data ?? {}
  );
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [riskData, setRiskData] = useState<Record<string, Prediction> | null>(
    null
  );

  /* -------------------- GUARD -------------------- */
  if (!resultData) {
    return (
      <div className="min-h-screen bg-[#0A1324] text-white text-center">
        <Navbar />
        <main className="pt-40">
          <h1 className="text-3xl font-semibold">No Report Data Found</h1>
          <Link
            to="/upload-report"
            className="mt-6 inline-block px-6 py-3 rounded-xl bg-white text-slate-900 font-semibold"
          >
            Upload Again
          </Link>
        </main>
      </div>
    );
  }

  /* -------------------- HANDLER -------------------- */
  const handleConfirmAndAnalyze = async () => {
    try {
      setLoadingRisk(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("Not authenticated");

      const res = await fetch(`${API_BASE_URL}/predict-risk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ features: editableData }),
      });

      const data = await res.json();
      setRiskData(data.predictions ?? {});
      setIsConfirmed(true);

      setTimeout(() => {
        document
          .getElementById("risk-section")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    } catch (err) {
      console.error(err);
      alert("Something went wrong while analyzing report.");
    } finally {
      setLoadingRisk(false);
    }
  };
  
  /* -------------------- UI -------------------- */
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1324] via-[#0B1B33] to-[#0A1324] text-white">
      <Navbar />

      <main className="mx-auto max-w-4xl px-6 pt-40 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-[40px] font-semibold">Report Review</h1>
          <p className="mt-2 text-white/80">
            Review and confirm extracted values before analysis
          </p>
        </motion.div>

        {/* -------------------- EXTRACTED DATA -------------------- */}
        <motion.section
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-white/10 bg-white/[0.035] backdrop-blur-2xl p-6 sm:p-8 mb-12"
        >
          <h2 className="text-2xl font-semibold mb-6">
            Extracted Medical Parameters
          </h2>

          {Object.keys(editableData).length === 0 ? (
            <p className="text-white/60">
              OCR not enabled yet. Data will appear here later.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {Object.entries(editableData).map(([key, value]) => (
                <div
                  key={key}
                  className="flex justify-between items-center border-b border-white/10 pb-2"
                >
                  <span className="text-white/70 font-medium">{key}</span>
                  <input
                    value={String(value)}
                    onChange={(e) =>
                      setEditableData({
                        ...editableData,
                        [key]: e.target.value,
                      })
                    }
                    className="bg-transparent text-right border-b border-white/30 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleConfirmAndAnalyze}
            disabled={loadingRisk}
            className="mt-8 w-full px-6 py-3 rounded-xl bg-cyan-400 text-slate-900 font-semibold hover:bg-cyan-300 disabled:opacity-50"
          >
            {loadingRisk ? "Analyzing…" : "Confirm & Analyze"}
          </button>
        </motion.section>

        {/* -------------------- RISK RESULTS -------------------- */}
        <AnimatePresence>
          {isConfirmed && riskData && (
            <motion.section
              id="risk-section"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <h2 className="text-3xl font-semibold text-center text-cyan-300">
                Disease Risk Analysis
              </h2>

              {Object.entries(riskData).map(([disease, result]) => (
                <div
                  key={disease}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <h3 className="text-xl font-bold capitalize">
                    {disease.replace("_", " ")}
                  </h3>

                  {result.ran ? (
                    <div className="mt-3">
                      <p className="text-4xl font-bold text-cyan-400">
                        {result.risk_percent}
                      </p>
                      <p className="text-sm text-white/60 mt-2">
                        Matched:{" "}
                        {result.matched_features.join(", ") || "None"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-yellow-400 mt-3">
                      {result.reason || "Analysis not run"}
                    </p>
                  )}
                </div>
              ))}
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
