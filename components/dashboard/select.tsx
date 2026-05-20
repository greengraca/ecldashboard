"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
  placeholder?: string;
  size?: "sm" | "md";
  /** Show a filter input at the top of the dropdown for long lists. */
  searchable?: boolean;
}

export default function Select({
  value,
  onChange,
  options,
  className = "",
  placeholder,
  size = "md",
  searchable = false,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const selectedOption = options.find((o) => o.value === value);
  const label = selectedOption?.label ?? placeholder ?? "";

  const filteredOptions = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.toLowerCase().trim();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  function openDropdown() {
    updatePosition();
    setOpen(true);
    setQuery("");
    const idx = options.findIndex((o) => o.value === value);
    setFocusedIndex(idx >= 0 ? idx : 0);
    if (searchable) {
      // Focus the search input on next tick (after portal mounts)
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }

  function close() {
    setOpen(false);
    setFocusedIndex(-1);
    setQuery("");
  }

  function select(val: string) {
    onChange(val);
    close();
    triggerRef.current?.focus();
  }

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        listRef.current?.contains(e.target as Node)
      )
        return;
      close();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  // Scroll focused option into view
  useEffect(() => {
    if (!open || focusedIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-option]");
    items[focusedIndex]?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex, open]);

  // Reset focused index when query changes
  useEffect(() => {
    if (open && searchable) {
      setFocusedIndex(filteredOptions.length > 0 ? 0 : -1);
    }
  }, [query, open, searchable, filteredOptions.length]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openDropdown();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((i) => {
          if (filteredOptions.length === 0) return -1;
          return (i + 1) % filteredOptions.length;
        });
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((i) => {
          if (filteredOptions.length === 0) return -1;
          return (i - 1 + filteredOptions.length) % filteredOptions.length;
        });
        break;
      case "Enter":
        e.preventDefault();
        if (focusedIndex >= 0 && filteredOptions[focusedIndex]) {
          select(filteredOptions[focusedIndex].value);
        }
        break;
      case " ":
        // Space inside search input should type a space, not select
        if (!searchable) {
          e.preventDefault();
          if (focusedIndex >= 0 && filteredOptions[focusedIndex]) {
            select(filteredOptions[focusedIndex].value);
          }
        }
        break;
      case "Escape":
        e.preventDefault();
        close();
        triggerRef.current?.focus();
        break;
      case "Tab":
        close();
        break;
    }
  }

  const pad = size === "sm" ? "px-2 py-1" : "px-3 py-2";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => (open ? close() : openDropdown())}
        onKeyDown={handleKeyDown}
        className={`flex items-center justify-between gap-1 rounded-lg border text-sm outline-none transition-colors ${pad} ${className}`}
        style={{
          background: "var(--surface-gradient)",
          backdropFilter: "var(--surface-blur)",
          borderColor: open ? "var(--accent)" : "rgba(255, 255, 255, 0.10)",
          color: selectedOption ? "var(--text-primary)" : "var(--text-muted)",
          minWidth: 0,
        }}
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          style={{ color: "var(--text-muted)" }}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={listRef}
            role="listbox"
            onKeyDown={handleKeyDown}
            className="fixed rounded-lg border overflow-hidden flex flex-col"
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxHeight: 280,
              zIndex: 9999,
              background: "linear-gradient(135deg, rgba(15, 20, 25, 0.95), rgba(26, 32, 48, 0.95))",
              borderColor: "rgba(255, 255, 255, 0.10)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
              animation: "menuSlideIn 0.15s ease",
            }}
          >
            {searchable && (
              <div
                className="flex items-center gap-2 px-2.5 py-2 border-b shrink-0"
                style={{ borderColor: "rgba(255,255,255,0.08)" }}
              >
                <Search className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-muted)" }} />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type to filter..."
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
            )}
            <div className="overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div
                  className="px-3 py-3 text-xs text-center"
                  style={{ color: "var(--text-muted)" }}
                >
                  No matches
                </div>
              ) : (
                filteredOptions.map((opt, i) => (
                  <div
                    key={opt.value}
                    data-option
                    role="option"
                    aria-selected={opt.value === value}
                    onClick={() => select(opt.value)}
                    onMouseEnter={() => setFocusedIndex(i)}
                    className="px-3 py-2 text-sm cursor-pointer transition-colors"
                    style={{
                      background:
                        i === focusedIndex
                          ? "var(--bg-hover)"
                          : "transparent",
                      color:
                        opt.value === value
                          ? "var(--accent)"
                          : "var(--text-primary)",
                    }}
                  >
                    {opt.label}
                  </div>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
