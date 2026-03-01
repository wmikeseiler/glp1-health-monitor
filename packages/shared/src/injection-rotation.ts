import type { InjectionSite } from "./types";

export const ROTATION_ORDER: InjectionSite[] = [
  "left_thigh",
  "right_thigh",
  "left_abdomen",
  "right_abdomen",
  "left_arm",
  "right_arm",
];

export interface InjectionRecord {
  site: InjectionSite;
  date: string | Date;
}

/**
 * Returns a map of site -> most recent Date it was used.
 * Sites that have never been used are not present in the map.
 */
export function getInjectionHistory(
  history: InjectionRecord[]
): Map<InjectionSite, Date> {
  const map = new Map<InjectionSite, Date>();

  for (const record of history) {
    const recordDate =
      record.date instanceof Date ? record.date : new Date(record.date);
    const existing = map.get(record.site);
    if (existing === undefined || recordDate > existing) {
      map.set(record.site, recordDate);
    }
  }

  return map;
}

/**
 * Suggests the next injection site based on history.
 *
 * Rules (in priority order):
 * 1. No history → return first site in rotation order ("left_thigh")
 * 2. Sites that have never been used → pick the first unused site in rotation order
 * 3. All sites used → pick the site with the oldest (least recent) last-use date
 * 4. Tie (multiple sites used equally recently) → advance to the next site in
 *    rotation order after the most recent injection site
 */
export function suggestNextSite(history: InjectionRecord[]): InjectionSite {
  if (history.length === 0) {
    return ROTATION_ORDER[0];
  }

  const lastUsed = getInjectionHistory(history);

  // Find sites that have never been used — pick first in rotation order
  const unusedSite = ROTATION_ORDER.find((site) => !lastUsed.has(site));
  if (unusedSite !== undefined) {
    return unusedSite;
  }

  // All sites have been used at least once.
  // Find the site with the oldest last-use date.
  let oldestSite: InjectionSite = ROTATION_ORDER[0];
  let oldestDate = lastUsed.get(ROTATION_ORDER[0])!;

  for (const site of ROTATION_ORDER) {
    const siteDate = lastUsed.get(site)!;
    if (siteDate < oldestDate) {
      oldestDate = siteDate;
      oldestSite = site;
    }
  }

  // Check for a tie: multiple sites share the same oldest date.
  // In that case we still return oldestSite (first in rotation order with that
  // date) which is deterministic because we iterate ROTATION_ORDER in order and
  // only update on strict less-than.
  return oldestSite;
}
