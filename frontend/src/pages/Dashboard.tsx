import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { Calendar, MessageSquare, Bell, MoreVertical, CheckCircle, Clock, Activity, ChevronDown, User, ArrowRight, Pill, FileText } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [fullName, setFullName] = useState<string>("");
  const [upcomingMedicines, setUpcomingMedicines] = useState<{ name: string, dosage: string, time: string, timeValue: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data, error } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      if (!error && data) setFullName(data.full_name);
    };
    fetchProfile();

    // Fetch medicines from local storage
    const stored = JSON.parse(localStorage.getItem("healthmate_medicines") || "[]");
    let upcoming: { name: string, dosage: string, time: string, timeValue: string }[] = [];
    stored.forEach((s: any) => {
      s.times.forEach((t: string) => {
        const [h, m] = t.split(":");
        let hours = parseInt(h, 10);
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;
        const formattedTime = `Today at ${hours}:${m} ${ampm}`;
        upcoming.push({ name: s.medicineName, dosage: s.dosage, time: formattedTime, timeValue: t });
      });
    });
    // Sort chronologically by time
    upcoming.sort((a, b) => a.timeValue.localeCompare(b.timeValue));
    setUpcomingMedicines(upcoming);
  }, [user]);

  if (loading) return null;

  return (
    <div className="w-full text-text-primary animate-in fade-in duration-500 pb-12 pt-4 px-2 sm:px-4 max-w-[1600px] mx-auto">

      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 px-2 md:px-8 mt-4 md:mt-8 gap-6">
        <h1 className="text-3xl md:text-[2.5rem] font-bold tracking-tight text-slate-900 leading-tight">
          Good morning, {fullName ? fullName.split(' ')[0] : "James"}!
        </h1>
        <div className="flex items-center gap-3 md:gap-4 shrink-0">
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors">
            <Calendar size={20} className="text-slate-600" />
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors">
            <MessageSquare size={20} className="text-slate-600" />
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors">
            <Bell size={20} className="text-slate-600" />
          </button>
          <Link to="/settings" className="flex items-center gap-2 ml-2 cursor-pointer bg-white/50 px-2 py-1.5 rounded-full hover:bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all">
            <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center overflow-hidden">
              <User size={16} className="text-slate-500" />
            </div>
            <ChevronDown size={14} className="text-slate-600 mr-1" strokeWidth={3} />
          </Link>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 px-2 md:px-8">

        {/* LEFT COLUMN (8 cols) */}
        <div className="xl:col-span-8 flex flex-col gap-8">

          {/* Top 4 Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {/* Card 1 */}
            <div className="bg-white/90 border border-rose-100 rounded-[2rem] p-6 flex flex-col justify-between min-h-[160px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(244,63,94,0.08)] transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="w-11 h-11 rounded-2xl border border-slate-300 flex items-center justify-center bg-transparent">
                  <Activity size={22} className="text-slate-800" strokeWidth={1.5} />
                </div>
                <button className="text-slate-400 hover:text-slate-800"><MoreVertical size={18} /></button>
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1.5">Stable</h3>
                <p className="text-slate-500 text-[13px] leading-snug font-semibold">Your current<br />health risk</p>
              </div>
            </div>
            {/* Card 2 */}
            <div className="bg-white/90 border border-rose-100 rounded-[2rem] p-6 flex flex-col justify-between min-h-[160px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(244,63,94,0.08)] transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="w-11 h-11 rounded-2xl border border-slate-300 flex items-center justify-center bg-transparent relative">
                  <FileText size={22} className="text-slate-800" strokeWidth={1.5} />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-[#E4ECEF]"></div>
                </div>
                <button className="text-slate-400 hover:text-slate-800"><MoreVertical size={18} /></button>
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1.5">12</h3>
                <p className="text-slate-500 text-[13px] leading-snug font-semibold">Recent medical<br />reports extracted</p>
              </div>
            </div>
            {/* Card 3 */}
            <div className="bg-white/90 border border-rose-100 rounded-[2rem] p-6 flex flex-col justify-between min-h-[160px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(244,63,94,0.08)] transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="w-11 h-11 rounded-2xl border border-slate-300 flex items-center justify-center bg-transparent">
                  <CheckCircle size={22} className="text-slate-800" strokeWidth={1.5} />
                </div>
                <button className="text-slate-400 hover:text-slate-800"><MoreVertical size={18} /></button>
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1.5">7</h3>
                <p className="text-slate-500 text-[13px] leading-snug font-semibold">Health insights<br />found today</p>
              </div>
            </div>
            {/* Card 4 */}
            <div className="bg-white/90 border border-rose-100 rounded-[2rem] p-6 flex flex-col justify-between min-h-[160px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(244,63,94,0.08)] transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="w-11 h-11 rounded-2xl border border-slate-300 flex items-center justify-center bg-transparent">
                  <Pill size={22} className="text-slate-800" strokeWidth={1.5} />
                </div>
                <button className="text-slate-400 hover:text-slate-800"><MoreVertical size={18} /></button>
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1.5">2 / 5</h3>
                <p className="text-slate-500 text-[13px] leading-snug font-semibold">Medications<br />taken this week</p>
              </div>
            </div>
          </div>

          {/* Middle Left: 2 Small + 1 Wide Chart area */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {/* Small stacked cards */}
            <div className="flex flex-col gap-6 md:gap-8">
              <div className="bg-white/90 border border-rose-100 rounded-[2rem] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(244,63,94,0.08)] transition-all flex-1 flex flex-col justify-center">
                <h4 className="text-slate-900 text-sm font-bold tracking-tight mb-2">New health parameters</h4>
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-black text-slate-900">54</span>
                  <span className="bg-emerald-200/50 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full mb-1">+18.7%</span>
                </div>
              </div>
              <div className="bg-white/90 border border-rose-100 rounded-[2rem] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(244,63,94,0.08)] transition-all flex-1 flex flex-col justify-center">
                <h4 className="text-slate-900 text-sm font-bold tracking-tight mb-2">Medications overdue</h4>
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-black text-slate-900">6</span>
                  <span className="bg-rose-200/50 text-rose-800 text-[11px] font-bold px-2 py-0.5 rounded-full mb-1">+2.7%</span>
                </div>
              </div>
            </div>

            {/* Chart Card */}
            <div className="md:col-span-2 bg-white border border-rose-100 rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] relative min-h-[300px] flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-slate-900 text-lg">Health Trends Analysis</h4>
                <span className="text-slate-500 text-sm font-semibold">Last 7 days VS prior week</span>
              </div>
              <div className="flex gap-4 mb-6 text-[11px] font-bold text-slate-500">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#60A5FA]"></div>Glucose (Blood Sugar)</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-400"></div>Cholesterol (Lipids)</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#0F172A]"></div>Heart Rate (BPM)</div>
              </div>

              {/* Decorative Chart UI mapping the SaaS image */}
              <div className="flex-1 relative w-full mt-2">
                {/* Y-axis lines */}
                <div className="absolute inset-0 flex flex-col justify-between pt-2 pb-6">
                  <div className="border-b border-slate-200 w-full h-0 relative"><span className="absolute -top-2 -left-6 text-[10px] font-bold text-slate-400">120</span></div>
                  <div className="border-b border-slate-200 w-full h-0 relative"><span className="absolute -top-2 -left-6 text-[10px] font-bold text-slate-400">100</span></div>
                  <div className="border-b border-slate-200 w-full h-0 relative"><span className="absolute -top-2 -left-4 text-[10px] font-bold text-slate-400">80</span></div>
                  <div className="border-b border-slate-200 w-full h-0 relative"><span className="absolute -top-2 -left-4 text-[10px] font-bold text-slate-400">60</span></div>
                </div>
                {/* SVG Chart paths */}
                <svg className="absolute inset-x-0 bottom-6 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                  {/* Heart Rate */}
                  <path d="M0 50 Q 15 55, 30 45 T 60 55 T 85 40 T 100 45" fill="none" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
                  {/* Glucose */}
                  <path d="M0 25 Q 20 20, 40 35 T 70 20 T 100 25" fill="none" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" />
                  {/* Cholesterol */}
                  <path d="M0 70 Q 25 80, 50 65 T 75 75 T 100 65" fill="none" stroke="#FB7185" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 4" />

                  {/* Plot points & Hover vertical line */}
                  <line x1="40" y1="10" x2="40" y2="100" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4 4" />
                  <circle cx="40" cy="35" r="3.5" fill="#60A5FA" stroke="white" strokeWidth="2" />
                  <circle cx="40" cy="50" r="3.5" fill="#0F172A" stroke="white" strokeWidth="2" />
                  <circle cx="40" cy="71" r="3.5" fill="#FB7185" stroke="white" strokeWidth="2" />
                </svg>

                {/* Black Tooltip */}
                <div className="absolute top-[5%] left-[30%] bg-slate-900 text-white text-[11px] p-3 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] z-10 flex flex-col gap-2 w-40 border border-slate-800">
                  <div className="flex justify-between items-center"><span className="font-bold text-slate-400">Feb 16 Snapshot</span></div>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#60A5FA]"></div><span className="font-medium text-slate-300">Glucose</span></div><strong className="text-white">94 mg/dL</strong></div>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#0F172A]"></div><span className="font-medium text-slate-300">Heart Rate</span></div><strong className="text-white">72 BPM</strong></div>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div><span className="font-medium text-slate-300">Cholesterol</span></div><strong className="text-white">185 mg/dL</strong></div>
                </div>
              </div>

              {/* X-Axis labels */}
              <div className="flex justify-between text-[11px] font-bold text-slate-400 mt-auto pl-4">
                <span>Feb 14</span><span>Feb 15</span><span>Feb 16</span><span>Feb 17</span><span>Feb 18</span><span>Feb 19</span><span>Feb 20</span>
              </div>
            </div>
          </div>

          {/* Bottom Left: Emails / Messages Area */}
          <div className="bg-white border border-rose-100 rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <h4 className="font-bold text-slate-900 text-lg mb-6">Recent Reports</h4>
            <ul className="flex flex-col gap-5">
              <li className="flex justify-between items-center text-sm border-b border-slate-100 pb-4">
                <div className="flex items-center gap-4 w-1/3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200 shrink-0"><FileText size={18} /></div>
                  <span className="text-slate-900 font-bold tracking-tight">CBC Blood Panel</span>
                </div>
                <span className="text-slate-500 font-semibold w-1/3 text-left">Analyzed securely</span>
                <span className="text-slate-500 font-bold w-auto text-right">Mar 4, 1:24 PM</span>
              </li>
              <li className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-4 w-1/3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200 shrink-0"><FileText size={18} /></div>
                  <span className="text-slate-900 font-bold tracking-tight">Metabolic Panel</span>
                </div>
                <span className="text-slate-500 font-semibold w-1/3 text-left">Processed</span>
                <span className="text-slate-500 font-bold w-auto text-right">Feb 28, 9:15 AM</span>
              </li>
            </ul>
          </div>
        </div>

        {/* RIGHT COLUMN (4 cols) */}
        <div className="xl:col-span-4 flex flex-col gap-8 h-full">

          {/* Rose AI Mini-Widget (Top Right) */}
          <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-[2.5rem] p-8 text-slate-900 shadow-[0_8px_30px_rgba(244,63,94,0.06)] border border-rose-200/60 flex-shrink-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-200/20 rounded-full blur-3xl" />
            <div className="flex items-center justify-between mb-2 relative z-10">
              <h3 className="font-bold text-xl tracking-tight">AI Companion</h3>
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            </div>
            <p className="text-slate-500 text-[13px] font-semibold mb-6 relative z-10">I am ready to analyze your inputs.</p>

            <div className="bg-white rounded-[1.25rem] p-4 text-sm font-medium text-slate-700 shadow-sm border border-slate-100 mb-4 relative z-10">
              "Hello. Your recent CBC report shows your iron levels are stable. How are you feeling today?"
            </div>

            <Link to="/ai-companion" className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-3 rounded-2xl hover:border-rose-300 focus-within:ring-2 focus-within:ring-rose-400/20 transition-all relative z-10 shadow-sm group">
              <input type="text" placeholder="Ask a medical question..." className="flex-1 bg-transparent border-none outline-none text-[13px] font-medium placeholder:text-slate-400 pointer-events-none" />
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center group-hover:bg-rose-500 transition-colors">
                <ArrowRight size={14} strokeWidth={2.5} />
              </div>
            </Link>
          </div>

          {/* Todo List Area */}
          <div className="bg-transparent flex-1 pt-2 pb-4">
            <h3 className="font-bold text-xl text-slate-900 mb-6 px-1 tracking-tight">Upcoming medicines</h3>
            <div className="flex flex-col gap-5">
              {upcomingMedicines.length === 0 ? (
                <div className="text-slate-500 font-medium px-2 py-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-sm">
                  No medicines scheduled. Add some in the Medicine Scheduler.
                </div>
              ) : (
                upcomingMedicines.map((med, idx) => (
                  <div key={idx} className="flex items-center gap-5 group cursor-pointer border border-transparent hover:border-slate-300 p-2 -m-2 rounded-2xl transition-all">
                    <div className="w-[3.25rem] h-[3.25rem] rounded-[1.25rem] bg-slate-900 border border-slate-800 text-white flex flex-shrink-0 items-center justify-center shadow-sm group-hover:bg-slate-800 group-hover:-translate-y-0.5 transition-all">
                      <Pill size={22} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 leading-tight mb-0.5 tracking-tight text-[15px]">Take {med.name} {med.dosage && `(${med.dosage})`}</h4>
                      <span className="text-slate-500 text-[13px] font-semibold">{med.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Second Dark Card (Bottom Right) */}
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-7 text-white mt-auto shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
            <h3 className="font-bold tracking-tight text-lg mb-1">Doctor meeting</h3>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
              <span className="text-slate-400 text-[13px] font-semibold">Feb 22 at 6:00 PM</span>
            </div>
            <p className="text-slate-400 font-medium text-sm leading-relaxed pr-2">You have been invited to attend a meeting with the primary care directors.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
