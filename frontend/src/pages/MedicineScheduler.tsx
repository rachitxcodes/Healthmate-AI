import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Flame, Clock, Calendar } from "lucide-react";

type Frequency = "daily" | "alternate" | "every_x_hours";

interface Schedule {
  medicineName: string;
  dosage: string;
  dosesPerDay: string;
  times: string[];
  startDate: string;
  endDate: string;
  frequency: Frequency;
  everyHours?: string;
}

export default function MedicineScheduler() {
  const [medicineName, setMedicineName] = useState("");
  const [dosage, setDosage] = useState("");
  const [dosesPerDay, setDosesPerDay] = useState("1");
  const [times, setTimes] = useState([""]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [everyHours, setEveryHours] = useState("");
  const [savedSchedule, setSavedSchedule] = useState<Schedule | null>(null);
  const [streak] = useState(3);

  const handleTimeChange = (value: string, index: number) => {
    setTimes((prev) => { const c = [...prev]; c[index] = value; return c; });
  };

  const handleSubmit = () => {
    if (!medicineName.trim()) return alert("Please enter a medicine name.");
    if (!dosage.trim()) return alert("Please enter dosage.");
    if (times.some((t) => !t.trim())) return alert("Please fill all reminder times.");

    const schedule: Schedule = {
      medicineName: medicineName.trim(),
      dosage: dosage.trim(),
      dosesPerDay, times, startDate, endDate, frequency,
      everyHours: frequency === "every_x_hours" ? everyHours : undefined,
    };
    setSavedSchedule(schedule);

    // Persist to local storage for Dashboard
    const existing = JSON.parse(localStorage.getItem("healthmate_medicines") || "[]");
    localStorage.setItem("healthmate_medicines", JSON.stringify([...existing, schedule]));

    alert("Medicine schedule saved!");
  };

  const inputClass = "mt-2 w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-800 placeholder-slate-400 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 transition-all font-medium";
  const labelClass = "text-sm font-semibold text-slate-700 tracking-wide";

  return (
    <div className="w-full text-text-primary px-6 pt-4 pb-24 max-w-[1000px] mx-auto">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 mt-4 md:mt-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Medicine Scheduler</h1>
            <p className="text-slate-600 mt-1 font-medium">Track your medicine timings and stay consistent.</p>
          </div>
          <motion.div
            initial={{ scale: 0.9 }} animate={{ scale: 1 }}
            className="flex items-center gap-2 bg-rose-50 text-rose-600 border border-rose-200 px-4 py-2 rounded-xl shadow-sm self-start sm:self-auto"
          >
            <Flame size={18} className="text-rose-500" />
            <span className="font-bold text-sm tracking-wide">{streak} Day Streak</span>
          </motion.div>
        </div>

        {/* Form Container */}
        <motion.div
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border border-rose-100 bg-white p-8 sm:p-10 shadow-[0_8px_40px_rgba(0,0,0,0.04)] space-y-6"
        >
          {/* Medicine Name & Dosage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Medicine Name</label>
              <input type="text" value={medicineName} onChange={(e) => setMedicineName(e.target.value)}
                placeholder="e.g., Metformin 500mg" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Dosage</label>
              <input type="text" value={dosage} onChange={(e) => setDosage(e.target.value)}
                placeholder="e.g., 1 tablet" className={inputClass} />
            </div>
          </div>

          {/* Doses per day & Frequency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Doses per Day</label>
              <select value={dosesPerDay} onChange={(e) => setDosesPerDay(e.target.value)}
                className={inputClass + " cursor-pointer"}>
                {["1", "2", "3", "4", "5"].map(n => <option key={n} value={n}>{n} dose{n !== "1" ? "s" : ""}</option>)}
              </select>
            </div>

            <div>
              <label className={labelClass}>Frequency</label>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}
                className={inputClass + " cursor-pointer"}>
                <option value="daily">Daily</option>
                <option value="alternate">Alternate Days</option>
                <option value="every_x_hours">Every X Hours</option>
              </select>
              {frequency === "every_x_hours" && (
                <motion.input initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  type="number" value={everyHours} onChange={(e) => setEveryHours(e.target.value)}
                  placeholder="e.g., 8 (for every 8 hours)" className={inputClass + " mt-3"} />
              )}
            </div>
          </div>

          {/* Reminder Times */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={16} className="text-slate-400" />
              <label className={labelClass}>Reminder Times</label>
            </div>
            <div className="space-y-3">
              {times.map((time, index) => (
                <motion.div key={index} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
                  <input type="time" value={time} onChange={(e) => handleTimeChange(e.target.value, index)}
                    className="flex-1 px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-800 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 transition-all font-medium" />
                  {index > 0 && (
                    <button onClick={() => setTimes(prev => prev.filter((_, i) => i !== index))}
                      className="p-3 bg-rose-50 text-rose-500 border border-rose-100 rounded-xl hover:bg-rose-100 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>

            <button onClick={() => setTimes(prev => [...prev, ""])}
              className="mt-4 flex items-center justify-center gap-2 w-full sm:w-auto bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-5 py-2.5 rounded-xl transition-colors font-bold text-sm">
              <Plus size={16} /> Add Another Time
            </button>
          </div>

          {/* Start & End Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={16} className="text-slate-400" />
                <label className={labelClass}>Start Date</label>
              </div>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass + " mt-0"} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={16} className="text-slate-400" />
                <label className={labelClass}>End Date</label>
              </div>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass + " mt-0"} />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-6">
            <motion.button whileTap={{ scale: 0.96 }} onClick={handleSubmit}
              className="w-full py-4 rounded-xl bg-rose-500 text-white font-bold text-lg hover:bg-rose-600 shadow-sm transition-colors flex justify-center items-center gap-2">
              Save Schedule
            </motion.button>
          </div>
        </motion.div>

        {/* Saved Schedule (Success state) */}
        <AnimatePresence>
          {savedSchedule && (
            <motion.div initial={{ opacity: 0, y: 12, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="mt-8 p-6 sm:p-8 rounded-3xl border border-emerald-200 bg-emerald-50 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-emerald-100 text-emerald-600 p-2 rounded-full">
                  <Flame size={20} />
                </div>
                <h2 className="text-xl font-bold text-emerald-800">Schedule Active!</h2>
              </div>

              <div className="grid grid-cols-2 gap-4 text-emerald-900/80 text-sm font-medium">
                <div>
                  <span className="text-emerald-900/50 block text-xs uppercase tracking-wider mb-1">Medicine</span>
                  {savedSchedule.medicineName} ({savedSchedule.dosage})
                </div>
                <div>
                  <span className="text-emerald-900/50 block text-xs uppercase tracking-wider mb-1">Frequency</span>
                  {savedSchedule.dosesPerDay}x {savedSchedule.frequency.replace(/_/g, " ")}
                </div>
                <div className="col-span-2">
                  <span className="text-emerald-900/50 block text-xs uppercase tracking-wider mb-1">Reminders Set For</span>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {savedSchedule.times.map((t, i) => (
                      <span key={i} className="bg-white border border-emerald-200 px-3 py-1 rounded-lg text-emerald-700 font-bold">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}