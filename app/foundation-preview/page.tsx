"use client";

import { useState } from "react";
import PageHeader from "@/components/dashboard/page-header";
import StatusCard from "@/components/dashboard/status-card";
import ContentCard from "@/components/dashboard/content-card";
import SectionHeader from "@/components/dashboard/section-header";
import LoadingSurface from "@/components/dashboard/loading-surface";
import EmptyState from "@/components/dashboard/empty-state";
import Tabs from "@/components/dashboard/tabs";
import FilterBar from "@/components/dashboard/filter-bar";
import CollapsibleCard from "@/components/dashboard/collapsible-card";
import { Plus, Inbox, Trophy, Gem, Shield, Dices, Terminal } from "lucide-react";

export default function FoundationPreview() {
  const [tab, setTab] = useState("prizes");
  const [filter, setFilter] = useState("all");
  return (
    <div className="min-h-screen p-8" style={{ background: "var(--bg-page)" }}>
      <div className="max-w-6xl mx-auto space-y-12">
        <section>
          <h2
            className="text-xs font-mono uppercase tracking-wider mb-4"
            style={{ color: "var(--text-muted)" }}
          >
            PageHeader
          </h2>
          <PageHeader
            title="Sample Page"
            subtitle="Subtitle describing the page"
            action={
              <button
                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{
                  background: "var(--accent-light)",
                  color: "var(--accent)",
                }}
              >
                Sample Action
              </button>
            }
          />
        </section>

        <section>
          <h2
            className="text-xs font-mono uppercase tracking-wider mb-4"
            style={{ color: "var(--text-muted)" }}
          >
            StatusCard
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatusCard
              title="Planning"
              value="4 of 6"
              subtitle="prizes planned for next month"
              action={{ label: "Open planner", onClick: () => alert("planner") }}
            />
            <StatusCard
              title="Distribution"
              value="12 of 16"
              subtitle="shipped this month"
              action={{ label: "View detail", onClick: () => alert("detail") }}
            />
            <StatusCard
              title="Inventory"
              value="24 cards"
              subtitle="€312 stock value"
              action={{ label: "Add order", onClick: () => alert("order") }}
            />
          </div>
        </section>

        <section>
          <h2
            className="text-xs font-mono uppercase tracking-wider mb-4"
            style={{ color: "var(--text-muted)" }}
          >
            ContentCard
          </h2>
          <div className="space-y-4">
            <ContentCard>
              <p style={{ color: "var(--text-primary)" }}>
                Default padded ContentCard. Use this for forms, paragraphs, or content that should breathe.
              </p>
            </ContentCard>
            <ContentCard padding="none">
              <div
                className="p-4 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                Tightly-fitted header (padding=&quot;none&quot;)
              </div>
              <div className="p-4" style={{ color: "var(--text-secondary)" }}>
                Body content. Useful when child needs to render edge-to-edge (tables, tab strips).
              </div>
            </ContentCard>
          </div>
        </section>

        <section>
          <h2
            className="text-xs font-mono uppercase tracking-wider mb-4"
            style={{ color: "var(--text-muted)" }}
          >
            SectionHeader
          </h2>
          <ContentCard>
            <SectionHeader
              title="Transactions"
              action={
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{
                    background: "var(--accent-light)",
                    color: "var(--accent)",
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              }
            />
            <p style={{ color: "var(--text-secondary)" }}>
              (table or list body would go here)
            </p>
          </ContentCard>
        </section>

        <section>
          <h2
            className="text-xs font-mono uppercase tracking-wider mb-4"
            style={{ color: "var(--text-muted)" }}
          >
            LoadingSurface
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LoadingSurface />
            <LoadingSurface message="Loading transactions..." />
          </div>
        </section>

        <section>
          <h2
            className="text-xs font-mono uppercase tracking-wider mb-4"
            style={{ color: "var(--text-muted)" }}
          >
            EmptyState
          </h2>
          <ContentCard padding="none">
            <EmptyState
              icon={Inbox}
              title="No transactions yet"
              subtitle="Add your first transaction to get started."
              action={{ label: "Add transaction", onClick: () => alert("add") }}
            />
          </ContentCard>
        </section>

        <section>
          <h2
            className="text-xs font-mono uppercase tracking-wider mb-4"
            style={{ color: "var(--text-muted)" }}
          >
            Tabs
          </h2>
          <ContentCard padding="none">
            <Tabs
              items={[
                { key: "prizes", label: "Prizes", icon: Trophy },
                { key: "pods", label: "Treasure Pods", icon: Gem },
                { key: "shield", label: "Dragon Shield", icon: Shield },
              ]}
              active={tab}
              onChange={setTab}
              action={
                <button
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Dices className="w-3.5 h-3.5" />
                  Most Games Raffle
                </button>
              }
            />
            <div
              className="p-4"
              style={{ color: "var(--text-secondary)" }}
            >
              Active tab: <strong>{tab}</strong>
            </div>
          </ContentCard>
        </section>

        <section>
          <h2
            className="text-xs font-mono uppercase tracking-wider mb-4"
            style={{ color: "var(--text-muted)" }}
          >
            FilterBar
          </h2>
          <ContentCard>
            <FilterBar
              chips={[
                { key: "patreon", label: "Patreon", count: 18 },
                { key: "kofi", label: "Ko-fi", count: 12 },
                { key: "free", label: "Free", count: 8 },
                { key: "manual", label: "Manual", count: 5 },
                { key: "not_playing", label: "Paying not playing", count: 4 },
              ]}
              active={filter}
              onChange={setFilter}
            />
            <p
              className="mt-3 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Active filter: <strong>{filter}</strong>
            </p>
          </ContentCard>
        </section>

        <section>
          <h2
            className="text-xs font-mono uppercase tracking-wider mb-4"
            style={{ color: "var(--text-muted)" }}
          >
            CollapsibleCard
          </h2>
          <div className="space-y-3">
            <CollapsibleCard
              title="Heroku Logs (eclBot)"
              icon={<Terminal className="w-4 h-4" />}
            >
              <div className="p-4" style={{ color: "var(--text-secondary)" }}>
                Body content shows when expanded.
              </div>
            </CollapsibleCard>
            <CollapsibleCard title="Dashboard Error Log" defaultOpen>
              <div className="p-4" style={{ color: "var(--text-secondary)" }}>
                Open by default.
              </div>
            </CollapsibleCard>
          </div>
        </section>
      </div>
    </div>
  );
}
