"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Upload, X, Copy, Check, Pencil, Eye } from "lucide-react";
import { TEMPLATES, type TemplateDataField } from "./template-registry";
import CardImage from "./shared/CardImage";

interface TemplateEditorProps {
  templateId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (key: string, value: any) => void;
  month?: string;
  savedCaptions?: Record<string, string>;
  onSaveCaption?: (templateId: string, value: string) => void;
  onResetCaption?: (templateId: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderField(field: TemplateDataField, data: Record<string, any>, onChange: (key: string, value: any) => void) {
  if (field.type === "checkbox") {
    return (
      <label key={field.key} className="flex items-center gap-2 cursor-pointer select-none py-1">
        <input
          type="checkbox"
          checked={!!data[field.key]}
          onChange={(e) => onChange(field.key, e.target.checked)}
          className="w-4 h-4 rounded"
          style={{ accentColor: "var(--accent)" }}
        />
        <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          {field.label}
        </span>
      </label>
    );
  }

  const hideInput = field.inputShowIf && !data[field.inputShowIf];

  if (hideInput) {
    return (
      <div key={field.key}>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
          {field.label}
        </label>
      </div>
    );
  }

  return (
    <div key={field.key}>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
        {field.label}
      </label>

      {field.type === "text" && (
        <input
          type="text"
          value={data[field.key] || ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
          style={{ background: "var(--bg-page)", borderColor: "var(--border)", color: "var(--text-primary)" }}
        />
      )}

      {field.type === "url" && (
        <input
          type="url"
          value={data[field.key] || ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder="https://"
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
          style={{ background: "var(--bg-page)", borderColor: "var(--border)", color: "var(--text-primary)" }}
        />
      )}

      {field.type === "textarea" && (
        <textarea
          value={data[field.key] || ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-y"
          style={{ background: "var(--bg-page)", borderColor: "var(--border)", color: "var(--text-primary)" }}
        />
      )}

      {field.type === "date" && (
        <input
          type="date"
          value={data[field.key] || ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
          style={{ background: "var(--bg-page)", borderColor: "var(--border)", color: "var(--text-primary)" }}
        />
      )}

      {field.type === "select" && field.options && (
        <select
          value={data[field.key] || ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
          style={{ background: "var(--bg-page)", borderColor: "var(--border)", color: "var(--text-primary)" }}
        >
          <option value="">Select...</option>
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}

      {field.type === "card" && (
        <CardImage
          value={data[field.key] || ""}
          imageUrl={data[`${field.key}_imageUrl`] || null}
          overrideUrl={data[`${field.key}_overrideUrl`] || null}
          onChange={(name, url) => {
            onChange(field.key, name);
            onChange(`${field.key}_imageUrl`, url);
          }}
          onOverride={(url) => onChange(`${field.key}_overrideUrl`, url)}
        />
      )}
    </div>
  );
}

/**
 * Detect commander-partner groups (card → checkbox → card) in a field list
 * and render them as a combined layout: inputs stacked, images side-by-side.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderColumnFields(fields: TemplateDataField[], data: Record<string, any>, onChange: (key: string, value: any) => void) {
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < fields.length) {
    const f = fields[i];
    // Detect pattern: card, checkbox, card (commander-partner group)
    if (
      f.type === "card" &&
      i + 1 < fields.length && fields[i + 1].type === "checkbox" &&
      i + 2 < fields.length && fields[i + 2].type === "card" && fields[i + 2].showIf === fields[i + 1].key
    ) {
      const cmdField = f;
      const toggleField = fields[i + 1];
      const partnerField = fields[i + 2];
      const hasPartner = !!data[toggleField.key];
      const partnerVisible = !partnerField.showIf || data[partnerField.showIf];

      elements.push(
        <CardPartnerGroup
          key={cmdField.key}
          cmdField={cmdField}
          toggleField={toggleField}
          partnerField={partnerField}
          hasPartner={hasPartner}
          partnerVisible={partnerVisible}
          data={data}
          onChange={onChange}
        />
      );
      i += 3;
    } else {
      elements.push(
        <React.Fragment key={f.key}>
          {renderField(f, data, onChange)}
        </React.Fragment>
      );
      i++;
    }
  }

  return elements;
}

/**
 * Combined commander + partner card group.
 * Inputs stack vertically; images display side-by-side.
 */
function CardPartnerGroup({
  cmdField,
  toggleField,
  partnerField,
  hasPartner,
  partnerVisible,
  data,
  onChange,
}: {
  cmdField: TemplateDataField;
  toggleField: TemplateDataField;
  partnerField: TemplateDataField;
  hasPartner: boolean;
  partnerVisible: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (key: string, value: any) => void;
}) {
  const cmdDisplayUrl = data[`${cmdField.key}_overrideUrl`] || data[`${cmdField.key}_imageUrl`] || null;
  const partnerDisplayUrl = hasPartner
    ? (data[`${partnerField.key}_overrideUrl`] || data[`${partnerField.key}_imageUrl`] || null)
    : null;

  return (
    <div className="space-y-2">
      {/* Commander input */}
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
        {cmdField.label}
      </label>
      <CardImage
        value={data[cmdField.key] || ""}
        imageUrl={data[`${cmdField.key}_imageUrl`] || null}
        overrideUrl={data[`${cmdField.key}_overrideUrl`] || null}
        onChange={(name, url) => {
          onChange(cmdField.key, name);
          onChange(`${cmdField.key}_imageUrl`, url);
        }}
        onOverride={(url) => onChange(`${cmdField.key}_overrideUrl`, url)}
        hidePreview
      />

      {/* Partner toggle */}
      {renderField(toggleField, data, onChange)}

      {/* Partner input (shown when toggled) */}
      {hasPartner && partnerVisible && (
        <>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            {partnerField.label}
          </label>
          <CardImage
            value={data[partnerField.key] || ""}
            imageUrl={data[`${partnerField.key}_imageUrl`] || null}
            overrideUrl={data[`${partnerField.key}_overrideUrl`] || null}
            onChange={(name, url) => {
              onChange(partnerField.key, name);
              onChange(`${partnerField.key}_imageUrl`, url);
            }}
            onOverride={(url) => onChange(`${partnerField.key}_overrideUrl`, url)}
            hidePreview
          />
        </>
      )}

      {/* Images side-by-side */}
      <div className="flex gap-2">
        <ImagePreview
          url={cmdDisplayUrl}
          alt={data[cmdField.key] || "Commander"}
          hasOverride={!!data[`${cmdField.key}_overrideUrl`]}
          onClearOverride={() => onChange(`${cmdField.key}_overrideUrl`, null)}
          onUpload={(url) => onChange(`${cmdField.key}_overrideUrl`, url)}
        />
        {hasPartner && partnerVisible && (
          <ImagePreview
            url={partnerDisplayUrl}
            alt={data[partnerField.key] || "Partner"}
            hasOverride={!!data[`${partnerField.key}_overrideUrl`]}
            onClearOverride={() => onChange(`${partnerField.key}_overrideUrl`, null)}
            onUpload={(url) => onChange(`${partnerField.key}_overrideUrl`, url)}
          />
        )}
      </div>
    </div>
  );
}

function ImagePreview({
  url,
  alt,
  hasOverride,
  onClearOverride,
  onUpload,
}: {
  url: string | null;
  alt: string;
  hasOverride: boolean;
  onClearOverride: () => void;
  onUpload: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onUpload(URL.createObjectURL(file));
  }

  return (
    <div className="flex flex-col items-start gap-1">
      {url && (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={alt}
            className="rounded-lg"
            style={{ maxHeight: 120, width: "auto" }}
          />
          {hasOverride && (
            <button
              onClick={onClearOverride}
              className="absolute -top-2 -right-2 p-1 rounded-full"
              style={{ background: "var(--error)", color: "#fff" }}
              title="Remove override"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
      <button
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-colors"
        style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}
      >
        <Upload className="w-2.5 h-2.5" />
        Upload image
      </button>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  );
}

interface ColGroup {
  col: string;
  fields: TemplateDataField[];
}

interface RowGroup {
  row: string;
  cols: ColGroup[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildLayout(fields: TemplateDataField[], data: Record<string, any>) {
  const visible = fields.filter((f) => !f.showIf || data[f.showIf]);

  // Separate into row-grouped and ungrouped
  const sections: ({ type: "row"; group: RowGroup } | { type: "field"; field: TemplateDataField })[] = [];
  let i = 0;

  while (i < visible.length) {
    const f = visible[i];
    if (f.row) {
      // Collect all consecutive fields with same row
      const rowFields = [f];
      while (i + 1 < visible.length && visible[i + 1].row === f.row) {
        i++;
        rowFields.push(visible[i]);
      }
      // Split into cols
      const colMap = new Map<string, TemplateDataField[]>();
      for (const rf of rowFields) {
        const key = rf.col || rf.key;
        if (!colMap.has(key)) colMap.set(key, []);
        colMap.get(key)!.push(rf);
      }
      const cols: ColGroup[] = [];
      for (const [col, cFields] of colMap) {
        cols.push({ col, fields: cFields });
      }
      sections.push({ type: "row", group: { row: f.row, cols } });
    } else {
      sections.push({ type: "field", field: f });
    }
    i++;
  }

  return sections;
}

function formatMonthLabel(month: string): string {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveCaption(template: string, data: Record<string, any>, month?: string): string {
  let result = template;
  if (month) {
    result = result.replace(/\{month\}/g, formatMonthLabel(month));
  }
  result = result.replace(/\{(\w+)\}/g, (match, key) => {
    const val = data[key];
    return val != null && val !== "" ? String(val) : "";
  });
  // Clean up empty lines left by stripped placeholders
  result = result.replace(/\n{3,}/g, "\n\n").trim();
  return result;
}

function CaptionSection({
  captionTemplate,
  savedTemplate,
  data,
  month,
  templateId,
  onSave,
  onReset,
}: {
  captionTemplate: string;
  savedTemplate?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
  month?: string;
  templateId: string;
  onSave: (templateId: string, value: string) => void;
  onReset: (templateId: string) => void;
}) {
  const effectiveDefault = savedTemplate ?? captionTemplate;
  const [editing, setEditing] = useState(false);
  const [localTemplate, setLocalTemplate] = useState(effectiveDefault);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const isCustomized = effectiveDefault !== captionTemplate;
  const hasUnsavedChanges = localTemplate !== effectiveDefault;

  // Sync when template switches or saved data arrives
  useEffect(() => {
    setLocalTemplate(savedTemplate ?? captionTemplate);
    setEditing(false);
  }, [templateId, captionTemplate, savedTemplate]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    onSave(templateId, localTemplate);
    setSaving(false);
  }, [templateId, localTemplate, onSave]);

  const handleReset = useCallback(() => {
    setLocalTemplate(captionTemplate);
    onReset(templateId);
  }, [templateId, captionTemplate, onReset]);

  const resolved = resolveCaption(localTemplate, data, month);

  const handleCopy = useCallback(() => {
    const text = editing ? localTemplate : resolved;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [editing, localTemplate, resolved]);

  return (
    <div className="mt-5 pt-5 border-t" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}
        >
          Instagram Caption
        </span>
        <div className="flex items-center gap-1.5">
          {editing && isCustomized && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors"
              style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}
            >
              Reset
            </button>
          )}
          {editing && hasUnsavedChanges && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          )}
          <button
            onClick={() => setEditing((e) => !e)}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors"
            style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}
          >
            {editing ? <Eye className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
            {editing ? "Preview" : "Edit Template"}
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors"
            style={{
              background: copied ? "var(--success)" : "var(--bg-hover)",
              color: copied ? "#fff" : "var(--text-secondary)",
            }}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {editing ? (
        <textarea
          value={localTemplate}
          onChange={(e) => setLocalTemplate(e.target.value)}
          rows={8}
          className="w-full px-3 py-2 rounded-lg text-xs font-mono border outline-none resize-y"
          style={{ background: "var(--bg-page)", borderColor: "var(--border)", color: "var(--text-primary)" }}
        />
      ) : (
        <div
          className="w-full px-3 py-2 rounded-lg text-xs whitespace-pre-wrap"
          style={{ background: "var(--bg-page)", color: "var(--text-primary)", minHeight: "4rem" }}
        >
          {resolved || <span style={{ color: "var(--text-muted)" }}>Fill in fields to preview caption...</span>}
        </div>
      )}
    </div>
  );
}

export default function TemplateEditor({ templateId, data, onChange, month, savedCaptions, onSaveCaption, onResetCaption }: TemplateEditorProps) {
  const template = TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;

  const sections = buildLayout(template.fields, data);

  // Pull out header-level toggles (e.g. nameOverrides) to render inline with the title
  const headerToggles: TemplateDataField[] = [];
  const filteredSections = sections.filter((s) => {
    if (s.type === "field" && s.field.key === "nameOverrides") {
      headerToggles.push(s.field);
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}
        >
          {template.label} Settings
        </h3>
        {headerToggles.map((toggle) => (
          <label
            key={toggle.key}
            className="flex items-center gap-1.5 cursor-pointer select-none opacity-60 hover:opacity-100 transition-opacity"
          >
            <input
              type="checkbox"
              checked={!!data[toggle.key]}
              onChange={(e) => onChange(toggle.key, e.target.checked)}
              className="w-3 h-3 rounded"
              style={{ accentColor: "var(--text-muted)" }}
            />
            <span className="text-[10px] lowercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              {toggle.label}
            </span>
          </label>
        ))}
      </div>

      {filteredSections.map((section, idx) => {
        if (section.type === "field") {
          // Standalone field — add separator if previous was a row group
          const prevWasRow = idx > 0 && filteredSections[idx - 1].type === "row";
          return (
            <React.Fragment key={section.field.key}>
              {prevWasRow && (
                <div className="border-t" style={{ borderColor: "var(--border)" }} />
              )}
              {renderField(section.field, data, onChange)}
            </React.Fragment>
          );
        }

        // Row group with columns
        const { group } = section;
        const prevSection = idx > 0 ? filteredSections[idx - 1] : null;
        const needsSeparator =
          prevSection?.type === "row" && prevSection.group.row !== group.row;

        return (
          <React.Fragment key={group.row}>
            {needsSeparator && (
              <div className="border-t" style={{ borderColor: "var(--border)" }} />
            )}
            {group.cols.length === 1 ? (
              // Single col — just render fields inline (e.g. stats with 2 fields but no col split)
              <div className="grid grid-cols-2 gap-3">
                {renderColumnFields(group.cols[0].fields, data, onChange)}
              </div>
            ) : (
              // Multi-col — two columns with a vertical divider
              <div className="flex gap-0">
                {group.cols.map((col, colIdx) => (
                  <React.Fragment key={col.col}>
                    {colIdx > 0 && (
                      <div
                        className="w-px mx-3 self-stretch"
                        style={{ background: "var(--border)" }}
                      />
                    )}
                    <div className="flex-1 flex flex-col gap-2 min-w-0">
                      {renderColumnFields(col.fields, data, onChange)}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            )}
          </React.Fragment>
        );
      })}

      {template.captionTemplate && onSaveCaption && onResetCaption && (
        <CaptionSection
          captionTemplate={template.captionTemplate}
          savedTemplate={savedCaptions?.[templateId]}
          data={data}
          month={month}
          templateId={templateId}
          onSave={onSaveCaption}
          onReset={onResetCaption}
        />
      )}
    </div>
  );
}
