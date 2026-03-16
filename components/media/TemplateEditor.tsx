"use client";

import React from "react";
import { TEMPLATES, type TemplateDataField } from "./template-registry";
import CardImage from "./shared/CardImage";

interface TemplateEditorProps {
  templateId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (key: string, value: any) => void;
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

export default function TemplateEditor({ templateId, data, onChange }: TemplateEditorProps) {
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
                {group.cols[0].fields.map((f) => renderField(f, data, onChange))}
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
                      {col.fields.map((f) => renderField(f, data, onChange))}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
