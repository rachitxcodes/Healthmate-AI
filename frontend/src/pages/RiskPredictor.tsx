// full page changed WITHOUT changing UI
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/Navbar";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function UploadReport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // ---------- helpers ----------
  const openFileDialog = () => inputRef.current?.click();
  const resetMessages = () => {
    setSuccessMsg("");
    setErrorMsg("");
  };

  const acceptMime = "image/*";

  const handleFilePick = (f: File | null | undefined) => {
    if (!f) return;
    resetMessages();
    setFile(f);
    if (f.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  };

  // ---------- input / drag ----------
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    handleFilePick(e.target.files?.[0]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    handleFilePick(e.dataTransfer.files?.[0]);
  };

  // ---------- upload ----------
  const handleUpload = async () => {
    resetMessages();

    if (!file) {
      setErrorMsg("Please select an image first.");
      return;
    }

    setIsUploading(true);
    setProgress(10);

    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) throw error;
      if (!session) throw new Error("Not logged in");

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE_URL}/upload-image/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Upload failed");
      }

      // ✅ SINGLE SOURCE OF TRUTH
      sessionStorage.setItem(
        "healthmate_report_result",
        JSON.stringify(result)
      );

      setProgress(100);
      setSuccessMsg("Uploaded successfully");

      // ✅ CLEAN NAVIGATION (NO STATE)
      navigate("/report-result");

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Something went wrong");
    } finally {
      setIsUploading(false);
      setTimeout(() => setProgress(0), 800);
    }
  };

  return (
    
    <div className="min-h-screen bg-gradient-to-b from-[#0A1324] via-[#0B1B33] to-[#0A1324] text-white">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 pt-40 pb-24">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h1 className="text-[36px] sm:text-[44px] font-semibold tracking-tight">
            Upload Report
          </h1>
          <p className="mt-2 text-white/80">
            Securely upload your image report. We’ll process it with your connected backend.
          </p>
        </motion.div>

        {/* Centered glass card */}
        <motion.section
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.05 }}
          className="
            mx-auto max-w-xl
            rounded-3xl border border-white/10
            bg-white/[0.035] backdrop-blur-2xl
            p-6 sm:p-8
            shadow-[0_0_60px_-16px_rgba(255,255,255,0.25)]
          "
        >
          {/* Drag & Drop Zone */}
          <motion.div
            onClick={openFileDialog}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            whileHover={{ scale: 1.01 }}
            className={[
              "cursor-pointer rounded-2xl px-6 py-10 text-center transition",
              "border bg-white/[0.03] border-white/10 shadow-inner",
              dragActive ? "ring-2 ring-cyan-300/40 bg-white/[0.06]" : "",
            ].join(" ")}
          >
            <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-white/[0.07] flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" className="opacity-90">
                <path
                  fill="currentColor"
                  d="M5 20q-.825 0-1.412-.588T3 18v-3q0-.425.288-.713T4 14q.425 0 .713.288T5 15v3h14v-3q0-.425.288-.713T20 14q.425 0 .713.288T21 15v3q0 .825-.588 1.413T19 20H5Zm7-4q-.425 0-.713-.288T11 15V7.825L8.4 10.4q-.3.3-.713.288T7 10.4q-.275-.3-.275-.7t.275-.7l4.3-4.3q.3-.3.713-.3t.712.3l4.3 4.3q.3.3.288.7t-.288.7q-.3.3-.7.3t-.7-.3L13 7.825V15q0 .425-.288.713T12 16Z"
                />
              </svg>
            </div>

            <p className="text-white/90 font-medium">
              Click to choose or drag & drop an image here
            </p>
            <p className="text-white/55 text-sm mt-1">JPG, PNG</p>

            {file && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 text-white/85 text-sm truncate"
              >
                Selected: <span className="font-medium">{file.name}</span>
              </motion.p>
            )}

            <input
              ref={inputRef}
              type="file"
              accept={acceptMime}
              className="hidden"
              onChange={onChange}
            />
          </motion.div>

          {/* Preview */}
          <AnimatePresence>
            {preview && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.35 }}
                className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
              >
                <img
                  src={preview}
                  alt="preview"
                  className="w-full h-64 object-contain bg-gradient-to-b from-transparent to-white/[0.02]"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="
                w-full sm:w-auto px-5 py-3 rounded-xl font-semibold
                text-slate-900 bg-white hover:bg-slate-200
                disabled:opacity-50 disabled:cursor-not-allowed transition
              "
            >
              {isUploading ? "Uploading…" : "Upload"}
            </button>

            <button
              onClick={openFileDialog}
              className="
                w-full sm:w-auto px-5 py-3 rounded-xl font-medium
                border border-white/15 bg-white/5 hover:bg-white/10 transition
              "
            >
              Choose another
            </button>
          </div>

          {/* Progress bar */}
          <AnimatePresence>
            {(isUploading || progress > 0) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-5 h-2 w-full rounded-full bg-white/10 overflow-hidden"
              >
                <motion.div
                  key={progress}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ type: "tween", ease: "easeOut", duration: 0.3 }}
                  className="h-full bg-gradient-to-r from-cyan-400/90 to-blue-500/90"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages */}
          <div className="min-h-[28px] mt-4">
            <AnimatePresence mode="popLayout">
              {successMsg && (
                <motion.p
                  key="ok"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="text-sm text-emerald-300/95"
                >
                  {successMsg}
                </motion.p>
              )}
              {errorMsg && (
                <motion.p
                  key="err"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="text-sm text-rose-300/95"
                >
                  {errorMsg}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.section>
      </main>
    </div>
  );
}