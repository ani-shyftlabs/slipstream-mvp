import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/queries/profile";
import { createClient } from "@/lib/supabase/server";

export default async function InsurerDashboardPage() {
  const ctx = await getCurrentProfile();
  const supabase = createClient();

  const { data: rooms } = await supabase
    .from("deal_rooms")
    .select("id, insured_name, status, created_at")
    .eq("status", "bound")
    .order("created_at", { ascending: false });

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
          {rooms && rooms.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {rooms.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between border-b border-silver/60 pb-2 last:border-0 last:pb-0"
                >
                  <span className="font-sans text-sm text-ink">{r.insured_name}</span>
                  <span className="font-mono text-xs uppercase text-success">{r.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-sans text-sm text-ink/60">
              Bound deals will appear here once brokers select winning quotes.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
