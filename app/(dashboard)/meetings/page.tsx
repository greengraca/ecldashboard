"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import ConfirmModal from "@/components/dashboard/confirm-modal";
import { Sensitive } from "@/components/dashboard/sensitive";
import dynamic from "next/dynamic";
import {
  Users2,
  ArrowLeft,
  Radio,
  Square,
  Trash2,
  Loader2,
  Trophy,
} from "lucide-react";
import MeetingTable from "@/components/meetings/MeetingTable";
import MeetingNotes from "@/components/meetings/MeetingNotes";
import MeetingHistory from "@/components/meetings/MeetingHistory";
import DetectionPanel from "@/components/meetings/DetectionPanel";
import { fetcher } from "@/lib/fetcher";
import type { Meeting, MeetingNote, MeetingItem, UserMapping } from "@/lib/types";

const PrizePlannerModal = dynamic(() => import("@/components/prizes/prize-planner-modal"), { ssr: false });

type ViewState = "lobby" | "active" | "detection" | "history-detail";

interface MeetingsResponse {
  data: {
    active: Meeting | null;
    history: Meeting[];
  };
}

interface NotesResponse {
  data: MeetingNote[];
}

interface MeetingResponse {
  data: Meeting;
}

interface ItemsResponse {
  data: MeetingItem[];
}

interface MappingsResponse {
  data: UserMapping[];
}

function formatElapsed(startedAt: string): string {
  const elapsed = Date.now() - new Date(startedAt).getTime();
  const mins = Math.floor(elapsed / 60000);
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hrs > 0) return `${hrs}h ${rem}m`;
  return `${mins}m`;
}

export default function MeetingsPage() {
  const { data: sessionData } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentUserId = (sessionData?.user as any)?.discordId || sessionData?.user?.id || null;
  const [view, setView] = useState<ViewState>("lobby");
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [elapsedText, setElapsedText] = useState("");
  const [endedBanner, setEndedBanner] = useState(false);

  // Data fetching — poll every 30s in lobby to detect new sessions and attendee updates
  const { data: meetingsData, mutate: mutateMeetings } = useSWR<MeetingsResponse>(
    "/api/meetings",
    fetcher,
    { refreshInterval: view === "lobby" ? 30000 : 0 }
  );

  const { data: mappingsData } = useSWR<MappingsResponse>(
    "/api/user-mapping",
    fetcher
  );

  const activeId = meetingsData?.data?.active
    ? String(meetingsData.data.active._id)
    : null;

  // Poll active meeting every 5s (fast presence + join detection)
  // keepPreviousData: false overrides global SWR config so stale meeting data
  // is cleared immediately when the key becomes null (e.g. after ending a session)
  const { data: activeMeetingData } = useSWR<MeetingResponse>(
    view === "active" && activeId ? `/api/meetings/${activeId}` : null,
    fetcher,
    { refreshInterval: 5000, keepPreviousData: false }
  );

  // Poll notes every 5s during active session
  const { data: notesData, mutate: mutateNotes } = useSWR<NotesResponse>(
    view === "active" && activeId ? `/api/meetings/${activeId}/notes` : null,
    fetcher,
    { refreshInterval: 5000 }
  );

  // History detail notes (no polling)
  const { data: historyNotesData } = useSWR<NotesResponse>(
    view === "history-detail" && selectedMeetingId
      ? `/api/meetings/${selectedMeetingId}/notes`
      : null,
    fetcher
  );

  // History detail items
  const { data: historyItemsData } = useSWR<ItemsResponse>(
    view === "history-detail" && selectedMeetingId
      ? `/api/meetings/${selectedMeetingId}/items`
      : null,
    fetcher
  );

  // Detection items
  const [detectionItems, setDetectionItems] = useState<MeetingItem[]>([]);
  const [detectionMeeting, setDetectionMeeting] = useState<Meeting | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const isEndingRef = useRef(false);

  // Resolved data — only treat meetings with status "active" as active
  const rawActive = activeMeetingData?.data || meetingsData?.data?.active || null;
  const active = rawActive?.status === "active" ? rawActive : null;
  const history = meetingsData?.data?.history || [];
  const allMembers = mappingsData?.data || [];
  const notes = notesData?.data || [];

  // Enrich attendees with current avatars from user-mappings
  const enrichedAttendees = (active?.attendees || []).map((a) => {
    const mapping = allMembers.find((m) => m.discord_id === a.discord_id);
    return mapping?.avatar_url ? { ...a, avatar_url: mapping.avatar_url } : a;
  });

  // Filter to only present members for the active table view
  const presentIds = new Set(active?.present_ids || []);
  const presentAttendees = enrichedAttendees.filter((a) => presentIds.has(a.discord_id));

  // Send presence signal when entering/leaving the room
  useEffect(() => {
    if (view !== "active" || !activeId || !currentUserId) return;

    // Signal entering room
    fetch(`/api/meetings/${activeId}/presence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ present: true }),
    }).catch(() => {});

    // Signal leaving room on cleanup (view change, page unload)
    const signalLeave = () => {
      navigator.sendBeacon(
        `/api/meetings/${activeId}/presence`,
        new Blob([JSON.stringify({ present: false })], { type: "application/json" })
      );
    };

    window.addEventListener("beforeunload", signalLeave);
    return () => {
      window.removeEventListener("beforeunload", signalLeave);
      // Also signal leave when view changes away from active
      fetch(`/api/meetings/${activeId}/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ present: false }),
      }).catch(() => {});
    };
  }, [view, activeId, currentUserId]);

  // Detect when meeting is ended by another member (polled data shows status changed)
  useEffect(() => {
    if (isEndingRef.current) return;
    if (view === "active" && activeMeetingData?.data?.status === "ended") {
      // Optimistically clear active so lobby doesn't flash stale data
      mutateMeetings(
        (current) =>
          current
            ? { data: { active: null, history: current.data.history } }
            : current,
        { revalidate: true }
      );
      setEndedBanner(true);
      setView("lobby");
      setTimeout(() => setEndedBanner(false), 5000);
    }
  }, [view, activeMeetingData?.data?.status, mutateMeetings]);

  // Reset to lobby when sidebar link is clicked while already on this page
  useEffect(() => {
    const handleNavReset = () => {
      setSelectedMeetingId(null);
      setDetectionMeeting(null);
      setDetectionItems([]);
      setView("lobby");
    };
    window.addEventListener("nav-reset", handleNavReset);
    return () => window.removeEventListener("nav-reset", handleNavReset);
  }, []);

  // Elapsed time ticker
  useEffect(() => {
    if (view !== "active" || !active?.started_at) return;
    const tick = () => setElapsedText(formatElapsed(active.started_at));
    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, [view, active?.started_at]);

  // History detail meeting
  const selectedMeeting = selectedMeetingId
    ? history.find((m) => String(m._id) === selectedMeetingId) || null
    : null;

  // Actions
  const handleStartSession = useCallback(async () => {
    setIsStarting(true);
    try {
      const res = await fetch("/api/meetings", { method: "POST" });
      if (res.ok) {
        await mutateMeetings();
        setView("active");
      }
    } catch (err) {
      console.error("Failed to start session:", err);
    } finally {
      setIsStarting(false);
    }
  }, [mutateMeetings]);

  const handleJoinSession = useCallback(async () => {
    if (!activeId) return;
    try {
      await fetch(`/api/meetings/${activeId}/join`, { method: "POST" });
      await mutateMeetings();
      setView("active");
    } catch (err) {
      console.error("Failed to join session:", err);
    }
  }, [activeId, mutateMeetings]);

  const handleEndSession = useCallback(async () => {
    if (!activeId) return;
    isEndingRef.current = true;
    setIsEnding(true);
    try {
      // End the meeting
      const res = await fetch(`/api/meetings/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ended" }),
      });
      if (!res.ok) return;

      const endedMeeting = (await res.json()).data as Meeting;

      // Optimistically clear active session so lobby doesn't flash stale state
      mutateMeetings(
        (prev) => prev ? { ...prev, data: { ...prev.data, active: null, history: prev.data.history } } : prev,
        { revalidate: false }
      );

      // Auto-delete if no notes were taken
      if (notes.length === 0) {
        await fetch(`/api/meetings/${activeId}`, { method: "DELETE" });
        await mutateMeetings();
        setView("lobby");
        return;
      }

      // Run detection on sessions with notes
      const detectRes = await fetch(`/api/meetings/${activeId}/detect`, {
        method: "POST",
      });
      const detected = detectRes.ok ? (await detectRes.json()).data : [];

      setDetectionMeeting(endedMeeting);
      setDetectionItems(detected);
      setView("detection");
      await mutateMeetings();
    } catch (err) {
      console.error("Failed to end session:", err);
    } finally {
      isEndingRef.current = false;
      setIsEnding(false);
    }
  }, [activeId, notes.length, mutateMeetings]);

  const handleItemUpdate = useCallback(
    async (itemId: string, status: string) => {
      if (!detectionMeeting) return;
      const meetingId = String(detectionMeeting._id);
      try {
        const res = await fetch(
          `/api/meetings/${meetingId}/items/${itemId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          }
        );
        if (res.ok) {
          const updated = (await res.json()).data as MeetingItem;
          setDetectionItems((prev) =>
            prev.map((it) => (String(it._id) === itemId ? updated : it))
          );
        }
      } catch (err) {
        console.error("Failed to update item:", err);
      }
    },
    [detectionMeeting]
  );

  const handleConfirmDetection = useCallback(() => {
    setDetectionMeeting(null);
    setDetectionItems([]);
    setView("lobby");
    mutateMeetings();
  }, [mutateMeetings]);

  const handleSaveAsDoc = useCallback(() => {
    setDetectionMeeting(null);
    setDetectionItems([]);
    setView("lobby");
    mutateMeetings();
  }, [mutateMeetings]);

  const handleSelectHistoryMeeting = useCallback((id: string) => {
    setSelectedMeetingId(id);
    setView("history-detail");
  }, []);

  const handleDeleteMeeting = useCallback((id: string) => {
    setDeleteConfirmId(id);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirmId) return;
    try {
      await fetch(`/api/meetings/${deleteConfirmId}`, { method: "DELETE" });
      await mutateMeetings();
      // Always go back to lobby after deleting
      setSelectedMeetingId(null);
      setDetectionMeeting(null);
      setDetectionItems([]);
      setView("lobby");
    } catch (err) {
      console.error("Failed to delete meeting:", err);
    } finally {
      setDeleteConfirmId(null);
    }
  }, [deleteConfirmId, mutateMeetings]);

  const handleBackToLobby = useCallback(() => {
    setSelectedMeetingId(null);
    setView("lobby");
  }, []);

  // ─── Render ───

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mb-1">
            <div
              className="p-2 rounded-lg"
              style={{ background: "var(--accent-light)" }}
            >
              <Users2
                className="w-5 h-5"
                style={{ color: "var(--accent)" }}
              />
            </div>
            <div>
              <h1
                className="text-2xl font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                Meeting Room
              </h1>
              <p
                className="text-sm mt-0.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Live team meetings with note-taking
              </p>
            </div>
          </div>
          <button
            onClick={() => setPlannerOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: "rgba(251,191,36,0.12)",
              color: "var(--accent)",
              border: "1px solid rgba(251,191,36,0.25)",
            }}
          >
            <Trophy className="w-4 h-4" />
            Prize Planner
          </button>
        </div>
      </div>

      {/* "Session ended" banner */}
      {endedBanner && (
        <div
          className="rounded-lg px-4 py-3 mb-4 flex items-center gap-2 text-sm font-medium"
          style={{
            background: "rgba(251,191,36,0.1)",
            color: "var(--accent)",
            border: "1px solid var(--accent-border)",
          }}
        >
          The session was ended by another member.
        </div>
      )}

      {/* ─── Lobby View ─── */}
      {view === "lobby" && (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-[300px_1fr]">
          <MeetingTable
            attendees={presentAttendees}
            allMembers={allMembers}
            isActive={!!active}
            isInRoom={false}
            isLoading={isStarting}
            onStartSession={!active ? handleStartSession : undefined}
            onJoinSession={active ? handleJoinSession : undefined}
          />
          <MeetingHistory
            meetings={history}
            allMembers={allMembers}
            onSelectMeeting={handleSelectHistoryMeeting}
            onDeleteMeeting={handleDeleteMeeting}
          />
        </div>
      )}

      {/* ─── Active View ─── */}
      {view === "active" && active && (
        <div>
          {/* Top bar */}
          <div
            className="rounded-xl px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-3"
            style={{
              background: "var(--surface-gradient)",
              backdropFilter: "var(--surface-blur)",
              border: "var(--surface-border)",
            }}
          >
            <div className="flex items-center gap-3 md:gap-4 flex-wrap">
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: "14px",
                  color: "var(--accent)",
                }}
              >
                Meeting #{active.number}
              </span>
              <span
                style={{ fontSize: "12px", color: "var(--text-muted)" }}
              >
                {active.date}
              </span>
              <span
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(239,68,68,0.12)",
                  color: "#ef4444",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                <Radio className="w-3 h-3" />
                LIVE
              </span>
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {elapsedText}
              </span>
            </div>
            <button
              onClick={() => setEndConfirmOpen(true)}
              disabled={isEnding}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              style={{
                background: "rgba(239,68,68,0.12)",
                color: "#ef4444",
                border: "1px solid rgba(239,68,68,0.25)",
              }}
            >
              {isEnding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />}
              {isEnding ? "Ending..." : "End Session"}
            </button>
          </div>

          {/* Two-column: table + notes */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-[280px_1fr]">
            <MeetingTable
              attendees={presentAttendees}
              isActive={true}
              isInRoom={true}
            />
            <MeetingNotes
              meetingId={String(active._id)}
              notes={notes}
              onNoteAdded={() => mutateNotes()}
            />
          </div>
        </div>
      )}

      {/* ─── Detection View ─── */}
      {view === "detection" && detectionMeeting && (
        <DetectionPanel
          meeting={detectionMeeting}
          items={detectionItems}
          onItemUpdate={handleItemUpdate}
          onConfirm={handleConfirmDetection}
          onSaveAsDoc={handleSaveAsDoc}
          onDiscard={() => handleDeleteMeeting(String(detectionMeeting._id))}
        />
      )}

      {/* ─── History Detail View ─── */}
      {view === "history-detail" && selectedMeeting && (
        <div>
          {/* Back + Discard */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleBackToLobby}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all"
              style={{
                color: "var(--text-secondary)",
                background: "transparent",
                border: "none",
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Lobby
            </button>
            <button
              onClick={() => handleDeleteMeeting(String(selectedMeeting._id))}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: "rgba(252,165,165,0.08)",
                color: "var(--error)",
                border: "1px solid rgba(252,165,165,0.2)",
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Discard Meeting
            </button>
          </div>

          {/* Meeting info header */}
          <div
            className="rounded-xl px-5 py-4 mb-4"
            style={{
              background: "var(--surface-gradient)",
              backdropFilter: "var(--surface-blur)",
              border: "var(--surface-border)",
            }}
          >
            <div className="flex items-center gap-4 mb-2">
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: "14px",
                  color: "var(--accent)",
                }}
              >
                Meeting #{selectedMeeting.number}
              </span>
              <span
                style={{ fontSize: "12px", color: "var(--text-muted)" }}
              >
                {selectedMeeting.date}
              </span>
            </div>
            <h2
              className="text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {selectedMeeting.title}
            </h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {selectedMeeting.attendees.map((a) => (
                <span
                  key={a.discord_id}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: `rgba(${hexToRgb(getColorHex(a.color))}, 0.12)`,
                    color: getColorHex(a.color),
                  }}
                >
                  <Sensitive>{a.display_name}</Sensitive>
                </span>
              ))}
            </div>
          </div>

          {/* Notes (read-only) */}
          <div className={`grid gap-6 grid-cols-1 ${historyItemsData?.data?.length ? "md:grid-cols-[1fr_360px]" : ""}`}>
            <div
              className="rounded-2xl"
              style={{
                background: "var(--surface-gradient)",
                backdropFilter: "var(--surface-blur)",
                border: "var(--surface-border)",
                boxShadow: "var(--surface-shadow)",
              }}
            >
              <div
                className="px-4 py-3 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <h3
                  style={{
                    fontFamily: "var(--font-mono)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  Notes
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {(!historyNotesData?.data || historyNotesData.data.length === 0) && (
                  <p
                    className="text-center py-6"
                    style={{ color: "var(--text-muted)", fontSize: "13px" }}
                  >
                    No notes were recorded
                  </p>
                )}
                {historyNotesData?.data?.map((note) => {
                  const color = getColorHex(note.author_color);
                  return (
                    <div
                      key={String(note._id)}
                      className="pl-3"
                      style={{ borderLeft: `3px solid ${color}` }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold" style={{ color }}>
                          <Sensitive>{note.author_name}</Sensitive>
                        </span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {new Date(note.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {note.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Items (if any) */}
            {historyItemsData?.data && historyItemsData.data.length > 0 && (
              <div
                className="rounded-2xl"
                style={{
                  background: "var(--surface-gradient)",
                  backdropFilter: "var(--surface-blur)",
                  border: "var(--surface-border)",
                  boxShadow: "var(--surface-shadow)",
                }}
              >
                <div
                  className="px-4 py-3 border-b"
                  style={{ borderColor: "var(--border)" }}
                >
                  <h3
                    style={{
                      fontFamily: "var(--font-mono)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    Detected Items
                  </h3>
                </div>
                <div className="p-4 space-y-2">
                  {historyItemsData.data.map((item) => (
                    <MeetingItemCardReadOnly key={String(item._id)} item={item} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* End session confirmation modal */}
      <ConfirmModal
        open={endConfirmOpen}
        onClose={() => setEndConfirmOpen(false)}
        onConfirm={() => {
          setEndConfirmOpen(false);
          handleEndSession();
        }}
        title="End Session"
        message="Are you sure you want to end the current session? This will close the meeting for all participants."
        confirmLabel="End Session"
        variant="danger"
      />

      {/* Delete confirmation modal */}
      <ConfirmModal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleConfirmDelete}
        title="Discard Meeting"
        message="This will permanently delete this meeting, all its notes, and any detected items. This action cannot be undone."
        confirmLabel="Discard"
        variant="danger"
      />

      {/* Prize Planner modal */}
      <PrizePlannerModal
        open={plannerOpen}
        onClose={() => setPlannerOpen(false)}
      />
    </div>
  );
}

// ─── Helpers ───

const COLOR_HEX: Record<string, string> = {
  amber: "#fbbf24",
  blue: "#60a5fa",
  green: "#34d399",
  purple: "#a855f7",
  red: "#fca5a5",
};

function getColorHex(color: string): string {
  return COLOR_HEX[color] || COLOR_HEX.amber;
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// Read-only item card for history view
function MeetingItemCardReadOnly({ item }: { item: MeetingItem }) {
  const TYPE_STYLES: Record<string, { label: string; color: string; bg: string }> = {
    task: { label: "Task", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
    deadline: { label: "Deadline", color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
    prize: { label: "Prize", color: "#a855f7", bg: "rgba(168,85,247,0.12)" },
  };
  const typeStyle = TYPE_STYLES[item.type] || TYPE_STYLES.task;

  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid var(--border)",
        opacity: item.status === "dismissed" ? 0.4 : 1,
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="px-1.5 py-0.5 rounded text-xs font-semibold"
          style={{ background: typeStyle.bg, color: typeStyle.color }}
        >
          {typeStyle.label}
        </span>
        <span
          className="text-xs"
          style={{
            color: item.status === "accepted"
              ? "var(--success)"
              : item.status === "dismissed"
              ? "var(--text-muted)"
              : "var(--accent)",
          }}
        >
          {item.status}
        </span>
      </div>
      <p className="text-sm" style={{ color: "var(--text-primary)" }}>
        {item.title}
      </p>
    </div>
  );
}
