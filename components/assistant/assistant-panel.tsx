"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageBubble, type Message } from "@/components/assistant/message-bubble";
import { askAssistant } from "@/lib/actions/assistant";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types/database";

export function AssistantPanel({
  open,
  onClose,
  greetingName,
  role,
}: {
  open: boolean;
  onClose: () => void;
  greetingName: string;
  role: UserRole;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Seed welcome on first open.
  useEffect(() => {
    if (!open) return;
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          text: `Hi ${greetingName}, I'm your Slipstream Assistant. Ask me about your deal rooms or quotes.`,
        },
      ]);
    }
    // Focus input after a tick so transition completes.
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-scroll to bottom on new message.
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  function send() {
    const trimmed = input.trim();
    if (!trimmed || pending) return;
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      text: trimmed,
    };
    setMessages((m) => [...m, userMsg, { id: "typing", role: "typing", text: "" }]);
    setInput("");

    startTransition(async () => {
      // Tiny artificial delay so the typing indicator registers visually.
      await new Promise((r) => setTimeout(r, 300));
      const res = await askAssistant(trimmed);
      setMessages((m) =>
        m
          .filter((x) => x.role !== "typing")
          .concat({
            id: `a-${Date.now()}`,
            role: "assistant",
            text: res.answer,
          }),
      );
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:bottom-6 md:right-6 md:left-auto md:top-auto md:inset-auto pointer-events-none">
      <div
        data-assistant-panel
        className={cn(
          "pointer-events-auto bg-white border border-silver shadow-mac-lg",
          "flex flex-col",
          "w-full h-full md:w-[380px] md:h-[560px] md:rounded-xl",
        )}
        role="dialog"
        aria-label="Slipstream Assistant"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-silver/60">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-gold" />
            <h2 className="font-serif text-lg text-navy">Slipstream Assistant</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-ink/70 hover:bg-silver/40 transition-colors"
            aria-label="Close assistant"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
        </div>

        <div className="px-3 py-3 border-t border-silver/60 flex items-center gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={`Ask about your ${role === "broker" ? "deal rooms" : role === "mga" ? "quotes" : "bound deals"}…`}
            disabled={pending}
            className="flex-1"
          />
          <Button
            type="button"
            size="icon"
            onClick={send}
            disabled={pending || !input.trim()}
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
