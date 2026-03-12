import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";
import GlassCard from "../components/GlassCard";
import PrimaryButton from "../components/PrimaryButton";

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
  if (v >= 60) return { text: "text-status-critical", bar: "bg-status-critical", badge: "bg-status-critical/10 text-status-critical", label: "High Risk", glow: "shadow-status-critical/10" };
  if (v >= 35) return { text: "text-status-warning", bar: "bg-status-warning", badge: "bg-status-warning/10 text-status-warning", label: "Moderate Risk", glow: "shadow-status-warning/10" };
  return { text: "text-status-success", bar: "bg-status-success", badge: "bg-status-success/10 text-status-success", label: "Low Risk", glow: "shadow-status-success/10" };
}

function formatDiseaseName(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

const DataSlider = ({ label, value }: { label: string, value: string | number }) => {
  const num = parseFloat(String(value));
  let pos = 50;
  if (!isNaN(num)) {
    pos = 30 + (num % 40);
  }
  return (
    <div className="flex items-center justify-between mb-4 w-full gap-4">
      <div className="w-[40%]">
        <span className="text-sm font-bold text-slate-500 leading-tight line-clamp-2" title={label}>{label.replace(/_/g, ' ')}</span>
      </div>
      <div className="w-[40%] relative h-3 bg-slate-100 shadow-inner rounded-full flex items-center border border-slate-200/50">
        <div className="absolute left-[30%] right-[30%] h-full bg-rose-400/20 rounded-full"></div>
        <motion.div
          initial={{ left: "0%" }}
          animate={{ left: `${pos}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="absolute w-5 h-5 bg-white border-[2.5px] border-rose-500 rounded-full shadow-[0_2px_8px_rgba(244,63,94,0.3)] -ml-2.5"
        />
      </div>
      <div className="w-[20%] text-right font-mono text-sm font-bold text-slate-900">
        {value}
      </div>
    </div>
  );
};

export default function ReportResult() {
  const location = useLocation();
  const stored = sessionStorage.getItem("healthmate_report_result");
  const resultData: ApiResult | null = stored ? JSON.parse(stored) : null;

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [results, setResults] = useState<Record<string, DiseaseResult>>({});

  useEffect(() => {
    // Automatically trigger the analysis if we just arrived from RiskPredictor
    if (location.state?.triggerAnalysis && resultData) {
      handleConfirm();
      // Clear history state to prevent re-triggering on refresh
      window.history.replaceState({}, document.title);
    }
  }, []);

  if (!resultData) {
    return (
      <div className="min-h-screen text-slate-900 text-center pt-40 px-4">
        <h1 className="text-3xl font-bold">No Report Data Found</h1>
        <Link to="/risk-predictor" className="mt-6 inline-block">
          <PrimaryButton className="w-auto">Upload a Report</PrimaryButton>
        </Link>
      </div>
    );
  }

  const fetchExplanation = async (disease: string, prediction: DiseaseResult, session: any, editableData: any) => {
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

      // Grab the extraction dataset confirmed by the user in RiskPredictor.tsx
      const editableData = resultData.extracted_data;

      const res = await fetch(`${API_BASE_URL}/api1/predict-risk`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ features: editableData }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Analysis failed");

      const ran = Object.fromEntries(
        Object.entries(data.predictions ?? {}).filter(([_, v]) => (v as Prediction).ran)
      ) as Record<string, DiseaseResult>;

      const withLoading = Object.fromEntries(
        Object.entries(ran).map(([k, v]) => [k, { ...v, loadingExplanation: true }])
      ) as Record<string, DiseaseResult>;

      setResults(withLoading);
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 200);

      Object.entries(ran).forEach(([disease, prediction]) => {
        fetchExplanation(disease, prediction, session, editableData);
      });

    } catch (err: any) {
      setErrorMsg(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full text-text-primary">
      <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-8 pb-32 flex flex-col items-center">

        {loading ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center mt-32">
            <div className="h-24 w-24 rounded-full border-4 border-rose-100 border-t-rose-500 animate-spin mb-6 shadow-lg shadow-rose-500/20" />
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">AI is analyzing your report...</h2>
            <p className="text-slate-500 font-medium mt-2">Checking against thousands of medical markers.</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key="results" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full">
              <div className="text-center mb-12 max-w-2xl mx-auto mt-4 md:mt-10">
                <h1 className="text-4xl sm:text-[2.75rem] font-black tracking-tight mb-4 text-slate-900">Your Intelligence Report</h1>
                <p className="text-slate-500 font-semibold text-lg max-w-2xl mx-auto">
                  We've analyzed your data points. Here is a breakdown of your current health markers and what they suggest.
                </p>
              </div>

              {errorMsg && (
                <div className="mb-8 p-6 bg-rose-50 border border-status-critical/20 rounded-2xl flex flex-col items-center text-center">
                  <p className="text-status-critical font-bold mb-4">{errorMsg}</p>
                  <Link to="/risk-predictor">
                    <PrimaryButton className="!py-3 !px-6">Return to Risk Predictor</PrimaryButton>
                  </Link>
                </div>
              )}

              {Object.keys(results).length === 0 && !errorMsg ? (
                <GlassCard className="text-center border-dashed border-2 py-16">
                  <div className="text-5xl mb-6 inline-block bg-slate-100 p-6 rounded-3xl">🔬</div>
                  <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Insufficient Data</h3>
                  <p className="text-slate-500 font-medium mb-8 max-w-md mx-auto">
                    No specific predictions could be made from the extracted parameters. Try ensuring all relevant markers are clearly visible.
                  </p>
                  <Link to="/risk-predictor" className="inline-block">
                    <PrimaryButton className="w-auto px-8 shadow-sm text-[16px]">Upload Different Report</PrimaryButton>
                  </Link>
                </GlassCard>
              ) : (
                <div className="space-y-8 w-full">
                  {Object.entries(results).map(([disease, result], i) => {
                    const risk = riskColor(result.risk_percent!);
                    return (
                      <motion.div key={disease} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                        <GlassCard className={`!p-0 overflow-hidden ${risk.glow} border-t-8 ${risk.bar.replace('bg-', 'border-t-')}`}>

                          {/* HEADER REGION */}
                          <div className="p-6 sm:p-8 sm:pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                              <p className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-2">Health Assessment</p>
                              <h3 className="text-[2rem] font-black text-slate-900 tracking-tight leading-none">{formatDiseaseName(disease)}</h3>
                            </div>
                            <div className="flex flex-col md:items-end">
                              <span className={`text-[11px] uppercase tracking-wider font-bold px-4 py-1.5 rounded-full mb-3 inline-block self-start md:self-auto ${risk.badge}`}>
                                {risk.label} Marker
                              </span>
                              <p className={`text-6xl font-black leading-none tracking-tighter ${risk.text}`}>
                                {result.risk_percent}
                              </p>
                            </div>
                          </div>

                          {/* SLIDER AND PARAMETERS (Z-LAYOUT) */}
                          <div className="px-6 sm:px-8 pb-8 pt-4 border-b border-slate-100 bg-white">
                            <h4 className="text-[11px] font-bold text-slate-400 mb-5 uppercase tracking-wider">Parameters Analyzed</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3">
                              {result.matched_features.map((featureKey) => (
                                <DataSlider key={featureKey} label={featureKey} value={resultData!.extracted_data[featureKey]} />
                              ))}
                            </div>
                          </div>

                          {/* EXPLANATION */}
                          <div className="p-6 sm:p-8 bg-slate-50/50">
                            {result.loadingExplanation ? (
                              <div className="space-y-5">
                                <div className="flex items-center gap-3 text-sm font-bold text-slate-900">
                                  <svg className="animate-spin h-5 w-5 text-rose-500" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                  </svg>
                                  Generating your personalized insights...
                                </div>
                                <div className="h-3 bg-slate-200/60 rounded-full w-full animate-pulse" />
                                <div className="h-3 bg-slate-200/60 rounded-full w-5/6 animate-pulse" />
                                <div className="h-3 bg-slate-200/60 rounded-full w-4/6 animate-pulse" />
                              </div>
                            ) : result.explanation ? (
                              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                <div className="bg-white rounded-[1.5rem] p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
                                  <div className="flex items-center gap-3 mb-4 relative z-10">
                                    <div className="bg-rose-50 p-2.5 rounded-xl text-rose-500 shadow-sm border border-rose-100/50"><span className="text-xl">💡</span></div>
                                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest">What This Means For You</h4>
                                  </div>
                                  <p className="text-slate-600 text-[15px] leading-relaxed font-medium relative z-10">{result.explanation}</p>
                                </div>

                                {result.precautions && result.precautions.length > 0 && (
                                  <div className="bg-white rounded-[1.5rem] p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden mt-6">
                                    <div className="flex items-center gap-3 mb-5 relative z-10">
                                      <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-500 shadow-sm border border-emerald-100/50"><span className="text-xl">🛡️</span></div>
                                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Recommended Actions</h4>
                                    </div>
                                    <ul className="space-y-3 relative z-10">
                                      {result.precautions.map((p, idx) => (
                                        <motion.li key={idx} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-4 text-[15px] font-medium text-slate-600 leading-relaxed p-3 rounded-2xl bg-slate-50 border border-slate-100">
                                          <span className="shrink-0 w-7 h-7 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-xs font-bold border border-emerald-200/50">{idx + 1}</span>
                                          <span className="mt-0.5">{p}</span>
                                        </motion.li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                <p className="text-[11px] text-slate-400 text-center font-bold tracking-wide italic mt-6">
                                  ⚕️ AI-GENERATED HEALTH INSIGHT. ALWAYS CONSULT A DOCTOR FOR DIAGNOSIS.
                                </p>
                              </motion.div>
                            ) : null}
                          </div>
                        </GlassCard>
                      </motion.div>
                    );
                  })}

                  <div className="flex justify-center pt-8">
                    <Link to="/risk-predictor" className="text-slate-500 font-bold hover:text-rose-500 transition-colors py-2 px-4 rounded-xl border border-transparent hover:bg-white hover:border-slate-200 shadow-sm">
                      ← Scan another report
                    </Link>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}