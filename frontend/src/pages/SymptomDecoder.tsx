import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search, ShieldAlert, RefreshCw, CheckCircle2,
  X, AlertTriangle, TrendingUp, Clock, Wifi, Sparkles, Plus
} from "lucide-react";
import { useDebounce } from "../hooks/use-debounce";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabaseClient";

// ─── Symptom Categorization for 132 features ─────────────────────────────────
const CATEGORIZED_SYMPTOMS: Record<string, { id: string; label: string; icon: string }[]> = {
  "General": [
    { id: "fatigue", label: "Fatigue", icon: "😴" },
    { id: "lethargy", label: "Lethargy", icon: "🥱" },
    { id: "high_fever", label: "High Fever", icon: "🌡️" },
    { id: "mild_fever", label: "Mild Fever", icon: "🤒" },
    { id: "shivering", label: "Shivering", icon: "🥶" },
    { id: "chills", label: "Chills", icon: "❄️" },
    { id: "sweating", label: "Sweating", icon: "💦" },
    { id: "dehydration", label: "Dehydration", icon: "🥤" },
    { id: "malaise", label: "Malaise", icon: "🤢" },
    { id: "obesity", label: "Obesity", icon: "⚖️" },
    { id: "loss_of_appetite", label: "Loss of Appetite", icon: "🍽️" },
    { id: "increased_appetite", label: "Increased Appetite", icon: "😋" },
    { id: "excessive_hunger", label: "Excessive Hunger", icon: "🍕" },
    { id: "weight_gain", label: "Weight Gain", icon: "📈" },
    { id: "weight_loss", label: "Weight Loss", icon: "📉" },
    { id: "sunken_eyes", label: "Sunken Eyes", icon: "👁️" }
  ],
  "Neurological": [
    { id: "headache", label: "Headache", icon: "🧠" },
    { id: "dizziness", label: "Dizziness", icon: "🌀" },
    { id: "spinning_movements", label: "Vertigo / Spinning", icon: "💫" },
    { id: "loss_of_balance", label: "Loss of Balance", icon: "🤸" },
    { id: "unsteadiness", label: "Unsteadiness", icon: "🚶" },
    { id: "loss_of_smell", label: "Loss of Smell", icon: "👃" },
    { id: "anxiety", label: "Anxiety", icon: "😟" },
    { id: "depression", label: "Depression", icon: "😢" },
    { id: "irritability", label: "Irritability", icon: "😠" },
    { id: "lack_of_concentration", label: "Lack of Concentration", icon: "💭" },
    { id: "visual_disturbances", label: "Visual Disturbances", icon: "👓" },
    { id: "blurred_and_distorted_vision", label: "Blurred Vision", icon: "👁️‍🗨️" },
    { id: "slurred_speech", label: "Slurred Speech", icon: "🗣️" },
    { id: "altered_sensorium", label: "Altered Sensorium", icon: "⚡" },
    { id: "coma", label: "Coma State", icon: "🏥" }
  ],
  "Cardio & Respiratory": [
    { id: "chest_pain", label: "Chest Pain", icon: "❤️" },
    { id: "breathlessness", label: "Shortness of Breath", icon: "💨" },
    { id: "cough", label: "Cough", icon: "😮‍💨" },
    { id: "phlegm", label: "Phlegm / Sputum", icon: "🥛" },
    { id: "runny_nose", label: "Runny Nose", icon: "🤧" },
    { id: "congestion", label: "Nasal Congestion", icon: "👃" },
    { id: "continuous_sneezing", label: "Continuous Sneezing", icon: "🤧" },
    { id: "throat_irritation", label: "Throat Irritation", icon: "🗣️" },
    { id: "sinus_pressure", label: "Sinus Pressure", icon: "💆" },
    { id: "palpitations", label: "Heart Palpitations", icon: "💓" },
    { id: "fast_heart_rate", label: "Fast Heart Rate", icon: "📈" },
    { id: "cold_hands_and_feets", label: "Cold Extremities", icon: "🥶" }
  ],
  "Gastrointestinal": [
    { id: "vomiting", label: "Vomiting", icon: "🤮" },
    { id: "nausea", label: "Nausea", icon: "🤢" },
    { id: "stomach_pain", label: "Stomach Pain", icon: "😣" },
    { id: "acidity", label: "Acidity / Heartburn", icon: "🔥" },
    { id: "ulcers_on_tongue", label: "Mouth/Tongue Ulcers", icon: "👅" },
    { id: "indigestion", label: "Indigestion", icon: "🍽️" },
    { id: "constipation", label: "Constipation", icon: "🚽" },
    { id: "diarrhoea", label: "Diarrhea", icon: "💩" },
    { id: "abdominal_pain", label: "Abdominal Pain", icon: "🤰" },
    { id: "belly_pain", label: "Belly Pain", icon: "🍔" },
    { id: "swelling_of_stomach", label: "Stomach Swelling", icon: "🎈" },
    { id: "distention_of_abdomen", label: "Abdomen Distention", icon: "🤰" },
    { id: "stomach_bleeding", label: "Stomach Bleeding", icon: "🩸" },
    { id: "acute_liver_failure", label: "Acute Liver Failure", icon: "🧬" },
    { id: "yellowish_skin", label: "Jaundice Skin", icon: "🟡" },
    { id: "yellowing_of_eyes", label: "Jaundice Eyes", icon: "🟡" },
    { id: "dark_urine", label: "Dark Urine", icon: "🥤" }
  ],
  "Skin & Nails": [
    { id: "itching", label: "Itching", icon: "🕸️" },
    { id: "skin_rash", label: "Skin Rash", icon: "🔴" },
    { id: "nodal_skin_eruptions", label: "Skin Eruptions", icon: "🟣" },
    { id: "red_spots_over_body", label: "Red Spots", icon: "📍" },
    { id: "dischromic _patches", label: "Discolored Patches", icon: "🏁" },
    { id: "pus_filled_pimples", label: "Pustules / Acne", icon: "🟡" },
    { id: "blackheads", label: "Blackheads", icon: "⚫" },
    { id: "scurring", label: "Skin Scars", icon: "🩹" },
    { id: "skin_peeling", label: "Skin Peeling", icon: "👋" },
    { id: "silver_like_dusting", label: "Silver Scale Dusting", icon: "✨" },
    { id: "small_dents_in_nails", label: "Small Nail Dents", icon: "💅" },
    { id: "inflammatory_nails", label: "Nail Inflammation", icon: "💅" },
    { id: "blister", label: "Skin Blisters", icon: "🧼" },
    { id: "red_sore_around_nose", label: "Sores Around Nose", icon: "🐽" },
    { id: "yellow_crust_ooze", label: "Yellow Ooze Crust", icon: "🍯" },
    { id: "patches_in_throat", label: "Throat Patches", icon: "👅" }
  ],
  "Musculoskeletal": [
    { id: "joint_pain", label: "Joint Pain", icon: "Bone" },
    { id: "muscle_pain", label: "Muscle Pain", icon: "💪" },
    { id: "muscle_weakness", label: "Muscle Weakness", icon: "🥀" },
    { id: "muscle_wasting", label: "Muscle Wasting", icon: "📉" },
    { id: "back_pain", label: "Back Pain", icon: "🪵" },
    { id: "neck_pain", label: "Neck Pain", icon: "🧣" },
    { id: "stiff_neck", label: "Stiff Neck", icon: "🧣" },
    { id: "knee_pain", label: "Knee Pain", icon: "🦵" },
    { id: "hip_joint_pain", label: "Hip Joint Pain", icon: "🩲" },
    { id: "swelling_joints", label: "Swelling Joints", icon: "🦴" },
    { id: "movement_stiffness", label: "Movement Stiffness", icon: "🤖" },
    { id: "weakness_in_limbs", label: "Limbs Weakness", icon: "🦾" },
    { id: "weakness_of_one_body_side", label: "Hemiparesis (One Side)", icon: "🌓" },
    { id: "swollen_legs", label: "Swollen Legs", icon: "🧦" },
    { id: "prominent_veins_on_calf", label: "Varicose Calf Veins", icon: "🦵" }
  ],
  "Urinary & Others": [
    { id: "burning_micturition", label: "Burning Urination", icon: "🔥" },
    { id: "spotting_ urination", label: "Spotting Blood", icon: "🩸" },
    { id: "yellow_urine", label: "Yellow Urine", icon: "🟡" },
    { id: "bladder_discomfort", label: "Bladder Discomfort", icon: "🎈" },
    { id: "foul_smell_of urine", label: "Smelly Urine", icon: "🪰" },
    { id: "continuous_feel_of_urine", label: "Urinary Urgency", icon: "🚽" },
    { id: "polyuria", label: "Excessive Urination", icon: "🚽" },
    { id: "abnormal_menstruation", label: "Abnormal Period", icon: "🩸" },
    { id: "family_history", label: "Family History", icon: "🧬" },
    { id: "receiving_blood_transfusion", label: "Blood Transfusion", icon: "🩸" },
    { id: "receiving_unsterile_injections", label: "Unsterile Injections", icon: "💉" }
  ]
};

// ─── Flat lookup mapping for search indexing ──────────────────────────────────
const ALL_132_SYMPTOMS = Object.values(CATEGORIZED_SYMPTOMS).flat();

// Rule-based concern weights for legacy vitals calculation
const SYMPTOM_WEIGHTS: Record<string, { weight: number; level: string; icon: string }> = {
  "chest_pain": { weight: 30, level: "Critical", icon: "❤️" },
  "breathlessness": { weight: 25, level: "Critical", icon: "💨" },
  "dizziness": { weight: 20, level: "High", icon: "🌀" },
  "fatigue": { weight: 15, level: "Medium", icon: "😴" },
  "lethargy": { weight: 15, level: "Medium", icon: "🥱" },
  "high_fever": { weight: 15, level: "Medium", icon: "🌡️" },
  "cough": { weight: 10, level: "Medium", icon: "😮‍💨" },
  "nausea": { weight: 10, level: "Medium", icon: "🤢" },
  "muscle_pain": { weight: 10, level: "Medium", icon: "💪" },
  "chills": { weight: 10, level: "Medium", icon: "❄️" },
  "muscle_weakness": { weight: 10, level: "Medium", icon: "🥀" },
  "headache": { weight: 5, level: "Low", icon: "🧠" },
  "throat_irritation": { weight: 5, level: "Low", icon: "🗣️" },
  "loss_of_appetite": { weight: 5, level: "Low", icon: "🍽️" }
};

const LEVEL_STYLES: Record<string, string> = {
  Critical: "bg-rose-50 text-rose-600 border-rose-200",
  High: "bg-amber-50 text-amber-600 border-amber-200",
  Medium: "bg-blue-50 text-blue-600 border-blue-200",
  Low: "bg-slate-50 text-slate-500 border-slate-200",
};

const GAUGE_COLOR = (score: number) => {
  if (score >= 40) return "#f43f5e";
  if (score >= 20) return "#f59e0b";
  return "#10b981";
};

const RISK_LABEL = (score: number) => {
  if (score >= 40) return { label: "Critical Hazard", color: "text-rose-600" };
  if (score >= 20) return { label: "Moderate Hazard", color: "text-amber-600" };
  if (score > 0) return { label: "Low Hazard", color: "text-blue-600" };
  return { label: "No Symptoms", color: "text-emerald-500" };
};

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

interface PredictedDisease {
  disease: string;
  probability: number;
  probability_percent: string;
  recommended_med: {
    name: string;
    dosage: string;
    frequency: string;
    times: string[];
  };
}

export default function SymptomDecoder() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("General");
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [loadingPrev, setLoadingPrev] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncedSet, setSyncedSet] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [unifiedSafetyScore, setUnifiedSafetyScore] = useState<number>(100);
  const [unifiedBreakdown, setUnifiedBreakdown] = useState<any>(null);

  // Predictions state
  const [predictedDiseases, setPredictedDiseases] = useState<PredictedDisease[]>([]);
  const [predicting, setPredicting] = useState(false);
  const [schedulingMed, setSchedulingMed] = useState<string | null>(null);

  const debouncedQuery = useDebounce(searchQuery, 200);

  const fetchUnifiedRisk = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const headers = { Authorization: `Bearer ${session.access_token}` };
      const resp = await fetch(`${API_URL}/api3/risk-score`, { headers });
      if (resp.ok) {
        const riskData = await resp.json();
        setUnifiedSafetyScore(100 - riskData.score);
        setUnifiedBreakdown(riskData.breakdown || null);
      }
    } catch (err) {
      console.warn("Failed to fetch unified safety score:", err);
    }
  };

  // ── Load previously synced symptoms on mount ─────────────────────────────
  useEffect(() => {
    if (!user?.id) {
      setLoadingPrev(false);
      return;
    }
    fetchUnifiedRisk();
    fetch(`${API_URL}/api/latest?user_id=${encodeURIComponent(user.id)}`)
      .then(r => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then(data => {
        if (Array.isArray(data.symptoms) && data.symptoms.length > 0) {
          // Convert database standard/legacy symptoms back to Set
          const names = new Set<string>(data.symptoms as string[]);
          setSelected(names);
          setSyncedSet(names);
          setSynced(true);
          setLastSyncedAt(data.synced_at ?? null);
          setPredictedDiseases(data.predicted_diseases ?? []);
        }
      })
      .catch(() => { /* start fresh */ })
      .finally(() => setLoadingPrev(false));
  }, [user?.id]);

  // ── Call prediction API when selected symptoms change ─────────────────────
  useEffect(() => {
    if (selected.size === 0) {
      setPredictedDiseases([]);
      return;
    }
    const fetchPredictions = async () => {
      setPredicting(true);
      try {
        const resp = await fetch(`${API_URL}/api/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symptoms: [...selected] })
        });
        if (resp.ok) {
          const data = await resp.json();
          setPredictedDiseases(data.predicted_diseases ?? []);
        }
      } catch (e) {
        console.warn("Prediction failed:", e);
      } finally {
        setPredicting(false);
      }
    };
    fetchPredictions();
  }, [selected]);

  // ── Live hazard calculation ──────────────────────────────────────────────
  const liveSummary = useMemo(() => {
    let total = 0;
    const breakdown: { name: string; label: string; weight: number; icon: string }[] = [];
    for (const id of selected) {
      const sym = ALL_132_SYMPTOMS.find(x => x.id === id);
      const conf = SYMPTOM_WEIGHTS[id] || { weight: 5, icon: sym?.icon || "🩺" };
      total += conf.weight;
      breakdown.push({
        name: id,
        label: sym?.label || id,
        weight: conf.weight,
        icon: sym?.icon || "🩺"
      });
    }
    return { total: Math.min(100, total), breakdown };
  }, [selected]);

  // ── Unsaved change detection ─────────────────────────────────────────────
  const hasUnsyncedChanges = useMemo(() => {
    if (selected.size !== syncedSet.size) return true;
    for (const s of selected) {
      if (!syncedSet.has(s)) return true;
    }
    return false;
  }, [selected, syncedSet]);

  // ── Toggle symptom ────────────────────────────────────────────────────────
  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSynced(false);
    setErrorMsg(null);
  };

  // ── Sync to backend ──────────────────────────────────────────────────────
  const syncToRiskEngine = async () => {
    if (!user?.id) {
      setErrorMsg("You must be signed in to sync symptoms.");
      return;
    }
    setSyncing(true);
    setErrorMsg(null);
    try {
      const resp = await fetch(`${API_URL}/api/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms: [...selected], user_id: user.id }),
      });
      if (!resp.ok) {
        const detail = await resp.text();
        throw new Error(detail || "Sync failed");
      }
      setSynced(true);
      setSyncedSet(new Set(selected));
      setLastSyncedAt(new Date().toISOString());
      fetchUnifiedRisk();
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Failed to sync. Check backend connection.");
    } finally {
      setSyncing(false);
    }
  };

  // ── Medicine Scheduler Syncer ─────────────────────────────────────────────
  const scheduleMedicine = async (medName: string, medInfo: any) => {
    if (!user?.id) {
      setErrorMsg("You must be signed in to schedule medicines.");
      return;
    }
    setSchedulingMed(medName);
    setErrorMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${API_URL}/api/medicines`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          medicine_name: medName,
          dosage: medInfo.dosage,
          doses_per_day: medInfo.times.length,
          times: medInfo.times,
          frequency: medInfo.frequency,
          start_date: new Date().toISOString().split("T")[0],
          timezone: "UTC"
        }),
      });
      if (!resp.ok) {
        throw new Error("Failed to add medicine schedule.");
      }
      alert(`✅ ${medName} has been successfully added to your Medicine Scheduler!`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to schedule medicine.");
    } finally {
      setSchedulingMed(null);
    }
  };

  // ── AI Companion Deep Link ────────────────────────────────────────────────
  const discussWithAi = (disease: string) => {
    const list = [...selected].map(id => ALL_132_SYMPTOMS.find(x => x.id === id)?.label || id);
    navigate("/ai-companion", {
      state: {
        prefilledMessage: `I recently ran a check in the Symptom Decoder with active symptoms: ${list.join(", ")}. The RandomForest classifier indicated a high risk of ${disease}. Can you explain what this condition is, tell me some lifestyle precautions, and suggest how to manage it?`
      }
    });
  };

  const filteredSymptoms = useMemo(() => {
    if (!debouncedQuery) {
      return CATEGORIZED_SYMPTOMS[activeTab] || [];
    }
    return ALL_132_SYMPTOMS.filter(s =>
      s.label.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
      s.id.replace(/_/g, " ").toLowerCase().includes(debouncedQuery.toLowerCase())
    );
  }, [debouncedQuery, activeTab]);

  const oldSymptomPts = unifiedBreakdown?.symptom_points || 0;
  const otherPts = Math.max(0, (100 - unifiedSafetyScore) - oldSymptomPts);
  const newSymptomPts = Math.min(30, Math.floor(liveSummary.total / 2.5));
  const previewSafetyScore = Math.max(0, 100 - Math.min(100, otherPts + newSymptomPts));

  const displayedScore = hasUnsyncedChanges ? previewSafetyScore : unifiedSafetyScore;
  const riskInfo = RISK_LABEL(100 - displayedScore);
  const gaugeOffset = 502 - (502 * displayedScore) / 100;

  const formatTime = (iso: string | null) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  };

  return (
    <div className="w-full px-4 sm:px-6 pt-4 pb-24 max-w-[1500px] mx-auto">
      {/* HEADER */}
      <div className="mb-8 mt-4 md:mt-8">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 leading-tight">
          Symptom Decoder
        </h1>
        <p className="text-slate-500 font-semibold mt-1">
          Select your symptoms. The ML Classifier predicts medical conditions in real time.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* ── LEFT: Category Selector & Directories ─────────────────── */}
        <div className="xl:col-span-7 flex flex-col gap-4">
          {/* Search bar */}
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search 132 different symptoms..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition-all font-medium placeholder:text-slate-400 shadow-sm"
            />
          </div>

          {/* Selected Symptoms banner */}
          <AnimatePresence>
            {selected.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-slate-900 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-md"
              >
                <div className="flex flex-wrap gap-2 flex-1">
                  {[...selected].map(id => {
                    const sym = ALL_132_SYMPTOMS.find(x => x.id === id);
                    const isSynced = syncedSet.has(id);
                    return (
                      <button
                        key={id}
                        onClick={() => toggle(id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-bold rounded-full transition-colors group border ${
                          isSynced
                            ? "bg-emerald-500/30 border-emerald-400/40"
                            : "bg-white/10 border-white/10"
                        } hover:bg-rose-500/80 hover:border-transparent`}
                      >
                        <span>{sym?.icon || "🩺"}</span>
                        {sym?.label || id}
                        {isSynced && <Wifi size={9} className="opacity-60" />}
                        <X size={10} className="opacity-40 group-hover:opacity-100" />
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => { setSelected(new Set()); setSynced(false); setErrorMsg(null); }}
                  className="text-slate-400 hover:text-white text-xs font-bold transition-colors whitespace-nowrap"
                >
                  Clear All
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Directory tabs */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            {!searchQuery && (
              <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-4 mb-4">
                {Object.keys(CATEGORIZED_SYMPTOMS).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all border ${
                      activeTab === tab
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-slate-50 text-slate-500 border-slate-200/60 hover:bg-slate-100"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            )}

            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
              {searchQuery ? `Search Results (${filteredSymptoms.length})` : `${activeTab} Symptoms`}
            </span>

            {loadingPrev ? (
              <div className="flex items-center justify-center py-12 gap-2 text-slate-400 text-sm font-semibold">
                <RefreshCw size={16} className="animate-spin" />
                Restoring your last session...
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filteredSymptoms.map(s => {
                  const isActive = selected.has(s.id);
                  const isSynced = syncedSet.has(s.id);
                  const conf = SYMPTOM_WEIGHTS[s.id];
                  return (
                    <motion.button
                      key={s.id}
                      onClick={() => toggle(s.id)}
                      whileTap={{ scale: 0.97 }}
                      className={`relative p-3.5 rounded-xl border text-left transition-all duration-150 ${
                        isActive
                          ? "bg-slate-900 border-slate-700 shadow-md animate-in fade-in zoom-in-95 duration-100"
                          : "bg-white border-slate-200 hover:border-rose-300 hover:bg-rose-50/20"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full ${
                            isSynced ? "bg-emerald-400" : "bg-amber-400"
                          }`}
                        />
                      )}
                      <span className="text-lg mb-1 block">{s.icon}</span>
                      <span className={`block text-xs font-bold mb-1.5 truncate ${isActive ? "text-white" : "text-slate-700"}`}>
                        {s.label}
                      </span>
                      {conf && (
                        <span className={`text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-md border ${
                          isActive ? "bg-white/10 text-slate-300 border-white/10" : LEVEL_STYLES[conf.level]
                        }`}>
                          {conf.level}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
                {filteredSymptoms.length === 0 && (
                  <p className="col-span-3 text-center py-8 text-slate-400 font-semibold text-sm">
                    No symptoms found for "{searchQuery}".
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Machine Learning Predictions & Hazard Score ────────── */}
        <div className="xl:col-span-5 flex flex-col gap-6">
          {/* Main Risk Score Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 flex flex-col gap-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-black text-xl text-slate-900">Health Safety Index</h3>
                {lastSyncedAt && (
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-600 font-bold">
                    <Clock size={10} />
                    Last synced at {formatTime(lastSyncedAt)}
                  </div>
                )}
              </div>
              <ShieldAlert size={22} className="text-slate-300 mt-0.5" />
            </div>

            {/* Gauge */}
            <div className="flex flex-col items-center">
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                  {/* Background track */}
                  <circle cx="88" cy="88" r="76" stroke="#f1f5f9" strokeWidth="12" fill="transparent" />
                  
                  {/* Synced score indicator (transparent dashed circle) */}
                  {hasUnsyncedChanges && (
                    <circle
                      cx="88" cy="88" r="76"
                      stroke="#94a3b8"
                      strokeWidth="6"
                      fill="transparent"
                      strokeDasharray="4 4"
                      strokeDashoffset={502 - (502 * unifiedSafetyScore) / 100}
                      strokeLinecap="round"
                      opacity="0.6"
                    />
                  )}
                  
                  {/* Active/Preview progress circle */}
                  <motion.circle
                    cx="88" cy="88" r="76"
                    stroke={GAUGE_COLOR(100 - displayedScore)}
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray="502"
                    animate={{ strokeDashoffset: gaugeOffset }}
                    transition={{ type: "spring", stiffness: 80, damping: 18 }}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span
                    key={displayedScore}
                    initial={{ scale: 1.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-4xl font-black text-slate-800"
                  >
                    {displayedScore}
                  </motion.span>
                  {hasUnsyncedChanges && (displayedScore !== unifiedSafetyScore) ? (
                    <div className="text-[10px] text-slate-400 font-bold bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-full mt-1.5 flex items-center gap-1 shadow-sm">
                      <span className="font-extrabold text-slate-500">{unifiedSafetyScore}</span>
                      <span className="text-slate-300">→</span>
                      <span className="font-extrabold text-rose-500">{displayedScore}</span>
                    </div>
                  ) : (
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">Safety Score</span>
                  )}
                </div>
              </div>

              <motion.p
                key={riskInfo.label}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-3 text-base font-black ${riskInfo.color}`}
              >
                {riskInfo.label}
              </motion.p>
              <p className="text-[10px] text-center text-slate-400 font-semibold mt-1 max-w-[280px]">
                {hasUnsyncedChanges
                  ? "⚠️ Sync required to update your Vitals Safety Index."
                  : "Reflected in your active health safety metrics."}
              </p>
            </div>

            {/* Error notifications */}
            {errorMsg && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-bold">
                <AlertTriangle size={14} className="flex-shrink-0" />
                {errorMsg}
              </div>
            )}

            {/* Sync button */}
            <div className="pt-2 border-t border-slate-100">
              <button
                id="sync-to-health-index-btn"
                onClick={syncToRiskEngine}
                disabled={syncing || !hasUnsyncedChanges}
                className={`w-full py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                  !hasUnsyncedChanges
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default"
                    : "bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-200 hover:shadow-rose-300 hover:translate-y-[-1px] active:translate-y-[1px]"
                }`}
              >
                {syncing
                  ? <><RefreshCw size={16} className="animate-spin" /> Syncing Vitals...</>
                  : synced && !hasUnsyncedChanges
                  ? <><CheckCircle2 size={16} /> Synced to Health Vitals</>
                  : <><TrendingUp size={16} /> Update Vitals Score</>
                }
              </button>
            </div>
          </div>

          {/* Machine Learning Predictions Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-extrabold text-slate-900 text-base">ML Disease Predictor</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  RandomForest Classifier · Real-Time
                </p>
              </div>
              {predicting && <RefreshCw size={14} className="text-slate-400 animate-spin" />}
            </div>

            {selected.size === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl text-slate-300 font-bold text-sm">
                Select symptoms to trigger ML diagnostics
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {predictedDiseases.slice(0, 4).map((pred) => (
                  <div key={pred.disease} className="bg-slate-50/70 border border-slate-100 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-black text-sm text-slate-800 leading-tight">
                          {pred.disease}
                        </span>
                        <span className="block text-[9px] font-black text-rose-500 mt-0.5">
                          {pred.probability_percent} Match
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => discussWithAi(pred.disease)}
                          className="px-2.5 py-1 text-[10px] font-black text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <Sparkles size={11} />
                          Discuss
                        </button>
                        {pred.recommended_med && (
                          <button
                            onClick={() => scheduleMedicine(pred.recommended_med.name, pred.recommended_med)}
                            disabled={schedulingMed === pred.recommended_med.name}
                            className="px-2.5 py-1 text-[10px] font-black text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50"
                          >
                            {schedulingMed === pred.recommended_med.name ? (
                              <RefreshCw size={11} className="animate-spin" />
                            ) : (
                              <Plus size={11} />
                            )}
                            Rx Sync
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pred.probability * 100}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-600"
                        transition={{ type: "spring", stiffness: 80, damping: 15 }}
                      />
                    </div>

                    {/* Recommended Support Treatment */}
                    {pred.recommended_med && (
                      <div className="bg-white/80 p-2 rounded-lg border border-slate-200/50 flex items-center justify-between text-[10px] text-slate-500 font-bold">
                        <span>
                          🏥 Rx Recommendation: <strong className="text-slate-700">{pred.recommended_med.name}</strong> ({pred.recommended_med.dosage})
                        </span>
                        <span className="text-slate-400 capitalize">
                          {pred.recommended_med.frequency}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                {predictedDiseases.length === 0 && !predicting && (
                  <p className="text-center py-6 text-xs text-slate-400 font-bold">
                    No matching clinical patterns predicted for selected symptoms.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}