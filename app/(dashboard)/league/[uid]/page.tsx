"use client";

import { use } from "react";
import useSWR from "swr";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import PlayerDetailComponent from "@/components/players/player-detail";
import type { PlayerDetail } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";

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
        href="/league"
        className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors"
        style={{ color: "var(--text-secondary)" }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to League
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

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-8 animate-pulse">
          {/* Header skeleton */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full skeleton" />
            <div className="space-y-2">
              <div className="h-6 w-40 rounded skeleton" />
              <div className="h-3 w-56 rounded skeleton" />
              <div className="h-4 w-24 rounded skeleton" />
            </div>
          </div>

          {/* Achievements skeleton */}
          <div>
            <div className="h-3 w-28 rounded skeleton mb-3" />
            <div className="flex flex-wrap gap-2">
              <div className="h-8 w-36 rounded-lg skeleton" />
              <div className="h-8 w-32 rounded-lg skeleton" />
              <div className="h-8 w-34 rounded-lg skeleton" />
            </div>
          </div>

          {/* Prizes placeholder skeleton */}
          <div className="h-24 rounded-xl skeleton" />

          {/* Stats skeleton */}
          <div>
            <div className="h-3 w-28 rounded skeleton mb-3" />
            <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl skeleton" />
              ))}
            </div>
          </div>

          {/* Progression skeleton */}
          <div>
            <div className="h-3 w-36 rounded skeleton mb-3" />
            <div className="h-44 rounded-xl skeleton" />
          </div>

          {/* History table skeleton */}
          <div>
            <div className="h-3 w-32 rounded skeleton mb-3" />
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid var(--border)" }}
            >
              <div className="h-10 skeleton" style={{ borderRadius: 0 }} />
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 skeleton"
                  style={{
                    borderRadius: 0,
                    borderTop: "1px solid var(--border-subtle)",
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Not found */}
      {!isLoading && !error && !player && (
        <div
          className="rounded-xl p-12 text-center"
          style={{
            background: "var(--surface-gradient)",
            backdropFilter: "var(--surface-blur)",
            border: "1.5px solid rgba(255, 255, 255, 0.10)",
            boxShadow: "var(--surface-shadow)",
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
