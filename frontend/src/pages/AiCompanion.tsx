import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, AlertCircle } from "lucide-react";
import { supabase } from "../supabaseClient"; // adjust path if needed

type Message = {
  role: "user" | "ai";
  text: string;
};

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function AiCompanion() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Load chat history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const getAuthToken = async (): Promise<string> => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.access_token) {
      throw new Error("Not authenticated. Please log in again.");
    }
    return data.session.access_token;
  };

  const getReportContext = (): string | null => {
    try {
      const raw = sessionStorage.getItem("healthmate_report_result");
      if (!raw) return null;
      // Validate it's parseable, then pass as string
      JSON.parse(raw);
      return raw;
    } catch {
      return null;
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_URL}/api2/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Non-fatal: just start with empty history
        console.warn("Could not load chat history:", response.status);
        return;
      }

      const data = await response.json();
      const loaded: Message[] = (data.messages || []).map(
        (m: { role: string; content: string }) => ({
          role: m.role === "assistant" ? "ai" : "user",
          text: m.content,
        })
      );
      setMessages(loaded);
    } catch (err) {
      console.warn("History load failed (non-fatal):", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    const userMsg: Message = { role: "user", text: userText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      const reportContext = getReportContext();

      const response = await fetch(`${API_URL}/api2/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userText,
          report_context: reportContext,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error (${response.status})`);
      }

      const result = await response.json();
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: result.response },
      ]);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const hasReportContext = !!getReportContext();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1324] via-[#0B1B33] to-[#0A1324] pt-24 pb-10 flex justify-center px-4">
      <div
        className="w-full max-w-2xl flex flex-col rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl overflow-hidden"
        style={{ height: "calc(100vh - 8rem)" }}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 bg-white/[0.03]">
          <div className="flex items-center justify-center gap-3">
            <div className="w-9 h-9 rounded-full bg-cyan-400/20 flex items-center justify-center">
              <Bot size={18} className="text-cyan-400" />
            </div>
            <div className="text-center">
              <h1 className="text-lg font-semibold text-white">
                HealthMate AI Companion
              </h1>
              <p className="text-xs text-white/40">
                Reliable, calm, professional health insights
              </p>
            </div>
          </div>

          {/* Report context pill */}
          {hasReportContext && (
            <div className="mt-3 flex justify-center">
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-300">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Using your latest health report as context
              </span>
            </div>
          )}
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Loading history skeleton */}
          {historyLoading && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-white/20">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-cyan-400/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-cyan-400/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-cyan-400/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <p className="text-xs">Loading your conversation...</p>
            </div>
          )}

          {/* Empty state */}
          {!historyLoading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-white/20">
              <Bot size={40} />
              <p className="text-sm">Ask me anything about your health</p>
              {hasReportContext && (
                <p className="text-xs text-cyan-400/40">
                  I have context from your latest report
                </p>
              )}
            </div>
          )}

          {/* Messages */}
          {!historyLoading && (
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex items-end gap-3 ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {m.role === "ai" && (
                    <div className="w-8 h-8 rounded-full bg-cyan-400/20 flex items-center justify-center shrink-0">
                      <Bot size={15} className="text-cyan-400" />
                    </div>
                  )}

                  <div
                    className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-cyan-500 text-white rounded-br-sm"
                        : "bg-white/[0.07] text-white/85 border border-white/10 rounded-bl-sm"
                    }`}
                  >
                    {m.text}
                  </div>

                  {m.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <User size={15} className="text-white/60" />
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-end gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-cyan-400/20 flex items-center justify-center">
                    <Bot size={15} className="text-cyan-400" />
                  </div>
                  <div className="bg-white/[0.07] border border-white/10 px-4 py-3 rounded-2xl rounded-bl-sm">
                    <div className="flex gap-1 items-center">
                      <span
                        className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-4 mb-2 flex items-center gap-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-2 rounded-xl"
            >
              <AlertCircle size={13} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="p-4 border-t border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3 bg-white/[0.06] border border-white/10 px-4 py-3 rounded-2xl">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Ask something for your wellbeing..."
              className="flex-1 bg-transparent outline-none text-white placeholder-white/30 text-sm"
              disabled={historyLoading}
            />
            <button
              disabled={loading || !input.trim() || historyLoading}
              onClick={sendMessage}
              className="w-9 h-9 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center"
            >
              <Send size={15} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}