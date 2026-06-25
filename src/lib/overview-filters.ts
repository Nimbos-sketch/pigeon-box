export type OverviewFilterId = "all" | "news" | "deals" | "newsletters" | "updates" | "finance";

export type OverviewFilter = {
  id: OverviewFilterId;
  label: string;
  description: string;
  keywords: RegExp;
  gmailQuery: string;
};

export const OVERVIEW_FILTERS: OverviewFilter[] = [
  {
    id: "all",
    label: "All highlights",
    description: "Mixed important updates from your inbox",
    keywords: /\b(news|update|alert|deal|sale|newsletter|invoice|order|shipping)\b/i,
    gmailQuery: "in:inbox newer_than:14d"
  },
  {
    id: "news",
    label: "News",
    description: "Headlines, alerts, and breaking updates",
    keywords: /\b(news|breaking|alert|report|headline|briefing|bulletin|today|daily)\b/i,
    gmailQuery: 'in:inbox newer_than:14d (news OR alert OR breaking OR headline OR report)'
  },
  {
    id: "deals",
    label: "Deals",
    description: "Sales, discounts, coupons, and promos",
    keywords: /\b(deal|sale|discount|coupon|promo|offer|% off|clearance|limited time|save)\b/i,
    gmailQuery: 'in:inbox newer_than:30d (deal OR sale OR discount OR coupon OR promo OR "save")'
  },
  {
    id: "newsletters",
    label: "Newsletters",
    description: "Digests and recurring subscriptions",
    keywords: /\b(newsletter|digest|weekly|roundup|edition|subscribe|subscription)\b/i,
    gmailQuery: 'in:inbox newer_than:30d (newsletter OR digest OR weekly OR roundup)'
  },
  {
    id: "updates",
    label: "Updates",
    description: "Orders, shipping, accounts, and notifications",
    keywords: /\b(update|shipped|delivery|tracking|order|account|security|password|verification)\b/i,
    gmailQuery: 'in:inbox newer_than:14d (update OR shipped OR delivery OR tracking OR order OR account)'
  },
  {
    id: "finance",
    label: "Finance",
    description: "Invoices, receipts, payments, and bills",
    keywords: /\b(invoice|receipt|payment|bill|statement|charged|refund|bank|transaction)\b/i,
    gmailQuery: 'in:inbox newer_than:30d (invoice OR receipt OR payment OR bill OR statement)'
  }
];

export function getOverviewFilter(id: string | null | undefined): OverviewFilter {
  return OVERVIEW_FILTERS.find((filter) => filter.id === id) ?? OVERVIEW_FILTERS[0];
}
