import { cn } from "@/lib/utils";
import { BindQuoteModal } from "@/components/quotes/bind-quote-modal";
import type { QuoteRow } from "@/lib/queries/quotes";
import type { DealRoomStatusEnum } from "@/lib/constants/coverage-types";

function formatCurrency(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(n));
}

const STATUS_PILL: Record<string, string> = {
  submitted: "bg-silver text-ink",
  won: "bg-success/15 text-success border border-success/30",
  lost: "bg-error/10 text-error border border-error/20",
};

export function QuotesList({
  dealRoomId,
  roomStatus,
  isOwningBroker,
  quotes,
}: {
  dealRoomId: string;
  roomStatus: DealRoomStatusEnum;
  isOwningBroker: boolean;
  quotes: QuoteRow[];
}) {
  if (quotes.length === 0) {
    return (
      <p className="font-sans text-sm text-ink/60">
        No quotes submitted yet. Invited MGAs will land here once they price.
      </p>
    );
  }
  const canBind = isOwningBroker && roomStatus === "active";

  return (
    <ul className="flex flex-col">
      {quotes.map((q) => {
        const partyName =
          q.party?.profile?.full_name ?? q.party?.profile?.email ?? "Unknown party";
        const partyOrg = q.party?.profile?.org_name;
        return (
          <li
            key={q.id}
            className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_auto_auto] items-center gap-3 px-2 py-3 border-b border-silver/60 last:border-0"
          >
            <div className="flex flex-col min-w-0">
              <span className="font-sans text-sm text-ink truncate">{partyName}</span>
              {partyOrg && (
                <span className="font-sans text-xs text-ink/60 truncate">{partyOrg}</span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-ink/50 font-sans">Premium</span>
              <span className="font-mono text-sm text-navy">{formatCurrency(q.premium)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-ink/50 font-sans">Limit</span>
              <span className="font-mono text-sm text-ink">{formatCurrency(q.coverage_limit)}</span>
            </div>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-sans font-medium uppercase tracking-wider",
                STATUS_PILL[q.status as string] ?? "bg-silver text-ink",
              )}
            >
              {q.status}
            </span>
            <div className="flex items-center justify-end">
              {canBind && q.status === "submitted" && (
                <BindQuoteModal
                  dealRoomId={dealRoomId}
                  quoteId={q.id}
                  partyName={partyName}
                  premium={Number(q.premium)}
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
