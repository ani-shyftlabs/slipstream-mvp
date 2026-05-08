import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DIRECTORY } from "@/lib/data/markets-directory";
import { cn } from "@/lib/utils";

const APPETITE_TONE: Record<string, string> = {
  Aggressive: "text-success",
  Moderate: "text-navy",
  Selective: "text-gold",
};

function fmtPremium(n: number): string {
  return `$${(n / 1000).toFixed(0)}k`;
}
function fmtLimit(n: number): string {
  return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

export default function DirectoryPage() {
  const insurers = DIRECTORY.filter((d) => d.type === "Insurer").length;
  const mgas = DIRECTORY.filter((d) => d.type === "MGA").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-3xl text-navy">Markets Directory</h1>
        <p className="font-sans text-sm text-ink/70 mt-1">
          {DIRECTORY.length} specialty markets across Canada · {insurers} Insurers · {mgas} MGAs
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="rounded-full bg-navy text-white px-3 py-1 text-xs font-sans">All</span>
        <span className="rounded-full bg-white border border-silver text-ink/70 px-3 py-1 text-xs font-sans">Insurers</span>
        <span className="rounded-full bg-white border border-silver text-ink/70 px-3 py-1 text-xs font-sans">MGAs</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{DIRECTORY.length} markets</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm font-sans">
            <thead className="sticky top-0 bg-white border-b border-silver">
              <tr className="text-[11px] uppercase tracking-wider text-ink/60">
                <th className="text-left py-2 px-4">Name</th>
                <th className="text-left py-2 px-4">Type</th>
                <th className="text-left py-2 px-4">Location</th>
                <th className="text-left py-2 px-4">Lines</th>
                <th className="text-right py-2 px-4">Premium Floor</th>
                <th className="text-right py-2 px-4">Max Limit</th>
                <th className="text-left py-2 px-4">Appetite</th>
              </tr>
            </thead>
            <tbody>
              {DIRECTORY.map((d) => (
                <tr key={d.id} className="border-b border-silver/60 last:border-0 hover:bg-silver/20">
                  <td className="py-2.5 px-4 font-serif font-semibold text-navy whitespace-nowrap">{d.name}</td>
                  <td className="py-2.5 px-4">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-sans font-medium uppercase tracking-wider text-white",
                        d.type === "Insurer" ? "bg-navy" : "bg-gold",
                      )}
                    >
                      {d.type}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-mono text-xs text-ink/70 whitespace-nowrap">{d.location}</td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-1 flex-wrap">
                      {d.primary_lines.slice(0, 2).map((l) => (
                        <span
                          key={l}
                          className="rounded-full bg-silver/60 px-2 py-0.5 text-[10px] font-sans text-ink whitespace-nowrap"
                        >
                          {l}
                        </span>
                      ))}
                      {d.primary_lines.length > 2 && (
                        <span className="text-[10px] font-sans text-ink/60">
                          +{d.primary_lines.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono">{fmtPremium(d.min_premium)}</td>
                  <td className="py-2.5 px-4 text-right font-mono">{fmtLimit(d.max_limit)}</td>
                  <td className={cn("py-2.5 px-4 text-xs font-sans font-medium", APPETITE_TONE[d.appetite])}>
                    {d.appetite}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
