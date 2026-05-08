import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/queries/profile";
import { createClient } from "@/lib/supabase/server";

export default async function MgaDashboardPage() {
  const ctx = await getCurrentProfile();
  const supabase = createClient();

  // RLS: mga sees only deal rooms where they're a party. Cycle 2 has zero parties seeded → expect [].
  const { data: invitedRooms } = await supabase
    .from("deal_rooms")
    .select("id, insured_name, status, class_of_business, created_at")
    .order("created_at", { ascending: false });

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
          {invitedRooms && invitedRooms.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {invitedRooms.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between border-b border-silver/60 pb-2 last:border-0 last:pb-0"
                >
                  <span className="font-sans text-sm text-ink">
                    {r.insured_name}{" "}
                    <span className="text-ink/50 text-xs">— {r.class_of_business}</span>
                  </span>
                  <span className="font-mono text-xs uppercase text-ink/60">{r.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-sans text-sm text-ink/60">
              Quotes you&rsquo;re invited to will appear here. Brokers must add you as a party before you&rsquo;ll see a deal room.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
