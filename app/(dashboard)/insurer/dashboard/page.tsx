import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DealRoomList } from "@/components/shared/deal-room-row";
import { getCurrentProfile } from "@/lib/queries/profile";
import { getBoundDealRooms } from "@/lib/queries/deal-rooms";

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
          <DealRoomList
            rooms={rooms}
            hrefBase="/insurer/quotes"
            emptyText="Bound deals will appear here once brokers select winning quotes."
          />
        </CardContent>
      </Card>
    </div>
  );
}
