import { cn } from "@/lib/utils";
import type { DealRoomDetail } from "@/lib/queries/deal-rooms";

const DOT_PALETTE: Record<string, string> = {
  created: "bg-navy",
  invited: "bg-navy",
  quote_submitted: "bg-gold",
  bound: "bg-success",
  closed: "bg-ink/40",
  doc_updated: "bg-warning",
};

function describe(activity: DealRoomDetail["activities"][number]): string {
  const data = activity.event_data as Record<string, unknown>;
  switch (activity.event_type) {
    case "created":
      return "Deal room created.";
    case "invited": {
      const name = (data?.invited_full_name as string) ?? "a party";
      const role = (data?.role as string)?.toUpperCase() ?? "PARTY";
      return `Invited ${name} as ${role}.`;
    }
    case "quote_submitted":
      return "Quote submitted.";
    case "bound":
      return "Bound to winning quote.";
    case "closed":
      return "Deal room closed.";
    case "doc_updated":
      return "Documents updated.";
    default:
      return activity.event_type;
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

export function ActivityFeed({
  activities,
  className,
}: {
  activities: DealRoomDetail["activities"];
  className?: string;
}) {
  if (activities.length === 0) {
    return (
      <p className={cn("text-sm font-sans text-ink/60", className)}>
        No activity yet.
      </p>
    );
  }

  return (
    <ol className={cn("flex flex-col gap-3", className)}>
      {activities.map((a) => (
        <li key={a.id} className="flex items-start gap-3">
          <span
            className={cn(
              "mt-1.5 inline-block h-2 w-2 rounded-full shrink-0",
              DOT_PALETTE[a.event_type] ?? "bg-ink/40",
            )}
          />
          <div className="flex flex-col min-w-0">
            <p className="text-sm font-sans text-ink">{describe(a)}</p>
            <p className="text-[11px] font-mono text-ink/60">
              {formatTime(a.created_at)} · {a.actor?.full_name ?? a.actor?.email ?? "system"}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
