import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TowerVisualization } from "@/components/quotes/tower-visualization";
import { DEMO_TOWER } from "@/lib/data/demo-tower";
import { relativeTime } from "@/lib/utils/relative-time";
import { cn } from "@/lib/utils";

const STATUS_PILL: Record<string, string> = {
  bound: "bg-success/15 text-success border border-success/30",
  firm: "bg-navy/10 text-navy border border-navy/30",
  quoted: "bg-gold/20 text-warning border border-gold/40",
  open: "bg-silver/40 text-ink border border-silver",
};

function fmtMillion(n: number): string {
  return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

export default function TowerDemoPage() {
  const total = DEMO_TOWER.total_limit;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-3xl text-navy">Tower Placement</h1>
        <p className="font-sans text-sm text-ink/70 mt-1">{DEMO_TOWER.insured}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="flex flex-col gap-6 min-w-0">
          <TowerVisualization data={DEMO_TOWER} />

          <Card>
            <CardHeader>
              <CardTitle>Layer detail</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm font-sans">
                <thead>
                  <tr className="border-b border-silver text-[11px] uppercase tracking-wider text-ink/60">
                    <th className="text-left py-2 px-4">Layer</th>
                    <th className="text-left py-2 px-4">Carrier</th>
                    <th className="text-right py-2 px-4">Range</th>
                    <th className="text-right py-2 px-4">Premium</th>
                    <th className="text-right py-2 px-4">% of Tower</th>
                    <th className="text-left py-2 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_TOWER.layers.map((layer) => {
                    const widthPct = (((layer.to - layer.from) / total) * 100).toFixed(0);
                    return (
                      <tr key={layer.id} className="border-b border-silver/60 last:border-0 hover:bg-silver/20">
                        <td className="py-2 px-4 font-serif text-navy">{layer.name}</td>
                        <td className="py-2 px-4">{layer.carrier ?? <span className="text-ink/40">—</span>}</td>
                        <td className="py-2 px-4 text-right font-mono">{fmtMillion(layer.from)}–{fmtMillion(layer.to)}</td>
                        <td className="py-2 px-4 text-right font-mono">
                          {layer.premium === null ? "—" : `$${(layer.premium / 1000).toFixed(0)}k`}
                        </td>
                        <td className="py-2 px-4 text-right font-mono">{widthPct}%</td>
                        <td className="py-2 px-4">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-sans font-medium uppercase tracking-wider",
                              STATUS_PILL[layer.status],
                            )}
                          >
                            {layer.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        <aside>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-3">
                {[...DEMO_TOWER.activity].reverse().map((a) => (
                  <li key={a.ts} className="flex items-start gap-3">
                    <span className="mt-1.5 inline-block h-2 w-2 rounded-full bg-navy shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <p className="text-sm font-sans text-ink">{a.event}</p>
                      <p className="text-[11px] font-mono text-ink/60">{relativeTime(a.ts)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
