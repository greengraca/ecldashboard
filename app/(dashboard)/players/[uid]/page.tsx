"use client";

import { use } from "react";
import useSWR from "swr";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import PlayerDetailComponent from "@/components/players/player-detail";
import type { PlayerDetail } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function PlayerDetailPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = use(params);

  const { data, error, isLoading } = useSWR<{ data: PlayerDetail }>(
    `/api/players/${uid}`,
    fetcher
  );

  const player = data?.data;

  return (
    <div>
      {/* Back link */}
      <Link
        href="/players"
        className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors"
        style={{ color: "var(--text-secondary)" }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Players
      </Link>

      {/* Error state */}
      {error && (
        <div
          className="mb-6 p-4 rounded-xl border text-sm"
          style={{
            background: "var(--error-light)",
            borderColor: "var(--error-border)",
            color: "var(--error)",
          }}
        >
          Failed to load player data. Please try again.
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div
          className="rounded-xl border p-12 text-center"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border)",
          }}
        >
          <div
            className="inline-block w-6 h-6 border-2 rounded-full animate-spin"
            style={{
              borderColor: "var(--border)",
              borderTopColor: "var(--accent)",
            }}
          />
          <p
            className="text-sm mt-3"
            style={{ color: "var(--text-muted)" }}
          >
            Loading player data...
          </p>
        </div>
      )}

      {/* Not found */}
      {!isLoading && !error && !player && (
        <div
          className="rounded-xl border p-12 text-center"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border)",
          }}
        >
          <p
            className="text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            Player not found.
          </p>
        </div>
      )}

      {/* Player detail */}
      {player && <PlayerDetailComponent player={player} />}
    </div>
  );
}
