import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types/database";

const LABELS: Record<UserRole, string> = {
  broker: "BROKER",
  mga: "MGA",
  insurer: "INSURER",
};

export function RoleBadge({ role, className }: { role: UserRole; className?: string }) {
  return (
    <span
      data-role={role}
      className={cn(
        "inline-flex items-center rounded-full bg-gold/95 px-2.5 py-0.5 text-[10px] font-sans font-medium uppercase tracking-wider text-navy",
        className,
      )}
    >
      {LABELS[role]}
    </span>
  );
}
