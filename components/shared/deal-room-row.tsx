import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import type { DealRoomListItem } from "@/lib/queries/deal-rooms";
import type { DealRoomStatusEnum } from "@/lib/constants/coverage-types";

export function DealRoomRow({
  room,
  hrefBase,
}: {
  room: DealRoomListItem;
  hrefBase: "/broker/quotes" | "/mga/quotes" | "/insurer/quotes";
}) {
  return (
    <li>
      <Link
        href={`${hrefBase}/${room.id}`}
        className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-3 rounded-xl border border-silver bg-white shadow-mac-sm hover:shadow-mac-lg hover:-translate-y-0.5 transition-all duration-200"
      >
        <div className="flex flex-col min-w-0">
          <span className="font-serif text-lg text-navy truncate">
            {room.insured_name}
          </span>
          <span className="font-sans text-xs text-ink/60">
            {room.class_of_business}
            {room.location ? ` · ${room.location}` : ""}
          </span>
        </div>
        <StatusBadge status={room.status as DealRoomStatusEnum} />
        <span className="font-mono text-[11px] text-ink/50 hidden md:inline-block">
          {new Date(room.created_at).toISOString().slice(0, 10)}
        </span>
        <span className="font-mono text-xs text-ink/40">→</span>
      </Link>
    </li>
  );
}

export function DealRoomList({
  rooms,
  hrefBase,
  emptyText,
}: {
  rooms: DealRoomListItem[];
  hrefBase: "/broker/quotes" | "/mga/quotes" | "/insurer/quotes";
  emptyText: string;
}) {
  if (rooms.length === 0) {
    return <p className="font-sans text-sm text-ink/60">{emptyText}</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {rooms.map((r) => (
        <DealRoomRow key={r.id} room={r} hrefBase={hrefBase} />
      ))}
    </ul>
  );
}
