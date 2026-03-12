# UI Conventions

## CSS Variable Theming

All colors, backgrounds, and borders MUST use CSS variables from `app/globals.css`. Use inline `style={{ }}` for variable references, Tailwind classes for layout/spacing/sizing.

```tsx
// Correct
style={{ color: "var(--text-primary)", background: "var(--bg-card)" }}

// Wrong — never hardcode colors
className="text-white bg-gray-900"
```

Key variable groups:
- Backgrounds: `--bg-page`, `--bg-card`, `--bg-card-hover`, `--bg-hover`, `--bg-modal`, `--card-inner-bg`
- Text: `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-muted`
- Borders: `--border`, `--border-hover`, `--border-subtle`
- Accent: `--accent`, `--accent-hover`, `--accent-light`, `--accent-border`
- Status: `--success`, `--warning`, `--error` (each with `-light` variant)
- Sources: `--status-patreon` (#f96854), `--status-kofi` (#29abe0), `--status-free` (purple, uses `--status-demo`)

---

## Reusable Components

Located in `components/dashboard/`:

- **StatCard** — metric card with title, value, subtitle, optional icon and trend
- **DataTable** — sortable table accepting `Column<T>[]` with optional `render` functions, `keyField` for React keys, `onRowClick` for navigation
- **Modal** — overlay with ESC/click-outside to close, slide-up animation
- **MonthPicker** — "YYYY-MM" selector with prev/next arrows, min/max bounds

Domain components in `components/{subscribers,finance,players,activity}/` follow the same styling conventions.

---

## Column Render Functions

DataTable columns use `render?: (row: T) => ReactNode` for custom cell formatting. This is how badges, colored amounts, and action buttons are implemented. See `components/finance/transaction-table.tsx` and `components/subscribers/subscriber-table.tsx` for examples.

---

## Badge Pattern

Source badges use a `Record<EnumType, { label, color, bg }>` lookup:

- Patreon: coral (`--status-patreon` / `--status-patreon-light`)
- Ko-fi: blue (`--status-kofi` / `--status-kofi-light`)
- Free: purple (`--status-free` / `--status-free-light`)
- Activity actions: create=green, update=blue, delete=red, sync=yellow

---

## Loading States

- **Skeleton**: use CSS class `skeleton` (shimmer animation defined in globals.css) with explicit dimensions
- **Spinners**: `animate-spin` on a lucide icon (typically `Loader2`)
- **Empty states**: centered text with `--text-muted` color

---

## Forms

- All inputs are controlled (React `useState`)
- Edit mode: form pre-populated from existing data
- Destructive actions (delete): `confirm()` dialog before proceeding
- Submit: POST/PATCH/DELETE via `fetch()`, then `mutate()` all related SWR keys

---

## Date Formats

- Months: `"YYYY-MM"` string (sortable, used as query params and MongoDB filter keys)
- Dates: `"YYYY-MM-DD"` string (matches HTML date input format)
- Timestamps: ISO 8601 strings (stored and transmitted, never Date objects in JSON)
- Relative time display: custom `timeAgo()` helper, no external library
