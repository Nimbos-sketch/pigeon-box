import type { OverviewFilterId } from "@/lib/overview-filters";
import { OVERVIEW_FILTERS } from "@/lib/overview-filters";

const STORAGE_KEY = "pigeon-box:overview-filters";

export const DEFAULT_ENABLED_OVERVIEW_FILTERS: OverviewFilterId[] = OVERVIEW_FILTERS.map((filter) => filter.id);

export function loadEnabledOverviewFilters(): OverviewFilterId[] {
  if (typeof window === "undefined") {
    return DEFAULT_ENABLED_OVERVIEW_FILTERS;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_ENABLED_OVERVIEW_FILTERS;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return DEFAULT_ENABLED_OVERVIEW_FILTERS;
    }
    const valid = new Set(DEFAULT_ENABLED_OVERVIEW_FILTERS);
    const enabled = parsed.filter((id): id is OverviewFilterId => typeof id === "string" && valid.has(id as OverviewFilterId));
    return enabled.length > 0 ? enabled : DEFAULT_ENABLED_OVERVIEW_FILTERS;
  } catch {
    return DEFAULT_ENABLED_OVERVIEW_FILTERS;
  }
}

export function saveEnabledOverviewFilters(ids: OverviewFilterId[]) {
  if (typeof window === "undefined" || ids.length === 0) {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function toggleOverviewFilter(
  enabled: OverviewFilterId[],
  filterId: OverviewFilterId
): OverviewFilterId[] {
  if (enabled.includes(filterId)) {
    if (enabled.length === 1) {
      return enabled;
    }
    return enabled.filter((id) => id !== filterId);
  }
  return [...enabled, filterId];
}
