// Scryfall API client — debounced, serialized requests

export interface ScryfallCard {
  name: string;
  image_url: string; // Direct Scryfall CDN URL (needs proxying for html-to-image)
}

let pending: AbortController | null = null;

export async function searchCard(query: string): Promise<ScryfallCard | null> {
  if (!query.trim()) return null;

  // Abort any in-flight request (serialized — one at a time)
  if (pending) pending.abort();
  const controller = new AbortController();
  pending = controller;

  try {
    const res = await fetch(
      `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(query)}`,
      { signal: controller.signal }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const imageUrl =
      data.image_uris?.png ||
      data.image_uris?.large ||
      data.image_uris?.normal ||
      data.card_faces?.[0]?.image_uris?.png ||
      data.card_faces?.[0]?.image_uris?.large ||
      null;

    if (!imageUrl) return null;

    return { name: data.name, image_url: imageUrl };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return null;
    console.error("Scryfall search failed:", err);
    return null;
  } finally {
    if (pending === controller) pending = null;
  }
}
