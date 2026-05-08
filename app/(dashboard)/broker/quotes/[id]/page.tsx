import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ActivityFeed } from "@/components/shared/activity-feed";
import { InvitePartyModal } from "@/components/quotes/invite-party-modal";
import { QuotesList } from "@/components/quotes/quotes-list";
import { ExportComplianceButton } from "@/components/quotes/export-compliance-button";
import { CloseDealModal } from "@/components/quotes/close-deal-modal";
import { TowerVisualization } from "@/components/quotes/tower-visualization";
import { getDealRoomDetail } from "@/lib/queries/deal-rooms";
import { getQuotesForDealRoom } from "@/lib/queries/quotes";
import { getInvitablePartyProfiles } from "@/lib/queries/profiles";
import { getCurrentProfile } from "@/lib/queries/profile";
import { DEMO_TOWER } from "@/lib/data/demo-tower";
import type { DealRoomStatusEnum } from "@/lib/constants/coverage-types";

function formatCurrency(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(n));
}

export default async function BrokerDealRoomDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const detail = await getDealRoomDetail(params.id);
  if (!detail) notFound();
  const { room, parties, activities } = detail;

  const ctx = await getCurrentProfile();
  const isOwningBroker = ctx?.role === "broker" && ctx?.user.id === room.broker_id;
  const status = room.status as DealRoomStatusEnum;
  const canInvite = isOwningBroker && (status === "draft" || status === "active");
  const canExport = isOwningBroker && (status === "bound" || status === "closed");
  const canClose = isOwningBroker && status === "bound";

  const [invitable, quotes] = await Promise.all([
    canInvite ? getInvitablePartyProfiles(room.id) : Promise.resolve([]),
    getQuotesForDealRoom(room.id),
  ]);

  const isTowerRoom = room.insured_name === DEMO_TOWER.insured;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-serif text-3xl text-navy break-words">{room.insured_name}</h1>
            <StatusBadge status={status} />
            {isTowerRoom && (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-sans font-medium uppercase tracking-wider bg-gold/20 text-warning border border-gold/40">
                Tower Placement
              </span>
            )}
          </div>
          <p className="font-mono text-xs text-ink/60 mt-1">DR-{room.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <Link
          href="/broker/quotes"
          className="text-sm font-sans text-ink/60 hover:text-ink underline-offset-4 hover:underline shrink-0"
        >
          ← All deal rooms
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="flex flex-col gap-6 min-w-0">
          {isTowerRoom && <TowerVisualization data={DEMO_TOWER} />}
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
                <Field
                  label="Created"
                  value={new Date(room.created_at).toISOString().slice(0, 19).replace("T", " ")}
                  mono
                />
                <Field
                  label="Last updated"
                  value={new Date(room.updated_at).toISOString().slice(0, 19).replace("T", " ")}
                  mono
                />
                {room.notes && (
                  <div className="col-span-2 flex flex-col gap-1">
                    <dt className="text-[11px] uppercase tracking-wider font-sans text-ink/50">Notes</dt>
                    <dd className="text-sm font-sans text-ink whitespace-pre-wrap">{room.notes}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Quotes</CardTitle>
            </CardHeader>
            <CardContent>
              <QuotesList
                dealRoomId={room.id}
                roomStatus={status}
                isOwningBroker={isOwningBroker}
                quotes={quotes}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Parties</CardTitle>
              {canInvite && (
                <InvitePartyModal dealRoomId={room.id} invitable={invitable} />
              )}
            </CardHeader>
            <CardContent>
              {parties.length === 0 ? (
                <p className="text-sm font-sans text-ink/60">
                  No parties invited yet.
                  {canInvite && " Click + Invite Party to add an MGA or insurer."}
                </p>
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

          {(canExport || canClose) && (
            <Card>
              <CardHeader>
                <CardTitle>Compliance</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                {canExport && (
                  <ExportComplianceButton
                    dealRoomId={room.id}
                    insuredName={room.insured_name}
                  />
                )}
                {canClose && <CloseDealModal dealRoomId={room.id} />}
                {status === "closed" && (
                  <p className="font-sans text-sm text-ink/60">
                    This deal room is closed. The export above remains available for the audit record.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
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
      <dd
        className={
          mono ? "text-sm font-mono text-ink truncate" : "text-sm font-sans text-ink truncate"
        }
      >
        {value}
      </dd>
    </div>
  );
}
