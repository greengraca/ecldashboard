"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Check, Loader2, Undo2 } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import type { DragonShieldMonth, PlayerAddress } from "@/lib/types";

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
  const codes = data?.codes || [];
  const top4 = codes.slice(0, 4);

  const { data: allAddresses } = useSWR<{ data: PlayerAddress[] }>("/api/players/addresses", fetcher);
  const addressMap = new Map((allAddresses?.data || []).map((a) => [a.player_uid, a]));

  const [forms, setForms] = useState<Record<string, AddressForm>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [handoffLoading, setHandoffLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Initialize forms from saved addresses
  useEffect(() => {
    const initial: Record<string, AddressForm> = {};
    top4.forEach((code) => {
      if (code.player_uid) {
        const saved = addressMap.get(code.player_uid);
        if (saved) {
          initial[code.player_uid] = {
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
  }, [allAddresses, codes.length]); // eslint-disable-line react-hooks/exhaustive-deps

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
        Load sleeve codes first to see Top 4 players.
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {top4.map((code, i) => {
          const uid = code.player_uid || `unknown-${i}`;
          const form = getForm(uid);
          const isSaving = saving === uid;

          return (
            <div
              key={uid}
              className="rounded-lg p-3"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{code.player_name}</div>
                  <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{PLACEMENT_LABELS[i]}</div>
                </div>
                <button
                  onClick={() => saveAddress(uid, code.player_name)}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium"
                  style={{ background: "var(--accent)", color: "#fff", opacity: isSaving ? 0.5 : 1 }}
                >
                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Save
                </button>
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
                      background: "var(--bg-primary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border)",
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
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium w-full justify-center"
            style={{ background: "var(--accent)", color: "#fff", opacity: handoffLoading ? 0.5 : 1 }}
          >
            {handoffLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Mark Playmats Sent to Dragon Shield
          </button>
        )}
      </div>
    </div>
  );
}
