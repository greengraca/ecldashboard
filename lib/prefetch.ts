import { preload } from "swr";
import { fetcher } from "./fetcher";
import { getCurrentMonth } from "./utils";

/**
 * Map of sidebar routes → API endpoints to warm in SWR cache on hover.
 * Only includes the primary data calls that block page render.
 */
function getLast5Months(): string {
  const d = new Date();
  const months: string[] = [];
  for (let i = 4; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    months.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`);
  }
  return months.join(",");
}

function getRoutePrefetchKeys(month: string): Record<string, string[]> {
  const isCurrentMonth = month === getCurrentMonth();

  return {
    "/": [
      "/api/activity?limit=5",
      "/api/finance/pending-reimbursements",
      `/api/calendar/events?month=${month}`,
      `/api/finance/summary?months=${getLast5Months()}`,
      "/api/taskpad",
      "/api/taskpad/status",
      "/api/user-mapping",
    ],
    "/subscribers": [
      `/api/subscribers?month=${month}`,
      `/api/subscribers/manual-payments?month=${month}`,
      "/api/players/identities?map=true",
    ],
    "/league": isCurrentMonth
      ? ["/api/players/standings/live"]
      : [
          `/api/players?month=${month}`,
          `/api/players/brackets?month=${month}`,
        ],
    "/finance": [
      `/api/finance/transactions?month=${month}`,
      `/api/finance/summary?month=${month}`,
      "/api/finance/fixed-costs",
      `/api/finance/group-summary?month=${month}`,
    ],
    "/prizes": [
      `/api/prizes?month=${month}`,
      `/api/prizes/summary?month=${month}`,
      `/api/prizes/budget?month=${month}`,
    ],
    "/activity": ["/api/activity?page=1&limit=10"],
    "/meetings": ["/api/meetings", "/api/user-mapping"],
  };
}

const prefetched = new Set<string>();

export function prefetchRouteData(href: string) {
  const month = getCurrentMonth();
  const map = getRoutePrefetchKeys(month);
  const keys = map[href];
  if (!keys) return;

  for (const key of keys) {
    if (prefetched.has(key)) continue;
    prefetched.add(key);
    preload(key, fetcher);
    // Allow re-prefetch after 60s (matches SWR dedupingInterval)
    setTimeout(() => prefetched.delete(key), 60_000);
  }
}
