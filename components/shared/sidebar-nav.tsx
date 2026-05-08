import Link from "next/link";
import type { UserRole } from "@/lib/types/database";

type NavItem = { href: string; label: string };

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  broker: [
    { href: "/broker/dashboard", label: "Dashboard" },
    { href: "/broker/quotes", label: "Deal Rooms" },
    { href: "/broker/tower-demo", label: "Tower Demo" },
    { href: "/broker/directory", label: "Markets Directory" },
  ],
  mga: [
    { href: "/mga/dashboard", label: "Dashboard" },
    { href: "/mga/quotes", label: "Quotes" },
  ],
  insurer: [{ href: "/insurer/dashboard", label: "Dashboard" }],
};

export function SidebarNav({ role }: { role: UserRole }) {
  const items = NAV_BY_ROLE[role];
  return (
    <nav className="flex flex-col gap-1">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className="px-3 py-2 rounded-md text-sm font-sans text-ink hover:bg-silver/40 transition-colors"
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
