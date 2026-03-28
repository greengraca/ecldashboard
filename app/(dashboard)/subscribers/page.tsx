import { getSubscribers, getSubscriberSummary } from "@/lib/subscribers";
import { getCurrentMonth } from "@/lib/utils";
import SubscribersContent from "@/components/subscribers/SubscribersContent";

export default async function SubscribersPage() {
  const month = getCurrentMonth();

  const [subscribers, summary] = await Promise.all([
    getSubscribers(month).catch(() => []),
    getSubscriberSummary(month).catch(() => null),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initialData = summary
    ? { data: { subscribers, summary, month } as any }
    : undefined;

  return <SubscribersContent initialData={initialData} defaultMonth={month} />;
}
