import type { MeetingNote, MeetingItemMetadata, UserMapping } from "./types";

const COMMON_WORDS = new Set(["we", "it", "that", "this", "there", "they", "the", "he", "she"]);

export interface DetectedItem {
  type: "task" | "deadline" | "prize";
  title: string;
  metadata: MeetingItemMetadata;
  source_quote: string;
  confidence: number;
}

const MONTHS: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04",
  may: "05", june: "06", july: "07", august: "08",
  september: "09", october: "10", november: "11", december: "12",
};

const MONTH_NAMES = Object.keys(MONTHS);
const MONTH_DAY_PATTERN_SRC = `(?:by|before|until|on|due)\\s+(${MONTH_NAMES.join("|")})\\s+(\\d{1,2})(?:st|nd|rd|th)?`;

// ─── Main detection entry point ───

export function detectItems(
  notes: MeetingNote[],
  meetingDate: string,
  teamMembers: UserMapping[]
): DetectedItem[] {
  const allItems: DetectedItem[] = [];

  for (const note of notes) {
    const content = note.content;
    allItems.push(...detectTasks(content, teamMembers, note.author_name));
    allItems.push(...detectDeadlines(content, meetingDate));
    allItems.push(...detectPrizes(content));
  }

  const deduped = deduplicateItems(allItems);
  return deduped.sort((a, b) => b.confidence - a.confidence);
}

// ─── Task Detection ───

function detectTasks(
  content: string,
  teamMembers: UserMapping[],
  authorName: string
): DetectedItem[] {
  const items: DetectedItem[] = [];

  // "I'll do X" / "I will do X" / "I'm going to do X"
  const selfTaskPatterns = [
    /(?:I'll|I will|I'm going to)\s+(.+?)(?:\.|$)/gi,
  ];

  for (const pattern of selfTaskPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const taskText = match[1].trim();
      if (taskText.length < 5 || taskText.length > 200) continue;

      const authorMember = teamMembers.find(
        (m) => m.display_name.toLowerCase() === authorName.toLowerCase()
      );

      items.push({
        type: "task",
        title: capitalizeFirst(taskText),
        metadata: {
          assignee_discord_id: authorMember?.discord_id,
          assignee_name: authorName,
        },
        source_quote: match[0].trim(),
        confidence: 0.8,
      });
    }
  }

  // "[Name] will/should/needs to do X"
  const namedTaskPattern =
    /(\w+)\s+(?:will|should|needs? to|has to|is going to)\s+(.+?)(?:\.|$)/gi;

  let match;
  while ((match = namedTaskPattern.exec(content)) !== null) {
    const personName = match[1];
    const taskText = match[2].trim();

    // Skip if the "name" is a common word
    if (COMMON_WORDS.has(personName.toLowerCase())) {
      continue;
    }
    if (taskText.length < 5 || taskText.length > 200) continue;

    const member = teamMembers.find(
      (m) => m.display_name.toLowerCase() === personName.toLowerCase()
    );

    items.push({
      type: "task",
      title: capitalizeFirst(taskText),
      metadata: {
        assignee_discord_id: member?.discord_id,
        assignee_name: member?.display_name || personName,
      },
      source_quote: match[0].trim(),
      confidence: member ? 0.85 : 0.5,
    });
  }

  // "We need to / we should / let's / someone should"
  const groupTaskPatterns = [
    /(?:we need to|we should|let's|someone should)\s+(.+?)(?:\.|$)/gi,
  ];

  for (const pattern of groupTaskPatterns) {
    let m;
    while ((m = pattern.exec(content)) !== null) {
      const taskText = m[1].trim();
      if (taskText.length < 5 || taskText.length > 200) continue;

      items.push({
        type: "task",
        title: capitalizeFirst(taskText),
        metadata: {},
        source_quote: m[0].trim(),
        confidence: 0.6,
      });
    }
  }

  // "TODO: X" / "ACTION: X" / "TASK: X"
  const explicitPattern = /(?:TODO|ACTION|TASK):\s*(.+?)(?:\.|$)/gi;
  while ((match = explicitPattern.exec(content)) !== null) {
    const taskText = match[1].trim();
    if (taskText.length < 3 || taskText.length > 200) continue;

    items.push({
      type: "task",
      title: capitalizeFirst(taskText),
      metadata: {},
      source_quote: match[0].trim(),
      confidence: 0.95,
    });
  }

  return items;
}

// ─── Deadline Detection ───

function detectDeadlines(content: string, meetingDate: string): DetectedItem[] {
  const items: DetectedItem[] = [];

  // "by/before/until/on/due [Month Day]"
  const monthDayPattern = new RegExp(MONTH_DAY_PATTERN_SRC, "gi");

  let match;
  while ((match = monthDayPattern.exec(content)) !== null) {
    const monthName = match[1].toLowerCase();
    const day = parseInt(match[2], 10);
    const resolvedDate = resolveMonthDay(monthName, day, meetingDate);

    if (resolvedDate) {
      const contextStart = Math.max(0, match.index - 30);
      const contextEnd = Math.min(content.length, match.index + match[0].length + 30);
      const context = content.substring(contextStart, contextEnd).trim();

      items.push({
        type: "deadline",
        title: extractDeadlineTitle(content, match.index) || `Deadline: ${match[1]} ${match[2]}`,
        metadata: { date: resolvedDate },
        source_quote: context,
        confidence: 0.8,
      });
    }
  }

  // "by/on the [Nth]" (day of current/next month)
  const ordinalPattern = /(?:by|before|until|on|due)\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)/gi;
  while ((match = ordinalPattern.exec(content)) !== null) {
    const day = parseInt(match[1], 10);
    if (day < 1 || day > 31) continue;

    const resolvedDate = resolveDayOnly(day, meetingDate);
    const contextStart = Math.max(0, match.index - 30);
    const contextEnd = Math.min(content.length, match.index + match[0].length + 30);
    const context = content.substring(contextStart, contextEnd).trim();

    items.push({
      type: "deadline",
      title: extractDeadlineTitle(content, match.index) || `Deadline: the ${match[1]}`,
      metadata: { date: resolvedDate },
      source_quote: context,
      confidence: 0.6,
    });
  }

  // "deadline: X" / "deadline is X"
  const deadlinePattern = /deadline(?:\s+is)?\s*:?\s*(.+?)(?:\.|$)/gi;
  while ((match = deadlinePattern.exec(content)) !== null) {
    const text = match[1].trim();
    if (text.length < 3 || text.length > 200) continue;

    // Try to extract a date from the captured text
    const inlineDate = extractInlineDate(text, meetingDate);

    items.push({
      type: "deadline",
      title: capitalizeFirst(text),
      metadata: inlineDate ? { date: inlineDate } : {},
      source_quote: match[0].trim(),
      confidence: 0.85,
    });
  }

  return items;
}

// ─── Prize Detection ───

function detectPrizes(content: string): DetectedItem[] {
  const items: DetectedItem[] = [];
  const lowerContent = content.toLowerCase();

  // Check if this note is prize-related at all
  const prizeKeywords = ["budget", "prize", "1st place", "2nd place", "3rd place",
    "treasure pod", "ring", "placement", "top 4", "top 16"];
  const hasPrizeContext = prizeKeywords.some((kw) => lowerContent.includes(kw));
  if (!hasPrizeContext) return items;

  // Extract budget amount: "budget of/is/: €X" or "budget €X"
  const budgetPattern = /budget\s*(?:of|is|:)?\s*€?\s*(\d+(?:[.,]\d+)?)/gi;
  let match;
  const breakdown: Record<string, number | string> = {};
  let budget: number | undefined;

  while ((match = budgetPattern.exec(content)) !== null) {
    budget = parseFloat(match[1].replace(",", "."));
  }

  // Extract placement amounts: "1st €50" / "2nd €30" etc
  const placementPattern = /(\d+)(?:st|nd|rd|th)\s*(?:place)?\s*€?\s*(\d+(?:[.,]\d+)?)/gi;
  while ((match = placementPattern.exec(content)) !== null) {
    const place = match[1];
    const amount = parseFloat(match[2].replace(",", "."));
    breakdown[`placement_${place}`] = amount;
  }

  // Treasure pod amounts
  const podPattern = /(\d+)\s*(?:treasure\s+)?pods?\s*(?:of|×|x)?\s*€?\s*(\d+(?:[.,]\d+)?)/gi;
  while ((match = podPattern.exec(content)) !== null) {
    const count = parseInt(match[1], 10);
    const amount = parseFloat(match[2].replace(",", "."));
    breakdown.treasure_pods = `${count}×€${amount}`;
  }

  // Ring mention
  if (lowerContent.includes("ring")) {
    breakdown.ring = "included";
  }

  if (budget !== undefined || Object.keys(breakdown).length > 0) {
    items.push({
      type: "prize",
      title: "Prize structure",
      metadata: {
        budget,
        breakdown: Object.keys(breakdown).length > 0 ? breakdown : undefined,
      },
      source_quote: content.length > 200 ? content.substring(0, 200) + "..." : content,
      confidence: 0.75,
    });
  }

  return items;
}

// ─── Helpers ───

/** Try to find a date inside free text (e.g. "submit prizes by April 29" or "on the 15th") */
function extractInlineDate(text: string, referenceDate: string): string | null {
  // "Month Day" anywhere in text
  const monthDayRe = new RegExp(`(${MONTH_NAMES.join("|")})\\s+(\\d{1,2})(?:st|nd|rd|th)?`, "i");
  const md = monthDayRe.exec(text);
  if (md) {
    return resolveMonthDay(md[1], parseInt(md[2], 10), referenceDate);
  }

  // "the Nth" or bare ordinal with suffix
  const ordRe = /(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)/i;
  const od = ordRe.exec(text);
  if (od) {
    const day = parseInt(od[1], 10);
    if (day >= 1 && day <= 31) return resolveDayOnly(day, referenceDate);
  }

  return null;
}

function resolveMonthDay(monthName: string, day: number, referenceDate: string): string | null {
  const monthNum = MONTHS[monthName.toLowerCase()];
  if (!monthNum || day < 1 || day > 31) return null;

  const refYear = parseInt(referenceDate.substring(0, 4), 10);
  const paddedDay = String(day).padStart(2, "0");

  return `${refYear}-${monthNum}-${paddedDay}`;
}

function resolveDayOnly(day: number, referenceDate: string): string {
  const [yearStr, monthStr, dayStr] = referenceDate.split("-");
  const refDay = parseInt(dayStr, 10);
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);

  if (day <= refDay) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function extractDeadlineTitle(content: string, matchIndex: number): string | null {
  // Look backwards for context before the date mention
  const before = content.substring(Math.max(0, matchIndex - 80), matchIndex).trim();

  // Try to find the last sentence or phrase
  const parts = before.split(/[.!?]/);
  const lastPart = parts[parts.length - 1]?.trim();
  if (lastPart && lastPart.length > 5 && lastPart.length < 100) {
    return capitalizeFirst(lastPart);
  }

  return null;
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function deduplicateItems(items: DetectedItem[]): DetectedItem[] {
  const seen = new Set<string>();
  const result: DetectedItem[] = [];

  for (const item of items) {
    const key = `${item.type}:${item.title.toLowerCase().substring(0, 50)}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}
