import { getPlayerDetail } from "@/lib/players";
import PlayerDetailPage from "@/components/players/PlayerDetailPage";

export default async function PlayerDetailRoute({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;

  const playerData = await getPlayerDetail(uid).catch(() => null);
  const initialData = playerData ? { data: playerData } : undefined;

  return <PlayerDetailPage uid={uid} initialData={initialData} />;
}
