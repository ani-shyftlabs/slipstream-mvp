import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { getInvitedDealRooms } from "@/lib/queries/deal-rooms";
import type { DealRoomStatusEnum } from "@/lib/constants/coverage-types";

export default async function MgaQuotesPage() {
  const rooms = await getInvitedDealRooms();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-3xl text-navy">Quotes</h1>
        <p className="font-sans text-sm text-ink/70 mt-1">
          Deal rooms you&rsquo;ve been invited to as MGA. Click to view + submit a quote.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{rooms.length} room{rooms.length === 1 ? "" : "s"}</CardTitle>
        </CardHeader>
        <CardContent>
          {rooms.length === 0 ? (
            <p className="font-sans text-sm text-ink/60">No invitations yet.</p>
          ) : (
            <ul className="flex flex-col">
              {rooms.map((r) => (
                <li
                  key={r.id}
                  className="border-b border-silver/60 last:border-0 transition-colors hover:bg-silver/20"
                >
                  <Link
                    href={`/mga/quotes/${r.id}`}
                    className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-2 py-3"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-serif text-base text-navy truncate">
                        {r.insured_name}
                      </span>
                      <span className="font-sans text-xs text-ink/60">
                        {r.class_of_business}
                        {r.location ? ` · ${r.location}` : ""}
                      </span>
                    </div>
                    <StatusBadge status={r.status as DealRoomStatusEnum} />
                    <span className="font-mono text-[11px] text-ink/50 hidden md:inline-block">
                      {new Date(r.created_at).toISOString().slice(0, 10)}
                    </span>
                    <span className="font-mono text-xs text-ink/40">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
