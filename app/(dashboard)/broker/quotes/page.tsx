import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DealRoomList } from "@/components/shared/deal-room-row";
import { getMyDealRooms } from "@/lib/queries/deal-rooms";

export default async function BrokerDealRoomsPage() {
  const rooms = await getMyDealRooms();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl text-navy">Deal Rooms</h1>
          <p className="font-sans text-sm text-ink/70 mt-1">
            All placements you own. Click a row to open the deal room.
          </p>
        </div>
        <Button asChild>
          <Link href="/broker/quotes/new">+ New Deal Room</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{rooms.length} deal room{rooms.length === 1 ? "" : "s"}</CardTitle>
        </CardHeader>
        <CardContent>
          <DealRoomList
            rooms={rooms}
            hrefBase="/broker/quotes"
            emptyText="No deal rooms yet. Create one to start collecting structured submissions."
          />
        </CardContent>
      </Card>
    </div>
  );
}
