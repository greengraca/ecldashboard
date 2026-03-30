"use client";

import { useState } from "react";
import { Check, Circle, Send, Loader2, X, Copy, MessageSquare } from "lucide-react";
import { useSensitiveData } from "@/contexts/SensitiveDataContext";
import type { DragonShieldMonth } from "@/lib/types";

interface DragonShieldCodesProps {
  data: DragonShieldMonth | null;
  month: string;
  onRefresh: () => void;
}

const TIER_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  champion: { label: "Champion", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  top4: { label: "Top 4", color: "#a855f7", bg: "rgba(168,85,247,0.12)" },
  top16: { label: "Top 16", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
};

export default function DragonShieldCodes({ data, month, onRefresh }: DragonShieldCodesProps) {
  const [codeText, setCodeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [copiedMsg, setCopiedMsg] = useState<number | null>(null);
  const { hidden: sensitiveHidden } = useSensitiveData();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const codes = data?.codes || [];
  const hasLoadedCodes = codes.length > 0;

  function showMsg(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }

  async function handleLoadCodes() {
    const lines = codeText.trim().split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    if (lines.length !== 16) {
      showMsg("error", `Expected 16 codes, got ${lines.length}`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/prizes/dragon-shield/codes?month=${month}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes: lines, month }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showMsg("success", "16 codes loaded");
      setCodeText("");
      onRefresh();
    } catch (e) {
      showMsg("error", String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkSent(index: number) {
    setSending(index);
    try {
      const res = await fetch(`/api/prizes/dragon-shield/codes/${index}/sent?month=${month}`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error((await res.json()).error);
      onRefresh();
    } catch (e) {
      showMsg("error", String(e));
    } finally {
      setSending(null);
    }
  }

  async function handleMarkUnsent(index: number) {
    setSending(index);
    try {
      const res = await fetch(`/api/prizes/dragon-shield/codes/${index}/sent?month=${month}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sent: false }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      onRefresh();
    } catch (e) {
      showMsg("error", String(e));
    } finally {
      setSending(null);
    }
  }

  async function handleMarkAllSent() {
    setLoading(true);
    try {
      const res = await fetch(`/api/prizes/dragon-shield/codes/mark-all-sent?month=${month}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showMsg("success", "All codes marked as sent");
      onRefresh();
    } catch (e) {
      showMsg("error", String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {message && (
        <div
          className="text-xs px-3 py-2 rounded-lg mb-3"
          style={{
            background: message.type === "success" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
            color: message.type === "success" ? "#22c55e" : "#ef4444",
          }}
        >
          {message.text}
        </div>
      )}

      {!hasLoadedCodes ? (
        <div>
          <label className="text-xs font-medium block mb-2" style={{ color: "var(--text-secondary)" }}>
            Paste 16 Dragon Shield codes (one per line)
          </label>
          <textarea
            value={codeText}
            onChange={(e) => setCodeText(e.target.value)}
            rows={8}
            className="w-full rounded-lg px-3 py-2 text-sm font-mono resize-none"
            style={{
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
            }}
            placeholder={"CODE-001\nCODE-002\n..."}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {codeText.trim().split("\n").filter((l) => l.trim()).length} / 16 codes
            </span>
            <button
              onClick={handleLoadCodes}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors hover:brightness-125"
              style={{
                background: "rgba(251, 191, 36, 0.15)",
                color: "var(--accent)",
                border: "1px solid rgba(251, 191, 36, 0.35)",
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Load Codes
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex flex-col gap-1.5 mt-2">
            {codes.map((code, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg px-3 py-2"
                style={{
                  background: code.sent ? "rgba(251,191,36,0.05)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${code.sent ? "rgba(251,191,36,0.15)" : "var(--border)"}`,
                }}
              >
                <span className="text-xs font-mono w-6 text-center" style={{ color: "var(--text-muted)" }}>
                  {code.placement}
                </span>
                <span className="text-xs font-medium flex-1 truncate" style={{ color: "var(--text-primary)" }}>
                  {code.player_name}
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: TIER_BADGE[code.sleeve_tier]?.bg, color: TIER_BADGE[code.sleeve_tier]?.color }}
                >
                  {TIER_BADGE[code.sleeve_tier]?.label}
                </span>
                <span className="text-xs font-mono shrink-0" style={{ color: "var(--text-muted)" }}>
                  {sensitiveHidden ? "••••••••" : code.code}
                </span>
                <button
                  onClick={() => {
                    const ta = document.createElement("textarea");
                    ta.value = code.code;
                    ta.style.position = "fixed";
                    ta.style.opacity = "0";
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand("copy");
                    document.body.removeChild(ta);
                    setCopied(i);
                    setTimeout(() => setCopied(null), 1500);
                  }}
                  className="p-1 rounded transition-colors shrink-0"
                  title="Copy code"
                >
                  {copied === i ? (
                    <Check className="w-3 h-3" style={{ color: "var(--success)" }} />
                  ) : (
                    <Copy className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                  )}
                </button>
                <button
                  onClick={() => {
                    const msg = `Congrats once again!\n\nThe code can be used on DragonShield Sleeve Crafter and it will give you a 100% discount on checkout!\nAny issues you have let us know!\n\nHere's your code: **${code.code}**\n\nhttps://www.dragonshield.com/p/sleeve-crafter`;
                    const ta = document.createElement("textarea");
                    ta.value = msg;
                    ta.style.position = "fixed";
                    ta.style.opacity = "0";
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand("copy");
                    document.body.removeChild(ta);
                    setCopiedMsg(i);
                    setTimeout(() => setCopiedMsg(null), 1500);
                  }}
                  className="p-1 rounded transition-colors shrink-0"
                  title="Copy message with code"
                >
                  {copiedMsg === i ? (
                    <Check className="w-3 h-3" style={{ color: "var(--success)" }} />
                  ) : (
                    <MessageSquare className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                  )}
                </button>
                <button
                  onClick={() => code.sent ? handleMarkUnsent(i) : handleMarkSent(i)}
                  disabled={sending === i}
                  className={`p-1 rounded transition-colors shrink-0 ${code.sent ? "group/sent" : ""}`}
                  style={{ cursor: "pointer" }}
                >
                  {sending === i ? (
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--text-muted)" }} />
                  ) : code.sent ? (
                    <>
                      <Check className="w-4 h-4 group-hover/sent:hidden" style={{ color: "#22c55e" }} />
                      <X className="w-4 h-4 hidden group-hover/sent:block" style={{ color: "var(--error)" }} />
                    </>
                  ) : (
                    <Circle className="w-4 h-4 hover:opacity-80" style={{ color: "#f59e0b" }} />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
