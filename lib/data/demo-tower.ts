export type TowerLayer = {
  id: number;
  name: string;
  from: number;
  to: number;
  carrier: string | null;
  premium: number | null;
  status: "bound" | "firm" | "quoted" | "open";
  bound_at?: string;
};

export const DEMO_TOWER = {
  insured: "Project Sunrise Industrial Park",
  class_of_business: "Property",
  location: "Calgary, AB",
  coverage_type: "Property + Business Interruption",
  total_limit: 50_000_000,
  layers: [
    { id: 5, name: "Excess Layer 4 (Top)", from: 45_000_000, to: 50_000_000, carrier: null,                premium: null,    status: "open"   },
    { id: 4, name: "Excess Layer 3",       from: 35_000_000, to: 45_000_000, carrier: "Allianz Canada",   premium: 95_000,  status: "quoted" },
    { id: 3, name: "Excess Layer 2",       from: 20_000_000, to: 35_000_000, carrier: "Markel Canada",    premium: 175_000, status: "firm"   },
    { id: 2, name: "Excess Layer 1",       from: 10_000_000, to: 20_000_000, carrier: "Liberty Mutual",   premium: 145_000, status: "bound", bound_at: "2026-05-04T14:22:00Z" },
    { id: 1, name: "Primary",              from: 0,          to: 10_000_000, carrier: "AIG Insurance",    premium: 285_000, status: "bound", bound_at: "2026-05-02T10:08:00Z" },
  ] as TowerLayer[],
  activity: [
    { ts: "2026-05-02T10:08:00Z", event: "Layer 1 Primary bound — AIG Insurance @ $285k" },
    { ts: "2026-05-04T14:22:00Z", event: "Layer 2 Excess bound — Liberty Mutual @ $145k" },
    { ts: "2026-05-06T11:40:00Z", event: "Layer 3 Excess firmed — Markel Canada @ $175k" },
    { ts: "2026-05-07T16:05:00Z", event: "Layer 4 Excess quoted — Allianz Canada @ $95k (subject to firm)" },
    { ts: "2026-05-08T09:30:00Z", event: "Layer 5 Top Layer remains open — 3 wholesalers in discussion" },
  ],
};
