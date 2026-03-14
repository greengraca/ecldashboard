"use client";

import { TEMPLATES } from "./template-registry";
import CardImage from "./shared/CardImage";

interface TemplateEditorProps {
  templateId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (key: string, value: any) => void;
}

export default function TemplateEditor({ templateId, data, onChange }: TemplateEditorProps) {
  const template = TEMPLATES.find((t) => t.id === templateId);

  if (!template) return null;

  return (
    <div className="space-y-4">
      <h3
        className="text-sm font-semibold uppercase tracking-wider"
        style={{ color: "var(--text-muted)" }}
      >
        {template.label} Settings
      </h3>

      {template.fields.map((field) => (
        <div key={field.key}>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: "var(--text-secondary)" }}
          >
            {field.label}
          </label>

          {field.type === "text" && (
            <input
              type="text"
              value={data[field.key] || ""}
              onChange={(e) => onChange(field.key, e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{
                background: "var(--bg-page)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            />
          )}

          {field.type === "url" && (
            <input
              type="url"
              value={data[field.key] || ""}
              onChange={(e) => onChange(field.key, e.target.value)}
              placeholder="https://"
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{
                background: "var(--bg-page)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            />
          )}

          {field.type === "textarea" && (
            <textarea
              value={data[field.key] || ""}
              onChange={(e) => onChange(field.key, e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-y"
              style={{
                background: "var(--bg-page)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            />
          )}

          {field.type === "date" && (
            <input
              type="date"
              value={data[field.key] || ""}
              onChange={(e) => onChange(field.key, e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{
                background: "var(--bg-page)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            />
          )}

          {field.type === "select" && field.options && (
            <select
              value={data[field.key] || ""}
              onChange={(e) => onChange(field.key, e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{
                background: "var(--bg-page)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            >
              <option value="">Select...</option>
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
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
      ))}
    </div>
  );
}
