import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User } from "lucide-react";

type Message = {
  role: "user" | "ai";
  text: string;
};

export default function AiCompanion() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // The new function for AiCompanion.tsx

const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Define your API URL consistently
      const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

      const response = await fetch(`${API_URL}/api2/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // Send the message in the format the backend expects
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) {
        // Try to get a detailed error message from the backend
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "The server responded with an error.");
      }

      const result = await response.json();
      
      // Create the AI message object and add it to the state
      const aiMsg: Message = { role: "ai", text: result.response };
      setMessages((prev) => [...prev, aiMsg]);

    } catch (error) {
      console.error("Failed to send message:", error);
      // Display an error message to the user
      const errorMsg: Message = {
        role: "ai",
        text: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
};

  return (
    <div className="min-h-screen bg-[#F7FAFC] pt-28 pb-10 flex justify-center px-4">
      <div className="w-full max-w-2xl flex flex-col bg-white border border-gray-200 rounded-2xl shadow-sm">
        
        {/* HEADER */}
        <div className="p-5 border-b border-gray-100 bg-white rounded-t-2xl sticky top-20 z-10">
          <h1 className="text-xl font-semibold text-gray-800 text-center">
            HealthMate AI Companion
          </h1>
          <p className="text-sm text-gray-500 text-center mt-1">
            Reliable, calm, professional health insights.
          </p>
        </div>

        {/* CHAT */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#FAFCFF]">
          <AnimatePresence>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex items-start gap-3 ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {/* AI avatar */}
                {m.role === "ai" && (
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                    <Bot size={18} className="text-blue-500" />
                  </div>
                )}

                {/* Message bubble */}
                <div
                  className={`max-w-[70%] px-4 py-2 rounded-xl text-sm leading-relaxed shadow-sm ${
                    m.role === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                  }`}
                >
                  {m.text}
                </div>

                {/* User avatar */}
                {m.role === "user" && (
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
                    <User size={18} className="text-gray-600" />
                  </div>
                )}
              </motion.div>
            ))}

            {/* Typing */}
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 text-blue-500"
              >
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                  <Bot size={16} />
                </div>
                <p className="text-sm animate-pulse">Typing…</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={chatEndRef} />
        </div>

        {/* INPUT SECTION */}
        <div className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
          <div className="flex items-center gap-3 bg-gray-100 px-4 py-2 rounded-xl">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask something for your wellbeing..."
              className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-500"
            />
            <button
              disabled={loading}
              onClick={sendMessage}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}