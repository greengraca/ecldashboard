import { NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { getSubscriptionIncome } from "@/lib/subscription-income";
import { getPrizeBudget } from "@/lib/prizes";
import { getCurrentMonth, getPreviousMonth } from "@/lib/utils";
import { searchCardsByPriceRange, scryfallDelay } from "@/lib/scryfall-server";
import type { PrizeBudgetAllocations } from "@/lib/types";

const SLOT_DEFS = [
  { key: "placement_1st", label: "1st Place", pct: 0.30 },
  { key: "placement_2nd", label: "2nd Place", pct: 0.22 },
  { key: "placement_3rd", label: "3rd Place", pct: 0.18 },
  { key: "placement_4th", label: "4th Place", pct: 0.15 },
  { key: "most_games", label: "Most Games", pct: 0.15 },
] as const;

export const GET = withAuthRead(async (request) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || getCurrentMonth();
  const prevMonth = getPreviousMonth(month);

  const [income, savedBudget] = await Promise.all([
    getSubscriptionIncome(prevMonth),
    getPrizeBudget(month),
  ]);

  const prizeBudget = Math.round(income.total * 0.5 * 100) / 100;

  // Build slots with amounts from saved budget or default percentages
  const slots = [];
  for (let i = 0; i < SLOT_DEFS.length; i++) {
    const def = SLOT_DEFS[i];
    const savedAmount = savedBudget?.allocations?.[def.key as keyof PrizeBudgetAllocations] ?? null;
    const defaultAmount = Math.round(prizeBudget * def.pct * 100) / 100;
    const target = savedAmount != null && savedAmount > 0 ? savedAmount : defaultAmount;

    const minEur = Math.max(1, Math.round(target * 0.85 * 100) / 100);
    const maxEur = Math.round(target * 1.15 * 100) / 100;

    // Rate-limit Scryfall calls
    if (i > 0) await scryfallDelay();

    const result = await searchCardsByPriceRange(minEur, maxEur);

    slots.push({
      key: def.key,
      label: def.label,
      default_amount: defaultAmount,
      saved_amount: savedAmount,
      min_eur: minEur,
      max_eur: maxEur,
      suggestions: result.cards,
      total_results: result.total,
    });
  }

  return NextResponse.json({
    data: {
      month,
      prev_month: prevMonth,
      subscription_income: income.total,
      prize_budget: prizeBudget,
      saved_allocations: savedBudget?.allocations ?? null,
      slots,
    },
  });
}, "prizes/planner:GET");
