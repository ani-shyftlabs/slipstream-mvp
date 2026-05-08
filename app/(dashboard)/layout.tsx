import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/shared/sign-out-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-[52px] bg-navy text-white flex items-center px-6 shrink-0">
        <Link
          href="/broker/dashboard"
          className="font-serif text-2xl tracking-wide text-white"
        >
          Slipstream
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-white/70">{user.email}</span>
          <SignOutButton />
        </div>
      </header>
      <div className="flex flex-1 min-h-0">
        <aside className="w-[220px] bg-white border-r border-silver p-4 shrink-0">
          <nav className="flex flex-col gap-1">
            <Link
              href="/broker/dashboard"
              className="px-3 py-2 rounded-md text-sm font-sans text-ink hover:bg-silver/40 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/broker/quotes"
              className="px-3 py-2 rounded-md text-sm font-sans text-ink hover:bg-silver/40 transition-colors"
            >
              Deal Rooms
            </Link>
          </nav>
        </aside>
        <main className="flex-1 bg-background p-6 overflow-auto">
          <div className="max-w-[1280px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
