import { createClient } from "@/lib/supabase/server";

export default async function BrokerDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-serif text-3xl text-navy">Welcome, {user?.email}</h1>
      <p className="font-sans text-sm text-ink/70">
        Slipstream MVP — Cycle 1 foundation deployed. Deal rooms ship in Cycle 2.
      </p>
    </div>
  );
}
