"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStore } from "@/lib/store";
import { Send, Sparkles, Loader2, Bot, User } from "lucide-react";
import { motion } from "framer-motion";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What if AI 101 is delayed by 30 minutes?",
  "Which gates are underused?",
  "How many wide-body flights are scheduled?",
  "When is the airport busiest?",
];

export function AssistantPanel() {
  const { flights, gates, result } = useStore();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Ask me anything about the schedule \u2014 utilisation, conflicts, what-if scenarios, or specific flights." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const send = async (text?: string) => {
    const message = text ?? input;
    if (!message.trim() || !result) return;
    setMessages((m) => [...m, { role: "user", content: message }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          flights,
          gates,
          assignments: result.assignments,
          metrics: result.metrics,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI error");
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", content: `Sorry, I hit an error: ${err instanceof Error ? err.message : "unknown"}` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1 px-4 pt-4">
        <div className="space-y-3">
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}
            >
              {m.role === "assistant" && (
                <div className="brand-gradient flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}>
                {m.content}
              </div>
              {m.role === "user" && (
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                  <User className="h-4 w-4" />
                </div>
              )}
            </motion.div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Thinking\u2026
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Try:</div>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border border-border/50 px-2.5 py-1 text-[11px] hover:bg-muted"
              >
                <Sparkles className="mr-1 inline h-3 w-3" /> {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-border/50 p-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !busy && send()}
            placeholder="Ask the AI\u2026"
            disabled={busy}
          />
          <Button onClick={() => send()} disabled={busy || !input.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
