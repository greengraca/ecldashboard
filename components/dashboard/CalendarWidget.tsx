"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import useSWR from "swr";
import { ChevronLeft, ChevronRight, Plus, Trash2, Loader2 } from "lucide-react";
import Modal from "@/components/dashboard/modal";
import Select from "@/components/dashboard/select";
import type { CalendarEvent, CalendarEventType } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json()).then((d) => d.data);

// ─── Event type styling ───

const EVENT_TYPE_STYLES: Record<CalendarEventType, { color: string; bg: string; label: string }> = {
  league:   { color: "var(--success)",  bg: "rgba(52, 211, 153, 0.12)",  label: "League" },
  feature:  { color: "var(--info)",     bg: "rgba(96, 165, 250, 0.12)",  label: "Feature" },
  deadline: { color: "var(--accent)",   bg: "rgba(251, 191, 36, 0.12)",  label: "Deadline" },
  urgent:   { color: "var(--error)",    bg: "rgba(252, 165, 165, 0.12)", label: "Urgent" },
  meeting:  { color: "var(--meeting)",  bg: "var(--meeting-light)",      label: "Meeting" },
};

const EVENT_TYPE_OPTIONS = Object.entries(EVENT_TYPE_STYLES).map(([value, { label }]) => ({
  value,
  label,
}));

// ─── Calendar grid helpers ───

function getMonthData(year: number, month: number) {
  // month is 0-indexed
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // ISO weekday: 0=Mon ... 6=Sun
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const prevMonthDays = new Date(year, month, 0).getDate();

  return { daysInMonth, startDow, prevMonthDays };
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const date = new Date(y, m - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MAX_VISIBLE_PILLS = 2;

// ─── Component ───

export default function CalendarWidget() {
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [prefillDate, setPrefillDate] = useState<string | null>(null);

  const { data: events, isLoading, mutate } = useSWR<CalendarEvent[]>(
    `/api/calendar/events?month=${currentMonth}`,
    fetcher
  );

  // Parse year/month from currentMonth
  const [year, month] = useMemo(() => {
    const [y, m] = currentMonth.split("-").map(Number);
    return [y, m];
  }, [currentMonth]);

  const { daysInMonth, startDow, prevMonthDays } = useMemo(
    () => getMonthData(year, month - 1),
    [year, month]
  );

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    if (!events) return map;
    for (const ev of events) {
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    }
    return map;
  }, [events]);

  // Today string
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  // Build grid cells
  const cells = useMemo(() => {
    const result: Array<{ day: number; dateStr: string; inMonth: boolean }> = [];

    // Previous month padding
    for (let i = startDow - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prev = shiftMonth(currentMonth, -1);
      result.push({ day: d, dateStr: `${prev}-${String(d).padStart(2, "0")}`, inMonth: false });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      result.push({
        day: d,
        dateStr: `${currentMonth}-${String(d).padStart(2, "0")}`,
        inMonth: true,
      });
    }

    // Next month padding (fill to complete rows)
    const remainder = result.length % 7;
    if (remainder > 0) {
      const next = shiftMonth(currentMonth, 1);
      for (let d = 1; d <= 7 - remainder; d++) {
        result.push({ day: d, dateStr: `${next}-${String(d).padStart(2, "0")}`, inMonth: false });
      }
    }

    return result;
  }, [currentMonth, daysInMonth, startDow, prevMonthDays]);

  // Handlers
  const handlePrev = useCallback(() => setCurrentMonth((m) => shiftMonth(m, -1)), []);
  const handleNext = useCallback(() => setCurrentMonth((m) => shiftMonth(m, 1)), []);
  const handleToday = useCallback(() => setCurrentMonth(getCurrentMonth()), []);

  const openCreateModal = useCallback((dateStr: string) => {
    setEditingEvent(null);
    setPrefillDate(dateStr);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((ev: CalendarEvent) => {
    setEditingEvent(ev);
    setPrefillDate(null);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingEvent(null);
    setPrefillDate(null);
  }, []);

  return (
    <div
      style={{
        background: "var(--surface-gradient)",
        border: "var(--surface-border)",
        boxShadow: "var(--surface-shadow)",
        backdropFilter: "var(--surface-blur)",
        borderRadius: "12px",
      }}
      className="p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--text-primary)",
            fontSize: "22px",
          }}
        >
          {formatMonthLabel(currentMonth)}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToday}
            className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
            style={{
              background: "rgba(251, 191, 36, 0.15)",
              color: "var(--accent)",
              border: "1px solid var(--accent-border)",
            }}
          >
            Today
          </button>
          <button
            onClick={handlePrev}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center py-1.5"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              color: "var(--text-muted)",
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-muted)" }} />
        </div>
      ) : (
        <div
          className="grid grid-cols-7"
          style={{ border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}
        >
          {cells.map((cell, idx) => {
            const dayEvents = eventsByDate[cell.dateStr] || [];
            const isToday = cell.dateStr === todayStr;
            const overflow = dayEvents.length > MAX_VISIBLE_PILLS;
            const visibleEvents = overflow ? dayEvents.slice(0, MAX_VISIBLE_PILLS) : dayEvents;
            const moreCount = dayEvents.length - MAX_VISIBLE_PILLS;

            return (
              <div
                key={idx}
                onClick={() => openCreateModal(cell.dateStr)}
                className="min-h-[80px] p-1.5 cursor-pointer transition-colors"
                style={{
                  opacity: cell.inMonth ? 1 : 0.3,
                  borderRight: (idx + 1) % 7 !== 0 ? "1px solid var(--border)" : undefined,
                  borderBottom:
                    idx < cells.length - 7 ? "1px solid var(--border)" : undefined,
                  background: "transparent",
                  ...(isToday && cell.inMonth
                    ? { boxShadow: "inset 0 0 0 2px var(--accent)" }
                    : {}),
                }}
                onMouseEnter={(e) => {
                  if (cell.inMonth)
                    e.currentTarget.style.background = "var(--bg-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {/* Day number */}
                <div
                  className="text-xs font-medium mb-0.5"
                  style={{
                    color: isToday && cell.inMonth ? "var(--accent)" : "var(--text-secondary)",
                    fontWeight: isToday ? 700 : 500,
                  }}
                >
                  {cell.day}
                </div>

                {/* Event pills */}
                <div className="flex flex-col gap-0.5">
                  {visibleEvents.map((ev) => {
                    const style = EVENT_TYPE_STYLES[ev.type] || EVENT_TYPE_STYLES.league;
                    return (
                      <div
                        key={String(ev._id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(ev);
                        }}
                        className="px-1.5 py-0.5 rounded text-[10px] leading-tight truncate cursor-pointer transition-opacity hover:opacity-80"
                        style={{
                          background: style.bg,
                          color: style.color,
                          fontWeight: 500,
                        }}
                        title={ev.title}
                      >
                        {ev.title}
                      </div>
                    );
                  })}
                  {overflow && (
                    <div
                      className="px-1.5 py-0.5 text-[10px] leading-tight"
                      style={{ color: "var(--text-muted)", fontWeight: 500 }}
                    >
                      +{moreCount} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
        {Object.entries(EVENT_TYPE_STYLES).map(([type, style]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ background: style.color }}
            />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                color: "var(--text-muted)",
              }}
            >
              {style.label}
            </span>
          </div>
        ))}
      </div>

      {/* Event Form Modal */}
      <EventFormModal
        open={modalOpen}
        onClose={closeModal}
        event={editingEvent}
        prefillDate={prefillDate}
        onSaved={() => {
          mutate();
          closeModal();
        }}
      />
    </div>
  );
}

// ─── Event Form Modal ───

interface EventFormModalProps {
  open: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  prefillDate: string | null;
  onSaved: () => void;
}

function EventFormModal({ open, onClose, event, prefillDate, onSaved }: EventFormModalProps) {
  const isEdit = !!event;

  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>("league");
  const [date, setDate] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  const prevOpenRef = useRef(false);
  if (open && !prevOpenRef.current) {
    if (event) {
      setTitle(event.title);
      setType(event.type);
      setDate(event.date);
      setRecurring(event.recurring);
    } else {
      setTitle("");
      setType("league");
      setDate(prefillDate || "");
      setRecurring(false);
    }
    setError(null);
  }
  prevOpenRef.current = open;

  async function handleSave() {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!date) {
      setError("Date is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const body = { title: title.trim(), type, date, recurring };

      if (isEdit) {
        const res = await fetch(`/api/calendar/events/${event._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update event");
        }
      } else {
        const res = await fetch("/api/calendar/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create event");
        }
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!event) return;
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/calendar/events/${event._id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete event");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Event" : "New Event"}
    >
      <div className="flex flex-col gap-4">
        {/* Title */}
        <div>
          <label
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              color: "var(--text-muted)",
            }}
          >
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none transition-colors"
            style={{
              background: "var(--bg-page)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          />
        </div>

        {/* Type */}
        <div>
          <label
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              color: "var(--text-muted)",
            }}
          >
            Type
          </label>
          <div className="mt-1">
            <Select
              value={type}
              onChange={setType}
              options={EVENT_TYPE_OPTIONS}
              className="w-full"
            />
          </div>
        </div>

        {/* Date */}
        <div>
          <label
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              color: "var(--text-muted)",
            }}
          >
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none transition-colors"
            style={{
              background: "var(--bg-page)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              colorScheme: "dark",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          />
        </div>

        {/* Recurring toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRecurring(!recurring)}
            className="w-9 h-5 rounded-full transition-colors relative"
            style={{
              background: recurring ? "var(--accent)" : "var(--border)",
            }}
          >
            <div
              className="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
              style={{
                background: recurring ? "var(--accent-text)" : "var(--text-secondary)",
                left: recurring ? "18px" : "2px",
              }}
            />
          </button>
          <span
            className="text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Recurring
          </span>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm" style={{ color: "var(--error)" }}>
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-2">
          <div>
            {isEdit && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors"
                style={{
                  color: "var(--error)",
                  background: deleting ? "var(--error-light)" : "transparent",
                  border: "1px solid var(--error-border)",
                }}
              >
                {deleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Delete
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm transition-colors"
              style={{
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: "rgba(251, 191, 36, 0.15)",
                color: "var(--accent)",
                border: "1px solid var(--accent-border)",
              }}
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : !isEdit ? (
                <Plus className="w-3.5 h-3.5" />
              ) : null}
              {isEdit ? "Save" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
