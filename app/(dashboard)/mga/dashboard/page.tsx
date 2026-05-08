import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DealRoomList } from "@/components/shared/deal-room-row";
import { getCurrentProfile } from "@/lib/queries/profile";
import { getInvitedDealRooms } from "@/lib/queries/deal-rooms";

export default async function MgaDashboardPage() {
  const ctx = await getCurrentProfile();
  const rooms = await getInvitedDealRooms();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-3xl text-navy">MGA Dashboard</h1>
        <p className="font-sans text-sm text-ink/70 mt-1">
          Welcome, {ctx?.profile?.full_name ?? ctx?.user.email}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quotes you&rsquo;re invited to</CardTitle>
        </CardHeader>
        <CardContent>
          <DealRoomList
            rooms={rooms}
            hrefBase="/mga/quotes"
            emptyText="Quotes you're invited to will appear here. Brokers must add you as a party before you'll see a deal room."
          />
        </CardContent>
      </Card>
    </div>
  );
}
