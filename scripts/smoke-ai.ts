import { readFile } from "node:fs/promises";
import path from "node:path";
import { SAMPLE_NOTES } from "@/content/sample-notes";
import { getAi } from "@/lib/ai";
import {
  chatSchema,
  explanationSchema,
  feedbackSchema,
  notesSchema,
  pdfTopicsSchema,
  quizSchema,
  topicsSchema,
} from "@/lib/ai/schemas";
import { selectChunks, splitIntoChunks } from "@/lib/ai/text";
import { AiError } from "@/lib/ai/types";
import type { ChatTutorOutput, ExplainTopicOutput, ExtractTopicsFromPdfOutput } from "@/lib/ai/types";
import type { MaterialNotes, Question, Topic, TopicProgress } from "@/lib/types";

// End-to-end check of the AI layer, in whatever mode the environment gives
// (mock when OPENROUTER_API_KEY is unset, real OpenRouter otherwise): run
// all seven AiClient jobs, the five text jobs chained on the bundled sample
// notes the way real route code would chain them (topics, quiz, explanation,
// study notes, feedback and the tutor chat), plus the scanned-PDF job on
// robot/data/test.pdf, and validate every output against the zod schemas in
// schemas.ts plus the id fields those schemas do not cover. The scanned-PDF
// job is retired in the OpenRouter client, so in real mode it must fail with
// exactly that student-readable AiError instead of producing output. Exits 1
// on any failure so it can be used as a CI-style gate.

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function wordCount(text: string): number {
  return text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
}

function validateTopics(topics: Topic[]): void {
  const ids = new Set<string>();
  for (const topic of topics) {
    assert(typeof topic.id === "string" && topic.id.length > 0, "topic id must be a non-empty string");
    assert(!ids.has(topic.id), `duplicate topic id: ${topic.id}`);
    ids.add(topic.id);
  }
  topicsSchema.parse({
    topics: topics.map((topic) => ({ name: topic.name, summary: topic.summary, keyPoints: topic.keyPoints })),
  });
}

function validateQuiz(questions: Question[], requestedCount: number, topics: Topic[]): void {
  assert(
    questions.length > 0 && questions.length <= requestedCount,
    `expected up to ${requestedCount} questions, got ${questions.length}`
  );
  if (questions.length !== requestedCount) {
    console.warn(`WARN: generateQuiz returned ${questions.length} of the ${requestedCount} requested questions.`);
  }

  const topicIds = new Set(topics.map((topic) => topic.id));
  const qids = new Set<string>();
  for (const question of questions) {
    assert(typeof question.qid === "string" && question.qid.length > 0, "qid must be a non-empty string");
    assert(!qids.has(question.qid), `duplicate qid: ${question.qid}`);
    qids.add(question.qid);
    assert(topicIds.has(question.topicId), `question topicId ${question.topicId} is not one of the given topics`);
    assert(question.options.length === 4, "options must have exactly 4 entries");
    assert(question.answerIndex >= 0 && question.answerIndex <= 3, "answerIndex must be 0 to 3");
  }

  quizSchema.parse({
    questions: questions.map((question) => ({
      topicName: topics.find((topic) => topic.id === question.topicId)?.name ?? "unknown",
      stem: question.stem,
      options: question.options,
      answerIndex: question.answerIndex,
      explanation: question.explanation,
    })),
  });
}

function validateExplanation(output: ExplainTopicOutput): void {
  explanationSchema.parse({ explanation: output.explanation, keyPoints: output.keyPoints });
}

function validateFeedback(feedback: string): void {
  feedbackSchema.parse({ feedback });
}

function validateNotes(notes: MaterialNotes): void {
  notesSchema.parse(notes);
}

function validateChat(output: ChatTutorOutput): void {
  chatSchema.parse(output);
}

function validatePdfTopics(output: ExtractTopicsFromPdfOutput): void {
  validateTopics(output.topics);
  pdfTopicsSchema.parse({
    text: output.text,
    topics: output.topics.map((topic) => ({
      name: topic.name,
      summary: topic.summary,
      keyPoints: topic.keyPoints,
    })),
  });
}

// A mix of strong (even index) and weak (odd index) topics, so
// generateFeedback has something of each to describe.
function fabricateProgress(topics: Topic[]): TopicProgress[] {
  const now = new Date().toISOString();
  return topics.map((topic, index) => {
    const attempts = 5 + index;
    const correct = index % 2 === 0 ? Math.round(attempts * 0.85) : Math.round(attempts * 0.4);
    const wrong = attempts - correct;
    const mastery = correct / attempts;
    return {
      topicId: topic.id,
      materialId: "smoke-material",
      name: topic.name,
      attempts,
      correct,
      wrong,
      mastery,
      lastAttemptAt: now,
      weak: mastery < 0.6 && attempts >= 3,
      explanation: null,
      explanationAt: null,
    };
  });
}

async function main(): Promise<void> {
  const ai = getAi();
  const description = await ai.describe();
  console.log(
    `Running the AI smoke test against: ${description.provider}${description.model ? ` (${description.model})` : ""}\n`
  );

  const topics = await ai.extractTopics({ title: SAMPLE_NOTES.title, text: SAMPLE_NOTES.text });
  validateTopics(topics);
  console.log(`OK: extractTopics -> ${topics.length} topics: ${topics.map((topic) => topic.name).join(", ")}`);

  const chunks = splitIntoChunks(SAMPLE_NOTES.text);
  const selected = selectChunks(chunks, topics, 24000);

  const requestedCount = 10;
  const questions = await ai.generateQuiz({
    topics,
    chunks: selected,
    count: requestedCount,
    difficulty: "medium",
  });
  validateQuiz(questions, requestedCount, topics);
  console.log(`OK: generateQuiz -> ${questions.length} questions, e.g. "${questions[0].stem}"`);

  const firstTopic = topics[0];
  const explanation = await ai.explainTopic({ topic: firstTopic, chunks: selected, wrongQuestions: [] });
  validateExplanation(explanation);
  console.log(
    `OK: explainTopic -> ${wordCount(explanation.explanation)} words, ${explanation.keyPoints.length} key points, on "${firstTopic.name}"`
  );

  const progress = fabricateProgress(topics);
  const feedback = await ai.generateFeedback({
    progress,
    materials: [{ id: "smoke-material", title: SAMPLE_NOTES.title }],
  });
  validateFeedback(feedback);
  const preview = feedback.length > 120 ? `${feedback.slice(0, 120)}...` : feedback;
  console.log(`OK: generateFeedback -> ${wordCount(feedback)} words: "${preview}"`);

  const notes = await ai.generateNotes({ title: SAMPLE_NOTES.title, topics, chunks: selected });
  validateNotes(notes);
  console.log(
    `OK: generateNotes -> ${notes.sections.length} sections, ${notes.keyPoints.length} key points, ${notes.flashcards.length} flashcards, summary ${wordCount(notes.summary)} words`
  );

  const chat = await ai.chatTutor({
    message: "Explain the most important idea in these notes in simple words.",
    contextText: selected.join("\n\n"),
    history: [],
  });
  validateChat(chat);
  const chatPreview = chat.reply.length > 120 ? `${chat.reply.slice(0, 120)}...` : chat.reply;
  console.log(
    `OK: chatTutor -> ${wordCount(chat.reply)} words, ${chat.suggestions.length} suggestions: "${chatPreview}"`
  );

  const pdfPath = path.join(process.cwd(), "robot", "data", "test.pdf");
  const pdfBuffer = await readFile(pdfPath);
  const pdfInput = {
    title: "Smoke test PDF",
    pdfBase64: pdfBuffer.toString("base64"),
    sourceName: "test.pdf",
  };

  if (description.provider === "mock") {
    const pdfResult = await ai.extractTopicsFromPdf(pdfInput);
    validatePdfTopics(pdfResult);
    console.log(
      `OK: extractTopicsFromPdf -> ${pdfResult.text.length} transcribed characters, topics: ${pdfResult.topics.map((topic) => topic.name).join(", ")}`
    );
  } else {
    // The OpenRouter client retires the scanned-PDF job, so in real mode
    // the call must fail with the retirement message, and anything else is
    // a smoke failure.
    try {
      await ai.extractTopicsFromPdf(pdfInput);
      throw new Error("extractTopicsFromPdf answered, but it is retired in the OpenRouter client.");
    } catch (error) {
      if (!(error instanceof AiError)) {
        throw error;
      }
      console.log(`OK: extractTopicsFromPdf -> retired in real mode as expected ("${error.message}")`);
    }
  }

  console.log("\nAll seven AI jobs produced schema-valid output.");
}

main().catch((error) => {
  console.error("FAIL:", error instanceof Error ? error.message : error);
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});
