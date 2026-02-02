import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Define message type explicitly to avoid TS inference errors
type Message = {
  role: "user" | "ai";
  text: string;
};

export default function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const toggleChat = () => setOpen((prev) => !prev);

  // The new, fully functional sendMessage function for ChatAssistant.tsx

const sendMessage = async () => {
  if (!input.trim() || loading) return;

  const userMessage: Message = { role: "user", text: input.trim() };
  setMessages((prev) => [...prev, userMessage]);
  setInput("");
  setLoading(true);

  try {
    // Define your API URL
    const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

    // Call your new backend endpoint
    const response = await fetch(`${API_URL}/api3/support-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // Send the message in the format the backend expects
      body: JSON.stringify({ message: userMessage.text }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "The server responded with an error.");
    }

    const result = await response.json();
    
    const aiMessage: Message = { role: "ai", text: result.response };
    setMessages((prev) => [...prev, aiMessage]);

  } catch (err) {
    const errorMessage: Message = {
      role: "ai",
      text: "⚠️ I'm having trouble connecting right now. Please try again.",
    };
    setMessages((prev) => [...prev, errorMessage]);
    console.error("Failed to send message:", err);
  } finally {
    setLoading(false);
  }
};
  return (
    <>
      {/* Floating chat button */}
      <motion.button
        onClick={toggleChat}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="
          fixed bottom-6 right-6 z-50 p-4 rounded-full
          bg-gradient-to-r from-cyan-500/90 to-blue-500/90
          text-white shadow-[0_0_25px_-4px_rgba(0,200,255,0.6)]
        "
      >
        {open ? "✖" : "💬"}
      </motion.button>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.3 }}
            className="
              fixed bottom-20 right-6 z-40 w-[350px] max-h-[520px]
              rounded-3xl border border-white/10
              bg-white/[0.04] backdrop-blur-2xl
              shadow-[0_0_60px_-15px_rgba(255,255,255,0.2)]
              flex flex-col overflow-hidden
            "
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold text-white/90">AI Health Assistant</h3>
              <button
                onClick={() => setMessages([])}
                className="text-sm text-white/60 hover:text-white/90 transition"
              >
                Clear
              </button>
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-white/15 text-white/95 rounded-br-none"
                        : "bg-gradient-to-r from-cyan-500/90 to-blue-500/90 text-white rounded-bl-none"
                    }`}
                  >
                    {m.text}
                  </div>
                </motion.div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gradient-to-r from-cyan-500/90 to-blue-500/90 px-3 py-2 rounded-2xl text-white/90 text-sm">
                    <span className="animate-pulse">•••</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input section */}
            <div className="border-t border-white/10 p-3 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                className="
                  flex-1 px-3 py-2 rounded-xl bg-white/5
                  text-white text-sm outline-none placeholder-white/40
                "
                placeholder="Ask something..."
              />
              <button
                onClick={sendMessage}
                disabled={loading}
                className="
                  px-4 py-2 rounded-xl bg-white text-slate-900
                  font-semibold hover:bg-slate-200 transition
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                Send
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}