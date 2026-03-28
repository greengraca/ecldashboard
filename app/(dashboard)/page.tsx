import { getSubscriberSummary } from "@/lib/subscribers";
import { getMonthlySummary } from "@/lib/finance";
import { getCurrentMonth } from "@/lib/utils";
import HomeContent from "@/components/home/HomeContent";

export default async function HomePage() {
  const month = getCurrentMonth();

  // Fetch initial data in parallel on the server
  const [subscriberSummary, financeSummary] = await Promise.all([
    getSubscriberSummary(month).catch(() => null),
    getMonthlySummary(month).catch(() => null),
  ]);

  // Wrap in the shape the API routes return so SWR fallbackData matches
  const initialSubscribers = subscriberSummary
    ? { data: { summary: subscriberSummary } }
    : undefined;
  const initialFinance = financeSummary
    ? { data: financeSummary }
    : undefined;

  return (
    <HomeContent
      initialSubscribers={initialSubscribers}
      initialFinance={initialFinance}
      month={month}
    />
  );
}
