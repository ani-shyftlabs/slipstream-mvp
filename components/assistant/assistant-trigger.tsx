"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { AssistantPanel } from "@/components/assistant/assistant-panel";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types/database";

const PILL_DISMISS_KEY = "slipstream-assistant-pill-dismissed";

export function AssistantTrigger({
  greetingName,
  role,
}: {
  greetingName: string;
  role: UserRole;
}) {
  const [open, setOpen] = useState(false);
  const [showPill, setShowPill] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = window.sessionStorage.getItem(PILL_DISMISS_KEY) === "1";
    if (dismissed) return;
    setShowPill(true);
    const t = setTimeout(() => {
      setShowPill(false);
      window.sessionStorage.setItem(PILL_DISMISS_KEY, "1");
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  function dismissPill() {
    setShowPill(false);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(PILL_DISMISS_KEY, "1");
    }
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        {showPill && !open && (
          <button
            type="button"
            onClick={() => {
              dismissPill();
              setOpen(true);
            }}
            className={cn(
              "rounded-full bg-white border border-silver px-3 py-1.5 text-xs font-sans text-ink shadow-mac-md",
              "hover:shadow-mac-lg transition-all duration-200",
              "animate-in fade-in slide-in-from-bottom-2",
            )}
          >
            Ask me about your deal rooms
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            dismissPill();
            setOpen((o) => !o);
          }}
          aria-label="Open Slipstream Assistant"
          className={cn(
            "h-14 w-14 rounded-full bg-gold text-navy shadow-mac-lg",
            "hover:shadow-mac-lg hover:-translate-y-0.5 transition-all duration-200",
            "flex items-center justify-center",
            open && "ring-2 ring-navy/30",
          )}
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      </div>

      <AssistantPanel
        open={open}
        onClose={() => setOpen(false)}
        greetingName={greetingName}
        role={role}
      />
    </>
  );
}
