"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Check, Loader2, Undo2, Copy } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import type { DragonShieldMonth, PlayerAddress } from "@/lib/types";

interface BracketResults {
  top4_order: (string | { uid: string; name: string })[];
  top4_winner: string | null;
}

interface Top4Player {
  uid: string;
  name: string;
}

interface DragonShieldAddressesProps {
  data: DragonShieldMonth | null;
  month: string;
  onRefresh: () => void;
}

interface AddressForm {
  full_name: string;
  street: string;
  city: string;
  postal_code: string;
  country: string;
}

const EMPTY_ADDRESS: AddressForm = { full_name: "", street: "", city: "", postal_code: "", country: "" };
const PLACEMENT_LABELS = ["1st — Champion", "2nd", "3rd", "4th"];

export default function DragonShieldAddresses({ data, month, onRefresh }: DragonShieldAddressesProps) {
  const { data: bracketData } = useSWR<{ data: BracketResults | null }>(
    `/api/players/brackets?month=${month}`,
    fetcher
  );

  const { data: allAddresses, mutate: mutateAddresses } = useSWR<{ data: PlayerAddress[] }>("/api/players/addresses", fetcher);
  const addressMap = new Map((allAddresses?.data || []).map((a) => [a.player_uid, a]));

  // Fetch players for name resolution
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: playersData } = useSWR<{ data: { players: any[] } }>(
    `/api/players?month=${month}`,
    fetcher
  );
  const playerMap = new Map(
    (playersData?.data?.players || []).map((p: { uid: string; name: string }) => [p.uid, p.name])
  );

  // Normalize top4_order: may be string[] (UIDs) or {uid,name}[]
  const codes = data?.codes || [];
  const codeMap = new Map(codes.map((c) => [c.player_uid, c.player_name]));
  const rawTop4 = bracketData?.data?.top4_order || [];
  const normalized: Top4Player[] = rawTop4.map((entry) => {
    if (typeof entry === "string") {
      const name = playerMap.get(entry) || addressMap.get(entry)?.player_name || codeMap.get(entry) || entry;
      return { uid: entry, name };
    }
    return entry;
  });
  // Swap 3rd/4th visually for clockwise 2x2 layout: [1st, 2nd, 4th, 3rd]
  const top4 = normalized.length === 4
    ? [normalized[0], normalized[1], normalized[3], normalized[2]]
    : normalized;
  const placementForIndex = [0, 1, 3, 2]; // maps visual index to actual placement index

  const [forms, setForms] = useState<Record<string, AddressForm>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [handoffLoading, setHandoffLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Initialize forms from saved addresses
  useEffect(() => {
    const initial: Record<string, AddressForm> = {};
    top4.forEach((player) => {
      if (player.uid) {
        const saved = addressMap.get(player.uid);
        if (saved) {
          initial[player.uid] = {
            full_name: saved.full_name,
            street: saved.street,
            city: saved.city,
            postal_code: saved.postal_code,
            country: saved.country,
          };
        }
      }
    });
    setForms((prev) => ({ ...initial, ...prev }));
  }, [allAddresses, top4.length]); // eslint-disable-line react-hooks/exhaustive-deps

  function showMsg(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }

  function getForm(uid: string): AddressForm {
    return forms[uid] || EMPTY_ADDRESS;
  }

  function updateForm(uid: string, field: keyof AddressForm, value: string) {
    setForms((prev) => ({ ...prev, [uid]: { ...getForm(uid), [field]: value } }));
  }

  async function saveAddress(uid: string, playerName: string) {
    const form = getForm(uid);
    setSaving(uid);
    try {
      const res = await fetch("/api/players/addresses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_uid: uid, player_name: playerName, ...form }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      mutateAddresses();
      showMsg("success", `Address saved for ${playerName}`);
    } catch (e) {
      showMsg("error", String(e));
    } finally {
      setSaving(null);
    }
  }

  async function toggleHandoff() {
    setHandoffLoading(true);
    try {
      const newVal = !data?.playmat_handoff;
      const res = await fetch(`/api/prizes/dragon-shield/handoff?month=${month}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handoff: newVal }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      onRefresh();
    } catch (e) {
      showMsg("error", String(e));
    } finally {
      setHandoffLoading(false);
    }
  }

  if (top4.length === 0) {
    return (
      <div className="text-center py-8" style={{ color: "var(--text-muted)" }}>
        Set Top 4 bracket results first to see players.
      </div>
    );
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 mt-2">
        {top4.map((player, i) => {
          const uid = player.uid || `unknown-${i}`;
          const form = getForm(uid);
          const isSaving = saving === uid;
          const saved = addressMap.get(uid);
          const hasSaved = !!saved;
          const hasChanges = !hasSaved
            ? Object.values(form).some((v) => v.trim() !== "")
            : (["full_name", "street", "city", "postal_code", "country"] as const).some((f) => form[f] !== (saved[f] || ""));

          return (
            <div
              key={uid}
              className="rounded-lg p-3"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{player.name}</div>
                  <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{PLACEMENT_LABELS[placementForIndex[i]]}</div>
                </div>
                <div className="flex items-stretch gap-1.5">
                  {hasSaved && (
                    <button
                      onClick={() => {
                        const f = getForm(uid);
                        const text = [f.full_name, f.street, `${f.postal_code} ${f.city}`, f.country].filter(Boolean).join("\n");
                        const ta = document.createElement("textarea");
                        ta.value = text;
                        ta.style.position = "fixed";
                        ta.style.opacity = "0";
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand("copy");
                        document.body.removeChild(ta);
                        showMsg("success", `Address copied for ${player.name}`);
                      }}
                      className="flex items-center justify-center px-2 py-1 rounded text-[10px] font-medium transition-colors hover:brightness-125"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        color: "var(--text-muted)",
                        border: "1px solid var(--border)",
                      }}
                      title="Copy address"
                    >
                      <Copy className="w-3 h-3 shrink-0" />
                    </button>
                  )}
                  {hasChanges && (
                    <button
                      onClick={() => saveAddress(uid, player.name)}
                      disabled={isSaving}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium"
                      style={{
                        background: hasSaved ? "rgba(251,191,36,0.15)" : "rgba(34,197,94,0.15)",
                        color: hasSaved ? "var(--accent)" : "var(--success)",
                        border: `1px solid ${hasSaved ? "rgba(251,191,36,0.35)" : "rgba(34,197,94,0.35)"}`,
                        opacity: isSaving ? 0.5 : 1,
                      }}
                    >
                      {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      {hasSaved ? "Save" : "Save"}
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["full_name", "street", "city", "postal_code", "country"] as const).map((field) => (
                  <input
                    key={field}
                    value={form[field]}
                    onChange={(e) => updateForm(uid, field, e.target.value)}
                    placeholder={field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    className={`rounded px-2 py-1.5 text-xs ${field === "street" ? "col-span-2" : ""}`}
                    style={{
                      background: "var(--bg-page)",
                      color: "var(--text-muted)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Handoff button */}
      <div
        className="rounded-lg px-4 py-3 flex items-center justify-between"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
      >
        {data?.playmat_handoff ? (
          <>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" style={{ color: "#22c55e" }} />
              <span className="text-sm" style={{ color: "#22c55e" }}>
                Sent to Dragon Shield
                {data.playmat_handoff_at && (
                  <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
                    {new Date(data.playmat_handoff_at).toLocaleDateString()}
                  </span>
                )}
              </span>
            </div>
            <button
              onClick={toggleHandoff}
              disabled={handoffLoading}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded"
              style={{ color: "var(--text-muted)" }}
            >
              <Undo2 className="w-3 h-3" /> Undo
            </button>
          </>
        ) : (
          <button
            onClick={toggleHandoff}
            disabled={handoffLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium w-full justify-center transition-colors hover:brightness-125"
            style={{
              background: "rgba(251, 191, 36, 0.15)",
              color: "var(--accent)",
              border: "1px solid rgba(251, 191, 36, 0.35)",
              opacity: handoffLoading ? 0.5 : 1,
            }}
          >
            {handoffLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Mark Playmats Sent to Dragon Shield
          </button>
        )}
      </div>
    </div>
  );
}
