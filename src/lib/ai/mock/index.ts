import { SAMPLE_MARKER, SAMPLE_NOTES } from "@/content/sample-notes";
import { pdfTopicsSchema } from "@/lib/ai/schemas";
import { uniqueTopicIds } from "@/lib/ai/text";
import type {
  AiClient,
  AiDescription,
  ExplainTopicInput,
  ExplainTopicOutput,
  ExtractTopicsFromPdfInput,
  ExtractTopicsFromPdfOutput,
  ExtractTopicsInput,
  GenerateFeedbackInput,
  GenerateQuizInput,
} from "@/lib/ai/types";
import { AiError } from "@/lib/ai/types";
import type { Question, Topic, TopicProgress } from "@/lib/types";

// Deterministic, offline stand-in for GeminiAi. Nothing here reads the
// network or Math.random: every output is built only from its input, so the
// same call always returns the same answer. Used whenever GEMINI_API_KEY is
// not set. Every output must satisfy the zod schemas in ../schemas.ts; the
// smoke test (scripts/smoke-ai.ts) asserts that directly.

// ---- shape limits, matching src/lib/ai/schemas.ts ------------------------

const MIN_TOPICS = 4;
const MAX_TOPICS = 8;
const MIN_KEY_POINTS = 3;
const MAX_KEY_POINTS = 5;
const NAME_MIN_CHARS = 2;
const NAME_MAX_CHARS = 60;
const NAME_MAX_WORDS = 6;
const SUMMARY_MIN_CHARS = 10;
const SUMMARY_MAX_CHARS = 220;
const KEY_POINT_MIN_CHARS = 3;
const KEY_POINT_MAX_CHARS = 160;
const OPTION_MIN_CHARS = 1;
const OPTION_MAX_CHARS = 160;
const STEM_MIN_CHARS = 10;
const STEM_MAX_CHARS = 300;
const QUESTION_EXPLANATION_MIN_CHARS = 10;
const QUESTION_EXPLANATION_MAX_CHARS = 320;
const EXPLANATION_MIN_WORDS = 150;
const EXPLANATION_MAX_WORDS = 300;
const EXPLANATION_MIN_CHARS = 300;
const EXPLANATION_MAX_CHARS = 2400;
const FEEDBACK_MIN_WORDS = 80;
const FEEDBACK_MAX_WORDS = 150;
const FEEDBACK_MIN_CHARS = 200;
const FEEDBACK_MAX_CHARS = 1400;

// ---- small generic text helpers ------------------------------------------

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function splitParagraphs(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

function countWords(text: string): number {
  return text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
}

function lowerFirst(text: string): string {
  return text.length > 0 ? text[0].toLowerCase() + text.slice(1) : text;
}

// Pads a short string up to min characters with a generic filler sentence,
// and truncates a long one down to max characters. Used for every field
// with a character-count schema limit (summary, key points, options,
// stems, per-question explanations).
function clamp(text: string, min: number, max: number): string {
  let result = text.trim();
  if (result.length === 0) {
    result = "Not stated directly in the notes.";
  }
  while (result.length < min) {
    result = `${result} See the notes for more detail.`.trim();
  }
  if (result.length > max) {
    result = result.slice(0, max).trim();
  }
  return result;
}

// Pads a piece of prose up to a minimum word count by appending more
// sentences from nextFiller, and truncates down to a maximum word count.
// nextFiller(i) must be able to produce output forever (i grows without
// bound if the source material is very thin), so callers cycle their filler
// source rather than exhausting it.
function ensureWordRange(
  text: string,
  minWords: number,
  maxWords: number,
  nextFiller: (i: number) => string
): string {
  let result = text.trim();
  let i = 0;
  while (countWords(result) < minWords && i < 200) {
    result = `${result} ${nextFiller(i)}`.trim();
    i += 1;
  }

  const words = result.split(/\s+/).filter(Boolean);
  if (words.length > maxWords) {
    result = `${words.slice(0, maxWords).join(" ")}.`;
  }

  return result;
}

// Turns a sentence (or heading) into a topic name: at most 6 words, at most
// 60 characters, never shorter than 2 characters.
function toTopicName(source: string): string {
  const words = source
    .replace(/[.!?:]+$/, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const joined = words.slice(0, NAME_MAX_WORDS).join(" ").trim();
  const trimmed = joined.length > NAME_MAX_CHARS ? joined.slice(0, NAME_MAX_CHARS).trim() : joined;
  return trimmed.length >= NAME_MIN_CHARS ? trimmed : "Topic";
}

function listNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  return `${names[0]} and ${names[1]}`;
}

// ---- extractTopics ---------------------------------------------------

interface RawSection {
  name: string;
  bodySentences: string[];
}

// A heading is a short line with no full stop, or any line ending in a colon.
function isHeadingLine(line: string): boolean {
  if (line.length === 0) return false;
  if (line.endsWith(":")) return true;
  return line.length < 80 && !line.includes(".");
}

function sectionsFromHeadings(lines: string[]): RawSection[] {
  const sections: RawSection[] = [];
  let current: RawSection | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length === 0) continue;

    if (isHeadingLine(line)) {
      current = { name: toTopicName(line), bodySentences: [] };
      sections.push(current);
      continue;
    }

    if (!current) continue;
    current.bodySentences.push(...splitSentences(line));
  }

  return sections.filter((section) => section.bodySentences.length > 0);
}

// No headings found: use the first sentence of each paragraph as the topic
// name instead, and the rest of that paragraph's sentences as its body.
function sectionsFromParagraphs(text: string): RawSection[] {
  const sections: RawSection[] = [];
  for (const paragraph of splitParagraphs(text)) {
    const sentences = splitSentences(paragraph);
    if (sentences.length === 0) continue;
    const [first, ...rest] = sentences;
    sections.push({ name: toTopicName(first), bodySentences: rest.length > 0 ? rest : [first] });
  }
  return sections;
}

function collectRawSections(text: string): RawSection[] {
  const headingSections = sectionsFromHeadings(text.split(/\r\n|\r|\n/));
  return headingSections.length > 0 ? headingSections : sectionsFromParagraphs(text);
}

const FILLER_TOPIC_NAMES = [
  "Overview",
  "Key ideas",
  "Details",
  "Summary",
  "Background",
  "Applications",
  "Terminology",
  "Review",
];

// Guarantees at least MIN_TOPICS sections: first by splitting an
// over-long section in two, then, if that is still not enough (very thin
// input), by adding generic filler sections built from whatever sentences
// exist anywhere in the source text.
function ensureEnoughSections(sections: RawSection[], sourceText: string): RawSection[] {
  const result = [...sections];

  let canSplit = true;
  while (result.length < MIN_TOPICS && canSplit) {
    const index = result.findIndex((section) => section.bodySentences.length >= MIN_KEY_POINTS * 2);
    if (index === -1) {
      canSplit = false;
      break;
    }
    const target = result[index];
    const mid = Math.ceil(target.bodySentences.length / 2);
    result.splice(
      index,
      1,
      { name: target.name, bodySentences: target.bodySentences.slice(0, mid) },
      { name: toTopicName(`${target.name} continued`), bodySentences: target.bodySentences.slice(mid) }
    );
  }

  if (result.length < MIN_TOPICS) {
    const pool = result.flatMap((section) => section.bodySentences);
    const sentences =
      pool.length > 0 ? pool : splitSentences(sourceText.trim()) || ["This material has very little text."];
    const safeSentences = sentences.length > 0 ? sentences : ["This material has very little text."];

    let poolIndex = 0;
    let fillerIndex = 0;
    while (result.length < MIN_TOPICS) {
      const bodySentences: string[] = [];
      for (let i = 0; i < MIN_KEY_POINTS + 1; i += 1) {
        bodySentences.push(safeSentences[poolIndex % safeSentences.length]);
        poolIndex += 1;
      }
      result.push({ name: FILLER_TOPIC_NAMES[fillerIndex % FILLER_TOPIC_NAMES.length], bodySentences });
      fillerIndex += 1;
    }
  }

  return result;
}

function buildSummary(bodySentences: string[]): string {
  const base = bodySentences[0] ?? "This topic is covered in the notes.";
  return clamp(base, SUMMARY_MIN_CHARS, SUMMARY_MAX_CHARS);
}

function padKeyPoints(points: string[], contextName: string): string[] {
  const result = [...points];
  let i = 0;
  while (result.length < MIN_KEY_POINTS) {
    result.push(
      clamp(`Review the notes on ${contextName} for more detail, point ${i + 1}.`, KEY_POINT_MIN_CHARS, KEY_POINT_MAX_CHARS)
    );
    i += 1;
  }
  return result.slice(0, MAX_KEY_POINTS);
}

// Key points come from the sentences after the one used for the summary
// (bodySentences[1:]); padded up to the minimum and capped at the maximum.
function buildKeyPoints(bodySentences: string[], topicName: string): string[] {
  const pool = bodySentences.slice(1).filter((sentence) => sentence.trim().length > 0);
  const points = pool.slice(0, MAX_KEY_POINTS).map((sentence) => clamp(sentence, KEY_POINT_MIN_CHARS, KEY_POINT_MAX_CHARS));
  return points.length >= MIN_KEY_POINTS ? points : padKeyPoints(points, topicName);
}

function cloneTopics(topics: Topic[]): Topic[] {
  return topics.map((topic) => ({ ...topic, keyPoints: [...topic.keyPoints] }));
}

function buildTopicsFromText(text: string): Topic[] {
  const sections = ensureEnoughSections(collectRawSections(text), text).slice(0, MAX_TOPICS);
  const ids = uniqueTopicIds(sections.map((section) => section.name));

  return sections.map((section, index) => ({
    id: ids[index],
    name: section.name,
    summary: buildSummary(section.bodySentences),
    keyPoints: buildKeyPoints(section.bodySentences, section.name),
  }));
}

// ---- generateQuiz ----------------------------------------------------

// Builds the sequence of topics to ask about: exactly `count` entries,
// cycling through the topics, with at least 70 percent drawn from the focus
// topics when any are given.
function buildTopicOrder(topics: Topic[], focusTopicIds: string[] | undefined, count: number): Topic[] {
  const focusIds = focusTopicIds ?? [];
  const focusTopics = focusIds.length > 0 ? topics.filter((topic) => focusIds.includes(topic.id)) : [];
  const otherTopics = focusIds.length > 0 ? topics.filter((topic) => !focusIds.includes(topic.id)) : [];

  if (focusTopics.length === 0) {
    return Array.from({ length: count }, (_, i) => topics[i % topics.length]);
  }

  const focusCount = Math.min(count, Math.ceil(count * 0.7));
  const order: Topic[] = [];
  for (let i = 0; i < count; i += 1) {
    if (i < focusCount || otherTopics.length === 0) {
      order.push(focusTopics[i % focusTopics.length]);
    } else {
      order.push(otherTopics[(i - focusCount) % otherTopics.length]);
    }
  }
  return order;
}

const DISTRACTOR_ALTERATIONS: ((text: string) => string)[] = [
  (text) => `It is not true that ${lowerFirst(text)}`,
  (text) => `${text.replace(/\.$/, "")}, but only in rare cases.`,
  (text) => `The opposite is true: ${lowerFirst(text)}`,
];

function alterSentence(text: string, seed: number): string {
  const alteration = DISTRACTOR_ALTERATIONS[seed % DISTRACTOR_ALTERATIONS.length];
  return clamp(alteration(text), OPTION_MIN_CHARS, OPTION_MAX_CHARS);
}

// Three wrong options for a question about `topic`: key points borrowed
// from other topics first, rotated by questionIndex (rather than always
// taken from the start of the pool) so two questions about the same topic,
// which happens whenever a quiz has more questions than topics, do not end
// up with the same three distractors; then, if there are not enough other
// topics to borrow from, altered versions of this topic's own key points,
// offset by questionIndex the same way. Deterministic: the same topic,
// pool and question index always produce the same three options.
function buildDistractors(
  topic: Topic,
  allTopics: Topic[],
  correctKeyPointIndex: number,
  questionIndex: number
): string[] {
  const otherPool = allTopics.filter((t) => t.id !== topic.id).flatMap((t) => t.keyPoints);
  const distractors: string[] = [];
  if (otherPool.length > 0) {
    const start = questionIndex % otherPool.length;
    for (let i = 0; i < Math.min(3, otherPool.length); i += 1) {
      distractors.push(otherPool[(start + i) % otherPool.length]);
    }
  }

  let altIndex = 0;
  while (distractors.length < 3) {
    const source =
      topic.keyPoints[(correctKeyPointIndex + 1 + altIndex + questionIndex) % topic.keyPoints.length];
    distractors.push(alterSentence(source, altIndex + questionIndex));
    altIndex += 1;
  }

  return distractors.map((text) => clamp(text, OPTION_MIN_CHARS, OPTION_MAX_CHARS));
}

function buildQuizQuestions(
  topics: Topic[],
  count: number,
  focusTopicIds: string[] | undefined
): Question[] {
  const order = buildTopicOrder(topics, focusTopicIds, count);

  return order.map((topic, index) => {
    const keyPointIndex = index % topic.keyPoints.length;
    const correctPoint = clamp(topic.keyPoints[keyPointIndex], OPTION_MIN_CHARS, OPTION_MAX_CHARS);
    const distractors = buildDistractors(topic, topics, keyPointIndex, index);

    const answerIndex = (index % 4) as 0 | 1 | 2 | 3;
    const options: string[] = new Array(4);
    options[answerIndex] = correctPoint;
    let distractorIndex = 0;
    for (let slot = 0; slot < 4; slot += 1) {
      if (slot === answerIndex) continue;
      options[slot] = distractors[distractorIndex];
      distractorIndex += 1;
    }

    return {
      qid: `mock-q${index + 1}`,
      topicId: topic.id,
      stem: clamp(
        `Which statement about ${topic.name} is correct according to the notes?`,
        STEM_MIN_CHARS,
        STEM_MAX_CHARS
      ),
      options: options as [string, string, string, string],
      answerIndex,
      explanation: clamp(
        `The correct statement is: ${topic.keyPoints[keyPointIndex]}`,
        QUESTION_EXPLANATION_MIN_CHARS,
        QUESTION_EXPLANATION_MAX_CHARS
      ),
    };
  });
}

// ---- explainTopic ------------------------------------------------------

const ORDINALS = ["First", "Second", "Third", "Fourth", "Fifth"];

function ordinal(position: number): string {
  return ORDINALS[(position - 1) % ORDINALS.length];
}

function buildExplanation(topic: Topic, wrongCount: number): string {
  const points = topic.keyPoints.length >= MIN_KEY_POINTS ? topic.keyPoints : padKeyPoints(topic.keyPoints, topic.name);

  const wrongLine =
    wrongCount > 0
      ? `You have answered ${wrongCount} question${wrongCount === 1 ? "" : "s"} on this topic incorrectly so far, so this explanation goes back over the basics before building up.`
      : "You have not missed a recorded question on this topic yet, but a refresher never hurts, so here is the topic from the ground up.";

  const walkthrough = points.map((point, i) => `${ordinal(i + 1)}, ${lowerFirst(point)}`).join(" ");

  const intro = `Let's go over ${topic.name}. ${topic.summary}`;
  const closing = `Keep these points in mind as you revisit the notes on ${topic.name}: ${points.join(" ")} Understanding ${topic.name} well makes the related quiz questions easier, and it usually connects to other topics in the same notes, so it is worth the time now.`;

  const draft = [intro, wrongLine, walkthrough, closing].join(" ");
  const sized = ensureWordRange(draft, EXPLANATION_MIN_WORDS, EXPLANATION_MAX_WORDS, (i) => {
    const point = points[i % points.length];
    return `This matters because ${lowerFirst(point)}`;
  });

  return clamp(sized, EXPLANATION_MIN_CHARS, EXPLANATION_MAX_CHARS);
}

// ---- generateFeedback --------------------------------------------------

const FEEDBACK_FILLERS = [
  "Keep a steady pace and revisit each material at least once more before the next quiz.",
  "Short, regular review sessions work better than one long cram session.",
  "Try explaining each weak topic out loud in your own words to check real understanding.",
  "Retake a quiz on a weak topic once you have gone back over its explanation.",
];

function buildNextSteps(weak: TopicProgress[], hasProgress: boolean): string {
  if (weak.length > 0) {
    const first = `Next, study the explanation for ${weak[0].name} and then retake a quiz on it.`;
    const second =
      weak.length >= 2
        ? `After that, do the same for ${weak[1].name}.`
        : hasProgress
          ? "After that, try a mixed quiz across your other topics to keep them fresh."
          : "After that, upload a set of notes and try your first quiz.";
    return `${first} ${second}`;
  }

  if (hasProgress) {
    return "Next, try a slightly harder quiz on your strongest topic, and look back over your most recent material once more to keep it fresh.";
  }

  return "Next, upload your lecture notes, or try the sample notes, then take your first quiz to get started.";
}

function buildFeedback(progress: TopicProgress[]): string {
  const strong = progress
    .filter((entry) => entry.mastery >= 0.8)
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, 2);
  const weak = progress
    .filter((entry) => entry.weak)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 2);

  const strongText =
    strong.length > 0
      ? `You are doing well on ${listNames(strong.map((entry) => entry.name))}.`
      : progress.length > 0
        ? "You do not have a clearly strong topic yet, so keep practising to build one up."
        : "You have not attempted any quizzes yet, so there is no strong topic to report.";

  const weakText =
    weak.length > 0
      ? `${listNames(weak.map((entry) => entry.name))} ${weak.length === 1 ? "needs" : "need"} more work.`
      : "No topic is currently flagged as weak, which is a good sign.";

  const steps = buildNextSteps(weak, progress.length > 0);

  const draft = `${strongText} ${weakText} ${steps}`;
  const sized = ensureWordRange(
    draft,
    FEEDBACK_MIN_WORDS,
    FEEDBACK_MAX_WORDS,
    (i) => FEEDBACK_FILLERS[i % FEEDBACK_FILLERS.length]
  );

  return clamp(sized, FEEDBACK_MIN_CHARS, FEEDBACK_MAX_CHARS);
}

// ---- extractTopicsFromPdf ----------------------------------------------

const PDF_NO_TEXT_NOTE =
  "No readable text was found in this PDF, so these topics were built from its file name. Set GEMINI_API_KEY to have Gemini read scanned PDFs.";

// Longest the file-name base is allowed to be: the longest suffix below,
// "common mistakes", is 16 characters, plus 2 for the ": " joiner, so a
// 40-character base keeps every "<Base>: <suffix>" topic name at 58
// characters or fewer, inside the schema's 60 character limit.
const PDF_TOPIC_BASE_MAX_CHARS = 40;

const PDF_TOPIC_SUFFIXES = ["overview", "key terms", "how it works", "common mistakes"] as const;

function titleCaseWord(word: string): string {
  return word.length === 0 ? word : word[0].toUpperCase() + word.slice(1).toLowerCase();
}

// Turns a file name into a short topic-name base: strip the extension,
// split on hyphens, underscores, dots and spaces, drop empty pieces,
// title-case each word and join with spaces, for example
// "photosynthesis-notes_v2.pdf" becomes "Photosynthesis Notes V2". Falls
// back to the material title when the file name has nothing usable in it
// (for example "upload.pdf" with nothing before the extension, or an empty
// string), then cuts the result to PDF_TOPIC_BASE_MAX_CHARS characters.
function pdfTopicBase(sourceName: string, title: string): string {
  const withoutExtension = sourceName.replace(/\.[^./\\]+$/, "");
  const words = withoutExtension
    .split(/[-_.\s]+/)
    .filter((word) => word.length > 0)
    .map(titleCaseWord);
  const joined = words.length > 0 ? words.join(" ") : title.trim();
  return joined.slice(0, PDF_TOPIC_BASE_MAX_CHARS).trim();
}

function pdfKeyPoints(base: string, suffix: string): string[] {
  return [
    clamp(`Open the original file to check the ${suffix} of ${base} directly.`, KEY_POINT_MIN_CHARS, KEY_POINT_MAX_CHARS),
    clamp(
      `This key point stands in for real content on ${base} until the PDF can be read.`,
      KEY_POINT_MIN_CHARS,
      KEY_POINT_MAX_CHARS
    ),
    clamp(
      `Set GEMINI_API_KEY so an upload like ${base} is read for its actual content next time.`,
      KEY_POINT_MIN_CHARS,
      KEY_POINT_MAX_CHARS
    ),
  ];
}

// Four generic topics named after the file, used whenever a scanned PDF has
// no extractable text and there is no Gemini key to read the file itself.
// Validated against pdfTopicsSchema before ids are attached, the same
// shape-then-validate order the smoke test uses to check every AiClient
// output, real or mock.
function buildPdfTopics(sourceName: string, title: string): ExtractTopicsFromPdfOutput {
  const base = pdfTopicBase(sourceName, title);
  const topicsPayload = PDF_TOPIC_SUFFIXES.map((suffix) => ({
    name: `${base}: ${suffix}`,
    summary: clamp(
      `This is a placeholder topic about the ${suffix} of ${base}, built from the file name because the PDF had no readable text.`,
      SUMMARY_MIN_CHARS,
      SUMMARY_MAX_CHARS
    ),
    keyPoints: pdfKeyPoints(base, suffix),
  }));

  const validated = pdfTopicsSchema.parse({ text: PDF_NO_TEXT_NOTE, topics: topicsPayload });
  const ids = uniqueTopicIds(validated.topics.map((topic) => topic.name));
  const topics: Topic[] = validated.topics.map((topic, index) => ({
    id: ids[index],
    name: topic.name,
    summary: topic.summary,
    keyPoints: topic.keyPoints,
  }));

  return { text: validated.text, topics };
}

// ---- the client itself --------------------------------------------------

// Deterministic, offline AiClient. Route code should never construct this
// directly, only through getAi() in src/lib/ai/index.ts.
export class MockAi implements AiClient {
  async extractTopics(input: ExtractTopicsInput): Promise<Topic[]> {
    if (input.text.includes(SAMPLE_MARKER)) {
      return cloneTopics(SAMPLE_NOTES.topics);
    }
    return buildTopicsFromText(input.text);
  }

  async generateQuiz(input: GenerateQuizInput): Promise<Question[]> {
    if (input.topics.length === 0) {
      throw new AiError("No topics were given to build a quiz from.");
    }
    return buildQuizQuestions(input.topics, input.count, input.focusTopicIds);
  }

  async explainTopic(input: ExplainTopicInput): Promise<ExplainTopicOutput> {
    const keyPoints =
      input.topic.keyPoints.length >= MIN_KEY_POINTS
        ? input.topic.keyPoints.slice(0, MAX_KEY_POINTS)
        : padKeyPoints(input.topic.keyPoints, input.topic.name);

    return {
      explanation: buildExplanation(input.topic, input.wrongQuestions.length),
      keyPoints,
    };
  }

  async generateFeedback(input: GenerateFeedbackInput): Promise<string> {
    return buildFeedback(input.progress);
  }

  async extractTopicsFromPdf(input: ExtractTopicsFromPdfInput): Promise<ExtractTopicsFromPdfOutput> {
    return buildPdfTopics(input.sourceName, input.title);
  }

  async describe(): Promise<AiDescription> {
    return { provider: "mock", model: null };
  }
}
