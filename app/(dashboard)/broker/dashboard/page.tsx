import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { getCurrentProfile } from "@/lib/queries/profile";
import { getMyDealRooms } from "@/lib/queries/deal-rooms";
import type { DealRoomStatusEnum } from "@/lib/constants/coverage-types";

export default async function BrokerDashboardPage() {
  const ctx = await getCurrentProfile();
  const rooms = await getMyDealRooms();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl text-navy">Broker Dashboard</h1>
          <p className="font-sans text-sm text-ink/70 mt-1">
            Welcome, {ctx?.profile?.full_name ?? ctx?.user.email}.
          </p>
        </div>
        <Button asChild>
          <Link href="/broker/quotes/new">+ New Deal Room</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your deal rooms</CardTitle>
        </CardHeader>
        <CardContent>
          {rooms.length === 0 ? (
            <div className="flex flex-col items-start gap-3 py-2">
              <p className="font-sans text-sm text-ink/60">
                No deal rooms yet. Create one to start collecting structured submissions.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/broker/quotes/new">Create your first deal room</Link>
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col">
              {rooms.map((r) => (
                <li
                  key={r.id}
                  className="border-b border-silver/60 last:border-0 transition-colors hover:bg-silver/20"
                >
                  <Link
                    href={`/broker/quotes/${r.id}`}
                    className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-2 py-3"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-serif text-lg text-navy truncate">
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
