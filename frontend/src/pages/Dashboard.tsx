import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { getReportHistory, ReportRecord } from "../utils/reportHistory";
import { Calendar, Bell, MoreVertical, Activity, ChevronDown, User, ArrowRight, Pill, FileText, TrendingUp, Search, Heart, Sparkles, Send, Loader2, Thermometer, ShieldCheck, ShieldAlert, Check } from "lucide-react";
import { motion } from "framer-motion";

const API_URL = import.meta.env.VITE_API_BASE_URL || "https://healthmate-api-2qu0.onrender.com";

interface MedicineStats {
  streak: number;
  today_taken: number;
  today_total: number;
  adherence_percent: number;
}

interface UpcomingMed {
  id: string;
  name: string;
  dosage: string;
  time: string;
  timeValue: string;
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [fullName, setFullName] = useState<string>("");
  const [caregiverEmail, setCaregiverEmail] = useState<string>("");
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [todayLogs, setTodayLogs] = useState<any[]>([]);
  const [medStats, setMedStats] = useState<MedicineStats>({ streak: 0, today_taken: 0, today_total: 0, adherence_percent: 0 });
  const [upcomingMedicines, setUpcomingMedicines] = useState<UpcomingMed[]>([]);
  const [takingId, setTakingId] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  // Latest report AI chat message
  const [latestAiMsg, setLatestAiMsg] = useState<string>("");

  // Vitals safety risk score state
  const [vitalsRisk, setVitalsRisk] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    loadDashboardData();
  }, [user]);

  const getAuthToken = async (): Promise<string> => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.access_token) throw new Error("Not authenticated");
    return data.session.access_token;
  };

  const loadDashboardData = async () => {
    setDataLoading(true);
    try {
      // 1. Get Token upfront to parallelize all API calls
      const token = await getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };

      // 2. Fire all requests in parallel
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const [profileRes, reportHistory, statsRes, medsRes, historyRes, riskRes] = await Promise.all([
        supabase.from("profiles").select("full_name, caregiver_email").eq("id", user!.id).single(),
        getReportHistory(),
        fetch(`${API_URL}/api/medicines/stats?timezone=${encodeURIComponent(tz)}`, { headers }).catch(() => null),
        fetch(`${API_URL}/api/medicines?timezone=${encodeURIComponent(tz)}`, { headers }).catch(() => null),
        fetch(`${API_URL}/api2/history`, { headers }).catch(() => null),
        fetch(`${API_URL}/api3/risk-score`, { headers }).catch(() => null)
      ]);

      // 3. Process Profile
      if (profileRes?.data) {
        setFullName(profileRes.data.full_name);
        setCaregiverEmail(profileRes.data.caregiver_email || "");
      }

      // 4. Process Reports
      setReports(reportHistory || []);

      // 5. Process Medicine Stats
      if (statsRes?.ok) {
        const statsData = await statsRes.json();
        setMedStats(statsData);
      }

      // 6. Process Medicine List
      if (medsRes?.ok) {
        const medsData = await medsRes.json();
        setTodayLogs(medsData.today_logs || []);
        const meds = medsData.medicines || [];
        const upcoming: UpcomingMed[] = [];
        meds.forEach((m: any) => {
          (m.times || []).forEach((t: string) => {
            const [h, min] = t.split(":");
            let hours = parseInt(h, 10);
            const ampm = hours >= 12 ? "PM" : "AM";
            hours = hours % 12 || 12;
            upcoming.push({
              id: m.id,
              name: m.medicine_name,
              dosage: m.dosage,
              time: `Today at ${hours}:${min} ${ampm}`,
              timeValue: t,
            });
          });
        });
        upcoming.sort((a, b) => a.timeValue.localeCompare(b.timeValue));
        setUpcomingMedicines(upcoming);
      }

      // 7. Process AI History
      if (historyRes?.ok) {
        const historyData = await historyRes.json();
        const msgs = historyData.messages || [];
        const lastAi = [...msgs].reverse().find((m: any) => m.role === "assistant");
        if (lastAi) setLatestAiMsg(lastAi.content);
      }

      // 8. Process Vitals Risk Score
      if (riskRes?.ok) {
        const riskData = await riskRes.json();
        setVitalsRisk(riskData);
      }

    } catch (err) {
      console.warn("Dashboard load error:", err);
    } finally {
      setDataLoading(false);
    }
  };

  const handleTakeMedicine = async (medicineId: string, time: string) => {
    const key = `${medicineId}-${time}`;
    setTakingId(key);
    try {
      const token = await getAuthToken();
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await fetch(`${API_URL}/api/medicines/${medicineId}/take?timezone=${encodeURIComponent(tz)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ scheduled_time: time }),
      });
      await loadDashboardData();
    } catch (err) {
      console.warn("Take failed:", err);
    } finally {
      setTakingId(null);
    }
  };

  if (loading) return null;

  const firstName = fullName ? fullName.split(' ')[0] : "there";
  const reportCount = reports.length;



  // Overall health status based on latest report
  const latestReport = reports[0];
  const getHealthStatus = () => {
    if (!latestReport) return { 
      label: "No Data", 
      badge: "New", 
      textClass: "text-slate-600", 
      bgClass: "bg-slate-50", 
      borderClass: "border-slate-100", 
      iconClass: "text-slate-500" 
    };
    const risks = Object.values(latestReport.predictions).filter((p: any) => p.ran);
    if (risks.length === 0) return { 
      label: "Stable", 
      badge: "Good", 
      textClass: "text-emerald-600", 
      bgClass: "bg-emerald-50", 
      borderClass: "border-emerald-100", 
      iconClass: "text-emerald-500" 
    };
    const avgRisk = risks.reduce((sum: number, p: any) => sum + (p.risk_probability || 0), 0) / risks.length;
    if (avgRisk < 0.3) return { 
      label: "Good", 
      badge: "Good", 
      textClass: "text-emerald-600", 
      bgClass: "bg-emerald-50", 
      borderClass: "border-emerald-100", 
      iconClass: "text-emerald-500" 
    };
    if (avgRisk < 0.6) return { 
      label: "Fair", 
      badge: "Monitor", 
      textClass: "text-amber-600", 
      bgClass: "bg-amber-50", 
      borderClass: "border-amber-100", 
      iconClass: "text-amber-500" 
    };
    return { 
      label: "At Risk", 
      badge: "Alert", 
      textClass: "text-rose-600", 
      bgClass: "bg-rose-50", 
      borderClass: "border-rose-100", 
      iconClass: "text-rose-500" 
    };
  };
  const healthStatus = getHealthStatus();

  // Unified Safety Score Calculations
  const displaySafetyScore = vitalsRisk ? (100 - vitalsRisk.score) : 100;
  const displayStatusLabel = vitalsRisk ? vitalsRisk.status : healthStatus.label;

  const getSafetyStyle = () => {
    if (displaySafetyScore >= 71) {
      return {
        bg: "bg-emerald-50",
        border: "border-emerald-100",
        text: "text-emerald-600",
        icon: "text-emerald-500",
        badge: "Stable"
      };
    }
    if (displaySafetyScore >= 41) {
      return {
        bg: "bg-amber-50",
        border: "border-amber-100",
        text: "text-amber-600",
        icon: "text-amber-500",
        badge: "Warning"
      };
    }
    return {
      bg: "bg-rose-50",
      border: "border-rose-100",
      text: "text-rose-600",
      icon: "text-rose-500",
      badge: "Critical"
    };
  };
  const safetyStyle = getSafetyStyle();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-surface via-rose-50/30 to-rose-100/20 text-slate-800 animate-in fade-in duration-500">
      <div className="flex h-full">

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 px-6 lg:px-10 py-8 max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl md:text-[2.25rem] font-bold tracking-tight text-slate-900 leading-tight">
                {getGreeting()}, {firstName}!
              </h1>
              <p className="text-slate-500 text-sm font-medium mt-1">Here's your health overview for today</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative">
                <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur border border-slate-200/60 hover:border-rose-200 hover:bg-rose-50/50 transition-all shadow-sm">
                  <Search size={18} className="text-slate-500" />
                </button>
              </div>
              <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur border border-slate-200/60 hover:border-rose-200 hover:bg-rose-50/50 transition-all shadow-sm">
                <Calendar size={18} className="text-slate-500" />
              </button>
              <button className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur border border-slate-200/60 hover:border-rose-200 hover:bg-rose-50/50 transition-all shadow-sm">
                <Bell size={18} className="text-slate-500" />
                {reports.slice(0, 5).some(r => Object.values(r.predictions).some((p: any) => p.ran && parseFloat(p.risk_percent) > 50)) && <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"></div>}
              </button>
              <Link to="/settings" className="flex items-center gap-2 ml-1 bg-white/80 backdrop-blur px-3 py-2 rounded-xl border border-slate-200/60 hover:border-rose-200 hover:bg-rose-50/50 shadow-sm transition-all">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-rose-500 flex items-center justify-center text-white">
                  <User size={14} />
                </div>
                <ChevronDown size={14} className="text-slate-400" strokeWidth={2.5} />
              </Link>
            </div>
          </div>

          {dataLoading ? (
            <div className="flex items-center justify-center py-24 text-slate-400 gap-2">
              <Loader2 size={20} className="animate-spin" />
              <span className="font-bold text-sm">Loading dashboard...</span>
            </div>
          ) : (
            <>
              {/* Live Vitals Quick View Strip */}
              {vitalsRisk && vitalsRisk.latest_vitals && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 bg-white border border-slate-100 p-4 rounded-[24px] shadow-[0_2px_15px_rgba(0,0,0,0.02)]"
                >
                  {[
                    { label: "Heart Rate", val: vitalsRisk.latest_vitals.heart_rate, unit: "BPM", icon: Heart, color: "text-rose-500", bg: "bg-rose-50", pulse: true },
                    { label: "Oxygen level", val: vitalsRisk.latest_vitals.spo2, unit: "%", icon: Activity, color: "text-blue-500", bg: "bg-blue-50" },
                    { label: "Body Temp", val: vitalsRisk.latest_vitals.temperature, unit: "°C", icon: Thermometer, color: "text-amber-500", bg: "bg-amber-50" },
                    { label: "Activity today", val: vitalsRisk.latest_vitals.steps || 0, unit: "steps", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50", text: vitalsRisk.latest_vitals.activity || "Stable" }
                  ].map((m, i) => {
                    const Icon = m.icon;
                    return (
                      <div key={i} className="flex items-center gap-3.5 px-4 py-2.5 rounded-2xl hover:bg-slate-50/50 transition-colors">
                        <div className={`w-10 h-10 rounded-xl ${m.bg} flex items-center justify-center shrink-0`}>
                          <Icon size={18} className={`${m.color} ${m.pulse ? "animate-pulse" : ""}`} />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">{m.label}</span>
                          <span className="text-base font-extrabold text-slate-800 flex items-baseline gap-0.5">
                            {m.val || "--"}<span className="text-[9px] text-slate-400 font-bold">{m.unit}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}

              {/* 4 Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* Overall Health (Unified Safety Score) */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                  className="bg-white rounded-[20px] p-5 border border-slate-100 shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(244,63,94,0.08)] hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-10 h-10 rounded-xl ${safetyStyle.bg} border ${safetyStyle.border} flex items-center justify-center`}>
                      <Heart size={20} className={safetyStyle.icon} strokeWidth={1.8} />
                    </div>
                    <span className={`text-[11px] font-semibold ${safetyStyle.text} ${safetyStyle.bg} px-2 py-0.5 rounded-full border ${safetyStyle.border}`}>{safetyStyle.badge}</span>
                  </div>
                  <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none mb-1">{displaySafetyScore}%</h3>
                  <p className="text-slate-400 text-xs font-medium leading-snug">Safety Index</p>
                </motion.div>

                {/* Recent Reports */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className="bg-white rounded-[20px] p-5 border border-slate-100 shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(244,63,94,0.08)] hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center relative">
                      <FileText size={20} className="text-primary" strokeWidth={1.8} />
                      {reportCount > 0 && <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-white"></div>}
                    </div>
                    <span className="text-[11px] font-semibold text-primary bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">{reportCount > 0 ? "Active" : "None"}</span>
                  </div>
                  <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none mb-1">{reportCount}</h3>
                  <p className="text-slate-400 text-xs font-medium leading-snug">Reports Analyzed</p>
                </motion.div>

                {/* Emergency Guard Status */}
                <Link to="/profile-settings" className="block">
                  <motion.div
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    className="bg-white rounded-[20px] p-5 border border-slate-100 shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(244,63,94,0.08)] hover:-translate-y-1 transition-all duration-300 h-full"
                  >
                    <div className="flex justify-between items-start mb-4">
                      {caregiverEmail ? (
                        <>
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                            <ShieldCheck size={20} className="text-emerald-600" strokeWidth={1.8} />
                          </div>
                          <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Protected</span>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                            <ShieldAlert size={20} className="text-amber-500" strokeWidth={1.8} />
                          </div>
                          <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">Setup</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none mb-1">
                      {caregiverEmail ? "Active" : "Inactive"}
                    </h3>
                    <p className="text-slate-400 text-xs font-medium leading-snug">SOS Emergency Guard</p>
                  </motion.div>
                </Link>

                {/* Medication Adherence */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="bg-white rounded-[20px] p-5 border border-slate-100 shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(244,63,94,0.08)] hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center">
                      <Pill size={20} className="text-violet-500" strokeWidth={1.8} />
                    </div>
                    <span className="text-[11px] font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100">{medStats.adherence_percent}%</span>
                  </div>
                  <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none mb-1">{medStats.today_taken} / {medStats.today_total || "—"}</h3>
                  <p className="text-slate-400 text-xs font-medium leading-snug">Medication Today</p>
                </motion.div>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                
                {/* Column 1 & 2: Health Records & Adherence */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Weekly Medication Adherence Tracker Calendar */}
                  <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
                    <div className="flex justify-between items-center mb-5">
                      <div>
                        <h3 className="font-black text-slate-900 text-[14px] tracking-tight uppercase">Medication Adherence Calendar</h3>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">Your daily dose schedule & streak logs</p>
                      </div>
                      <div className="bg-rose-50 text-rose-600 font-bold text-xs px-3 py-1 rounded-xl border border-rose-100/50 flex items-center gap-1.5 shadow-sm">
                        🔥 <span className="font-extrabold">{medStats.streak} Day Streak</span>
                      </div>
                    </div>
                    
                    {/* Horizontal Week Calendar */}
                    <div className="grid grid-cols-7 gap-2.5">
                      {Array.from({ length: 7 }, (_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() - (6 - i));
                        const isToday = i === 6;
                        
                        // Adherence logic:
                        const year = d.getFullYear();
                        const month = String(d.getMonth() + 1).padStart(2, "0");
                        const dateNum = String(d.getDate()).padStart(2, "0");
                        const dateStr = `${year}-${month}-${dateNum}`;
                        
                        const takenMeds = medStats.logged_dates?.includes(dateStr);
                        const hasTodayMeds = isToday && medStats.today_total > 0;
                        const takenToday = isToday && medStats.today_total > 0 && medStats.today_taken === medStats.today_total;
                        
                        let circleClass = "bg-slate-50 border border-slate-200/50 text-slate-400";
                        let statusIcon = "—";
                        
                        if (takenMeds || takenToday) {
                          circleClass = "bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-sm shadow-emerald-500/10";
                          statusIcon = "✓";
                        } else if (isToday && hasTodayMeds) {
                          circleClass = "bg-blue-50 border border-blue-200 text-blue-600 shadow-sm shadow-blue-500/10";
                          statusIcon = `${medStats.today_taken}/${medStats.today_total}`;
                        }
                        
                        return (
                          <div key={i} className={`flex flex-col items-center p-3 rounded-2xl transition-all ${isToday ? "bg-slate-900 text-white shadow-md shadow-black/10 scale-105" : "hover:bg-slate-50"}`}>
                            <span className={`text-[10px] font-black uppercase tracking-wider ${isToday ? "text-slate-300" : "text-slate-400"}`}>
                              {d.toLocaleDateString("en-US", { weekday: "short" })}
                            </span>
                            <span className="text-base font-extrabold tracking-tight mt-1">
                              {d.getDate()}
                            </span>
                            <div className={`mt-3 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${circleClass}`}>
                              {statusIcon}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Disease Risk Overview Card */}
                  <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="font-black text-slate-900 text-[14px] tracking-tight uppercase">Latest Risk Analysis</h3>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">Biomarker risk predictions from your medical logs</p>
                      </div>
                      {latestReport && (
                        <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider bg-slate-50 border border-slate-100 px-3 py-1 rounded-xl">
                          {new Date(latestReport.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>

                    {latestReport ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.entries(latestReport.predictions)
                          .filter(([, p]: [string, any]) => p.ran)
                          .map(([disease, pred]: [string, any]) => {
                            const riskPct = pred.risk_probability * 100;
                            const isHigh = riskPct > 60;
                            const isMod = riskPct > 30;
                            
                            const barColor = isHigh ? "bg-rose-500" : isMod ? "bg-amber-400" : "bg-emerald-400";
                            const badgeStyle = isHigh ? "bg-rose-50 text-rose-600 border-rose-100" : isMod ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100";
                            
                            return (
                              <div key={disease} className="p-4 rounded-2xl bg-slate-50 border border-slate-100/50 hover:bg-slate-100/30 transition-colors">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-xs font-black text-slate-800 tracking-tight capitalize">{disease.replace(/_/g, " ")}</span>
                                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${badgeStyle}`}>{pred.risk_percent}</span>
                                </div>
                                <div className="w-full h-2 bg-slate-200/60 rounded-full overflow-hidden mt-3 shadow-inner">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${riskPct}%` }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                    className={`h-full rounded-full ${barColor}`}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        {Object.values(latestReport.predictions).filter((p: any) => p.ran).length === 0 && (
                          <div className="col-span-2 text-center py-8 text-slate-400 text-sm font-semibold">
                            No disease predictions ran for this report
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl text-slate-300 font-bold text-sm">
                        Upload a report to see risk analysis
                      </div>
                    )}
                  </div>

                  {/* Recent Reports Table */}
                  <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
                    <div className="flex justify-between items-center mb-5">
                      <div>
                        <h3 className="font-black text-slate-900 text-[14px] tracking-tight uppercase">Recent Reports</h3>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">Your medical records archive</p>
                      </div>
                      <Link to="/risk-predictor" className="text-rose-500 text-xs font-bold hover:text-rose-600 transition-colors flex items-center gap-1">
                        Upload new <ArrowRight size={14} />
                      </Link>
                    </div>

                    {reports.length === 0 ? (
                      <div className="text-slate-400 font-medium px-4 py-8 bg-slate-50/80 border border-dashed border-slate-200 rounded-2xl text-center text-sm">
                        No reports yet. Upload your first medical report to get started.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {reports.slice(0, 3).map((report) => (
                          <Link
                            key={report.id}
                            to={`/report-history/${report.id}`}
                            className="flex items-center justify-between p-3 border border-slate-50 hover:bg-rose-50/30 rounded-xl transition-all hover:border-rose-100"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-primary shrink-0">
                                <FileText size={16} />
                              </div>
                              <span className="text-slate-850 font-black text-xs truncate max-w-[200px] sm:max-w-xs">{report.name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 uppercase tracking-widest">Analyzed</span>
                              <span className="text-slate-400 font-bold text-[11px]">{formatDate(report.timestamp)}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                {/* Column 3: Sidebar Actions & AI Chat */}
                <div className="space-y-6">
                  
                  {/* Ask AI Doctor Companion Quick Chat Card */}
                  <div className="bg-gradient-to-br from-rose-500/10 to-rose-600/5 backdrop-blur-md rounded-[24px] p-6 border border-rose-100/50 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[300px]">
                    <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-rose-200/20 rounded-full blur-2xl"></div>
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="bg-rose-500 text-white p-2.5 rounded-xl shadow-md shadow-rose-500/20"><Sparkles size={20} /></div>
                        <div>
                          <h3 className="font-black text-slate-900 text-sm tracking-tight uppercase leading-none">Ask Dr. HealthMate</h3>
                          <span className="text-[9px] text-rose-500 font-bold tracking-widest uppercase">Personal Health Companion</span>
                        </div>
                      </div>
                      
                      {latestAiMsg ? (
                        <div className="bg-white/80 border border-slate-100 rounded-2xl p-4 shadow-sm mb-4">
                          <p className="text-[11px] uppercase tracking-wider font-black text-slate-400 mb-1.5">Last Advice</p>
                          <p className="text-xs text-slate-700 leading-relaxed font-medium line-clamp-4 italic">
                            "{latestAiMsg}"
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-600 leading-relaxed font-medium mb-4">
                          Need insights on your diagnostic trends, medical values, or symptom changes? Chat directly with your medical companion.
                        </p>
                      )}
                    </div>
                    
                    <Link to="/ai-companion">
                      <button className="w-full bg-slate-900 hover:bg-black text-white py-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md shadow-black/10">
                        Ask Doctor Companion <ArrowRight size={14} />
                      </button>
                    </Link>
                  </div>

                  {/* Upcoming Medicines */}
                  <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
                    <div className="flex justify-between items-center mb-5">
                      <div>
                        <h3 className="font-black text-slate-900 text-[14px] tracking-tight uppercase">Upcoming Doses</h3>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">Your schedule for the day</p>
                      </div>
                      <Link to="/medicine-scheduler" className="text-rose-500 text-xs font-bold hover:text-rose-600 transition-colors">
                        Manage →
                      </Link>
                    </div>
                    
                    <div className="space-y-3">
                      {upcomingMedicines.length === 0 ? (
                        <div className="text-slate-400 font-medium px-4 py-8 bg-slate-50/80 border border-dashed border-slate-200 rounded-2xl text-center text-sm">
                          No doses scheduled for today.
                        </div>
                      ) : (
                        upcomingMedicines.slice(0, 3).map((med, idx) => {
                          const isTaken = todayLogs.some(log => log.medicine_id === med.id && log.scheduled_time === med.timeValue);
                          const isTaking = takingId === `${med.id}-${med.timeValue}`;
                          return (
                            <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                              isTaken 
                                ? "bg-emerald-50/50 border-emerald-100/50 text-emerald-800" 
                                : "bg-slate-50 border-slate-100 hover:bg-rose-50/30 hover:border-rose-100"
                            }`}>
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                  isTaken 
                                    ? "bg-emerald-100 text-emerald-700" 
                                    : "bg-gradient-to-br from-primary to-rose-500 text-white shadow-md shadow-rose-500/10"
                                }`}>
                                  <Pill size={16} />
                                </div>
                                <div className="min-w-0">
                                  <h4 className={`font-black text-xs truncate leading-snug ${isTaken ? "line-through text-emerald-800/70" : "text-slate-800"}`}>
                                    Take {med.name}
                                  </h4>
                                  <span className={`text-[10px] font-bold mt-0.5 block ${isTaken ? "text-emerald-600/70" : "text-slate-400"}`}>
                                    {med.time}
                                  </span>
                                </div>
                              </div>
                              
                              <button
                                onClick={() => !isTaken && handleTakeMedicine(med.id, med.timeValue)}
                                disabled={isTaken || isTaking}
                                className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                                  isTaken
                                    ? "bg-emerald-100 border-emerald-200 text-emerald-700 cursor-default"
                                    : "bg-white hover:bg-emerald-50 border-slate-200 hover:border-emerald-200 text-slate-400 hover:text-emerald-600"
                                } disabled:opacity-90`}
                              >
                                {isTaking ? (
                                  <Loader2 size={13} className="animate-spin text-emerald-600" />
                                ) : isTaken ? (
                                  <Check size={14} className="stroke-[3]" />
                                ) : (
                                  <Check size={14} className="stroke-[2.5]" />
                                )}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Quick Actions List */}
                  <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
                    <h3 className="font-black text-slate-900 text-[14px] tracking-tight uppercase mb-4">Quick Navigation</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <Link to="/risk-predictor" className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-rose-50/30 hover:border-rose-100 transition-all text-center">
                        <FileText size={18} className="text-rose-500 mb-1" />
                        <span className="text-[10px] font-bold text-slate-700">Upload Report</span>
                      </Link>
                      <Link to="/symptom-decoder" className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-rose-50/30 hover:border-rose-100 transition-all text-center">
                        <Activity size={18} className="text-rose-500 mb-1" />
                        <span className="text-[10px] font-bold text-slate-700">Symptom Decoder</span>
                      </Link>
                      <Link to="/ai-companion" className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-rose-50/30 hover:border-rose-100 transition-all text-center">
                        <Sparkles size={18} className="text-rose-500 mb-1" />
                        <span className="text-[10px] font-bold text-slate-700">Ask AI Doctor</span>
                      </Link>
                      <Link to="/medicine-scheduler" className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-rose-50/30 hover:border-rose-100 transition-all text-center">
                        <Pill size={18} className="text-rose-500 mb-1" />
                        <span className="text-[10px] font-bold text-slate-700">Scheduler</span>
                      </Link>
                    </div>
                  </div>

                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
