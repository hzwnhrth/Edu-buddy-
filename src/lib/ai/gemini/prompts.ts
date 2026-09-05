import type { Difficulty } from "@/lib/types";

// Plain-English prompt builders for the four AI jobs. Every prompt states,
// in some form: you are helping a university student study, use only the
// notes given, keep language simple and clear, answer with JSON matching
// the schema and nothing else, and no markdown in the answer.

const ROLE_LINE =
  "You are helping a university student study from their own lecture notes.";

const GROUNDING_LINE =
  "Use only the notes given below. Do not add facts, names or numbers that are not in them.";

const LANGUAGE_LINE =
  "Write in simple, clear language a first-year student can follow on a first read.";

const OUTPUT_LINE =
  "Answer with a single JSON object matching the schema described below and nothing else: no markdown, no headings, no bullet lists, no code fences, and no text before or after the JSON.";

function withNotes(title: string | null, notesText: string): string {
  const heading = title ? `Notes title: "${title}"` : "Notes:";
  return `${heading}\n"""\n${notesText}\n"""`;
}

// extractTopics: 4 to 8 topics, short names, one-sentence summaries, 3 to 5
// key points each, covering the whole of the notes with no duplicates.
export function buildExtractTopicsPrompt(title: string, notesText: string): string {
  return [
    ROLE_LINE,
    GROUNDING_LINE,
    LANGUAGE_LINE,
    "",
    "Read the notes and pick between 4 and 8 main topics that, together, cover the whole of the notes from start to end. Do not leave out a major section, and do not list the same idea twice under two different names: every topic must be clearly different from every other topic.",
    "",
    "For each topic give:",
    "- name: a short topic name, at most 6 words",
    "- summary: one sentence describing the topic",
    "- keyPoints: 3 to 5 short factual statements about the topic, each one actually stated in the notes",
    "",
    withNotes(title, notesText),
    "",
    OUTPUT_LINE,
  ].join("\n");
}

const DIFFICULTY_GUIDANCE: Record<Difficulty, string> = {
  easy: "Easy: ask for facts stated directly in the notes. Keep the wrong options clearly wrong to anyone who read the notes.",
  medium:
    "Medium: ask questions that need understanding, not just spotting a sentence. Wrong options should be plausible but clearly incorrect on a careful read.",
  hard: "Hard: ask questions that need connecting two ideas from the notes or reading closely. Wrong options should be close and easy to confuse with the right one.",
};

export interface QuizPromptTopic {
  name: string;
  keyPoints: string[];
}

export function buildGenerateQuizPrompt(args: {
  notesText: string;
  topics: QuizPromptTopic[];
  count: number;
  difficulty: Difficulty;
  focusTopicNames: string[];
}): string {
  const { notesText, topics, count, difficulty, focusTopicNames } = args;

  const topicList = topics
    .map((topic) => `- ${topic.name}: ${topic.keyPoints.join("; ")}`)
    .join("\n");

  const focusLine =
    focusTopicNames.length > 0
      ? `At least 70 percent of the ${count} questions must be about these topics: ${focusTopicNames.join(", ")}. The rest may be spread across any of the topics listed below.`
      : `Spread the ${count} questions across all of the topics listed below, roughly evenly.`;

  return [
    ROLE_LINE,
    GROUNDING_LINE,
    LANGUAGE_LINE,
    "",
    `Write exactly ${count} multiple-choice questions testing the topics below. Every question must have exactly four options, with exactly one correct option, and must be answerable from the notes alone. Make the three wrong options plausible, not silly or obviously wrong, but never write two options that could both be defended as correct.`,
    "",
    focusLine,
    "",
    DIFFICULTY_GUIDANCE[difficulty],
    "",
    "Topics (use these exact names as topicName in your answer):",
    topicList,
    "",
    withNotes(null, notesText),
    "",
    "For each question give: topicName (one of the exact topic names above), stem (the question text), options (exactly four strings), answerIndex (the 0-based index of the correct option in options), and explanation (one or two sentences saying why the correct option is right).",
    "",
    OUTPUT_LINE,
  ].join("\n");
}

export interface ExplainPromptWrongQuestion {
  stem: string;
  options: string[];
  correctOption: string;
}

export function buildExplainTopicPrompt(args: {
  notesText: string;
  topicName: string;
  summary: string;
  keyPoints: string[];
  wrongQuestions: ExplainPromptWrongQuestion[];
}): string {
  const { notesText, topicName, summary, keyPoints, wrongQuestions } = args;

  const wrongSection =
    wrongQuestions.length > 0
      ? [
          `This student has previously answered ${wrongQuestions.length} question${wrongQuestions.length === 1 ? "" : "s"} on this topic incorrectly. Use these to spot likely misunderstandings and address them directly in the explanation:`,
          ...wrongQuestions.map(
            (q, i) =>
              `${i + 1}. Question: ${q.stem}\n   Options: ${q.options.join(" / ")}\n   Correct answer: ${q.correctOption}`
          ),
        ].join("\n")
      : "This student has not answered any recorded question on this topic wrong; write a general explanation for someone who found the topic difficult.";

  return [
    ROLE_LINE,
    GROUNDING_LINE,
    LANGUAGE_LINE,
    "",
    `Explain the topic "${topicName}" to a student who is struggling with it. The topic summary is: ${summary}`,
    `Known key points of this topic: ${keyPoints.join("; ")}`,
    "",
    wrongSection,
    "",
    withNotes(null, notesText),
    "",
    "Write explanation as 150 to 300 words of plain, encouraging prose (not a list) that teaches the topic clearly and, where relevant, clears up the misunderstandings above. Then give keyPoints: 3 to 5 short takeaways a student should remember.",
    "",
    OUTPUT_LINE,
  ].join("\n");
}

// extractTopicsFromPdf: the notes arrive as an attached PDF document part
// rather than as text in the prompt (see generateJson's `parts` option in
// client.ts). Transcribe it first, then extract topics the same way
// buildExtractTopicsPrompt does for pasted text.
export function buildExtractTopicsFromPdfPrompt(title: string, sourceName: string): string {
  return [
    ROLE_LINE,
    "Use only the document attached to this message. Do not add facts, names or numbers that are not in it.",
    LANGUAGE_LINE,
    "",
    `The attached file is named "${sourceName}", uploaded with the title "${title}".`,
    "First transcribe the document as plain text, in reading order, at most 30000 characters. If it is longer than that, transcribe from the start and stop at 30000 characters.",
    "",
    "Then, from that transcription, pick between 4 and 8 main topics that, together, cover the whole of the transcription from start to end. Do not leave out a major section, and do not list the same idea twice under two different names: every topic must be clearly different from every other topic.",
    "",
    "For each topic give:",
    "- name: a short topic name, at most 6 words",
    "- summary: one sentence describing the topic",
    "- keyPoints: 3 to 5 short factual statements about the topic, each one actually stated in the document",
    "",
    OUTPUT_LINE,
  ].join("\n");
}

export interface FeedbackPromptTopic {
  name: string;
  materialTitle: string;
  mastery: number;
  attempts: number;
  weak: boolean;
}

export function buildGenerateFeedbackPrompt(
  topics: FeedbackPromptTopic[],
  materialTitles: string[]
): string {
  const topicLines =
    topics.length > 0
      ? topics
          .map(
            (topic) =>
              `- ${topic.name} (from "${topic.materialTitle}"): ${Math.round(topic.mastery * 100)} percent mastery over ${topic.attempts} question${topic.attempts === 1 ? "" : "s"}${topic.weak ? ", currently weak" : ""}`
          )
          .join("\n")
      : "- No quiz attempts yet.";

  return [
    ROLE_LINE,
    LANGUAGE_LINE,
    "",
    "Write a short study plan for this student based on their progress so far, shown below as one line per topic with its mastery, how many questions it is based on, and whether it currently counts as weak (mastery under 60 percent with at least 3 questions answered).",
    "",
    `Materials studied so far: ${materialTitles.length > 0 ? materialTitles.join(", ") : "none yet"}`,
    "Progress by topic:",
    topicLines,
    "",
    "Write feedback as 80 to 150 words covering: what the student is doing well, what is weak, and the next two concrete things they should do. Be friendly and direct, do not pad it with filler, and do not repeat the raw numbers back verbatim, describe them in words.",
    "",
    OUTPUT_LINE,
  ].join("\n");
}
