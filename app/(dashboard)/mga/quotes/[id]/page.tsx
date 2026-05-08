import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ActivityFeed } from "@/components/shared/activity-feed";
import { SubmitQuoteForm } from "@/components/quotes/submit-quote-form";
import { getDealRoomDetail } from "@/lib/queries/deal-rooms";
import { getMyQuoteForDealRoom, getWinningQuoteForViewer } from "@/lib/queries/quotes";
import type { DealRoomStatusEnum } from "@/lib/constants/coverage-types";

function formatCurrency(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(n));
}

const QUOTE_PILL: Record<string, string> = {
  submitted: "bg-silver text-ink",
  won: "bg-success/15 text-success border border-success/30",
  lost: "bg-error/10 text-error border border-error/20",
};

export default async function MgaDealRoomPage({ params }: { params: { id: string } }) {
  const detail = await getDealRoomDetail(params.id);
  if (!detail) notFound();
  const { room, activities } = detail;
  const status = room.status as DealRoomStatusEnum;

  const myQuote = await getMyQuoteForDealRoom(room.id);
  const winning = status === "bound" || status === "closed" ? await getWinningQuoteForViewer(room.id) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-serif text-3xl text-navy break-words">{room.insured_name}</h1>
            <StatusBadge status={status} />
          </div>
          <p className="font-mono text-xs text-ink/60 mt-1">DR-{room.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <Link
          href="/mga/quotes"
          className="text-sm font-sans text-ink/60 hover:text-ink underline-offset-4 hover:underline shrink-0"
        >
          ← All invitations
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
            <Card>
              <CardHeader>
                <CardTitle>Winning quote</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-sans text-sm text-ink mb-2">
                  Bound to <strong>{winning.party?.profile?.full_name ?? "an MGA"}</strong>{winning.party?.profile?.org_name ? ` (${winning.party.profile.org_name})` : ""}
                </p>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <Field label="Premium" value={formatCurrency(winning.premium as unknown as number)} mono />
                  <Field label="Coverage limit" value={formatCurrency(winning.coverage_limit as unknown as number)} mono />
                </dl>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Your quote</CardTitle>
            </CardHeader>
            <CardContent>
              {myQuote ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-sans font-medium uppercase tracking-wider ${QUOTE_PILL[myQuote.status as string] ?? "bg-silver text-ink"}`}
                    >
                      {myQuote.status}
                    </span>
                    <span className="font-mono text-xs text-ink/60">
                      Submitted {new Date(myQuote.submitted_at).toISOString().slice(0, 19).replace("T", " ")}
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <Field label="Premium" value={formatCurrency(myQuote.premium as unknown as number)} mono />
                    <Field label="Deductible" value={formatCurrency(myQuote.deductible as unknown as number)} mono />
                    <Field label="Coverage limit" value={formatCurrency(myQuote.coverage_limit as unknown as number)} mono />
                  </dl>
                  {myQuote.terms && (
                    <div className="flex flex-col gap-1">
                      <dt className="text-[11px] uppercase tracking-wider font-sans text-ink/50">Terms</dt>
                      <dd className="text-sm font-sans text-ink whitespace-pre-wrap">{myQuote.terms}</dd>
                    </div>
                  )}
                </div>
              ) : status !== "active" && status !== "draft" ? (
                <p className="font-sans text-sm text-ink/60">
                  This room is no longer accepting quotes (status: {status}).
                </p>
              ) : (
                <SubmitQuoteForm dealRoomId={room.id} />
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
