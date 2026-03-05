import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Flame } from "lucide-react";

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
    alert("Medicine schedule saved!");
  };

  // Shared input class
  const inputClass = "mt-2 w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/30 outline-none focus:border-cyan-400/50 transition";
  const labelClass = "text-sm font-medium text-white/60";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1324] via-[#0B1B33] to-[#0A1324] text-white px-6 pt-28 pb-20">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold">Medicine Scheduler</h1>
            <p className="text-white/50 mt-1">Track your medicine timings and stay consistent.</p>
          </div>
          <motion.div
            initial={{ scale: 0.9 }} animate={{ scale: 1 }}
            className="flex items-center gap-2 bg-amber-400/10 text-amber-300 border border-amber-400/20 px-4 py-2 rounded-xl"
          >
            <Flame size={18} />
            <span className="font-semibold text-sm">{streak} day streak</span>
          </motion.div>
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-white/10 bg-white/[0.035] backdrop-blur-xl p-6 sm:p-8 space-y-6"
        >
          {/* Medicine Name */}
          <div>
            <label className={labelClass}>Medicine Name</label>
            <input type="text" value={medicineName} onChange={(e) => setMedicineName(e.target.value)}
              placeholder="e.g., Dolo 650" className={inputClass} />
          </div>

          {/* Dosage */}
          <div>
            <label className={labelClass}>Dosage</label>
            <input type="text" value={dosage} onChange={(e) => setDosage(e.target.value)}
              placeholder="e.g., 1 tablet" className={inputClass} />
          </div>

          {/* Doses per day */}
          <div>
            <label className={labelClass}>Number of Doses per Day</label>
            <select value={dosesPerDay} onChange={(e) => setDosesPerDay(e.target.value)}
              className={inputClass + " cursor-pointer"}>
              {["1","2","3","4","5"].map(n => <option key={n} value={n} className="bg-[#0B1B33]">{n} dose{n !== "1" ? "s" : ""}</option>)}
            </select>
          </div>

          {/* Reminder Times */}
          <div>
            <label className={labelClass}>Reminder Times</label>
            {times.map((time, index) => (
              <div key={index} className="flex items-center gap-3 mt-3">
                <input type="time" value={time} onChange={(e) => handleTimeChange(e.target.value, index)}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white outline-none focus:border-cyan-400/50 transition" />
                {index > 0 && (
                  <button onClick={() => setTimes(prev => prev.filter((_, i) => i !== index))}
                    className="p-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 transition">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            <button onClick={() => setTimes(prev => [...prev, ""])}
              className="mt-4 flex items-center gap-2 bg-white/[0.06] border border-white/10 text-white/70 hover:text-white px-4 py-2 rounded-xl transition text-sm">
              <Plus size={16} /> Add Time
            </button>
          </div>

          {/* Start & End Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className={labelClass}>Frequency</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}
              className={inputClass + " cursor-pointer"}>
              <option value="daily" className="bg-[#0B1B33]">Daily</option>
              <option value="alternate" className="bg-[#0B1B33]">Alternate Days</option>
              <option value="every_x_hours" className="bg-[#0B1B33]">Every X Hours</option>
            </select>
            {frequency === "every_x_hours" && (
              <input type="number" value={everyHours} onChange={(e) => setEveryHours(e.target.value)}
                placeholder="Every how many hours?" className={inputClass + " mt-3"} />
            )}
          </div>

          {/* Submit */}
          <button onClick={handleSubmit}
            className="w-full py-4 rounded-2xl bg-cyan-400 text-slate-900 font-bold text-lg hover:bg-cyan-300 transition">
            Save Schedule
          </button>
        </motion.div>

        {/* Saved Schedule */}
        {savedSchedule && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-6 rounded-3xl border border-cyan-400/20 bg-cyan-400/5 backdrop-blur-xl">
            <h2 className="text-xl font-semibold text-cyan-300 mb-4">📅 Schedule Saved!</h2>
            <div className="space-y-2 text-white/75 text-sm">
              <p><span className="text-white font-medium">Medicine:</span> {savedSchedule.medicineName} — {savedSchedule.dosage}</p>
              <p><span className="text-white font-medium">Doses/day:</span> {savedSchedule.dosesPerDay}</p>
              <p><span className="text-white font-medium">Times:</span> {savedSchedule.times.join(", ")}</p>
              <p><span className="text-white font-medium">Duration:</span> {savedSchedule.startDate} → {savedSchedule.endDate}</p>
              <p><span className="text-white font-medium">Frequency:</span> {savedSchedule.frequency}</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}