import type { Topic } from "@/lib/types";

// Small, dependency-free text helpers shared by the OpenRouter and mock AI
// implementations: turning a topic name into a stable id, splitting raw
// notes into chunks small enough to send to the model, and picking which
// chunks are worth sending for a given set of topics.

const MAX_SLUG_CHARS = 40;

// Combining diacritical marks (the accent marks NFKD normalisation splits
// off from a letter, for example the two dots in the decomposed form of a
// letter like the German o-umlaut) run from code point 768 to 879.
const COMBINING_MARK_START = 768;
const COMBINING_MARK_END = 879;

// Decomposes accented letters (NFKD) and drops the combining marks left
// behind, so "cafe with an accented e" folds to a plain "e" instead of
// disappearing when non-ascii characters are stripped further down.
function stripDiacritics(input: string): string {
  let result = "";
  for (const char of input.normalize("NFKD")) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= COMBINING_MARK_START && code <= COMBINING_MARK_END) {
      continue;
    }
    result += char;
  }
  return result;
}

// Lowercase, ascii letters, digits and hyphens only, at most 40 characters,
// and never empty (falls back to "topic"). Used to turn a topic name into a
// URL-safe id.
export function slugify(name: string): string {
  const ascii = stripDiacritics(name);
  const slug = ascii
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_CHARS)
    .replace(/-+$/g, "");
  return slug.length > 0 ? slug : "topic";
}

// Slugifies every name and disambiguates collisions with -2, -3, and so on,
// so the result is safe to use as a set of topic ids within one material.
export function uniqueTopicIds(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const base = slugify(name);
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    if (count === 1) {
      return base;
    }
    const suffix = `-${count}`;
    const trimmedBase = base.slice(0, Math.max(1, MAX_SLUG_CHARS - suffix.length));
    return `${trimmedBase}${suffix}`;
  });
}

// Splits text on sentence boundaries and repacks it into pieces no longer
// than targetChars. Used both to break an over-long paragraph into
// chunk-sized pieces and, inside that, to hard-split a single sentence that
// is on its own longer than targetChars.
function splitBySentence(text: string, targetChars: number): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/).filter((sentence) => sentence.trim().length > 0);
  const pieces: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (sentence.length > targetChars) {
      if (current.length > 0) {
        pieces.push(current);
        current = "";
      }
      for (let i = 0; i < sentence.length; i += targetChars) {
        pieces.push(sentence.slice(i, i + targetChars));
      }
      continue;
    }

    if (current.length === 0) {
      current = sentence;
    } else if (current.length + 1 + sentence.length <= targetChars) {
      current = `${current} ${sentence}`;
    } else {
      pieces.push(current);
      current = sentence;
    }
  }

  if (current.length > 0) {
    pieces.push(current);
  }

  return pieces;
}

// Normalises line endings, splits the text into paragraphs on blank lines,
// then packs paragraphs into chunks of about targetChars, splitting any
// single paragraph that is longer than targetChars at sentence boundaries.
// Never returns an empty chunk, and never returns an empty array for
// non-blank input.
export function splitIntoChunks(text: string, targetChars = 6000): string[] {
  const normalised = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const paragraphs = normalised
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

  const pieces: string[] = [];
  for (const paragraph of paragraphs) {
    if (paragraph.length <= targetChars) {
      pieces.push(paragraph);
    } else {
      pieces.push(...splitBySentence(paragraph, targetChars));
    }
  }

  const chunks: string[] = [];
  let current = "";
  for (const piece of pieces) {
    if (current.length === 0) {
      current = piece;
    } else if (current.length + 2 + piece.length <= targetChars) {
      current = `${current}\n\n${piece}`;
    } else {
      chunks.push(current);
      current = piece;
    }
  }
  if (current.length > 0) {
    chunks.push(current);
  }

  if (chunks.length === 0 && normalised.trim().length > 0) {
    chunks.push(normalised.trim());
  }

  return chunks;
}

// Words that are too common to help decide which chunk covers which topic.
const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "can", "could",
  "did", "does", "do", "for", "from", "has", "have", "how", "in", "into",
  "is", "it", "its", "may", "more", "most", "not", "of", "on", "or", "over",
  "should", "so", "some", "such", "than", "that", "the", "their", "then",
  "these", "this", "those", "to", "under", "was", "were", "what", "when",
  "where", "which", "why", "will", "with", "would", "you", "your",
]);

// Lowercase alphanumeric words of more than two characters, stopwords removed.
function extractWords(text: string): string[] {
  const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return words.filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

// Distinct keywords drawn from every topic's name and key points.
function collectKeywords(topics: Topic[]): string[] {
  const keywords = new Set<string>();
  for (const topic of topics) {
    for (const word of extractWords(topic.name)) {
      keywords.add(word);
    }
    for (const point of topic.keyPoints) {
      for (const word of extractWords(point)) {
        keywords.add(word);
      }
    }
  }
  return [...keywords];
}

// Number of distinct keywords that appear, as whole words, anywhere in chunk.
function scoreChunk(chunk: string, keywords: string[]): number {
  const lower = chunk.toLowerCase();
  let score = 0;
  for (const keyword of keywords) {
    if (new RegExp(`\\b${keyword}\\b`).test(lower)) {
      score += 1;
    }
  }
  return score;
}

// Picks the chunks worth sending to the model for a given set of topics,
// staying under budgetChars. Chunks are scored by how many distinct
// lowercase keywords from the topics' names and key points they contain;
// the highest scoring chunks that fit the budget are kept, returned in
// their original order. When no chunk scores (for example, extractTopics
// has no topics yet), the leading chunks that fit the budget are returned
// instead so there is always relevant-ish context to send.
export function selectChunks(chunks: string[], topics: Topic[], budgetChars = 24000): string[] {
  const keywords = collectKeywords(topics);
  const scores = chunks.map((chunk) => scoreChunk(chunk, keywords));
  const anyScore = scores.some((score) => score > 0);

  if (!anyScore) {
    const leading: string[] = [];
    let used = 0;
    for (const chunk of chunks) {
      if (used + chunk.length > budgetChars) {
        break;
      }
      leading.push(chunk);
      used += chunk.length;
    }
    return leading;
  }

  const byScore = chunks
    .map((chunk, index) => ({ chunk, index, score: scores[index] }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const pickedIndexes: number[] = [];
  let used = 0;
  for (const entry of byScore) {
    if (used + entry.chunk.length > budgetChars) {
      continue;
    }
    pickedIndexes.push(entry.index);
    used += entry.chunk.length;
  }

  pickedIndexes.sort((a, b) => a - b);
  return pickedIndexes.map((index) => chunks[index]);
}
