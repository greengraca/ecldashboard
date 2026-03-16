"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Upload, X } from "lucide-react";
import { searchCard, type ScryfallCard } from "@/lib/scryfall";

interface CardImageProps {
  value: string; // card name
  imageUrl: string | null; // resolved image URL (proxied)
  overrideUrl: string | null; // manual upload override
  onChange: (name: string, imageUrl: string | null) => void;
  onOverride: (url: string | null) => void;
  placeholder?: string;
  hidePreview?: boolean; // hide the image preview + upload (rendered externally)
}

export default function CardImage({
  value,
  imageUrl,
  overrideUrl,
  onChange,
  onOverride,
  placeholder = "Search for a card...",
  hidePreview = false,
}: CardImageProps) {
  const [query, setQuery] = useState(value);
  const [searching, setSearching] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (!query || query === value) return;

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const card = await searchCard(query);
        if (card) {
          const proxiedUrl = `/api/media/proxy?url=${encodeURIComponent(card.image_url)}`;
          onChange(card.name, proxiedUrl);
        }
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, value, onChange]);

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
