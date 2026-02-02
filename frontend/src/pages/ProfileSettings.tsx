import { motion } from "framer-motion";
import NavbarPrivate from "../components/NavbarPrivate";
import GlassCard from "../components/GlassCard";
import Field from "../components/Field";
import PrimaryButton from "../components/PrimaryButton";
import { useAuth } from "../contexts/AuthContext";
import { useEffect, useState } from "react";
import { Camera, Bell, Moon, Sun, LogOut } from "lucide-react";
import { supabase } from "../supabaseClient";

export default function ProfileSettings() {
  const { user, signOut, loading } = useAuth();

  // Profile fields (DB-backed)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");

  // Toggles (local for now)
  const [notifications, setNotifications] = useState(true);
  const [emailReminder, setEmailReminder] = useState(false);
  const [medicineReminder, setMedicineReminder] = useState(true);

  // Theme
  const [darkMode, setDarkMode] = useState(true);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // 🔄 Load profile from DB
  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setName(data.full_name || "");
        setEmail(data.email || user.email || "");
      }
    };

    fetchProfile();
  }, [user]);

  if (loading) return null;

  // 💾 Save profile changes
  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: name,
        // phone & dob can be added later to table
      })
      .eq("id", user.id);

    if (error) {
      setMessage("❌ Failed to update profile");
    } else {
      setMessage("✅ Profile updated successfully");
    }

    setSaving(false);
  };

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/";
  };

  return (
    <div
      className={`min-h-screen ${
        darkMode
          ? "bg-gradient-to-b from-[#0A1324] via-[#0B1B33] to-[#0A1324] text-white"
          : "bg-gradient-to-b from-slate-100 via-white to-slate-200 text-slate-900"
      }`}
    >
      <NavbarPrivate />

      <div className="pt-24 max-w-5xl mx-auto px-4 pb-20 space-y-10">
        {/* USER HEADER */}
        <GlassCard className="p-8 flex items-center gap-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative group"
          >
            <div className="w-28 h-28 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl font-bold">
              {name ? name[0].toUpperCase() : "U"}
            </div>

            <button className="absolute -bottom-2 -right-2 bg-white text-black p-2 rounded-full shadow-md hover:bg-slate-200 transition">
              <Camera size={16} />
            </button>
          </motion.div>

          <div>
            <h2 className="text-3xl font-bold">{name || "User"}</h2>
            <p className="opacity-80">{email}</p>
          </div>
        </GlassCard>

        {/* ACCOUNT INFORMATION */}
        <GlassCard className="p-8">
          <h3 className="text-xl font-semibold mb-6">Account Information</h3>

          <div className="grid md:grid-cols-2 gap-6">
            <Field
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <Field
              label="Email"
              value={email}
              type="email"
              disabled
            />

            <Field
              label="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <Field
              label="Date of Birth"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </div>

          {message && (
            <p className="mt-4 text-sm text-center opacity-80">
              {message}
            </p>
          )}

          <PrimaryButton
            className="mt-6"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </PrimaryButton>
        </GlassCard>

        {/* PREFERENCES */}
        <GlassCard className="p-8">
          <h3 className="text-xl font-semibold mb-6">Preferences</h3>

          <div className="space-y-4">
            <ToggleRow
              icon={<Bell size={18} />}
              label="Enable Push Notifications"
              enabled={notifications}
              setEnabled={setNotifications}
            />

            <ToggleRow
              icon={<Bell size={18} />}
              label="Email Reminders"
              enabled={emailReminder}
              setEnabled={setEmailReminder}
            />

            <ToggleRow
              icon={<Bell size={18} />}
              label="Medicine Intake Reminders"
              enabled={medicineReminder}
              setEnabled={setMedicineReminder}
            />

            <ToggleRow
              icon={darkMode ? <Moon size={18} /> : <Sun size={18} />}
              label={darkMode ? "Dark Mode" : "Light Mode"}
              enabled={darkMode}
              setEnabled={setDarkMode}
            />
          </div>
        </GlassCard>

        {/* LOGOUT */}
        <GlassCard className="p-8">
          <h3 className="text-xl font-semibold mb-6">Account</h3>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl 
            bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
          >
            <LogOut size={18} />
            Logout
          </button>
        </GlassCard>
      </div>
    </div>
  );
}

/* ---------------- TOGGLE COMPONENT ---------------- */

interface ToggleRowProps {
  icon: React.ReactNode;
  label: string;
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({
  icon,
  label,
  enabled,
  setEnabled,
  disabled = false,
}: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="text-cyan-300">{icon}</div>
        <p>{label}</p>
      </div>

      <div
        onClick={() => !disabled && setEnabled(!enabled)}
        className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition 
          ${enabled ? "bg-cyan-400" : "bg-white/20"} 
          ${disabled ? "opacity-40 cursor-not-allowed" : ""}
        `}
      >
        <div
          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition 
            ${enabled ? "translate-x-6" : "translate-x-0"}
          `}
        />
      </div>
    </div>
  );
}
