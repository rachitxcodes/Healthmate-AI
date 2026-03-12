import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Activity, Pill, Stethoscope, Settings, LogOut, FileText, ChevronRight } from "lucide-react";
import logo from "../assets/logo4.png";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

export default function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { signOut } = useAuth();
    const [isExpanded, setIsExpanded] = useState(false);

    const navLinks = [
        { icon: <LayoutDashboard size={20} />, path: "/dashboard", label: "Dashboard" },
        { icon: <Activity size={20} />, path: "/risk-predictor", label: "Predictor" },
        { icon: <Pill size={20} />, path: "/medicine-scheduler", label: "Medicine" },
        { icon: <Stethoscope size={20} />, path: "/symptom-decoder", label: "Symptoms" },
        { icon: <FileText size={20} />, path: "/report-result", label: "Reports" },
    ];

    return (
        <div className={`fixed left-0 top-0 z-40 h-screen py-6 pl-4 pr-2 transition-all duration-300 ease-in-out ${isExpanded ? "w-64" : "w-[6.5rem] lg:w-28"}`}>
            <div className={`h-full bg-slate-900 rounded-[2.5rem] flex flex-col py-8 relative shadow-[0_8px_40px_rgba(0,0,0,0.12)] border border-slate-800 ${isExpanded ? "px-5" : "items-center"}`}>

                {/* Logo / Brand */}
                <div className={`flex items-center gap-3 mb-10 w-full relative group ${isExpanded ? "justify-start px-2" : "justify-center flex-col"}`}>
                    <div className="bg-white p-1 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <img src={logo} alt="Logo" className="w-9 h-9 rounded-xl" />
                    </div>
                    {isExpanded ? (
                        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white font-bold text-[15px] tracking-wide whitespace-nowrap">
                            HealthMate
                        </motion.span>
                    ) : (
                        <span className="text-white font-bold text-[9px] tracking-widest uppercase mt-2">HM</span>
                    )}

                    {/* Expand Toggle */}
                    <button onClick={() => setIsExpanded(!isExpanded)} className={`absolute ${isExpanded ? "-right-9" : "-right-5"} top-2 bg-white hover:bg-slate-100 rounded-full p-1.5 shadow-md border border-slate-200 transition-all z-10`}>
                        <ChevronRight size={14} className={`text-slate-800 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} strokeWidth={3} />
                    </button>
                </div>

                {/* Nav Items */}
                <div className={`flex flex-col gap-3 flex-1 w-full ${isExpanded ? "" : "items-center px-3"}`}>
                    {navLinks.map((link) => {
                        const isActive = location.pathname === link.path || (link.path === "/dashboard" && location.pathname === "/");
                        return (
                            <Link
                                key={link.path}
                                to={link.path}
                                title={!isExpanded ? link.label : ""}
                                className={`relative flex items-center h-12 transition-all duration-300 
                                ${isExpanded ? "w-full rounded-2xl px-4 justify-start gap-4 hover:bg-white/10" : "w-12 justify-center rounded-[1rem] hover:bg-white/10"} 
                                ${isActive && isExpanded ? "bg-white text-slate-900 hover:bg-white shadow-md" : ""}
                                ${isActive && !isExpanded ? "bg-white text-slate-900 scale-105 shadow-md" : "text-slate-400 hover:text-white"}`}
                            >
                                <div className="flex-shrink-0">{link.icon}</div>
                                {isExpanded && (
                                    <span className={`font-semibold text-[15px] whitespace-nowrap transition-colors ${isActive ? "text-slate-900" : "text-slate-300"}`}>
                                        {link.label}
                                    </span>
                                )}
                                {isActive && !isExpanded && (
                                    <motion.div layoutId="sidebar-active" className="absolute left-[-21px] lg:left-[-25px] w-1 h-6 bg-white rounded-r-full" />
                                )}
                            </Link>
                        );
                    })}
                </div>

                {/* Settings / Logout Bottom */}
                <div className={`flex flex-col gap-3 mt-auto w-full ${isExpanded ? "" : "items-center px-3"}`}>
                    <Link to="/settings" title={!isExpanded ? "Settings" : ""} className={`flex items-center h-12 transition-colors duration-300 ${isExpanded ? "w-full rounded-2xl px-4 justify-start gap-4 hover:bg-white/10 text-slate-400 hover:text-white" : "w-12 justify-center rounded-[1rem] hover:bg-white/10 text-slate-400 hover:text-white"}`}>
                        <div className="flex-shrink-0"><Settings size={20} /></div>
                        {isExpanded && <span className="font-semibold text-[15px]">Settings</span>}
                    </Link>
                    <button onClick={() => { signOut(); navigate("/"); }} title={!isExpanded ? "Logout" : ""} className={`flex items-center h-12 transition-colors duration-300 ${isExpanded ? "w-full rounded-2xl px-4 justify-start gap-4 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400" : "w-12 justify-center rounded-[1rem] hover:bg-rose-500/10 text-slate-400 hover:text-rose-400"}`}>
                        <div className="flex-shrink-0"><LogOut size={20} /></div>
                        {isExpanded && <span className="font-semibold text-[15px]">Logout</span>}
                    </button>
                </div>
            </div>
        </div>
    );
}
