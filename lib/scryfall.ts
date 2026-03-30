// Scryfall API client — debounced, serialized requests

export interface ScryfallCard {
  name: string;
  image_url: string; // Direct Scryfall CDN URL (needs proxying for html-to-image)
}

export interface ScryfallPrinting {
  id: string;
  set: string;
  set_name: string;
  collector_number: string;
  image_url: string;
  price_eur: number | null;
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
    const imageUrl = extractImageUrl(data);
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

/** Fetch all printings of a card by exact name */
export async function searchPrintings(cardName: string, lang?: string): Promise<ScryfallPrinting[]> {
  if (!cardName.trim()) return [];

  try {
    const langFilter = lang && lang !== "en" ? ` lang:${lang}` : "";
    const q = `!"${cardName}" unique:prints${langFilter}`;
    const res = await fetch(
      `https://api.scryfall.com/cards/search?order=released&dir=desc&q=${encodeURIComponent(q)}`
    );

    if (!res.ok) return [];

    const data = await res.json();
    const printings: ScryfallPrinting[] = [];

    for (const card of data.data || []) {
      const imageUrl = extractImageUrl(card);
      if (!imageUrl) continue;
      printings.push({
        id: card.id,
        set: card.set,
        set_name: card.set_name,
        collector_number: card.collector_number,
        image_url: imageUrl,
        price_eur: card.prices?.eur ? parseFloat(card.prices.eur) : null,
      });
    }

    return printings;
  } catch (err) {
    console.error("Scryfall printings search failed:", err);
    return [];
  }
}

function extractImageUrl(card: Record<string, unknown>): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = card as any;
  return (
    c.image_uris?.png ||
    c.image_uris?.large ||
    c.image_uris?.normal ||
    c.card_faces?.[0]?.image_uris?.png ||
    c.card_faces?.[0]?.image_uris?.large ||
    null
  );
}
