import React from "react";
import { motion, MotionProps } from "framer-motion";

// ✅ Merge native <button> attributes + Motion props
type PrimaryButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  MotionProps & {
    children: React.ReactNode;
    className?: string;
  };

const MotionButton = motion.button;

/**
 * PrimaryButton — Animated, fully typed button (no errors!)
 */
const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  className = "",
  disabled = false,
  type = "button",
  onClick,
  ...rest
}) => {
  return (
    <MotionButton
      type={type}
      disabled={disabled}
      onClick={onClick}
      whileHover={!disabled ? { scale: 1.03 } : {}}
      whileTap={!disabled ? { scale: 0.97 } : {}}
      transition={{ duration: 0.15 }}
      className={`rounded-xl px-6 py-3 font-semibold transition-all shadow-md w-full 
        ${
          disabled
            ? "bg-slate-400/60 text-slate-100 cursor-not-allowed opacity-60"
            : "bg-gradient-to-r from-cyan-400 to-blue-500 text-black hover:opacity-90 hover:shadow-cyan-400/30"
        } ${className}`}
      {...rest}
    >
      {children}
    </MotionButton>
  );
};

export default PrimaryButton;
