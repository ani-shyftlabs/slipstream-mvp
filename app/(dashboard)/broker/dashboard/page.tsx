import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DealRoomList } from "@/components/shared/deal-room-row";
import { getCurrentProfile } from "@/lib/queries/profile";
import { getMyDealRooms } from "@/lib/queries/deal-rooms";

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
            <DealRoomList
              rooms={rooms}
              hrefBase="/broker/quotes"
              emptyText="No deal rooms yet."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
