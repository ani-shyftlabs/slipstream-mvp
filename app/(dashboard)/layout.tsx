import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/queries/profile";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { RoleBadge } from "@/components/shared/role-badge";
import { SidebarNav } from "@/components/shared/sidebar-nav";
import { AssistantTrigger } from "@/components/assistant/assistant-trigger";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getCurrentProfile();
  if (!ctx) redirect("/login");

  const { user, profile, role } = ctx;
  const greetingName = profile?.full_name ?? user.email ?? "there";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 h-[52px] bg-navy/90 backdrop-blur-md text-white flex items-center px-6 shrink-0 border-b border-white/5">
        <Link
          href="/"
          className="font-serif text-2xl tracking-wide text-white"
        >
          Slipstream
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <RoleBadge role={role} />
          <span className="font-mono text-xs text-white/70 hidden sm:inline">
            {profile?.full_name ?? user.email}
          </span>
          <SignOutButton />
        </div>
      </header>
      <div className="flex flex-1 min-h-0">
        <aside className="hidden md:block w-[220px] bg-white border-r border-silver p-4 shrink-0">
          <SidebarNav role={role} />
        </aside>
        <main className="flex-1 bg-background p-4 md:p-6 overflow-auto">
          <div className="max-w-[1280px] mx-auto">{children}</div>
        </main>
      </div>
      <AssistantTrigger greetingName={greetingName} role={role} />
    </div>
  );
}
