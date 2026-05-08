import { cn } from "@/lib/utils";
import { STATUS_LABELS, type DealRoomStatusEnum } from "@/lib/constants/coverage-types";

const PALETTE: Record<DealRoomStatusEnum, string> = {
  draft: "bg-silver text-ink",
  active: "bg-success/10 text-success border border-success/30",
  bound: "bg-gold/15 text-warning border border-gold/40",
  closed: "bg-ink/10 text-ink/70 border border-ink/20",
};

export function StatusBadge({
  status,
  className,
}: {
  status: DealRoomStatusEnum;
  className?: string;
}) {
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-sans font-medium uppercase tracking-wider",
        PALETTE[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
