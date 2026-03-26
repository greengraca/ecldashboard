"use client";

import { useState } from "react";
import useSWR from "swr";
import { ChevronLeft, ChevronRight, ScrollText, Terminal, AlertTriangle } from "lucide-react";
import ActivityTable from "@/components/activity/activity-table";
import ActivityFilters, {
  ActivityFilterValues,
} from "@/components/activity/activity-filters";
import Accordion from "@/components/dashboard/accordion";
import HerokuLogViewer from "@/components/activity/heroku-log-viewer";
import ErrorLogViewer from "@/components/activity/error-log-viewer";
import type { ActivityEntry } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";

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
  const [herokuOpen, setHerokuOpen] = useState(false);
  const [errorLogOpen, setErrorLogOpen] = useState(false);

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", "10");
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
        className="rounded-xl overflow-hidden"
        style={{
          background: "rgba(255, 255, 255, 0.015)",
          border: "1px solid var(--border)",
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
            className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t"
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

      {/* Heroku Logs Accordion */}
      <div className="mt-6">
        <Accordion
          title="Heroku Logs (eclBot)"
          icon={<Terminal className="w-4 h-4" />}
          onToggle={setHerokuOpen}
        >
          <HerokuLogViewer active={herokuOpen} />
        </Accordion>
      </div>

      {/* Dashboard Error Log Accordion */}
      <div className="mt-4">
        <Accordion
          title="Dashboard Error Log"
          icon={<AlertTriangle className="w-4 h-4" />}
          onToggle={setErrorLogOpen}
        >
          <ErrorLogViewer active={errorLogOpen} />
        </Accordion>
      </div>
    </div>
  );
}
