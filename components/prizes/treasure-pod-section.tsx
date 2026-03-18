"use client";

import { useState } from "react";
import useSWR from "swr";
import { ChevronDown, ChevronUp, Gem, X } from "lucide-react";
import type { TreasurePodData, TreasurePodWithClaim } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface TreasurePodSectionProps {
  month: string;
}

export default function TreasurePodSection({ month }: TreasurePodSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading, mutate } = useSWR<{ data: TreasurePodData }>(
    `/api/prizes/treasure-pods?month=${month}`,
    fetcher
  );

  const podData = data?.data;
  const stats = podData?.stats || [];
  const pods = podData?.pods || [];

  const totalWon = stats.reduce((s, t) => s + t.won, 0);
  const totalClaimed = stats.reduce((s, t) => s + t.claimed, 0);
  const hasPods = pods.length > 0 || (podData?.schedule != null);

  if (!hasPods && !isLoading) return null;

  return (
    <div
      className="rounded-xl mb-8 overflow-hidden"
      style={{
        background: "var(--surface-gradient)",
        backdropFilter: "var(--surface-blur)",
        border: "1.5px solid rgba(255, 255, 255, 0.10)",
        boxShadow: "var(--surface-shadow)",
      }}
    >
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:brightness-110"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(168, 85, 247, 0.15)" }}
          >
            <Gem className="w-4 h-4" style={{ color: "#a855f7" }} />
          </div>
          <div className="text-left">
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Treasure Pods
            </span>
            {!isLoading && hasPods && (
              <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
                {totalWon} won · {totalClaimed} claimed
              </span>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
        ) : (
          <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {isLoading ? (
            <div className="text-center py-6">
              <div
                className="inline-block w-5 h-5 border-2 rounded-full animate-spin"
                style={{ borderColor: "var(--border)", borderTopColor: "#a855f7" }}
              />
            </div>
          ) : (
            <>
              {/* Per-type stat cards */}
              {stats.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {stats.map((stat) => (
                    <div
                      key={stat.type}
                      className="rounded-lg p-3"
                      style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                      }}
                    >
                      <div className="text-xs font-medium mb-2 truncate" style={{ color: "var(--text-secondary)" }}>
                        {stat.title}
                      </div>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                          {stat.triggered}
                          <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>
                            /{stat.total}
                          </span>
                        </span>
                        {stat.won > 0 && (
                          <span className="text-xs" style={{ color: "#22c55e" }}>
                            {stat.won} won
                          </span>
                        )}
                        {stat.claimed > 0 && (
                          <span className="text-xs" style={{ color: "var(--accent)" }}>
                            {stat.claimed} claimed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pod list — only triggered pods */}
              {pods.length > 0 ? (
                <div className="space-y-2">
                  {pods.map((pod) => (
                    <PodCard key={String(pod._id)} pod={pod} month={month} onMutate={mutate} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-xs" style={{ color: "var(--text-muted)" }}>
                  No pods triggered yet this month
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Pod Card ───

function PodCard({
  pod,
  month,
  onMutate,
}: {
  pod: TreasurePodWithClaim;
  month: string;
  onMutate: () => void;
}) {
  const [claiming, setClaiming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [friendDiscordId, setFriendDiscordId] = useState("");
  const [friendName, setFriendName] = useState("");
  const [notes, setNotes] = useState("");

  const isBringAFriend = pod.pod_type === "bring_a_friend";
  const isClaimed = !!pod.claim;

  async function handleClaim() {
    if (isBringAFriend && !claiming) {
      setClaiming(true);
      return;
    }

    setLoading(true);
    try {
      await fetch(`/api/prizes/treasure-pods/${pod._id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pod_type: pod.pod_type,
          month,
          friend_discord_id: friendDiscordId || null,
          friend_name: friendName || null,
          notes: notes || null,
        }),
      });
      setClaiming(false);
      onMutate();
    } finally {
      setLoading(false);
    }
  }

  async function handleUnclaim() {
    setLoading(true);
    try {
      await fetch(`/api/prizes/treasure-pods/${pod._id}/claim`, { method: "DELETE" });
      onMutate();
    } finally {
      setLoading(false);
    }
  }

  const statusColor =
    pod.status === "won" ? "#22c55e" :
    pod.status === "draw" ? "var(--text-muted)" :
    "#f59e0b";

  const statusBg =
    pod.status === "won" ? "rgba(34, 197, 94, 0.15)" :
    pod.status === "draw" ? "rgba(255, 255, 255, 0.05)" :
    "rgba(245, 158, 11, 0.15)";

  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      <div className="flex items-center gap-3">
        {/* Status badge */}
        <span
          className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0"
          style={{ background: statusBg, color: statusColor }}
        >
          {pod.status}
        </span>

        {/* Pod info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {pod.pod_title}
            <span className="text-xs ml-2 font-normal" style={{ color: "var(--text-muted)" }}>
              Table {pod.table}
            </span>
          </div>
          {pod.winner_discord_handle && (
            <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              Winner: {pod.winner_discord_handle}
            </div>
          )}
        </div>

        {/* Claim actions */}
        <div className="flex items-center gap-2 shrink-0">
          {isClaimed && (
            <>
              <span
                className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase"
                style={{ background: "rgba(var(--accent-rgb, 212 175 55), 0.15)", color: "var(--accent)" }}
              >
                Claimed
              </span>
              <button
                onClick={handleUnclaim}
                disabled={loading}
                className="p-1 rounded transition-colors hover:brightness-125"
                style={{ color: "var(--text-muted)" }}
                title="Remove claim"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {!isClaimed && pod.status === "won" && !claiming && (
            <button
              onClick={handleClaim}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: "rgba(168, 85, 247, 0.15)", color: "#a855f7" }}
            >
              Mark Claimed
            </button>
          )}
        </div>
      </div>

      {/* Bring a friend inline form */}
      {claiming && isBringAFriend && (
        <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Friend's Discord ID"
              value={friendDiscordId}
              onChange={(e) => setFriendDiscordId(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs outline-none"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.10)",
                color: "var(--text-primary)",
              }}
            />
            <input
              type="text"
              placeholder="Friend's name"
              value={friendName}
              onChange={(e) => setFriendName(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs outline-none"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.10)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <input
            type="text"
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg text-xs outline-none"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.10)",
              color: "var(--text-primary)",
            }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleClaim}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: "rgba(168, 85, 247, 0.15)", color: "#a855f7" }}
            >
              {loading ? "Saving..." : "Confirm Claim"}
            </button>
            <button
              onClick={() => setClaiming(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Show friend info on claimed bring_a_friend */}
      {isClaimed && isBringAFriend && pod.claim?.friend_name && (
        <div className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
          Friend: {pod.claim.friend_name}
          {pod.claim.friend_discord_id && ` (${pod.claim.friend_discord_id})`}
        </div>
      )}

      {/* Show notes if present */}
      {isClaimed && pod.claim?.notes && (
        <div className="mt-1 text-xs italic" style={{ color: "var(--text-muted)" }}>
          {pod.claim.notes}
        </div>
      )}
    </div>
  );
}
