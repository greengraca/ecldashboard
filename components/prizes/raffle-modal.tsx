"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import useSWR from "swr";
import { X, Maximize2, Minimize2, Loader2, Dices } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import type { RaffleCandidate, RaffleResult, Prize } from "@/lib/types";

interface RaffleModalProps {
  open: boolean;
  month: string;
  onClose: () => void;
  onComplete: () => void;
}

export default function RaffleModal({ open, month, onClose, onComplete }: RaffleModalProps) {
  const [excludeFinalists, setExcludeFinalists] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<RaffleCandidate | null>(null);
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);

  const { data: candidatesData, isLoading: candidatesLoading } = useSWR<{ data: RaffleCandidate[] }>(
    open ? `/api/prizes/raffle/candidates?month=${month}&exclude_finalists=${excludeFinalists}` : null,
    fetcher
  );

  const { data: existingResult } = useSWR<{ data: RaffleResult | null }>(
    open ? `/api/prizes/raffle?month=${month}` : null,
    fetcher
  );

  const { data: prizesData } = useSWR<{ data: Prize[] }>(
    open ? `/api/prizes?month=${month}` : null,
    fetcher
  );
  const mostGamesPrize = prizesData?.data?.find((p) => p.recipient_type === "most_games") || null;

  const candidates = candidatesData?.data || [];
  const eligible = candidates.filter((c) => !c.excluded);
  const hasResult = !!existingResult?.data;

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    function handleFs() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", handleFs);
    return () => document.removeEventListener("fullscreenchange", handleFs);
  }, []);

  function runSlotMachine() {
    if (eligible.length === 0) return;

    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    const winnerIndex = arr[0] % eligible.length;
    const selectedWinner = eligible[winnerIndex];

    setSpinning(true);
    setWinner(null);

    const slot = slotRef.current;
    if (!slot) return;

    const repeatCount = 8;
    const names: RaffleCandidate[] = [];
    for (let r = 0; r < repeatCount; r++) {
      for (let i = 0; i < eligible.length; i++) {
        names.push(eligible[i]);
      }
    }
    names.push(selectedWinner);

    const itemHeight = 64;
    const totalItems = names.length;
    const finalOffset = (totalItems - 1) * itemHeight;

    slot.innerHTML = names
      .map(
        (c) =>
          `<div style="height:${itemHeight}px;display:flex;align-items:center;justify-content:center;font-size:1.25rem;font-weight:600;color:var(--text-primary);white-space:nowrap;">${c.player_name}</div>`
      )
      .join("");

    slot.style.transition = "none";
    slot.style.transform = "translateY(0)";
    void slot.offsetHeight;

    slot.style.transition = `transform 5s cubic-bezier(0.15, 0.85, 0.35, 1)`;
    slot.style.transform = `translateY(-${finalOffset}px)`;

    setTimeout(() => {
      setSpinning(false);
      setWinner(selectedWinner);
    }, 5200);
  }

  async function handleSave() {
    if (!winner) return;
    setSaving(true);
    try {
      await fetch("/api/prizes/raffle/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          candidates,
          exclude_finalists: excludeFinalists,
          winner_uid: winner.player_uid,
          winner_name: winner.player_name,
          prize_id: mostGamesPrize?._id ? String(mostGamesPrize._id) : null,
        }),
      });
      onComplete();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
    >
      <div
        ref={containerRef}
        className="w-full max-w-lg rounded-xl p-6 relative"
        style={{
          background: isFullscreen ? "#0a0a0a" : "var(--bg-secondary)",
          border: isFullscreen ? "none" : "1px solid var(--border)",
          maxHeight: isFullscreen ? "100vh" : "90vh",
          height: isFullscreen ? "100vh" : "auto",
          maxWidth: isFullscreen ? "100vw" : undefined,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Controls */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button onClick={toggleFullscreen} className="p-2 rounded-lg" style={{ color: "var(--text-muted)" }}>
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          {!isFullscreen && (
            <button onClick={onClose} className="p-2 rounded-lg" style={{ color: "var(--text-muted)" }}>
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="text-center mb-6">
          <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Most Games Raffle
          </h2>
          {!hasResult && !winner && (
            <div className="flex items-center justify-center gap-3 mt-3">
              <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                <input
                  type="checkbox"
                  checked={excludeFinalists}
                  onChange={(e) => setExcludeFinalists(e.target.checked)}
                  disabled={spinning}
                  className="rounded"
                />
                Exclude finalists
              </label>
            </div>
          )}
        </div>

        {hasResult && !winner ? (
          <div className="text-center">
            <div className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>
              Raffle already run for this month
            </div>
            <div className="text-2xl font-bold" style={{ color: "var(--accent)" }}>
              {existingResult!.data!.winner_name}
            </div>
          </div>
        ) : candidatesLoading ? (
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--text-muted)" }} />
        ) : !spinning && !winner ? (
          <div className="w-full">
            <div className="mb-4 flex flex-col gap-2">
              {eligible.map((c) => (
                <div
                  key={c.player_uid}
                  className="flex items-center justify-between px-4 py-2 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{c.player_name}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{c.game_count} games</span>
                </div>
              ))}
              {candidates.filter((c) => c.excluded).map((c) => (
                <div
                  key={c.player_uid}
                  className="flex items-center justify-between px-4 py-2 rounded-lg opacity-40 line-through"
                  style={{ background: "rgba(255,255,255,0.02)" }}
                >
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>{c.player_name}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>finalist</span>
                </div>
              ))}
            </div>
            <button
              onClick={runSlotMachine}
              disabled={eligible.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              <Dices className="w-5 h-5" /> Run Raffle
            </button>
          </div>
        ) : spinning ? (
          <div
            className="overflow-hidden rounded-lg mx-auto"
            style={{ height: 64, width: 300, border: "2px solid var(--accent)" }}
          >
            <div ref={slotRef} />
          </div>
        ) : winner ? (
          <div className="text-center">
            <div className="text-3xl font-bold mb-3" style={{ color: "var(--accent)" }}>
              {winner.player_name}
            </div>
            {mostGamesPrize?.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mostGamesPrize.image_url}
                alt={mostGamesPrize.name}
                className="mx-auto rounded-lg mb-3"
                style={{ maxHeight: 200, objectFit: "contain" }}
              />
            )}
            <div className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
              {winner.game_count} games played
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 rounded-lg text-sm font-semibold"
              style={{ background: "var(--accent)", color: "#fff", opacity: saving ? 0.5 : 1 }}
            >
              {saving ? "Saving..." : "Save Result"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
