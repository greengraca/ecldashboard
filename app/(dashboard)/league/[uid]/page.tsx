import PlayerDetailPage from "@/components/players/PlayerDetailPage";

export default async function PlayerDetailRoute({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;
  return <PlayerDetailPage uid={uid} />;
}
