import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Activity, HeartPulse, Brain, Thermometer, XCircle } from "lucide-react";
import NavbarPrivate from "../components/NavbarPrivate";
import GlassCard from "../components/GlassCard";
import Field from "../components/Field";
import PrimaryButton from "../components/PrimaryButton";
import { useDebounce } from "../hooks/use-debounce";

const COMMON_SYMPTOMS = [
  "Fever", "Headache", "Cough", "Fatigue", "Nausea",
  "Chest Pain", "Shortness of Breath", "Dizziness", "Sore Throat",
  "Body Aches", "Loss of Appetite", "Chills", "Weakness"
];

export default function SymptomDecoder() {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [predictions, setPredictions] = useState<{ disease: string; confidence: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:8000";
  const debouncedQuery = useDebounce(searchQuery, 250);

  const addSymptom = (s: string) => {
    if (!selectedSymptoms.includes(s)) setSelectedSymptoms([...selectedSymptoms, s]);
  };
  const removeSymptom = (s: string) => setSelectedSymptoms(selectedSymptoms.filter(sym => sym !== s));

  const predictDiseases = async () => {
    if (selectedSymptoms.length === 0) return;
    setLoading(true);
    setPredictions([]);
    setErrorMsg(null);

    try {
      const resp = await fetch(`${API_URL}/predict?top_k=5`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms: selectedSymptoms }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const parsed =
        data?.predictions?.map((p: any) => ({
          disease: p.class,
          confidence: Math.round((p.probability ?? 0) * 100),
        })) || [];
      setPredictions(parsed);
    } catch (err) {
      console.error("Prediction error:", err);
      setErrorMsg("Could not connect to the backend service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredSymptoms = COMMON_SYMPTOMS.filter(
    s => s.toLowerCase().includes(debouncedQuery.toLowerCase()) && !selectedSymptoms.includes(s)
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1324] via-[#0B1B33] to-[#0A1324] text-white">
      <NavbarPrivate />

      <div className="pt-24 max-w-6xl mx-auto px-4 pb-16">
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
            Symptom Decoder
          </h1>
          <p className="text-white/60 text-lg">AI-powered diagnosis prediction based on your symptoms.</p>
        </motion.div>

        {/* GLASS CARD SECTION */}
        <GlassCard className="p-8 backdrop-blur-2xl border-white/10 shadow-[0_0_35px_-10px_rgba(0,255,255,0.2)]">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Search size={20} className="text-cyan-400" /> Select Symptoms
          </h2>

          {/* SEARCH INPUT */}
          <div className="relative mb-6">
            <Field
              type="text"
              placeholder="Search for symptoms..."
              value={searchQuery}
              onChange={(e: any) => setSearchQuery(e.target.value)}
              className="pl-10 text-white bg-white/10 border border-white/20 placeholder-white/40"
            />
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          </div>

          {/* SELECTED SYMPTOMS */}
          {selectedSymptoms.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {selectedSymptoms.map((s) => (
                <div
                  key={s}
                  onClick={() => removeSymptom(s)}
                  className="flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 text-white text-sm cursor-pointer hover:scale-105 transition"
                >
                  {s}
                  <XCircle size={14} />
                </div>
              ))}
            </div>
          )}

          {/* COMMON SYMPTOMS */}
          <div className="flex flex-wrap gap-2 mb-8">
            {filteredSymptoms.map((s) => (
              <div
                key={s}
                onClick={() => addSymptom(s)}
                className="px-3 py-1.5 rounded-full bg-white/10 text-white/80 hover:bg-cyan-400/30 hover:text-white cursor-pointer transition-all"
              >
                {s}
              </div>
            ))}
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex gap-3">
            <PrimaryButton
              onClick={predictDiseases}
              disabled={selectedSymptoms.length === 0 || loading}
              className="flex-1 bg-gradient-to-r from-cyan-400 to-blue-500 text-black hover:opacity-90"
            >
              <Activity size={18} className="mr-2" />
              {loading ? "Predicting..." : "Predict Diseases"}
            </PrimaryButton>

            {selectedSymptoms.length > 0 && (
              <button
                onClick={() => setSelectedSymptoms([])}
                disabled={loading}
                className="px-6 py-2 rounded-xl border border-white/30 hover:bg-white/10 transition text-white/80"
              >
                Clear All
              </button>
            )}
          </div>

          {/* ERROR */}
          {errorMsg && (
            <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-200">
              ⚠️ {errorMsg}
            </div>
          )}
        </GlassCard>

        {/* RESULTS */}
        <div className="mt-10">
          {loading && (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <GlassCard key={i} className="p-6 bg-white/5 border-white/10 animate-pulse">
                  <div className="h-4 w-1/2 bg-white/20 rounded mb-2" />
                  <div className="h-3 w-3/4 bg-white/10 rounded" />
                </GlassCard>
              ))}
            </div>
          )}

          {!loading && predictions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="grid gap-4 md:grid-cols-2"
            >
              {predictions.map((p, i) => (
                <GlassCard
                  key={p.disease}
                  className="p-6 bg-white/10 hover:bg-white/20 transition border-white/10 shadow-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">{p.disease}</h3>
                    <span
                      className={`px-3 py-1 text-sm rounded-full ${
                        p.confidence > 70
                          ? "bg-green-500/80"
                          : p.confidence > 50
                          ? "bg-yellow-400/70"
                          : "bg-red-400/70"
                      }`}
                    >
                      {p.confidence}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-700"
                      style={{ width: `${p.confidence}%` }}
                    ></div>
                  </div>
                </GlassCard>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
