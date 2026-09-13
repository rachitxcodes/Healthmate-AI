/**
 * AIVoiceSummaryPlayer
 *
 * A compact "listen to your report" audio player, styled after the
 * reference screenshot (dark card, waveform, play/pause, seek bar,
 * elapsed/duration time).
 *
 * The player reads the short overall summary supplied by the report page.
 *
 * Drop into: frontend/src/components/AIVoiceSummaryPlayer.tsx
 *
 * Usage in ReportResult.tsx:
 *   <AIVoiceSummaryPlayer
 *     text={overallSummary}
 *     ready={!loadingSummary && !!overallSummary}
 *   />
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Volume2, Play, Pause, Loader2 } from "lucide-react";

type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "error";

interface AIVoiceSummaryPlayerProps {
  text: string;
  ready: boolean;
  apiBase?: string;
  voice?: string;
  language?: "en-IN" | "hi-IN" | "hi-en";
}

function formatTime(seconds: number) {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const BAR_COUNT = 28;

export default function AIVoiceSummaryPlayer({
  text,
  ready,
  apiBase = "",
  voice = "Pranav",
  language = "en-IN",
}: AIVoiceSummaryPlayerProps) {
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [usingFallback, setUsingFallback] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep playback concise: this is the report summary, not dictation of every card.
  const fullScript = language === "hi-IN"
    ? `यह आपके स्वास्थ्य की AI रिपोर्ट का सारांश है। ${text} याद रखें, यह AI द्वारा दी गई जानकारी है। पूरी जाँच के लिए अपने डॉक्टर से सलाह लें।`
    : language === "hi-en"
    ? `Yeh aapki health report ka AI summary hai. ${text} Yaad rakhein, yeh AI generated guidance hai. Complete diagnosis ke liye apne doctor se consult karein.`
    : `Here is your AI health summary. ${text} Remember, this is AI generated guidance. Please consult your doctor for a full diagnosis.`;

  useEffect(() => {
    // Reset the player whenever the summary text changes (new report analyzed)
    audioRef.current?.pause();
    audioRef.current = null;
    window.speechSynthesis?.cancel();
    if (fallbackTimerRef.current) clearInterval(fallbackTimerRef.current);
    setStatus("idle");
    setCurrentTime(0);
    setDuration(0);
    setUsingFallback(false);
  }, [text]);

  const startFallback = useCallback(() => {
    if (!("speechSynthesis" in window)) {
      setStatus("error");
      return;
    }
    setUsingFallback(true);
    const utterance = new SpeechSynthesisUtterance(fullScript);
    utterance.lang = language;
    utterance.onstart = () => {
      setStatus("playing");
      let elapsed = 0;
      fallbackTimerRef.current = setInterval(() => {
        elapsed += 1;
        setCurrentTime(elapsed);
      }, 1000);
    };
    utterance.onend = () => {
      setStatus("idle");
      if (fallbackTimerRef.current) clearInterval(fallbackTimerRef.current);
      setCurrentTime(0);
    };
    utterance.onerror = () => setStatus("error");
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [fullScript]);

  const loadAndPlay = useCallback(async () => {
    setStatus("loading");
    try {
      const response = await fetch(`${apiBase}/api/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: fullScript, voice, language }),
      });
      if (!response.ok) throw new Error("TTS server error");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audio.onloadedmetadata = () => setDuration(audio.duration);
      audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
      audio.onplay = () => setStatus("playing");
      audio.onpause = () => setStatus((s) => (s === "playing" ? "paused" : s));
      audio.onended = () => {
        setStatus("idle");
        setCurrentTime(0);
      };
      audio.onerror = () => startFallback();

      audioRef.current = audio;
      await audio.play();
    } catch {
      startFallback();
    }
  }, [apiBase, voice, language, fullScript, startFallback]);

  const togglePlay = () => {
    if (status === "loading" || !ready) return;

    if (usingFallback) {
      if (status === "playing") {
        window.speechSynthesis.pause();
        setStatus("paused");
      } else if (status === "paused") {
        window.speechSynthesis.resume();
        setStatus("playing");
      } else {
        startFallback();
      }
      return;
    }

    if (!audioRef.current) {
      loadAndPlay();
      return;
    }

    if (status === "playing") {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setCurrentTime(value);
    if (audioRef.current) audioRef.current.currentTime = value;
  };

  const statusLabel =
    status === "loading"
      ? "Preparing audio..."
      : status === "playing"
      ? "Playing Audio"
      : status === "paused"
      ? "Paused"
      : status === "error"
      ? "Voice unavailable"
      : "Ready to play";

  return (
    <div className="w-full rounded-[1.75rem] bg-slate-900 text-white p-6 sm:p-7 mb-8 shadow-lg shadow-slate-900/10">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Volume2 size={18} className="text-rose-400" />
          <span className="font-bold text-sm tracking-wide text-rose-100">AI Voice Summary</span>
        </div>
        <span
          className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full ${
            status === "playing"
              ? "bg-rose-500/20 text-rose-300"
              : status === "error"
              ? "bg-red-500/20 text-red-300"
              : "bg-slate-700/60 text-slate-300"
          }`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!ready || status === "loading"}
          className="shrink-0 w-14 h-14 rounded-full bg-rose-500 hover:bg-rose-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shadow-md transition-colors"
        >
          {status === "loading" ? (
            <Loader2 size={22} className="animate-spin" />
          ) : status === "playing" ? (
            <Pause size={22} />
          ) : (
            <Play size={22} className="ml-0.5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-end gap-[3px] h-8 mb-2">
            {Array.from({ length: BAR_COUNT }).map((_, i) => {
              const baseHeight = 30 + ((i * 37) % 70); // deterministic pseudo-random 30-100%
              return (
                <motion.div
                  key={i}
                  className="w-[3px] rounded-full bg-rose-400/70"
                  style={{ height: `${baseHeight}%` }}
                  animate={status === "playing" ? { scaleY: [0.4, 1, 0.4] } : { scaleY: 0.4 }}
                  transition={
                    status === "playing"
                      ? { duration: 0.9 + (i % 5) * 0.1, repeat: Infinity, ease: "easeInOut", delay: i * 0.03 }
                      : { duration: 0.3 }
                  }
                />
              );
            })}
          </div>

          {!usingFallback ? (
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              disabled={!duration}
              className="w-full h-1 accent-rose-400 cursor-pointer disabled:cursor-default"
            />
          ) : (
            <div className="w-full h-1 rounded-full bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-rose-400 animate-pulse"
                style={{ width: status === "playing" ? "100%" : "0%" }}
              />
            </div>
          )}

          <div className="flex justify-between text-[11px] font-semibold text-slate-400 mt-1.5">
            <span>{formatTime(currentTime)}</span>
            <span>{usingFallback ? "" : formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}