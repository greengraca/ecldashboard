"use client";

import { useState, useCallback, useEffect, useTransition } from "react";
import useSWR from "swr";
import MonthPicker from "@/components/dashboard/month-picker";
import TemplateSelector from "@/components/media/TemplateSelector";
import TemplatePreview from "@/components/media/TemplatePreview";
import TemplateEditor from "@/components/media/TemplateEditor";
import AssetDrive from "@/components/media/drive/AssetDrive";
import { TEMPLATES } from "@/components/media/template-registry";
import { fetcher } from "@/lib/fetcher";
import { getCurrentMonth } from "@/lib/utils";

// Templates that need prize data
const PRIZE_TEMPLATES = new Set<string>([]);
// Templates that need bracket data
const BRACKET_TEMPLATES = new Set(["results-drop-top4-v2", "results-drop-winner"]);
// Templates that need standings data
const STANDINGS_TEMPLATES = new Set(["results-drop-2", "results-drop-top4-v2", "results-drop-winner"]);

export default function MediaPage() {
  const [month, setMonth] = useState(getCurrentMonth);
  const [isPending, startTransition] = useTransition();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [templateData, setTemplateData] = useState<Record<string, any>>({});

  // Auto-fill data sources
  const needsPrizes = selectedTemplate ? PRIZE_TEMPLATES.has(selectedTemplate) : false;
  const needsBrackets = selectedTemplate ? BRACKET_TEMPLATES.has(selectedTemplate) : false;
  const needsStandings = selectedTemplate ? STANDINGS_TEMPLATES.has(selectedTemplate) : false;

  const { data: prizesRes, isLoading: prizesLoading } = useSWR(
    needsPrizes ? `/api/prizes?month=${month}` : null,
    fetcher
  );
  const { data: standingsRes, isLoading: standingsLoading } = useSWR(
    needsStandings ? `/api/players/standings?month=${month}` : null,
    fetcher
  );
  // Brackets should use the resolved month from standings (standings falls back
  // to the latest month with data, but brackets does an exact match).
  const bracketsMonth = (needsStandings && standingsRes?.data?.month) || month;
  const { data: bracketsRes, isLoading: bracketsLoading } = useSWR(
    needsBrackets ? `/api/players/brackets?month=${bracketsMonth}` : null,
    fetcher
  );
  const { data: membersRes } = useSWR(
    needsBrackets ? "/api/discord/members" : null,
    fetcher
  );

  const isAutoFilling =
    (needsPrizes && prizesLoading) || (needsBrackets && bracketsLoading) || (needsStandings && standingsLoading);

  // Auto-fill prizes into template data
  useEffect(() => {
    if (needsPrizes && prizesRes?.data) {
      setTemplateData((prev) => ({ ...prev, prizes: prizesRes.data }));
    }
  }, [needsPrizes, prizesRes, selectedTemplate]);

  // Auto-fill bracket data
  useEffect(() => {
    if (needsBrackets && bracketsRes?.data) {
      setTemplateData((prev) => ({
        ...prev,
        brackets: bracketsRes.data,
      }));
    }
  }, [needsBrackets, bracketsRes, selectedTemplate]);

  // Auto-fill members for avatar resolution
  useEffect(() => {
    if (needsBrackets && membersRes?.data) {
      setTemplateData((prev) => ({ ...prev, members: membersRes.data }));
    }
  }, [needsBrackets, membersRes, selectedTemplate]);

  // Auto-fill standings data
  useEffect(() => {
    if (needsStandings && standingsRes?.data) {
      setTemplateData((prev) => ({ ...prev, standings: standingsRes.data }));
    }
  }, [needsStandings, standingsRes, selectedTemplate]);

  // Caption templates from DB
  const { data: captionsRes, mutate: mutateCaptions } = useSWR<{ data: Record<string, string> }>(
    "/api/media/caption-templates",
    fetcher,
  );
  const savedCaptions = captionsRes?.data ?? {};

  const handleSaveCaption = useCallback(async (templateId: string, value: string) => {
    // Optimistic update
    mutateCaptions({ data: { ...savedCaptions, [templateId]: value } }, false);
    await fetch(`/api/media/caption-templates/${templateId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ captionTemplate: value }),
    });
    mutateCaptions();
  }, [savedCaptions, mutateCaptions]);

  const handleResetCaption = useCallback(async (templateId: string) => {
    const next = { ...savedCaptions };
    delete next[templateId];
    mutateCaptions({ data: next }, false);
    await fetch(`/api/media/caption-templates/${templateId}`, { method: "DELETE" });
    mutateCaptions();
  }, [savedCaptions, mutateCaptions]);

  const handleSelectTemplate = useCallback((id: string) => {
    setSelectedTemplate(id);
    setTemplateData({});
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFieldChange = useCallback((key: string, value: any) => {
    setTemplateData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const selectedDef = selectedTemplate
    ? TEMPLATES.find((t) => t.id === selectedTemplate)
    : null;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Media
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Generate branded ECL visuals
          </p>
        </div>
        <MonthPicker value={month} onChange={(m) => startTransition(() => setMonth(m))} minMonth="2025-11" />
      </div>

      {/* Asset Drive */}
      <div className="mb-6">
        <AssetDrive />
      </div>

      {/* Template selector */}
      <div className="mb-8">
        <TemplateSelector
          selected={selectedTemplate}
          onSelect={handleSelectTemplate}
        />
      </div>

      {/* Preview + Editor */}
      {selectedTemplate && selectedDef && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Preview */}
          <div>
            <h3
              className="text-sm font-semibold uppercase tracking-wider mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              Preview
            </h3>
            {isAutoFilling ? (
              <div
                className="flex flex-col items-center justify-center rounded-xl h-96"
                style={{ background: "var(--surface-gradient)", backdropFilter: "var(--surface-blur)", border: "1.5px solid rgba(255, 255, 255, 0.10)", boxShadow: "var(--surface-shadow)" }}
              >
                <div
                  className="w-6 h-6 border-2 rounded-full animate-spin mb-3"
                  style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }}
                />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Loading data...
                </p>
              </div>
            ) : (
              <TemplatePreview
                templateId={selectedTemplate}
                data={templateData}
                month={month}
              />
            )}
          </div>

          {/* Editor */}
          <div
            className="p-5 rounded-xl"
            style={{
              background: "var(--surface-gradient)",
              backdropFilter: "var(--surface-blur)",
              border: "1.5px solid rgba(255, 255, 255, 0.10)",
              boxShadow: "var(--surface-shadow)",
            }}
          >
            <TemplateEditor
              templateId={selectedTemplate}
              data={templateData}
              onChange={handleFieldChange}
              month={month}
              savedCaptions={savedCaptions}
              onSaveCaption={handleSaveCaption}
              onResetCaption={handleResetCaption}
            />

            {/* Auto-fill status */}
            {needsPrizes && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {prizesRes?.data
                    ? `Auto-filled ${prizesRes.data.length} prizes for ${month}`
                    : "Loading prize data..."}
                </p>
              </div>
            )}
            {needsBrackets && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {bracketsRes?.data
                    ? "Bracket data loaded"
                    : bracketsRes === undefined
                      ? "Loading bracket data..."
                      : "No bracket data for this month"}
                </p>
              </div>
            )}
            {needsStandings && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {standingsRes?.data
                    ? `Standings loaded (${standingsRes.data.standings?.length || 0} players)`
                    : standingsRes === undefined
                      ? "Loading standings data..."
                      : "No standings data for this month"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!selectedTemplate && (
        <div
          className="flex items-center justify-center rounded-xl h-64"
          style={{
            background: "var(--surface-gradient)",
            backdropFilter: "var(--surface-blur)",
            border: "1.5px solid rgba(255, 255, 255, 0.10)",
            boxShadow: "var(--surface-shadow)",
          }}
        >
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Select a template above to get started
          </p>
        </div>
      )}
    </div>
  );
}
