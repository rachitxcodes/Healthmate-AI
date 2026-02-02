import React from "react";
import { motion } from "framer-motion";
import { useTheme } from "../contexts/ThemeContext";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * GlassCard - Theme-aware glassmorphic container
 */
const GlassCard: React.FC<GlassCardProps> = ({ children, className = "" }) => {
  const { darkMode } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`
        rounded-3xl p-6 
        transition-all duration-300
        
        ${darkMode
          ? // 🌙 DARK MODE — glass, navy, soft glow
            "bg-white/10 backdrop-blur-xl border border-white/20 shadow-card-strong"
          : // ☀️ LIGHT MODE — clean white card, soft shadow
            "bg-lightCard border border-lightBorder shadow-card-soft"
        }

        ${className}
      `}
    >
      {children}
    </motion.div>
  );
};

export default GlassCard;
