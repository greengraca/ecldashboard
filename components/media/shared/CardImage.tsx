"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Upload, X, ChevronDown } from "lucide-react";
import { searchCard, searchPrintings, type ScryfallPrinting } from "@/lib/scryfall";

interface CardImageProps {
  value: string; // card name
  imageUrl: string | null; // resolved image URL (proxied)
  overrideUrl: string | null; // manual upload override
  onChange: (name: string, imageUrl: string | null) => void;
  onOverride: (url: string | null) => void;
  onPriceChange?: (price: number | null) => void;
  onEditionChange?: (setName: string | null, lang: string) => void;
  placeholder?: string;
  hidePreview?: boolean; // hide the image preview + upload (rendered externally)
  showEditionPicker?: boolean; // show edition/set selector after card found
}

export default function CardImage({
  value,
  imageUrl,
  overrideUrl,
  onChange,
  onOverride,
  onPriceChange,
  onEditionChange,
  placeholder = "Search for a card...",
  hidePreview = false,
  showEditionPicker = false,
}: CardImageProps) {
  const [query, setQuery] = useState(value);
  const [searching, setSearching] = useState(false);
  const [printings, setPrintings] = useState<ScryfallPrinting[]>([]);
  const [selectedPrintingId, setSelectedPrintingId] = useState<string | null>(null);
  const [editionOpen, setEditionOpen] = useState(false);
  const [loadingPrintings, setLoadingPrintings] = useState(false);
  const [lang, setLang] = useState<"en" | "ja">("en");
  const fileRef = useRef<HTMLInputElement>(null);
  const editionRef = useRef<HTMLDivElement>(null);
  const resolvedNameRef = useRef<string>("");

  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Fetch printings when card name is resolved, match initial image
  const fetchPrintings = useCallback(async (cardName: string, initialImageUrl?: string, language?: string) => {
    if (!showEditionPicker || !cardName) {
      setPrintings([]);
      return;
    }
    setLoadingPrintings(true);
    try {
      const results = await searchPrintings(cardName, language || lang);
      setPrintings(results);
      // Match the printing that corresponds to the initial search result
      if (initialImageUrl && results.length > 0) {
        const match = results.find((p) => p.image_url === initialImageUrl);
        const selected = match || results[0];
        setSelectedPrintingId(selected.id);
        onPriceChange?.(selected.price_eur);
        onEditionChange?.(selected.set_name, language || lang);
      } else if (results.length > 0) {
        setSelectedPrintingId(results[0].id);
        onPriceChange?.(results[0].price_eur);
        onEditionChange?.(results[0].set_name, language || lang);
      } else {
        setSelectedPrintingId(null);
      }
    } catch {
      setPrintings([]);
    } finally {
      setLoadingPrintings(false);
    }
  }, [showEditionPicker, onPriceChange, onEditionChange, lang]);

  useEffect(() => {
    if (!query || query === value) return;

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const card = await searchCard(query);
        if (card) {
          const proxiedUrl = `/api/media/proxy?url=${encodeURIComponent(card.image_url)}`;
          resolvedNameRef.current = card.name;
          onChange(card.name, proxiedUrl);
          fetchPrintings(card.name, card.image_url);
        }
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, value, onChange, fetchPrintings]);

  // Close edition dropdown on outside click
  useEffect(() => {
    if (!editionOpen) return;
    function handleClick(e: MouseEvent) {
      if (editionRef.current && !editionRef.current.contains(e.target as Node)) {
        setEditionOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [editionOpen]);

  function handleToggleLang() {
    const newLang = lang === "en" ? "ja" : "en";
    setLang(newLang);
    if (value) {
      fetchPrintings(value, undefined, newLang);
    }
  }

  function handleSelectPrinting(printing: ScryfallPrinting) {
    setSelectedPrintingId(printing.id);
    const proxiedUrl = `/api/media/proxy?url=${encodeURIComponent(printing.image_url)}`;
    onChange(value, proxiedUrl);
    onPriceChange?.(printing.price_eur);
    onEditionChange?.(printing.set_name, lang);
    setEditionOpen(false);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onOverride(url);
  }

  function handleDragOver(e: React.DragEvent) {
    if (e.dataTransfer.types.includes("application/x-drive-asset")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }

  function handleDrop(e: React.DragEvent) {
    const assetJson = e.dataTransfer.getData("application/x-drive-asset");
    if (assetJson) {
      e.preventDefault();
      try {
        const asset = JSON.parse(assetJson);
        if (asset.previewUrl) {
          onOverride(asset.previewUrl);
        }
      } catch {
        // Ignore malformed data
      }
    }
  }

  const displayUrl = overrideUrl || imageUrl;
  const selectedPrinting = printings.find((p) => p.id === selectedPrintingId);
  const currentSetLabel = selectedPrinting
    ? `${selectedPrinting.set_name} #${selectedPrinting.collector_number}`
    : printings.length > 0
      ? `${printings[0].set_name} #${printings[0].collector_number}`
      : null;

  return (
    <div className="space-y-2" onDragOver={handleDragOver} onDrop={handleDrop}>
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2 rounded-lg text-sm border outline-none"
          style={{
            background: "var(--bg-page)",
            borderColor: "var(--border)",
            color: "var(--text-primary)",
          }}
        />
        {searching && (
          <div
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 rounded-full animate-spin"
            style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }}
          />
        )}
      </div>

      {/* Edition picker + language toggle */}
      {showEditionPicker && value && (
        <div className="flex items-center gap-1.5">
          {/* Language toggle */}
          <div className="flex rounded-lg overflow-hidden shrink-0" style={{ border: "1px solid var(--border)" }}>
            {(["en", "ja"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={l !== lang ? handleToggleLang : undefined}
                className="px-2 py-1.5 text-[10px] font-bold uppercase transition-colors"
                style={{
                  background: lang === l ? "rgba(251,191,36,0.2)" : "var(--bg-page)",
                  color: lang === l ? "var(--accent)" : "var(--text-muted)",
                }}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Edition dropdown */}
          {printings.length > 0 && (
          <div className="relative flex-1" ref={editionRef}>
          <button
            type="button"
            onClick={() => setEditionOpen(!editionOpen)}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs border transition-colors"
            style={{
              background: "var(--bg-page)",
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            <span className="truncate">
              {loadingPrintings ? "Loading editions..." : currentSetLabel || "Select edition"}
            </span>
            <ChevronDown className="w-3 h-3 ml-2 shrink-0" style={{ color: "var(--text-muted)" }} />
          </button>

          {editionOpen && (
            <div
              className="absolute z-20 left-0 right-0 mt-1 rounded-lg overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(15, 20, 25, 0.95), rgba(26, 32, 48, 0.95))",
                border: "1px solid rgba(255, 255, 255, 0.10)",
                backdropFilter: "blur(12px)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
              }}
            >
              <div className="max-h-48 overflow-y-auto">
                {printings.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPrinting(p)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors"
                    style={{
                      background: (selectedPrintingId === p.id || (!selectedPrintingId && p.id === printings[0].id))
                        ? "rgba(251,191,36,0.1)"
                        : "transparent",
                      color: "var(--text-primary)",
                    }}
                    onMouseEnter={(e) => { if (selectedPrintingId !== p.id) (e.currentTarget.style.background = "var(--bg-hover)"); }}
                    onMouseLeave={(e) => {
                      (e.currentTarget.style.background = (selectedPrintingId === p.id || (!selectedPrintingId && p.id === printings[0].id))
                        ? "rgba(251,191,36,0.1)" : "transparent");
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://svgs.scryfall.io/sets/${p.set}.svg`}
                      alt={p.set}
                      className="w-4 h-4 shrink-0"
                      style={{ filter: "brightness(0) invert(1)" }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <span className="truncate">{p.set_name}</span>
                    <span className="shrink-0" style={{ color: "var(--text-muted)" }}>
                      #{p.collector_number}
                    </span>
                    {p.price_eur != null && (
                      <span className="ml-auto shrink-0 font-medium" style={{ color: "var(--accent)" }}>
                        €{p.price_eur.toFixed(2)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
          )}
        </div>
      )}

      {!hidePreview && displayUrl && (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayUrl}
            alt={value || "Card"}
            className="rounded-lg"
            style={{ maxHeight: 160, width: "auto" }}
          />
          {overrideUrl && (
            <button
              onClick={() => onOverride(null)}
              className="absolute -top-2 -right-2 p-1 rounded-full"
              style={{ background: "var(--error)", color: "#fff" }}
              title="Remove override"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {!hidePreview && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors"
            style={{
              background: "var(--bg-hover)",
              color: "var(--text-secondary)",
            }}
          >
            <Upload className="w-3 h-3" />
            Upload image
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}
