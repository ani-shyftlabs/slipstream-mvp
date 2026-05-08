import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ActivityFeed } from "@/components/shared/activity-feed";
import { getDealRoomDetail } from "@/lib/queries/deal-rooms";
import { getWinningQuoteForViewer } from "@/lib/queries/quotes";
import type { DealRoomStatusEnum } from "@/lib/constants/coverage-types";

function formatCurrency(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(n));
}

export default async function InsurerDealRoomPage({ params }: { params: { id: string } }) {
  const detail = await getDealRoomDetail(params.id);
  if (!detail) notFound();
  const { room, parties, activities } = detail;
  const status = room.status as DealRoomStatusEnum;

  const winning = await getWinningQuoteForViewer(room.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-serif text-3xl text-navy break-words">{room.insured_name}</h1>
            <StatusBadge status={status} />
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-silver text-ink">
              READ-ONLY
            </span>
          </div>
          <p className="font-mono text-xs text-ink/60 mt-1">DR-{room.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <Link
          href="/insurer/dashboard"
          className="text-sm font-sans text-ink/60 hover:text-ink underline-offset-4 hover:underline shrink-0"
        >
          ← All bound deals
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="flex flex-col gap-6 min-w-0">
          <Card>
            <CardHeader>
              <CardTitle>Submission</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Class of business" value={room.class_of_business} />
                <Field label="Coverage type" value={room.coverage_type} />
                <Field label="Location" value={room.location ?? "—"} />
                <Field label="Coverage amount" value={formatCurrency(room.coverage_amount)} mono />
                {room.notes && (
                  <div className="col-span-2 flex flex-col gap-1">
                    <dt className="text-[11px] uppercase tracking-wider font-sans text-ink/50">Notes</dt>
                    <dd className="text-sm font-sans text-ink whitespace-pre-wrap">{room.notes}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {winning && (
            <Card className="border-success/40">
              <CardHeader>
                <CardTitle>Winning quote</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-sans text-sm text-ink mb-3">
                  Bound to <strong>{winning.party?.profile?.full_name ?? "an MGA"}</strong>
                  {winning.party?.profile?.org_name ? ` (${winning.party.profile.org_name})` : ""}.
                </p>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <Field label="Premium" value={formatCurrency(winning.premium as unknown as number)} mono />
                  <Field label="Deductible" value={formatCurrency(winning.deductible as unknown as number)} mono />
                  <Field label="Coverage limit" value={formatCurrency(winning.coverage_limit as unknown as number)} mono />
                </dl>
                {winning.terms && (
                  <div className="flex flex-col gap-1 mt-4">
                    <dt className="text-[11px] uppercase tracking-wider font-sans text-ink/50">Terms</dt>
                    <dd className="text-sm font-sans text-ink whitespace-pre-wrap">{winning.terms}</dd>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Parties</CardTitle>
            </CardHeader>
            <CardContent>
              {parties.length === 0 ? (
                <p className="text-sm font-sans text-ink/60">No parties on this room.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {parties.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between border-b border-silver/60 pb-2 last:border-0 last:pb-0"
                    >
                      <div className="flex flex-col">
                        <span className="font-sans text-sm text-ink">
                          {p.profile?.full_name ?? p.profile?.email ?? "Unknown"}
                        </span>
                        {p.profile?.org_name && (
                          <span className="font-sans text-xs text-ink/60">
                            {p.profile.org_name}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-xs uppercase text-gold tracking-wider">
                        {p.role}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <aside>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed activities={activities} />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | number | null;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <dt className="text-[11px] uppercase tracking-wider font-sans text-ink/50">{label}</dt>
      <dd className={mono ? "text-sm font-mono text-ink truncate" : "text-sm font-sans text-ink truncate"}>
        {value}
      </dd>
    </div>
  );
}
