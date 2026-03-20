"use client";

import { useState } from "react";
import useSWR from "swr";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ErrorLogTable from "./error-log-table";
import ErrorLogFilters, { ErrorLogFilterValues } from "./error-log-filters";
import type { ErrorLogEntry } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ErrorLogResponse {
  data: ErrorLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

interface ErrorLogViewerProps {
  active: boolean;
}

export default function ErrorLogViewer({ active }: ErrorLogViewerProps) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ErrorLogFilterValues>({
    level: "",
    source: "",
    from: "",
    to: "",
  });

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", "20");
  if (filters.level) params.set("level", filters.level);
  if (filters.source) params.set("source", filters.source);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);

  const { data, isLoading } = useSWR<ErrorLogResponse>(
    active ? `/api/error-log?${params.toString()}` : null,
    fetcher,
    { keepPreviousData: true }
  );

  function handleFilterChange(newFilters: ErrorLogFilterValues) {
    setFilters(newFilters);
    setPage(1);
  }

  return (
    <div>
      <div
        className="p-4 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <ErrorLogFilters values={filters} onChange={handleFilterChange} />
      </div>

      <div className="p-4">
        <ErrorLogTable data={data?.data || []} loading={active && isLoading} />
      </div>

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
  );
}
