import { Link } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

interface Prediction {
  ran: boolean;
  risk_percent?: string;
  risk_probability?: number;
  matched_features: string[];
  missing_features: string[];
  reason?: string;
}

interface DiseaseResult extends Prediction {
  explanation?: string;
  precautions?: string[];
  loadingExplanation?: boolean;
}

interface ApiResult {
  message: string;
  extracted_data: Record<string, string | number>;
  predictions?: Record<string, Prediction>;
}

function riskColor(pct: string) {
  const v = parseFloat(pct);
  if (v >= 60) return { text: "text-rose-400", bar: "bg-rose-500", badge: "bg-rose-500/20 text-rose-300 border-rose-500/30", label: "High Risk", glow: "shadow-rose-500/20" };
  if (v >= 35) return { text: "text-amber-400", bar: "bg-amber-400", badge: "bg-amber-500/20 text-amber-300 border-amber-500/30", label: "Moderate Risk", glow: "shadow-amber-500/20" };
  return { text: "text-emerald-400", bar: "bg-emerald-400", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", label: "Low Risk", glow: "shadow-emerald-500/20" };
}

function formatDiseaseName(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default function ReportResult() {
  const stored = sessionStorage.getItem("healthmate_report_result");
  const resultData: ApiResult | null = stored ? JSON.parse(stored) : null;

  const [editableData, setEditableData] = useState<Record<string, any>>(resultData?.extracted_data ?? {});
  const [step, setStep]         = useState<"review" | "results">("review");
  const [loading, setLoading]   = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [results, setResults]   = useState<Record<string, DiseaseResult>>({});

  if (!resultData) {
    return (
      <div className="min-h-screen bg-[#0A1324] text-white text-center pt-40">
        <h1 className="text-3xl font-semibold">No Report Data Found</h1>
        <Link to="/risk-predictor" className="mt-6 inline-block px-6 py-3 rounded-xl bg-white text-slate-900 font-semibold">
          Upload Again
        </Link>
      </div>
    );
  }

  // Fetch explanation for a single disease and update state
  const fetchExplanation = async (disease: string, prediction: DiseaseResult, session: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api1/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          disease,
          risk_percent: prediction.risk_percent,
          matched_features: prediction.matched_features,
          extracted_data: editableData,
        }),
      });
      const data = await res.json();
      setResults(prev => ({
        ...prev,
        [disease]: { ...prev[disease], explanation: data.explanation, precautions: data.precautions, loadingExplanation: false }
      }));
    } catch {
      setResults(prev => ({ ...prev, [disease]: { ...prev[disease], loadingExplanation: false } }));
    }
  };

  const handleConfirm = async () => {
    try {
      setErrorMsg("");
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await fetch(`${API_BASE_URL}/api1/predict-risk`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ features: editableData }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Analysis failed");

      // Only diseases that ran
      const ran = Object.fromEntries(
        Object.entries(data.predictions ?? {}).filter(([_, v]) => (v as Prediction).ran)
      ) as Record<string, DiseaseResult>;

      // Mark all as loading explanation
      const withLoading = Object.fromEntries(
        Object.entries(ran).map(([k, v]) => [k, { ...v, loadingExplanation: true }])
      ) as Record<string, DiseaseResult>;

      setResults(withLoading);
      setStep("results");
      setTimeout(() => document.getElementById("results-top")?.scrollIntoView({ behavior: "smooth" }), 200);

      // Fire explanation requests for all diseases in parallel
      Object.entries(ran).forEach(([disease, prediction]) => {
        fetchExplanation(disease, prediction, session);
      });

    } catch (err: any) {
      setErrorMsg(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1324] via-[#0B1B33] to-[#0A1324] text-white">
      <main className="mx-auto max-w-4xl px-6 pt-28 pb-24">
        <AnimatePresence mode="wait">

          {/* ── STEP 1: REVIEW ── */}
          {step === "review" && (
            <motion.div key="review" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }}>
              <div className="text-center mb-10">
                <h1 className="text-[40px] font-semibold">Report Review</h1>
                <p className="mt-2 text-white/60">Review the extracted values. Edit anything that looks wrong before analysis.</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.035] backdrop-blur-2xl p-6 sm:p-8">
                <h2 className="text-xl font-semibold mb-6 text-white/90">📋 Extracted Medical Parameters</h2>
                {Object.keys(editableData).length === 0 ? (
                  <p className="text-white/50">No values extracted. Try uploading a clearer image.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
                    {Object.entries(editableData).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center border-b border-white/10 pb-3">
                        <span className="text-white/60 text-sm font-medium">{key}</span>
                        <input
                          value={String(value)}
                          onChange={(e) => setEditableData({ ...editableData, [key]: e.target.value })}
                          className="bg-transparent text-right text-white text-sm w-36 border-b border-white/20 focus:outline-none focus:border-cyan-400 transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {errorMsg && <p className="mt-4 text-rose-400 text-sm">{errorMsg}</p>}

                <button
                  onClick={handleConfirm}
                  disabled={loading || Object.keys(editableData).length === 0}
                  className="mt-8 w-full py-4 rounded-2xl bg-cyan-400 text-slate-900 font-bold text-lg hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Analyzing...
                    </span>
                  ) : "Confirm & Analyze →"}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: RESULTS ── */}
          {step === "results" && (
            <motion.div key="results" id="results-top" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-10">
                <h1 className="text-[40px] font-semibold">Analysis Results</h1>
                <p className="mt-2 text-white/60">
                  {Object.keys(results).length} disease risk{Object.keys(results).length !== 1 ? "s" : ""} analyzed from your report.
                </p>
              </div>

              {Object.keys(results).length === 0 ? (
                <div className="text-center rounded-3xl border border-white/10 bg-white/[0.03] p-12">
                  <p className="text-5xl mb-4">🔬</p>
                  <p className="text-white/50 text-lg">No predictions could be made from this report.</p>
                  <p className="text-white/30 text-sm mt-2">Upload a report with more relevant medical parameters.</p>
                  <Link to="/upload-report" className="mt-6 inline-block px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition">Upload Different Report</Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(results).map(([disease, result], i) => {
                    const risk = riskColor(result.risk_percent!);
                    return (
                      <motion.div
                        key={disease}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={`rounded-3xl border border-white/10 bg-white/[0.035] backdrop-blur-xl overflow-hidden shadow-2xl ${risk.glow}`}
                      >
                        {/* ── Risk Header ── */}
                        <div className="p-6 sm:p-8 pb-5">
                          <div className="flex items-start justify-between mb-5">
                            <div>
                              <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Disease Risk</p>
                              <h3 className="text-2xl font-bold">{formatDiseaseName(disease)}</h3>
                            </div>
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${risk.badge}`}>
                              {risk.label}
                            </span>
                          </div>

                          <p className={`text-7xl font-black mb-4 leading-none ${risk.text}`}>
                            {result.risk_percent}
                          </p>

                          <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden mb-5">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: result.risk_percent }}
                              transition={{ duration: 1.2, ease: "easeOut", delay: i * 0.1 + 0.2 }}
                              className={`h-full rounded-full ${risk.bar}`}
                            />
                          </div>


                        </div>

                        {/* ── AI Explanation ── */}
                        <div className="border-t border-white/10 px-6 sm:px-8 py-6">
                          {result.loadingExplanation ? (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-white/40 text-sm mb-4">
                                <svg className="animate-spin h-4 w-4 text-cyan-400" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                </svg>
                                <span className="text-cyan-400/70">Generating your personalized health insights...</span>
                              </div>
                              {/* Skeleton loaders */}
                              <div className="h-3 bg-white/5 rounded-full w-full animate-pulse"/>
                              <div className="h-3 bg-white/5 rounded-full w-5/6 animate-pulse"/>
                              <div className="h-3 bg-white/5 rounded-full w-4/6 animate-pulse"/>
                            </div>
                          ) : result.explanation ? (
                            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                              {/* What this means */}
                              <div className="rounded-2xl bg-white/[0.04] border border-white/8 p-5">
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="text-lg">💡</span>
                                  <h4 className="text-sm font-bold text-white/70 uppercase tracking-wider">What This Means For You</h4>
                                </div>
                                <p className="text-white/85 text-sm leading-7">{result.explanation}</p>
                              </div>

                              {/* Precautions */}
                              {result.precautions && result.precautions.length > 0 && (
                                <div className="rounded-2xl bg-white/[0.04] border border-white/8 p-5">
                                  <div className="flex items-center gap-2 mb-4">
                                    <span className="text-lg">🛡️</span>
                                    <h4 className="text-sm font-bold text-white/70 uppercase tracking-wider">Recommended Actions</h4>
                                  </div>
                                  <ul className="space-y-3">
                                    {result.precautions.map((p, idx) => (
                                      <motion.li
                                        key={idx}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.07 }}
                                        className="flex items-start gap-3 text-sm text-white/75 leading-relaxed"
                                      >
                                        <span className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${risk.badge}`}>
                                          {idx + 1}
                                        </span>
                                        {p}
                                      </motion.li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Disclaimer */}
                              <p className="text-white/25 text-xs text-center">
                                ⚕️ This is an AI-generated health insight, not a medical diagnosis. Always consult a qualified doctor.
                              </p>
                            </motion.div>
                          ) : null}
                        </div>
                      </motion.div>
                    );
                  })}

                  <button
                    onClick={() => setStep("review")}
                    className="w-full py-3 rounded-2xl border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition text-sm"
                  >
                    ← Review & Edit Values
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}