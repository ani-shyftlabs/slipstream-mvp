import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { getCurrentProfile } from "@/lib/queries/profile";
import { getBoundDealRooms } from "@/lib/queries/deal-rooms";
import type { DealRoomStatusEnum } from "@/lib/constants/coverage-types";

export default async function InsurerDashboardPage() {
  const ctx = await getCurrentProfile();
  const rooms = await getBoundDealRooms();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-3xl text-navy">Insurer Dashboard</h1>
        <p className="font-sans text-sm text-ink/70 mt-1">
          Welcome, {ctx?.profile?.full_name ?? ctx?.user.email}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bound deals</CardTitle>
        </CardHeader>
        <CardContent>
          {rooms.length === 0 ? (
            <p className="font-sans text-sm text-ink/60">
              Bound deals will appear here once brokers select winning quotes.
            </p>
          ) : (
            <ul className="flex flex-col">
              {rooms.map((r) => (
                <li
                  key={r.id}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-2 py-3 border-b border-silver/60 last:border-0"
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
                  <span className="font-mono text-[11px] text-success">BOUND</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
