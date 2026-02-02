import React from "react";
import { motion, MotionProps } from "framer-motion";

// ✅ Combined types: native input props + framer motion + optional label
type FieldProps = React.InputHTMLAttributes<HTMLInputElement> &
  MotionProps & {
    label?: string; // ✅ made optional
    className?: string;
  };

const MotionInput = motion.input;

/**
 * Field — Reusable animated input field (no more label errors)
 */
export default function Field({ label, className = "", ...rest }: FieldProps) {
  return (
    <div className="w-full flex flex-col">
      {/* Optional label */}
      {label && (
        <label className="mb-1 block text-sm font-medium text-white/70">
          {label}
        </label>
      )}

      <MotionInput
        {...rest}
        whileFocus={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
        className={`w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3
                   text-white placeholder-white/40 shadow-sm outline-none
                   focus:border-cyan-400 focus:ring-2 focus:ring-cyan-300
                   transition-all ${className}`}
      />
    </div>
  );
}
