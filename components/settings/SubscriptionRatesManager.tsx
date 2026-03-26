"use client";

import { useState } from "react";
import useSWR from "swr";
import type { SubscriptionRate } from "@/lib/types";
import { Sensitive } from "@/components/dashboard/sensitive";
import { useSensitiveData } from "@/contexts/SensitiveDataContext";
import { fetcher } from "@/lib/fetcher";

export default function SubscriptionRatesManager() {
  const { data, mutate } = useSWR<{ data: SubscriptionRate[] }>(
    "/api/finance/subscription-rates",
    fetcher
  );

  const rates = data?.data || [];
  const { hidden: sensitiveHidden } = useSensitiveData();

  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [patreonNet, setPatreonNet] = useState("5.79");
  const [kofiNet, setKofiNet] = useState("5.63");
  const [manualNet, setManualNet] = useState("6.50");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveFrom) return;

    setSaving(true);
    try {
      const res = await fetch("/api/finance/subscription-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          effective_from: effectiveFrom,
          patreon_net: parseFloat(patreonNet),
          kofi_net: parseFloat(kofiNet),
          manual_net: parseFloat(manualNet),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to save");
        return;
      }

      mutate();
      setEffectiveFrom("");
    } catch {
      alert("Failed to save rate");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 py-2">
      {/* Rate history table */}
      {rates.length > 0 && (
        <div className="overflow-x-auto" style={{
          background: "rgba(255, 255, 255, 0.015)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          overflow: "hidden",
        }}>
          <table className="w-full text-sm">
            <thead>
              <tr
                style={{
                  color: "var(--text-muted)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <th className="px-3 py-2.5 text-left font-medium">Effective From</th>
                <th className="px-3 py-2.5 text-right font-medium">Patreon Net</th>
                <th className="px-3 py-2.5 text-right font-medium">Ko-fi Net</th>
                <th className="px-3 py-2.5 text-right font-medium">Manual Net</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((rate) => (
                <tr
                  key={rate.effective_from}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <td className="px-3 py-2">{rate.effective_from}</td>
                  <td className="px-3 py-2 text-right">
                    <Sensitive placeholder="€•••••">&euro;{rate.patreon_net.toFixed(2)}</Sensitive>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Sensitive placeholder="€•••••">&euro;{rate.kofi_net.toFixed(2)}</Sensitive>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Sensitive placeholder="€•••••">&euro;{rate.manual_net.toFixed(2)}</Sensitive>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add new rate form */}
      {sensitiveHidden ? (
        <div
          className="flex items-center justify-center gap-2 rounded-lg py-6"
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px dashed var(--border)",
            color: "var(--text-muted)",
          }}
        >
          <span className="text-sm">Rate editing hidden in privacy mode</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Add new rates (applies from the selected month onward, does not affect
            previous months).
          </p>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label
                className="mb-1 block text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Effective From
              </label>
              <input
                type="month"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                required
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{
                  background: "var(--bg-page)",
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <div>
              <label
                className="mb-1 block text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Patreon Net (&euro;)
              </label>
              <input
                type="number"
                step="0.01"
                value={patreonNet}
                onChange={(e) => setPatreonNet(e.target.value)}
                required
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{
                  background: "var(--bg-page)",
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <div>
              <label
                className="mb-1 block text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Ko-fi Net (&euro;)
              </label>
              <input
                type="number"
                step="0.01"
                value={kofiNet}
                onChange={(e) => setKofiNet(e.target.value)}
                required
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{
                  background: "var(--bg-page)",
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <div>
              <label
                className="mb-1 block text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Manual Net (&euro;)
              </label>
              <input
                type="number"
                step="0.01"
                value={manualNet}
                onChange={(e) => setManualNet(e.target.value)}
                required
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{
                  background: "var(--bg-page)",
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !effectiveFrom}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{
              background: "rgba(251, 191, 36, 0.15)",
              color: "var(--accent)",
              border: "1px solid rgba(251, 191, 36, 0.35)",
              backdropFilter: "blur(8px)",
              opacity: saving || !effectiveFrom ? 0.6 : 1,
            }}
          >
            {saving ? "Saving..." : "Add Rate"}
          </button>
        </form>
      )}

    </div>
  );
}
