import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import logo from "../assets/logo4.png";
import { useAuth } from "../contexts/AuthContext"; // ✅ for logout handling

// ✅ Lucide icons
import {
  Dna,
  Pill,
  Stethoscope,
  Bot,
  Settings,
  LogOut,
  LayoutDashboard,
} from "lucide-react";

export default function NavbarPrivate() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth(); // ✅ call Supabase logout

  // ✅ Define nav links (updated Medication Planner → Medicine Scheduler)
  const navLinks = [
    { icon: <LayoutDashboard size={18} />, label: "Dashboard", path: "/dashboard" },
    { icon: <Dna size={18} />, label: "Risk Predictor", path: "/risk-predictor" },
    { icon: <Pill size={18} />, label: "Medicine Scheduler", path: "/medicine-scheduler" }, // ✅ updated
    { icon: <Stethoscope size={18} />, label: "Symptom Decoder", path: "/symptom-decoder" },
    { icon: <Bot size={18} />, label: "HealthMate AI Chat", path: "/ai-companion" },
    { icon: <Settings size={18} />, label: "Profile / Settings", path: "/settings" },
  ];

  const handleLogout = async () => {
    await signOut(); // ✅ log out user via Supabase
    navigate("/"); // ✅ return to welcome page
  };

  return (
    <motion.nav
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 w-full z-50 backdrop-blur-xl bg-white/5 border-b border-white/10 shadow-[0_0_25px_-10px_rgba(0,0,0,0.6)]"
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-sm">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2">
          <img
            src={logo}
            alt="HealthMate AI"
            className="h-9 w-9 rounded-md object-cover"
          />
          <span className="text-white text-lg font-semibold tracking-tight">
            HealthMate AI
          </span>
        </Link>

        {/* Menu */}
        <div className="hidden md:flex items-center gap-6 text-white/85 font-medium">
          {navLinks.map(({ icon, label, path }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-2 transition ${
                location.pathname === path
                  ? "text-cyan-300 font-semibold"
                  : "text-white/80 hover:text-cyan-200"
              }`}
            >
              {icon}
              <span>{label}</span>
            </Link>
          ))}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-white/80 hover:text-red-400 transition"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </motion.nav>
  );
}
