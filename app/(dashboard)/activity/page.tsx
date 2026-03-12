"use client";

import { useState } from "react";
import useSWR from "swr";
import { ChevronLeft, ChevronRight, ScrollText } from "lucide-react";
import ActivityTable from "@/components/activity/activity-table";
import ActivityFilters, {
  ActivityFilterValues,
} from "@/components/activity/activity-filters";
import type { ActivityEntry } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ActivityResponse {
  data: ActivityEntry[];
  total: number;
  page: number;
  totalPages: number;
}

export default function ActivityPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ActivityFilterValues>({
    action: "",
    entity_type: "",
    from: "",
    to: "",
  });

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", "20");
  if (filters.action) params.set("action", filters.action);
  if (filters.entity_type) params.set("entity_type", filters.entity_type);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);

  const { data, isLoading } = useSWR<ActivityResponse>(
    `/api/activity?${params.toString()}`,
    fetcher,
    { keepPreviousData: true }
  );

  function handleFilterChange(newFilters: ActivityFilterValues) {
    setFilters(newFilters);
    setPage(1);
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="p-2 rounded-lg"
            style={{ background: "var(--accent-light)" }}
          >
            <ScrollText
              className="w-5 h-5"
              style={{ color: "var(--accent)" }}
            />
          </div>
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Activity Log
            </h1>
            <p
              className="text-sm mt-0.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Track all changes made through the dashboard
            </p>
          </div>
        </div>
      </div>

      <div
        className="rounded-xl border overflow-hidden"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border)",
        }}
      >
        <div
          className="p-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <ActivityFilters values={filters} onChange={handleFilterChange} />
        </div>

        <div className="p-4">
          <ActivityTable
            data={data?.data || []}
            loading={isLoading}
          />
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3 border-t"
            style={{ borderColor: "var(--border)" }}
          >
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Page {data.page} of {data.totalPages} ({data.total} entries)
            </span>
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm transition-colors disabled:opacity-40"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-secondary)",
                }}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </button>
              <button
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm transition-colors disabled:opacity-40"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-secondary)",
                }}
                disabled={page >= (data?.totalPages || 1)}
                onClick={() =>
                  setPage((p) => Math.min(data?.totalPages || 1, p + 1))
                }
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
