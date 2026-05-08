"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/queries/profile";
import { relativeTime } from "@/lib/utils/relative-time";
import { STATUS_LABELS } from "@/lib/constants/coverage-types";

function fmtUSD(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(n));
}

const HELP =
  "I can help with deal rooms and quotes specifically. Try: 'show my deal rooms', 'how many active quotes', 'status of <insured name>', or 'latest quote'.";

const PATTERNS = {
  list: /(show|list|what).*(deal rooms?|deals?|rooms?)|^my deal rooms?$/i,
  count: /how many.*(active|pending|open|live)|active.*(quotes?|rooms?)|open quotes?/i,
  status: /status of (.+?)$/i,
  latest: /(latest|most recent|newest|last) quote/i,
  help: /\bhelp\b|what can you|capabilities/i,
};

export type AssistantResult = { answer: string };

export async function askAssistant(question: string): Promise<AssistantResult> {
  const ctx = await getCurrentProfile();
  if (!ctx) return { answer: "Please sign in." };

  const q = (question ?? "").toLowerCase().trim();
  if (!q) return { answer: "Ask me something — try 'show my deal rooms'." };

  const supabase = createClient();
  const role = ctx.role;

  // ===== Pattern 1 — list deal rooms =====
  if (PATTERNS.list.test(q)) {
    const { data: rooms } = await supabase
      .from("deal_rooms")
      .select("insured_name, status, coverage_amount")
      .order("created_at", { ascending: false });
    if (!rooms || rooms.length === 0) {
      return {
        answer:
          role === "broker"
            ? "You don't have any deal rooms yet. Click + New Deal Room to create one."
            : "You haven't been invited to any deal rooms yet.",
      };
    }
    const lines = rooms
      .map(
        (r) =>
          `• ${r.insured_name} (${STATUS_LABELS[r.status as keyof typeof STATUS_LABELS] ?? r.status})` +
          (r.coverage_amount ? ` — ${fmtUSD(r.coverage_amount as number)} coverage` : ""),
      )
      .join("\n");
    return {
      answer: `You have ${rooms.length} deal room${rooms.length === 1 ? "" : "s"}:\n${lines}`,
    };
  }

  // ===== Pattern 2 — counts =====
  if (PATTERNS.count.test(q)) {
    if (role === "broker") {
      const { data: activeRooms } = await supabase
        .from("deal_rooms")
        .select("id")
        .eq("status", "active");
      const ids = (activeRooms ?? []).map((r) => r.id as string);
      let openQuotes = 0;
      if (ids.length > 0) {
        const { count } = await supabase
          .from("quotes")
          .select("*", { count: "exact", head: true })
          .in("deal_room_id", ids)
          .eq("status", "submitted");
        openQuotes = count ?? 0;
      }
      const aCount = activeRooms?.length ?? 0;
      return {
        answer: `You have ${aCount} active deal room${aCount === 1 ? "" : "s"} with ${openQuotes} quote${openQuotes === 1 ? "" : "s"} awaiting your review.`,
      };
    }
    if (role === "mga") {
      const { count } = await supabase
        .from("quotes")
        .select("*", { count: "exact", head: true })
        .eq("status", "submitted");
      return {
        answer: `You have ${count ?? 0} quote${(count ?? 0) === 1 ? "" : "s"} currently submitted, awaiting review.`,
      };
    }
    // insurer
    const { count } = await supabase
      .from("deal_rooms")
      .select("*", { count: "exact", head: true })
      .in("status", ["bound", "closed"]);
    return {
      answer: `You have ${count ?? 0} bound deal${(count ?? 0) === 1 ? "" : "s"} you can review.`,
    };
  }

  // ===== Pattern 3 — status of <name> =====
  const statusMatch = question.match(PATTERNS.status);
  if (statusMatch) {
    const captured = statusMatch[1].trim().replace(/[?.!,]+$/g, "");
    const { data: matches } = await supabase
      .from("deal_rooms")
      .select("id, insured_name, status, created_at")
      .ilike("insured_name", `%${captured}%`)
      .limit(1);
    if (!matches || matches.length === 0) {
      return {
        answer: `I couldn't find a deal room matching "${captured}". Try 'show my deal rooms' to see them.`,
      };
    }
    const room = matches[0];
    const { count: partyCount } = await supabase
      .from("parties")
      .select("*", { count: "exact", head: true })
      .eq("deal_room_id", room.id);
    return {
      answer: `${room.insured_name} is currently ${STATUS_LABELS[room.status as keyof typeof STATUS_LABELS] ?? room.status}. ${partyCount ?? 0} part${partyCount === 1 ? "y" : "ies"} involved. Created ${relativeTime(room.created_at as string)}.`,
    };
  }

  // ===== Pattern 4 — latest quote =====
  if (PATTERNS.latest.test(q)) {
    const { data: quotes } = await supabase
      .from("quotes")
      .select(
        "premium, status, submitted_at, deal_room:deal_rooms!quotes_deal_room_id_fkey(insured_name)",
      )
      .order("submitted_at", { ascending: false })
      .limit(1);
    if (!quotes || quotes.length === 0) {
      return { answer: "No quotes yet." };
    }
    const q0 = quotes[0] as unknown as {
      premium: number;
      status: string;
      submitted_at: string;
      deal_room: { insured_name: string } | null;
    };
    const insured = q0.deal_room?.insured_name ?? "an unnamed deal room";
    return {
      answer: `Your most recent quote: ${fmtUSD(q0.premium)} on ${insured}, submitted ${relativeTime(q0.submitted_at)}, status ${q0.status}.`,
    };
  }

  // ===== Pattern 5 — help =====
  if (PATTERNS.help.test(q)) {
    return {
      answer:
        "I can help with your deal rooms and quotes. Try: 'show my deal rooms', 'how many active quotes', 'status of Cresthill', 'latest quote'.",
    };
  }

  return { answer: HELP };
}
