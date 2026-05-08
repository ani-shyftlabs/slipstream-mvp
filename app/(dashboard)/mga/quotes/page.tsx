import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DealRoomList } from "@/components/shared/deal-room-row";
import { getInvitedDealRooms } from "@/lib/queries/deal-rooms";

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
          <DealRoomList
            rooms={rooms}
            hrefBase="/mga/quotes"
            emptyText="No invitations yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}
