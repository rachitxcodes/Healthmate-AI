import React, { useState } from "react";
import NavbarPrivate from "../components/NavbarPrivate";
import { motion } from "framer-motion";
import { Plus, Trash2, Flame } from "lucide-react";

/**
 * Type definitions
 */
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

  // form state
  const [medicineName, setMedicineName] = useState<string>("");
  const [dosage, setDosage] = useState<string>("");
  const [dosesPerDay, setDosesPerDay] = useState<string>("1");
  const [times, setTimes] = useState<string[]>([""]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [everyHours, setEveryHours] = useState<string>("");

  // saved schedule (typed)
  const [savedSchedule, setSavedSchedule] = useState<Schedule | null>(null);

  // demo streak (you can replace with real logic later)
  const [streak] = useState<number>(3);

  // handlers
  const handleTimeChange = (value: string, index: number) => {
    setTimes((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const handleAddTime = () => setTimes((prev) => [...prev, ""]);
  const handleRemoveTime = (index: number) =>
    setTimes((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = () => {
    // basic validation (optional - add more as needed)
    if (!medicineName.trim()) {
      alert("Please enter a medicine name.");
      return;
    }
    if (!dosage.trim()) {
      alert("Please enter dosage.");
      return;
    }
    if (times.length === 0 || times.some((t) => t.trim() === "")) {
      alert("Please add at least one valid reminder time.");
      return;
    }

    const schedule: Schedule = {
      medicineName: medicineName.trim(),
      dosage: dosage.trim(),
      dosesPerDay,
      times: times.map((t) => t.trim()),
      startDate,
      endDate,
      frequency,
      everyHours: frequency === "every_x_hours" ? everyHours : undefined,
    };

    setSavedSchedule(schedule);
    // replace with real persist logic later (API / local storage)
    // e.g., save to Supabase or localStorage
    alert("Medicine schedule saved successfully!");
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark transition px-6">
      <NavbarPrivate />

      <div className="max-w-3xl mx-auto pt-32 pb-20">
        {/* HEADER + STREAK */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold text-text-light dark:text-text-dark">
              Medicine Scheduler
            </h1>
            <p className="text-muted-light dark:text-muted-dark mt-1">
              Track your medicine timings and stay consistent.
            </p>
          </div>

          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-4 py-2 rounded-xl shadow-sm"
          >
            <Flame size={20} />
            <span className="font-semibold">{streak} day streak</span>
          </motion.div>
        </div>

        {/* FORM CARD */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card-light dark:bg-card-dark rounded-2xl border border-border-light dark:border-border-dark p-6 shadow-sm space-y-6"
        >
          {/* MEDICINE NAME */}
          <div>
            <label className="text-sm font-medium text-muted-light dark:text-muted-dark">
              Medicine Name
            </label>
            <input
              type="text"
              value={medicineName}
              onChange={(e) => setMedicineName(e.target.value)}
              placeholder="e.g., Dolo 650"
              className="mt-2 w-full px-4 py-3 rounded-xl bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark outline-none"
            />
          </div>

          {/* DOSAGE */}
          <div>
            <label className="text-sm font-medium text-muted-light dark:text-muted-dark">
              Dosage
            </label>
            <input
              type="text"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="e.g., 1 tablet"
              className="mt-2 w-full px-4 py-3 rounded-xl bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark outline-none"
            />
          </div>

          {/* DOSES PER DAY */}
          <div>
            <label className="text-sm font-medium text-muted-light dark:text-muted-dark">
              Number of Doses per Day
            </label>

            <select
              value={dosesPerDay}
              onChange={(e) => setDosesPerDay(e.target.value)}
              className="mt-2 w-full px-4 py-3 rounded-xl bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark outline-none"
            >
              <option value="1">1 dose</option>
              <option value="2">2 doses</option>
              <option value="3">3 doses</option>
              <option value="4">4 doses</option>
              <option value="5">5 doses</option>
            </select>
          </div>

          {/* REMINDER TIMES */}
          <div>
            <label className="text-sm font-medium text-muted-light dark:text-muted-dark">
              Reminder Times
            </label>

            {times.map((time, index) => (
              <div key={index} className="flex items-center gap-3 mt-3">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => handleTimeChange(e.target.value, index)}
                  className="flex-1 px-4 py-3 rounded-xl bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark outline-none"
                />

                {index > 0 && (
                  <button
                    onClick={() => handleRemoveTime(index)}
                    className="p-2 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 rounded-xl"
                    aria-label={`Remove time ${index}`}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={handleAddTime}
              className="mt-4 flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-xl shadow-sm"
            >
              <Plus size={18} />
              Add Time
            </button>
          </div>

          {/* START & END DATES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-xl bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark"
              />
            </div>

            <div>
              <label className="text-sm font-medium">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-xl bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark"
              />
            </div>
          </div>

          {/* FREQUENCY */}
          <div>
            <label className="text-sm font-medium">Frequency</label>

            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as Frequency)}
              className="mt-2 w-full px-4 py-3 rounded-xl bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark outline-none"
            >
              <option value="daily">Daily</option>
              <option value="alternate">Alternate Days</option>
              <option value="every_x_hours">Every X Hours</option>
            </select>

            {frequency === "every_x_hours" && (
              <input
                type="number"
                value={everyHours}
                onChange={(e) => setEveryHours(e.target.value)}
                placeholder="Every how many hours?"
                className="mt-3 w-full px-4 py-3 rounded-xl bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark outline-none"
              />
            )}
          </div>

          {/* SUBMIT */}
          <button
            onClick={handleSubmit}
            className="w-full py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition shadow-sm"
          >
            Save Schedule
          </button>
        </motion.div>

        {/* SAVED SCHEDULE */}
        {savedSchedule && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 p-6 rounded-2xl border border-primary-300/40 dark:border-primary-700/40 bg-primary-50 dark:bg-primary-900/20 shadow-sm"
          >
            <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300">
              📅 Your Medicine Schedule is Set!
            </h2>

            <p className="mt-2 text-text-light dark:text-text-dark text-lg">
              <strong>{savedSchedule.medicineName}</strong> – {savedSchedule.dosage}
            </p>

            <p className="mt-3">
              <span className="font-medium">💊 Doses per day:</span> {savedSchedule.dosesPerDay}
            </p>

            <div className="mt-3">
              <p className="font-medium">⏰ Reminder Times:</p>
              <ul className="mt-1 ml-4 list-disc">
                {savedSchedule.times.map((t, i) => (
                  <li className="text-muted-light dark:text-muted-dark" key={i}>
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-3">
              <span className="font-medium">📆 Duration:</span> {savedSchedule.startDate} → {savedSchedule.endDate}
            </p>

            <p className="mt-3">
              <span className="font-medium">🔁 Frequency:</span> {savedSchedule.frequency}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
