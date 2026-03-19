"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import useSWR from "swr";
import { ChevronDown, ChevronUp, Gem, X } from "lucide-react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Cell,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { TreasurePodData, TreasurePodWithClaim } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface TreasurePodSectionProps {
  month: string;
}

export default function TreasurePodSection({ month }: TreasurePodSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [hoveredPodId, setHoveredPodId] = useState<string | null>(null);

  const { data, isLoading, mutate } = useSWR<{ data: TreasurePodData }>(
    `/api/prizes/treasure-pods?month=${month}`,
    fetcher
  );

  const podData = data?.data;
  const stats = podData?.stats || [];
  const pods = podData?.pods || [];

  const totalWon = stats.reduce((s, t) => s + t.won, 0);
  const totalClaimed = stats.reduce((s, t) => s + t.claimed, 0);
  const hasData = pods.length > 0 || (podData?.schedule != null);

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
            style={{ background: "rgba(251, 191, 36, 0.15)" }}
          >
            <Gem className="w-4 h-4" style={{ color: "var(--accent)" }} />
          </div>
          <div className="text-left">
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Treasure Pods
            </span>
            {!isLoading && hasData && (
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
        <div className="px-5 pb-5 space-y-4 pod-section-enter">
          <style>{`
            @keyframes podFadeSlideIn {
              from { opacity: 0; transform: translateY(-8px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .pod-section-enter > * {
              animation: podFadeSlideIn 0.3s ease-out both;
            }
            .pod-section-enter > *:nth-child(2) { animation-delay: 0.05s; }
            .pod-section-enter > *:nth-child(3) { animation-delay: 0.1s; }
          `}</style>
          {isLoading ? (
            <div className="text-center py-6">
              <div
                className="inline-block w-5 h-5 border-2 rounded-full animate-spin"
                style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }}
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

              {/* Timeline graph */}
              {pods.length > 0 && (
                <TreasurePodTimeline pods={pods} month={month} schedule={podData?.schedule ?? null} onHoverPod={setHoveredPodId} />
              )}

              {/* Pod list — only triggered pods */}
              {pods.length > 0 ? (
                <div className="space-y-2">
                  {pods.map((pod) => (
                    <PodCard key={String(pod._id)} pod={pod} month={month} onMutate={mutate} highlighted={String(pod._id) === hoveredPodId} />
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

// ─── Timeline ───

const STATUS_COLORS: Record<string, string> = {
  won: "#22c55e",
  pending: "#9a7dd4",
  draw: "rgba(255, 255, 255, 0.35)",
};

const CARD_PRIZE_COLOR = "#34d399"; // emerald — distinct from won green

function cleanPodTitle(title: string): string {
  return title.replace(/\s*Treasure Pod!?/i, "").trim();
}

interface TimelinePoint {
  ts: number;
  y: number;
  fill: string;
  opacity: number;
  label: string;
  tooltipDate: string;
  podId: string;
}

interface ProbabilityZone {
  x1: number;
  x2: number;
  opacity: number;
  probability: number; // 0-100%
  tableRange: string;
  label: string;
}

function TreasurePodTimeline({
  pods,
  month,
  schedule,
  onHoverPod,
}: {
  pods: TreasurePodWithClaim[];
  month: string;
  schedule: TreasurePodData["schedule"];
  onHoverPod: (podId: string | null) => void;
}) {
  const lastHoveredRef = useRef<string | null>(null);

  const { triggeredPoints, probabilityZones, domainStart, domainEnd, remainingCount } = useMemo(() => {
    const [year, mon] = month.split("-").map(Number);
    const dim = new Date(year, mon, 0).getDate();
    // League ends on penultimate day of the month
    const leagueEndDay = dim - 1;
    const start = new Date(year, mon - 1, 1).getTime();
    const end = new Date(year, mon - 1, leagueEndDay, 23, 59, 59).getTime();
    const now = new Date();
    const nowMs = now.getTime();
    const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === mon;

    // Triggered pods — use precise timestamp for X
    const triggered: TimelinePoint[] = pods.map((pod) => {
      const d = new Date(pod.triggered_at);
      // Card prize gets a distinct green; others use status color
      const dotColor = pod.pod_type === "card_prize"
        ? (pod.status === "draw" ? STATUS_COLORS.draw : CARD_PRIZE_COLOR)
        : (STATUS_COLORS[pod.status] || STATUS_COLORS.pending);
      return {
        ts: d.getTime(),
        y: 1,
        fill: dotColor,
        opacity: 1,
        label: `${cleanPodTitle(pod.pod_title)} — Table ${pod.table}`,
        tooltipDate: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        podId: String(pod._id),
      };
    });

    const zones: ProbabilityZone[] = [];

    if (!schedule || !isCurrentMonth) {
      return { triggeredPoints: triggered, probabilityZones: zones, domainStart: start, domainEnd: end, remainingCount: 0 };
    }

    const totalExpected = schedule.pod_types_config.reduce((sum, c) => sum + c.count, 0);
    // Draws are re-rolled — they don't consume a slot
    const usedSlots = pods.filter((p) => p.status !== "draw").length;
    const remaining = Math.max(0, totalExpected - usedSlots);

    if (remaining === 0) {
      return { triggeredPoints: triggered, probabilityZones: zones, domainStart: start, domainEnd: end, remainingCount: 0 };
    }

    // ─── Table velocity ───
    // Use fired_tables to get the highest table reached
    const maxTable = schedule.fired_tables.length > 0
      ? Math.max(...schedule.fired_tables)
      : Math.max(...pods.map((p) => p.table), 0);

    // Tables per ms: from month start to now, how fast are tables being played
    const elapsedMs = nowMs - start;
    const tablesPerMs = elapsedMs > 0 ? maxTable / elapsedMs : 0;

    // Days until league close
    const msUntilEnd = end - nowMs;
    const daysUntilClose = msUntilEnd / (1000 * 60 * 60 * 24);

    // ─── Regime-aware pod range ───
    const estimatedTotal = schedule.estimated_total;
    const recalcActive = daysUntilClose <= 11;
    const podRange = recalcActive
      ? (daysUntilClose <= 3 ? 5 : daysUntilClose <= 5 ? 15 : 30)
      : Math.max(1, Math.round(estimatedTotal * 0.92) - maxTable);

    const NUM_ZONES = 5;

    // Enhanced model applies from April 2026 onward (month >= "2026-04")
    const useEnhancedModel = month >= "2026-04";

    // ─── Draw-adjusted effective remaining (enhanced model only) ───
    let effectiveRemaining = remaining;
    if (useEnhancedModel) {
      const drawCount = pods.filter((p) => p.status === "draw").length;
      const wonCount = pods.filter((p) => p.status === "won").length;
      const drawRate = (drawCount + wonCount) > 0 ? drawCount / (drawCount + wonCount) : 0;
      effectiveRemaining = Math.min(
        remaining * 3,
        remaining / Math.max(0.1, 1 - drawRate)
      );
    }

    // ─── Scheduling constants for spacing model ───
    const totalPods = totalExpected;
    const scheduleStart = 10; // MIN_TABLE_OFFSET
    const scheduleEnd = Math.round(estimatedTotal * 0.92);
    const step = totalPods > 0 ? (scheduleEnd - scheduleStart) / (totalPods + 1) : 0;

    // Use spacing-aware model only for early month in enhanced mode
    const useSpacingModel = useEnhancedModel && !recalcActive && step > 0;

    if (!useSpacingModel) {
      // ─── Uniform CDF model (original for current months, draw-adjusted for future) ───
      for (let i = 0; i < NUM_ZONES; i++) {
        const tablesCoveredByZoneEnd = podRange * (i + 1) / NUM_ZONES;
        const zoneStartTable = maxTable + podRange * i / NUM_ZONES;
        const zoneEndTable = maxTable + tablesCoveredByZoneEnd;

        const fractionNotCovered = Math.max(0, (podRange - tablesCoveredByZoneEnd) / podRange);
        const cumulativeProbability = 1 - Math.pow(fractionNotCovered, effectiveRemaining);

        let zoneX1: number, zoneX2: number;
        if (tablesPerMs > 0) {
          zoneX1 = nowMs + (zoneStartTable - maxTable) / tablesPerMs;
          zoneX2 = nowMs + (zoneEndTable - maxTable) / tablesPerMs;
        } else {
          const timeStep = (end - nowMs) / NUM_ZONES;
          zoneX1 = nowMs + timeStep * i;
          zoneX2 = nowMs + timeStep * (i + 1);
        }

        zoneX1 = Math.max(zoneX1, nowMs);
        zoneX2 = Math.min(zoneX2, end);
        if (zoneX2 <= zoneX1) continue;

        const dateTo = new Date(zoneX2).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
        const regimeInfo = useEnhancedModel && recalcActive ? " · Recalc active" : "";
        zones.push({
          x1: zoneX1,
          x2: zoneX2,
          opacity: 0.08 + cumulativeProbability * 0.30,
          probability: Math.round(cumulativeProbability * 100),
          tableRange: `~${Math.round(zoneStartTable)}–${Math.round(zoneEndTable)}`,
          label: `${Math.round(cumulativeProbability * 100)}% by ${dateTo}${regimeInfo}`,
        });
      }
    } else {
      // ─── Early month: spacing-aware distribution (enhanced model) ───
      const firedTables = pods
        .filter((p) => p.status !== "draw")
        .map((p) => p.table)
        .sort((a, b) => a - b);
      const lastFired = firedTables.length > 0 ? firedTables[firedTables.length - 1] : scheduleStart;
      const lastSlot = Math.round((lastFired - scheduleStart) / step);

      // Build estimated positions of remaining unfired pods
      const unfiredPositions: { center: number; low: number; high: number }[] = [];
      for (let s = lastSlot + 1; s <= totalPods && unfiredPositions.length < remaining; s++) {
        const center = scheduleStart + step * s;
        unfiredPositions.push({
          center,
          low: center - step / 3,
          high: center + step / 3,
        });
      }

      // Determine full range for zones
      const zoneRangeStart = maxTable;
      const zoneRangeEnd = unfiredPositions.length > 0
        ? Math.max(unfiredPositions[unfiredPositions.length - 1].high, maxTable + 1)
        : scheduleEnd;
      const totalZoneRange = zoneRangeEnd - zoneRangeStart;

      const nextPodEstimate = unfiredPositions.length > 0
        ? Math.round(unfiredPositions[0].center)
        : null;

      for (let i = 0; i < NUM_ZONES; i++) {
        const zoneStartTable = zoneRangeStart + totalZoneRange * i / NUM_ZONES;
        const zoneEndTable = zoneRangeStart + totalZoneRange * (i + 1) / NUM_ZONES;

        // P(at least 1 unfired pod's jitter range overlaps [zoneRangeStart, zoneEndTable])
        let probNoneByZoneEnd = 1;
        for (const pos of unfiredPositions) {
          if (pos.low > zoneEndTable) break;
          const overlapStart = Math.max(pos.low, zoneRangeStart);
          const overlapEnd = Math.min(pos.high, zoneEndTable);
          const jitterWidth = pos.high - pos.low;
          if (jitterWidth <= 0 || overlapEnd <= overlapStart) continue;
          const probPodInRange = (overlapEnd - overlapStart) / jitterWidth;
          probNoneByZoneEnd *= (1 - probPodInRange);
        }
        // Adjust for draw-spawned extra pods
        const drawMultiplier = remaining > 0 ? effectiveRemaining / remaining : 1;
        const cumulativeProbability = 1 - Math.pow(probNoneByZoneEnd, drawMultiplier);

        let zoneX1: number, zoneX2: number;
        if (tablesPerMs > 0) {
          zoneX1 = nowMs + (zoneStartTable - maxTable) / tablesPerMs;
          zoneX2 = nowMs + (zoneEndTable - maxTable) / tablesPerMs;
        } else {
          const timeStep = (end - nowMs) / NUM_ZONES;
          zoneX1 = nowMs + timeStep * i;
          zoneX2 = nowMs + timeStep * (i + 1);
        }

        zoneX1 = Math.max(zoneX1, nowMs);
        zoneX2 = Math.min(zoneX2, end);
        if (zoneX2 <= zoneX1) continue;

        const dateTo = new Date(zoneX2).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
        const nextPodInfo = nextPodEstimate ? ` · Next pod ~table ${nextPodEstimate}` : "";
        zones.push({
          x1: zoneX1,
          x2: zoneX2,
          opacity: 0.08 + cumulativeProbability * 0.30,
          probability: Math.round(cumulativeProbability * 100),
          tableRange: `~${Math.round(zoneStartTable)}–${Math.round(zoneEndTable)}`,
          label: `${Math.round(cumulativeProbability * 100)}% by ${dateTo}${nextPodInfo}`,
        });
      }
    }

    return { triggeredPoints: triggered, probabilityZones: zones, domainStart: start, domainEnd: end, remainingCount: remaining };
  }, [pods, month, schedule]);

  const formatTick = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  // Build ticks: 7 evenly spaced across the month
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  const ticks = Array.from({ length: 7 }, (_, i) => Math.round(domainStart + ((domainEnd - domainStart) / 6) * i));

  const MARGIN = { top: 4, right: 8, bottom: 0, left: 8 };

  // Pre-compute zone CSS positions as % of the domain range
  const zonePositions = useMemo(() => {
    const range = domainEnd - domainStart;
    if (range <= 0) return [];
    return probabilityZones.map((zone) => {
      const leftPct = ((zone.x1 - domainStart) / range) * 100;
      const widthPct = ((zone.x2 - zone.x1) / range) * 100;
      const dateFrom = new Date(zone.x1).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      const dateTo = new Date(zone.x2).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      return { leftPct, widthPct, dateFrom, dateTo, zone };
    });
  }, [probabilityZones, domainStart, domainEnd]);

  return (
    <div
      className="rounded-lg px-4 py-3"
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
          Pod triggers across the month
        </span>
        {remainingCount > 0 && (
          <span className="text-[10px]" style={{ color: "var(--accent)" }}>
            {remainingCount} remaining
          </span>
        )}
      </div>
      <div style={{ width: "100%", height: 80, position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={MARGIN} onMouseLeave={() => onHoverPod(null)}>
            <XAxis
              dataKey="ts"
              type="number"
              domain={[domainStart, domainEnd]}
              tickFormatter={formatTick}
              tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              ticks={ticks}
            />
            <YAxis hide domain={[0, 2]} />
            <Tooltip
              content={({ payload, active }) => {
                // Sync hovered pod via ref to avoid render loops
                const podId = active && payload?.length
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ? (payload[0].payload as any)?.podId ?? null
                  : null;
                if (podId !== lastHoveredRef.current) {
                  lastHoveredRef.current = podId;
                  // Defer state update to avoid setting state during render
                  setTimeout(() => onHoverPod(podId), 0);
                }
                if (!active || !payload?.length) return null;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const pt = payload[0].payload as any;
                return (
                  <div
                    className="rounded px-2 py-1 text-[10px]"
                    style={{
                      background: "rgba(0,0,0,0.85)",
                      color: "var(--text-primary)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    {pt.tooltipDate && <div style={{ color: "var(--text-muted)" }}>{pt.tooltipDate}</div>}
                    {pt.label}
                  </div>
                );
              }}
            />
            {/* Today line */}
            <ReferenceLine
              x={todayStart}
              stroke="rgba(255,255,255,0.6)"
              strokeDasharray="4 3"
              strokeWidth={1}
            />
            {/* Probability zones */}
            {probabilityZones.map((zone, i) => {
              const isFirst = i === 0;
              const isLast = i === probabilityZones.length - 1;
              return (
                <ReferenceArea
                  key={`zone-${i}`}
                  x1={zone.x1}
                  x2={zone.x2}
                  y1={0}
                  y2={2}
                  fill="#fbbf24"
                  fillOpacity={zone.opacity}
                  stroke="rgba(251, 191, 36, 0.2)"
                  strokeWidth={1}
                  shape={(props: Record<string, number>) => {
                    const { x, y, width, height } = props;
                    const r = 4;
                    const tl = isFirst ? r : 0;
                    const tr = isLast ? r : 0;
                    // Top-left corner → top-right corner → bottom-right → bottom-left → close
                    const d = [
                      `M${x},${y + tl}`,
                      tl ? `Q${x},${y} ${x + tl},${y}` : "",
                      `L${x + width - tr},${y}`,
                      tr ? `Q${x + width},${y} ${x + width},${y + tr}` : "",
                      `L${x + width},${y + height}`,
                      `L${x},${y + height}`,
                      "Z",
                    ].join(" ");
                    return (
                      <path
                        d={d}
                        fill="#fbbf24"
                        fillOpacity={zone.opacity}
                        stroke="rgba(251, 191, 36, 0.2)"
                        strokeWidth={1}
                      />
                    );
                  }}
                />
              );
            })}
            {/* Triggered pods */}
            <Scatter data={triggeredPoints} dataKey="y" fill="#22c55e">
              {triggeredPoints.map((pt, i) => (
                <Cell key={i} fill={pt.fill} fillOpacity={pt.opacity} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        {/* Overlay container matching the chart plot area */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: MARGIN.left,
            right: MARGIN.right,
            bottom: 0,
            pointerEvents: "none",
          }}
        >
          {zonePositions.map(({ leftPct, widthPct, dateFrom, dateTo, zone }, i) => (
            <div
              key={`overlay-${i}`}
              className="zone-hover-target"
              style={{
                position: "absolute",
                left: `${leftPct}%`,
                top: 0,
                width: `${widthPct}%`,
                height: "100%",
                pointerEvents: "auto",
                cursor: "default",
              }}
            >
              <div
                className="zone-tooltip"
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 4px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(0,0,0,0.9)",
                  color: "var(--text-primary)",
                  border: "1px solid rgba(251,191,36,0.3)",
                  borderRadius: 6,
                  padding: "5px 8px",
                  fontSize: 10,
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  opacity: 0,
                  transition: "opacity 0.1s",
                  zIndex: 10,
                }}
              >
                <div style={{ color: "var(--accent)", fontWeight: 600 }}>{zone.label}</div>
                <div style={{ color: "var(--text-muted)" }}>{dateFrom} – {dateTo}</div>
                <div style={{ color: "var(--text-muted)" }}>Tables {zone.tableRange}</div>
              </div>
            </div>
          ))}
        </div>
        <style>{`
          .zone-hover-target:hover .zone-tooltip { opacity: 1 !important; }
        `}</style>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-1">
        {[
          { color: "#22c55e", label: "Won" },
          { color: "rgba(255,255,255,0.35)", label: "Draw" },
          { color: "#9a7dd4", label: "Pending" },
          ...(remainingCount > 0 ? [{ color: "#fbbf24", label: "Probability zone", opacity: 0.25 }] : []),
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            {"opacity" in item ? (
              <span
                className="inline-block w-4 h-2 rounded-sm"
                style={{ background: item.color, opacity: item.opacity ?? 1 }}
              />
            ) : (
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: item.color }}
              />
            )}
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Pod Card ───

function PodCard({
  pod,
  month,
  onMutate,
  highlighted,
}: {
  pod: TreasurePodWithClaim;
  month: string;
  onMutate: () => void;
  highlighted?: boolean;
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
    "#9a7dd4";

  const statusBg =
    pod.status === "won" ? "rgba(34, 197, 94, 0.15)" :
    pod.status === "draw" ? "rgba(255, 255, 255, 0.05)" :
    "rgba(154, 125, 212, 0.15)";

  // Winner display: prefer display name with handle in parens
  const winnerDisplay = pod.winner_discord_handle
    ? pod.winner_display_name && pod.winner_display_name !== pod.winner_discord_handle
      ? `${pod.winner_display_name} (${pod.winner_discord_handle})`
      : pod.winner_discord_handle
    : null;

  return (
    <div
      className="rounded-lg p-4 transition-colors"
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        border: highlighted ? "1px solid var(--accent)" : "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      <div className="flex items-center gap-3">
        {/* Status badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase"
            style={{ background: statusBg, color: statusColor }}
          >
            {pod.status}
          </span>
          {pod.status === "draw" && (
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-medium"
              style={{ background: "rgba(255, 255, 255, 0.05)", color: "var(--text-muted)" }}
            >
              Recalculated
            </span>
          )}
        </div>

        {/* Pod info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {pod.pod_title}
            <span className="text-xs ml-2 font-normal" style={{ color: "var(--text-muted)" }}>
              Table {pod.table}
            </span>
          </div>
          {winnerDisplay && (
            <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              Winner: {winnerDisplay}
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
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: "rgba(251, 191, 36, 0.15)",
                color: "var(--accent)",
                border: "1px solid transparent",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; }}
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
              placeholder="Friend's Discord handle"
              value={friendName}
              onChange={(e) => setFriendName(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs outline-none"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.10)",
                color: "var(--text-primary)",
              }}
            />
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
              style={{ background: "rgba(251, 191, 36, 0.15)", color: "var(--accent)" }}
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
