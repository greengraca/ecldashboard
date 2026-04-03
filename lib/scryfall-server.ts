// Server-side Scryfall client — price-range card search for prize planning

export interface PlannerCard {
  scryfall_id: string;
  name: string;
  set: string;
  set_name: string;
  collector_number: string;
  image_url: string;
  price_eur: number;
}

interface SearchResult {
  cards: PlannerCard[];
  total: number;
  hasMore: boolean;
}

const SCRYFALL_HEADERS = {
  "User-Agent": "ECL-Dashboard/1.0",
  Accept: "application/json",
};

export async function searchCardsByPriceRange(
  minEur: number,
  maxEur: number,
  page = 1
): Promise<SearchResult> {
  const q = `eur>=${minEur.toFixed(2)} eur<=${maxEur.toFixed(2)} game:paper unique:cards format:commander legal:commander`;
  const url = `https://api.scryfall.com/cards/search?order=eur&dir=desc&page=${page}&q=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(url, { headers: SCRYFALL_HEADERS });
    if (!res.ok) return { cards: [], total: 0, hasMore: false };

    const data = await res.json();
    const allCards: PlannerCard[] = [];

    for (const card of data.data || []) {
      const imageUrl = extractImageUrl(card);
      const priceEur = card.prices?.eur ? parseFloat(card.prices.eur) : null;
      if (!imageUrl || priceEur == null) continue;

      allCards.push({
        scryfall_id: card.id,
        name: card.name,
        set: card.set,
        set_name: card.set_name,
        collector_number: card.collector_number,
        image_url: imageUrl,
        price_eur: priceEur,
      });
    }

    // Pick 6 random cards from the results
    const suggestions = pickRandom(allCards, 6);

    return {
      cards: suggestions,
      total: data.total_cards || allCards.length,
      hasMore: !!data.has_more,
    };
  } catch (err) {
    console.error("Scryfall price search failed:", err);
    return { cards: [], total: 0, hasMore: false };
  }
}

/** 100ms delay between Scryfall requests to respect rate limit (10 req/s) */
export function scryfallDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 100));
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractImageUrl(card: any): string | null {
  return (
    card.image_uris?.png ||
    card.image_uris?.large ||
    card.image_uris?.normal ||
    card.card_faces?.[0]?.image_uris?.png ||
    card.card_faces?.[0]?.image_uris?.large ||
    null
  );
}
