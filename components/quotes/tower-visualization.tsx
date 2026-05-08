import { Card, CardContent } from "@/components/ui/card";
import type { TowerLayer } from "@/lib/data/demo-tower";
import { cn } from "@/lib/utils";

type TowerData = {
  insured: string;
  class_of_business: string;
  location: string;
  coverage_type: string;
  total_limit: number;
  layers: TowerLayer[];
};

function fmtMillion(n: number): string {
  return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}
function fmtPremiumK(n: number | null): string {
  if (n === null) return "—";
  return `$${(n / 1000).toFixed(0)}k`;
}

const STATUS_BAR: Record<TowerLayer["status"], string> = {
  bound: "bg-success text-white",
  firm: "bg-navy text-white",
  quoted: "bg-gold text-ink",
  open: "text-ink/70",
};

const STATUS_PILL: Record<TowerLayer["status"], string> = {
  bound: "bg-success/15 text-success border border-success/30",
  firm: "bg-navy/10 text-navy border border-navy/30",
  quoted: "bg-gold/20 text-warning border border-gold/40",
  open: "bg-silver/40 text-ink border border-silver",
};

const OPEN_STRIPE_BG: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(45deg, transparent, transparent 6px, #DDE4E9 6px, #DDE4E9 8px)",
};

export function TowerVisualization({ data }: { data: TowerData }) {
  const total = data.total_limit;
  const completed = data.layers.filter((l) => l.status !== "open").length;
  const pct = Math.round((completed / data.layers.length) * 100);
  const totalCompletedPremium = data.layers
    .filter((l) => l.premium !== null && l.status !== "open")
    .reduce((acc, l) => acc + (l.premium ?? 0), 0);
  const openCount = data.layers.filter((l) => l.status === "open").length;

  // Pie geometry
  const r = 28;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;

  return (
    <Card className="p-6">
      <CardContent className="p-0 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <div className="font-mono text-[11px] uppercase tracking-wider text-gold">
              TOWER PLACEMENT
            </div>
            <h2 className="font-serif text-2xl text-navy mt-1">{data.insured}</h2>
            <p className="font-sans text-sm text-ink/60 mt-1">
              {data.class_of_business} · {data.location} · {fmtMillion(data.total_limit)} total · {data.layers.length} layers
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden>
              <circle cx="36" cy="36" r={r} fill="none" stroke="#DDE4E9" strokeWidth="6" />
              <circle
                cx="36"
                cy="36"
                r={r}
                fill="none"
                stroke="#C49A2C"
                strokeWidth="6"
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={c / 4}
                strokeLinecap="round"
                transform="rotate(-90 36 36)"
              />
              <text
                x="36"
                y="40"
                textAnchor="middle"
                className="fill-navy"
                fontFamily="ui-sans-serif"
                fontSize="14"
                fontWeight="600"
              >
                {pct}%
              </text>
            </svg>
            <div className="text-right">
              <div className="font-sans text-xs text-ink/60">Tower complete</div>
              <div className="font-mono text-sm text-navy">{completed} / {data.layers.length} layers</div>
            </div>
          </div>
        </div>

        <div className="border-t border-silver" />

        <div className="flex flex-col gap-2">
          {data.layers.map((layer) => {
            const fromPct = (layer.from / total) * 100;
            const widthPct = ((layer.to - layer.from) / total) * 100;
            return (
              <div key={layer.id} className="flex items-center gap-4 py-1 min-h-[64px]">
                <div className="w-[140px] shrink-0">
                  <div className="font-serif text-base text-navy leading-tight">{layer.name}</div>
                  <div className="font-mono text-[11px] text-ink/60 mt-0.5">
                    {fmtMillion(layer.from)} – {fmtMillion(layer.to)}
                  </div>
                </div>

                <div className="flex-1 relative h-9 rounded-md bg-silver/20 overflow-hidden">
                  <div
                    className={cn(
                      "absolute top-0 bottom-0 border-l-2 border-navy/70 flex items-center justify-center text-[10px] font-sans font-semibold uppercase tracking-wider",
                      STATUS_BAR[layer.status],
                    )}
                    style={{
                      left: `${fromPct}%`,
                      width: `${widthPct}%`,
                      ...(layer.status === "open" ? OPEN_STRIPE_BG : {}),
                    }}
                  >
                    {layer.status === "bound" ? "✓ BOUND" : layer.status.toUpperCase()}
                  </div>
                </div>

                <div className="w-[220px] shrink-0 flex flex-col items-end gap-1">
                  <div className="font-sans text-sm font-semibold text-ink truncate max-w-full">
                    {layer.carrier ?? <span className="text-ink/40">No carrier yet</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-navy">{fmtPremiumK(layer.premium)}</span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-sans font-medium uppercase tracking-wider",
                        STATUS_PILL[layer.status],
                      )}
                    >
                      {layer.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-silver" />

        <div className="font-mono text-[11px] uppercase tracking-wide text-ink/70">
          {data.layers.length} LAYERS · {pct}% COMPLETE · ${(totalCompletedPremium / 1000).toFixed(0)}K BOUND/FIRM/QUOTED PREMIUM · {openCount} LAYER{openCount === 1 ? "" : "S"} OPEN
        </div>
      </CardContent>
    </Card>
  );
}
