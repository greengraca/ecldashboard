"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import useSWR from "swr";
import { X, Maximize2, Minimize2, Loader2, Settings, Trash2 } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import type { RaffleCandidate, RaffleResult, Prize } from "@/lib/types";

interface RaffleModalProps {
  open: boolean;
  month: string;
  onClose: () => void;
  onComplete: () => void;
}

// ─── Slot Reel Component ───

function SlotReel({
  names,
  spinning,
  winnerIndex,
  onComplete,
}: {
  names: string[];
  spinning: boolean;
  winnerIndex: number;
  onComplete: () => void;
}) {
  const reelRef = useRef<HTMLDivElement>(null);
  const itemH = 72;
  const visibleItems = 5;
  const reelHeight = visibleItems * itemH;

  useEffect(() => {
    if (!spinning || !reelRef.current || names.length === 0) return;

    const reel = reelRef.current;
    // Build long strip: 12 full cycles + land on winner
    const cycles = 12;
    const totalItems = cycles * names.length + winnerIndex;
    // Center the winner in the viewport (middle of 5 visible)
    const centerOffset = Math.floor(visibleItems / 2) * itemH;
    const finalPos = totalItems * itemH - centerOffset;

    reel.style.transition = "none";
    reel.style.transform = "translateY(0)";
    void reel.offsetHeight;

    // Two-phase: fast spin then decelerate
    reel.style.transition = "transform 6s cubic-bezier(0.05, 0.7, 0.15, 1)";
    reel.style.transform = `translateY(-${finalPos}px)`;

    const timer = setTimeout(onComplete, 6200);
    return () => clearTimeout(timer);
  }, [spinning]); // eslint-disable-line react-hooks/exhaustive-deps

  // Generate reel items — enough to fill the animation
  const cycles = 12;
  const reelItems: string[] = [];
  for (let c = 0; c <= cycles; c++) {
    for (let i = 0; i < names.length; i++) {
      reelItems.push(names[i]);
    }
  }

  return (
    <div
      className="relative overflow-hidden"
      style={{ height: reelHeight, borderRadius: 12 }}
    >
      {/* Gradient masks */}
      <div
        className="absolute inset-x-0 top-0 z-10 pointer-events-none"
        style={{ height: itemH * 1.5, background: "linear-gradient(to bottom, #0a0a0aff, #0a0a0a00)" }}
      />
      <div
        className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
        style={{ height: itemH * 1.5, background: "linear-gradient(to top, #0a0a0aff, #0a0a0a00)" }}
      />
      {/* Center highlight */}
      <div
        className="absolute inset-x-0 z-10 pointer-events-none"
        style={{
          top: itemH * 2,
          height: itemH,
          borderTop: "2px solid var(--accent)",
          borderBottom: "2px solid var(--accent)",
          boxShadow: "0 0 30px rgba(251,191,36,0.15)",
        }}
      />
      {/* Reel strip */}
      <div ref={reelRef}>
        {reelItems.map((name, i) => (
          <div
            key={i}
            className="flex items-center justify-center text-xl font-bold"
            style={{ height: itemH, color: "var(--text-primary)" }}
          >
            {name}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Lever Component ───

function Lever({ onPull, disabled, forcePulled }: { onPull: () => void; disabled: boolean; forcePulled?: boolean }) {
  const [animating, setAnimating] = useState(false);
  const pulled = forcePulled || animating;

  function handlePull() {
    if (disabled || animating || forcePulled) return;
    setAnimating(true);
    // Ball drops down, then trigger after a beat
    setTimeout(() => onPull(), 400);
    setTimeout(() => setAnimating(false), 800);
  }

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <style>{`
        @keyframes leverPull {
          0% { transform: translateY(0); }
          30% { transform: translateY(36px); }
          60% { transform: translateY(36px); }
          100% { transform: translateY(${forcePulled ? "36px" : "0"}); }
        }
        @keyframes leverArmStretch {
          0% { height: 60px; }
          30% { height: 96px; }
          60% { height: 96px; }
          100% { height: ${forcePulled ? "96px" : "60px"}; }
        }
        @keyframes leverHeldDown {
          from, to { transform: translateY(36px); }
        }
        @keyframes leverArmHeld {
          from, to { height: 96px; }
        }
      `}</style>
      <div
        className="relative flex flex-col items-center"
        onClick={handlePull}
        style={{
          opacity: disabled && !forcePulled ? 0.3 : 1,
          cursor: disabled || forcePulled ? "default" : "pointer",
        }}
      >
        {/* Lever ball (rendered first, ordered above via negative order) */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: pulled
              ? "radial-gradient(circle at 40% 35%, #ef4444, #991b1b)"
              : "radial-gradient(circle at 40% 35%, #fbbf24, #b45309)",
            boxShadow: pulled
              ? "0 0 16px rgba(239,68,68,0.5)"
              : "0 0 12px rgba(251,191,36,0.4)",
            order: -1,
            transition: pulled ? "none" : "background 0.3s, box-shadow 0.3s",
            animation: forcePulled
              ? "leverHeldDown 0.1s both"
              : animating
                ? "leverPull 0.8s ease-in-out both"
                : "none",
          }}
        />
        {/* Lever arm */}
        <div
          style={{
            width: 6,
            height: 60,
            background: "linear-gradient(to bottom, #d4d4d4, #737373)",
            borderRadius: 3,
            marginTop: -4,
            animation: forcePulled
              ? "leverArmHeld 0.1s both"
              : animating
                ? "leverArmStretch 0.8s ease-in-out both"
                : "none",
          }}
        />
        {/* Base plate */}
        <div
          style={{
            width: 20,
            height: 8,
            background: "linear-gradient(to bottom, #525252, #262626)",
            borderRadius: "0 0 4px 4px",
            marginTop: 2,
          }}
        />
      </div>
      <span className="text-[9px] uppercase tracking-wider mt-1" style={{ color: "var(--text-muted)" }}>
        {pulled ? "Pulled" : "Pull"}
      </span>
    </div>
  );
}

// ─── Particles ───

function WinnerParticles() {
  const particles = Array.from({ length: 24 }, (_, i) => {
    const angle = (i / 24) * 360;
    const distance = 80 + Math.random() * 120;
    const size = 4 + Math.random() * 6;
    const delay = Math.random() * 0.5;
    const hue = Math.random() > 0.5 ? "40" : "45"; // amber tones
    return { angle, distance, size, delay, hue };
  });

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <style>{`
        @keyframes particleBurst {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(0); }
          50% { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1) translate(var(--tx), var(--ty)); }
        }
      `}</style>
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: "50%",
            top: "40%",
            width: p.size,
            height: p.size,
            background: `hsl(${p.hue}, 90%, 60%)`,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ["--tx" as any]: `${Math.cos((p.angle * Math.PI) / 180) * p.distance}px`,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ["--ty" as any]: `${Math.sin((p.angle * Math.PI) / 180) * p.distance}px`,
            animation: `particleBurst 1.2s ${p.delay}s ease-out both`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Main Modal ───

export default function RaffleModal({ open, month, onClose, onComplete }: RaffleModalProps) {
  const [excludeFinalists, setExcludeFinalists] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [phase, setPhase] = useState<"setup" | "spinning" | "reveal">("setup");
  const [winner, setWinner] = useState<RaffleCandidate | null>(null);
  const [winnerIdx, setWinnerIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setConfirmDelete(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setPhase("setup");
      setWinner(null);
      setShowParticles(false);
    }
  }, [open]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    function handleFs() { setIsFullscreen(!!document.fullscreenElement); }
    document.addEventListener("fullscreenchange", handleFs);
    return () => document.removeEventListener("fullscreenchange", handleFs);
  }, []);

  function handlePullLever() {
    if (eligible.length === 0) return;

    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    const idx = arr[0] % eligible.length;
    setWinnerIdx(idx);
    setWinner(eligible[idx]);
    setPhase("spinning");
  }

  function handleSpinComplete() {
    setPhase("reveal");
    setShowParticles(true);
    setTimeout(() => setShowParticles(false), 2000);
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

  const bgStyle = isFullscreen
    ? { background: "#0a0a0a" }
    : { background: "linear-gradient(135deg, #0f1419, #1a2030)", border: "1px solid var(--border)" } as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)" }}
    >
      <div
        ref={containerRef}
        className="w-full max-w-2xl rounded-2xl relative overflow-hidden"
        style={{
          ...bgStyle,
          maxHeight: isFullscreen ? "100vh" : "90vh",
          height: isFullscreen ? "100vh" : "auto",
          maxWidth: isFullscreen ? "100vw" : undefined,
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          justifyContent: "center",
          padding: isFullscreen ? "32px" : "32px",
          boxShadow: "0 40px 120px rgba(0,0,0,0.6)",
        }}
      >
        {/* Fullscreen pattern background */}
        {isFullscreen && (
          <>
            <div
              className="absolute inset-0 pointer-events-none z-0"
              style={{
                backgroundImage: `
                  radial-gradient(circle at 20% 30%, rgba(251,191,36,0.04) 0%, transparent 50%),
                  radial-gradient(circle at 80% 70%, rgba(251,191,36,0.03) 0%, transparent 50%)
                `,
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none z-0"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fbbf24' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
            <div
              className="absolute inset-x-0 bottom-0 pointer-events-none z-0"
              style={{
                height: "40%",
                background: "linear-gradient(to top, rgba(251,191,36,0.02), transparent)",
              }}
            />
          </>
        )}

        {/* Content wrapper — constrained width in fullscreen */}
        <div className="w-full z-10" style={{ maxWidth: isFullscreen ? 560 : undefined, margin: isFullscreen ? "0 auto" : undefined }}>

        {/* Top bar: settings (left) + controls (right) */}
        <div className="flex items-center justify-between mb-6">
          <div className="relative" ref={menuRef}>
            {hasResult && phase === "setup" ? (
              <>
                <button
                  onClick={() => { setShowMenu(!showMenu); setConfirmDelete(false); }}
                  className="p-2 rounded-lg transition-colors hover:brightness-125"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Settings className="w-5 h-5" />
                </button>
                {showMenu && (
                  <div
                    className="absolute left-0 mt-1 rounded-lg shadow-lg py-1 z-30"
                    style={{ background: "linear-gradient(135deg, #1a2030, #0f1419)", border: "1px solid rgba(255,255,255,0.1)", minWidth: 160, boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}
                  >
                    {!confirmDelete ? (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:brightness-125"
                        style={{ color: "var(--error)" }}
                      >
                        <Trash2 className="w-5 h-5" />
                        Delete result
                      </button>
                    ) : (
                      <div className="px-3 py-2">
                        <div className="text-[10px] mb-2" style={{ color: "var(--text-muted)" }}>
                          Are you sure?
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              setDeleting(true);
                              try {
                                await fetch(`/api/prizes/raffle?month=${month}`, { method: "DELETE" });
                                setShowMenu(false);
                                setConfirmDelete(false);
                                onComplete();
                              } catch {
                                // silent
                              } finally {
                                setDeleting(false);
                              }
                            }}
                            disabled={deleting}
                            className="px-3 py-1 rounded text-[10px] font-medium transition-colors hover:brightness-125"
                            style={{ background: "var(--error-light)", color: "var(--error)", opacity: deleting ? 0.5 : 1 }}
                          >
                            {deleting ? "..." : "Delete"}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(false)}
                            className="px-3 py-1 rounded text-[10px] transition-colors hover:brightness-125"
                            style={{ color: "var(--text-muted)" }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : <div />}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleFullscreen} className="p-2 rounded-lg transition-colors hover:brightness-125" style={{ color: "var(--text-muted)" }}>
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            {!isFullscreen && (
              <button onClick={onClose} className="p-2 rounded-lg transition-colors hover:brightness-125" style={{ color: "var(--text-muted)" }}>
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="mb-8">
          <div className="text-xs uppercase tracking-[0.3em] mb-2" style={{ color: "var(--accent)", opacity: 0.7 }}>
            European cEDH League
          </div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Most Games Raffle
          </h2>
        </div>

        {/* Slot machine card */}
        <div
          className="w-full rounded-2xl overflow-hidden relative"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
            border: "2px solid rgba(255,255,255,0.08)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          {/* Top trim */}
          <div style={{ height: 3, background: "linear-gradient(90deg, transparent, rgba(251,191,36,0.4), transparent)" }} />

          <div className="p-5">
            {hasResult && phase === "setup" ? (
              <div className="text-center py-6">
                <div className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
                  Raffle already run this month
                </div>
                <div className="text-3xl font-bold" style={{ color: "var(--accent)" }}>
                  {existingResult!.data!.winner_name}
                </div>
              </div>

            ) : candidatesLoading ? (
              <div className="text-center py-10">
                <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: "var(--text-muted)" }} />
              </div>

            ) : phase === "setup" ? (
              <div className="flex items-start gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                      <input
                        type="checkbox"
                        checked={excludeFinalists}
                        onChange={(e) => setExcludeFinalists(e.target.checked)}
                        className="rounded accent-[var(--accent)]"
                      />
                      Exclude finalists (Top 4)
                    </label>
                  </div>

                  <div className="flex flex-col gap-1.5 mb-2">
                    {eligible.map((c, i) => (
                      <div
                        key={c.player_uid}
                        className="flex items-center justify-between px-4 py-2.5 rounded-lg"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono w-5 text-center" style={{ color: "var(--text-muted)" }}>{i + 1}</span>
                          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{c.player_name}</span>
                        </div>
                        <span className="text-xs font-mono" style={{ color: "var(--accent)" }}>{c.game_count} games</span>
                      </div>
                    ))}
                    {candidates.filter((c) => c.excluded).map((c) => (
                      <div
                        key={c.player_uid}
                        className="flex items-center justify-between px-4 py-2.5 rounded-lg opacity-30"
                        style={{ background: "rgba(255,255,255,0.02)" }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono w-5 text-center" style={{ color: "var(--text-muted)" }}>—</span>
                          <span className="text-sm line-through" style={{ color: "var(--text-muted)" }}>{c.player_name}</span>
                        </div>
                        <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--error)" }}>finalist</span>
                      </div>
                    ))}
                  </div>

                  {eligible.length === 0 && (
                    <div className="text-center py-4 text-sm" style={{ color: "var(--text-muted)" }}>
                      No eligible candidates
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center justify-center pt-8">
                  <Lever onPull={handlePullLever} disabled={eligible.length === 0} />
                </div>
              </div>

            ) : phase === "spinning" ? (
              <div className="flex items-center gap-6">
                <div
                  className="flex-1 rounded-xl overflow-hidden"
                  style={{
                    background: "#050505",
                    border: "2px solid rgba(251,191,36,0.3)",
                    boxShadow: "0 0 40px rgba(251,191,36,0.08), inset 0 0 30px rgba(0,0,0,0.8)",
                  }}
                >
                  <SlotReel
                    names={eligible.map((c) => c.player_name)}
                    spinning={true}
                    winnerIndex={winnerIdx}
                    onComplete={handleSpinComplete}
                  />
                </div>

                <div className="flex flex-col items-center justify-center">
                  <Lever onPull={() => {}} disabled={true} forcePulled={true} />
                </div>
              </div>

            ) : phase === "reveal" && winner ? (
              <div className="text-center relative py-4">
                {showParticles && <WinnerParticles />}

                <div
                  className="text-4xl font-black mb-4"
                  style={{
                    color: "var(--accent)",
                    textShadow: "0 0 30px rgba(251,191,36,0.4)",
                    animation: "fadeIn 0.5s ease-out",
                  }}
                >
                  {winner.player_name}
                </div>

                {mostGamesPrize?.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mostGamesPrize.image_url}
                    alt={mostGamesPrize.name}
                    className="mx-auto rounded-xl mb-4"
                    style={{
                      maxHeight: 220,
                      objectFit: "contain",
                      animation: "fadeIn 0.8s ease-out",
                      boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
                    }}
                  />
                )}

                <div className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
                  {winner.game_count} games played
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-8 py-3 rounded-xl text-sm font-bold transition-colors hover:brightness-125"
                  style={{
                    background: "rgba(251,191,36,0.15)",
                    color: "var(--accent)",
                    border: "1px solid rgba(251,191,36,0.35)",
                    opacity: saving ? 0.5 : 1,
                  }}
                >
                  {saving ? "Saving..." : "Save Result"}
                </button>
              </div>
            ) : null}
          </div>

          {/* Bottom trim */}
          <div style={{ height: 3, background: "linear-gradient(90deg, transparent, rgba(251,191,36,0.4), transparent)" }} />
        </div>

        </div>{/* end content wrapper */}
      </div>
    </div>
  );
}
