// Coverage / class enumerations exposed to forms.
// Used by lib/actions/deal-rooms.ts (zod) + ui-2 form selects.

export const CLASS_OF_BUSINESS = [
  "GL",
  "Property",
  "Cyber",
  "D&O",
  "E&O",
  "Casualty",
] as const;
export type ClassOfBusiness = (typeof CLASS_OF_BUSINESS)[number];

export const COVERAGE_TYPES = [
  "General Liability",
  "Property",
  "Cyber Liability",
  "Directors & Officers",
  "Errors & Omissions",
  "Casualty",
  "Umbrella",
  "Excess",
] as const;
export type CoverageType = (typeof COVERAGE_TYPES)[number];

export const DEAL_ROOM_STATUSES = ["draft", "active", "bound", "closed"] as const;
export type DealRoomStatusEnum = (typeof DEAL_ROOM_STATUSES)[number];

export const STATUS_LABELS: Record<DealRoomStatusEnum, string> = {
  draft: "Draft",
  active: "Active",
  bound: "Bound",
  closed: "Closed",
};
