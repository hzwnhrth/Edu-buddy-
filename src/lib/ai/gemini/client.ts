import { ApiError, GoogleGenAI, type ContentListUnion, type Part } from "@google/genai";
import type { z } from "zod";
import { getEnv } from "@/lib/env";
import { jsonSchemaFor } from "@/lib/ai/schemas";
import { AiError } from "@/lib/ai/types";

// Thin wrapper around @google/genai: building the client, picking a model
// when GEMINI_MODEL is not set, and asking for structured JSON output that
// is validated against a zod schema. Everything here reads from the
// installed SDK's own type definitions (node_modules/@google/genai/dist),
// never from memory of an older SDK shape. See the report for the exact
// names and .d.ts paths this was read from.

declare global {
  var __edubuddyGeminiClient: GoogleGenAI | undefined;
  var __edubuddyGeminiModel: Promise<string> | undefined;
  var __edubuddyGeminiModelLogged: boolean | undefined;
}

function getClient(): GoogleGenAI {
  if (!globalThis.__edubuddyGeminiClient) {
    const apiKey = getEnv().geminiApiKey;
    if (!apiKey) {
      throw new AiError("GEMINI_API_KEY is not set, so Gemini cannot be reached.");
    }
    // Client construction, per node_modules/@google/genai/dist/genai.d.ts
    // (GoogleGenAI class, line 6725): new GoogleGenAI({ apiKey }).
    globalThis.__edubuddyGeminiClient = new GoogleGenAI({ apiKey });
  }
  return globalThis.__edubuddyGeminiClient;
}

function stripModelsPrefix(id: string): string {
  return id.startsWith("models/") ? id.slice("models/".length) : id;
}

// Model ids that must be excluded even though they contain "flash": preview
// builds, the smaller "lite" tier, live/streaming variants, and models that
// are not general-purpose text models at all (tts, image, audio, embedding,
// and so on).
const EXCLUDED_SUBSTRINGS = [
  "preview",
  "lite",
  "live",
  "tts",
  "image",
  "audio",
  "embedding",
  "native",
  "exp",
  "computer-use",
  "translate",
  "transcribe",
];

function isEligibleFlashModel(id: string): boolean {
  const lower = id.toLowerCase();
  if (!lower.includes("flash")) {
    return false;
  }
  return !EXCLUDED_SUBSTRINGS.some((word) => lower.includes(word));
}

// The numeric version after "gemini-", for example 2.5 out of
// "gemini-2.5-flash". Ids with no such number (an alias like
// "gemini-flash-latest") sort behind every versioned id.
function parseGeminiVersion(id: string): number {
  const match = id.match(/gemini-(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : Number.NEGATIVE_INFINITY;
}

export interface GeminiModelInfo {
  id: string;
  displayName: string | null;
  supportsGenerateContent: boolean;
}

// Lists every model this API key can see. Used by scripts/list-models.ts
// and by resolveModel() below. Per node_modules/@google/genai/dist/genai.d.ts:
// Models.list(params?: ListModelsParameters) => Promise<Pager<Model>>
// (line 11040 there, 11052 in dist/node/node.d.ts), where Pager<T> (line
// 11589) implements AsyncIterable<T> and fetches further pages on its own
// while iterated with "for await". The Model interface (line 10798) has
// "name" (the resource name, for example "models/gemini-2.5-flash"),
// "displayName", and "supportedActions" (a string array; the SDK maps this
// from the Gemini API's raw "supportedGenerationMethods" field, confirmed in
// node_modules/@google/genai/dist/node/index.mjs around line 12048, so a
// model that can answer generateContent calls lists "generateContent" in it).
export async function listGeminiModels(): Promise<GeminiModelInfo[]> {
  const client = getClient();
  const pager = await client.models.list();
  const models: GeminiModelInfo[] = [];
  for await (const model of pager) {
    const rawId = model.name ?? "";
    if (!rawId) {
      continue;
    }
    models.push({
      id: stripModelsPrefix(rawId),
      displayName: model.displayName ?? null,
      supportsGenerateContent: (model.supportedActions ?? []).includes("generateContent"),
    });
  }
  return models;
}

async function pickNewestFlashModel(): Promise<string> {
  const models = await listGeminiModels();
  const candidates = models
    .filter((model) => model.supportsGenerateContent && isEligibleFlashModel(model.id))
    .map((model) => model.id);

  if (candidates.length === 0) {
    throw new AiError(
      "No usable Gemini Flash model was found for this API key. Please set GEMINI_MODEL to a specific model id."
    );
  }

  candidates.sort((a, b) => {
    const versionDiff = parseGeminiVersion(b) - parseGeminiVersion(a);
    if (versionDiff !== 0) {
      return versionDiff;
    }
    return b.length - a.length;
  });

  return candidates[0];
}

// Returns the model id to use for every Gemini call. When GEMINI_MODEL is
// set, that value wins outright and nothing is listed. Otherwise the
// available models are listed once per process and the newest eligible
// Flash model is cached on globalThis for reuse; a failed resolution is not
// cached, so the next call tries again instead of failing forever.
export async function resolveModel(): Promise<string> {
  const configured = getEnv().geminiModel;
  if (configured) {
    return configured;
  }

  if (globalThis.__edubuddyGeminiModel) {
    return globalThis.__edubuddyGeminiModel;
  }

  const promise = pickNewestFlashModel().then((id) => {
    if (!globalThis.__edubuddyGeminiModelLogged) {
      globalThis.__edubuddyGeminiModelLogged = true;
      console.log(`EduBuddy: using Gemini model ${id}`);
    }
    return id;
  });

  globalThis.__edubuddyGeminiModel = promise;
  promise.catch(() => {
    if (globalThis.__edubuddyGeminiModel === promise) {
      globalThis.__edubuddyGeminiModel = undefined;
    }
  });

  return promise;
}

// Strips a leading ```json (or plain ```) fence and trailing ``` if the
// model wrapped its answer in one despite being asked not to.
function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

// Turns an SDK-level failure into a short message a student could read,
// while keeping the real error in the server log.
function toAiError(error: unknown): AiError {
  console.error(error);

  if (error instanceof ApiError) {
    if (error.status === 429) {
      return new AiError("The AI service is busy right now. Please try again in a moment.");
    }
    if (error.status === 401 || error.status === 403) {
      return new AiError("The AI service rejected the request. Please check the API key.");
    }
    if (error.status >= 500) {
      return new AiError("The AI service is temporarily unavailable. Please try again shortly.");
    }
    return new AiError("The AI service could not process this request.");
  }

  if (error instanceof AiError) {
    return error;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const looksLikeNetworkError = ["fetch failed", "network", "enotfound", "econnrefused", "timeout"].some(
    (needle) => message.includes(needle)
  );
  if (looksLikeNetworkError) {
    return new AiError("Could not reach the AI service. Please check your connection and try again.");
  }

  return new AiError("The AI service had a problem. Please try again.");
}

interface AttemptResult<T> {
  ok: boolean;
  value?: T;
  issue?: string;
  raw?: string;
}

async function attemptGenerate<T>(
  fullPrompt: string,
  schema: z.ZodType<T>,
  model: string,
  responseJsonSchema: Record<string, unknown>,
  temperature: number,
  extraParts?: Part[]
): Promise<AttemptResult<T>> {
  let responseText: string;
  try {
    const client = getClient();
    // Content parts, per node_modules/@google/genai/dist/genai.d.ts: Part
    // (line 11744) has a "text" field (line 11767) for plain prompt text and
    // an "inlineData" field (line 11765) of type Blob_2 (declared line 1370,
    // exported as "Blob") for attached media, whose own "data" (line 1373,
    // a base64 string) and "mimeType" (line 1377) fields carry the bytes and
    // their IANA media type. GenerateContentParameters.contents (line 5734)
    // takes a ContentListUnion (line 2187), which includes PartUnion[]
    // (PartUnion at line 11843 is Part | string), so a plain Part[] such as
    // [{ text }, { inlineData: { data, mimeType } }] is valid on its own,
    // with no need to wrap it in a Content object first. The same
    // declarations, at slightly different line numbers, are duplicated in
    // dist/node/node.d.ts, which is the file the "node" package export
    // condition actually resolves types to in this project.
    const contents: ContentListUnion =
      extraParts && extraParts.length > 0 ? [{ text: fullPrompt }, ...extraParts] : fullPrompt;
    // Structured output option, per node_modules/@google/genai/dist/genai.d.ts
    // GenerateContentConfig (line 5565): responseMimeType must be
    // "application/json" and responseJsonSchema (line 5667) takes a plain
    // JSON Schema object, preferred here over responseSchema (line 5651)
    // which only accepts the smaller OpenAPI 3.0 subset used by "Schema".
    const response = await client.models.generateContent({
      model,
      contents,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema,
        temperature,
      },
    });
    // GenerateContentResponse.text (line 5785): the concatenated text of
    // the first candidate.
    responseText = response.text ?? "";
  } catch (error) {
    throw toAiError(error);
  }

  const cleaned = stripJsonFence(responseText);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { ok: false, raw: cleaned, issue: "The response was not valid JSON." };
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    const issue = result.error.issues[0];
    const issueMessage = issue
      ? `${issue.path.length ? issue.path.join(".") : "value"}: ${issue.message}`
      : "The response did not match the expected shape.";
    return { ok: false, raw: cleaned, issue: issueMessage };
  }

  return { ok: true, value: result.data };
}

// Asks Gemini for JSON matching `schema`, validates it, and retries once
// with a corrective instruction if the first answer could not be parsed or
// did not validate. Throws AiError on a second failure, or immediately on
// any SDK-level error (rate limit, bad key, network). `parts` carries extra
// content parts (for example an inline PDF document) sent alongside the
// prompt text on both the first attempt and the corrective retry.
export async function generateJson<T>(args: {
  prompt: string;
  schema: z.ZodType<T>;
  temperature?: number;
  parts?: Part[];
}): Promise<T> {
  const { prompt, schema, temperature = 0.4, parts } = args;
  const model = await resolveModel();
  const responseJsonSchema = jsonSchemaFor(schema);

  const first = await attemptGenerate(prompt, schema, model, responseJsonSchema, temperature, parts);
  if (first.ok && first.value !== undefined) {
    return first.value;
  }
  console.error("EduBuddy: Gemini answer failed validation, retrying once.", first.issue, first.raw);

  const corrective = `${prompt}\n\nYour previous answer was invalid: ${first.issue} Return corrected JSON that matches the schema exactly, with no markdown formatting and no extra text.`;
  const second = await attemptGenerate(corrective, schema, model, responseJsonSchema, temperature, parts);
  if (second.ok && second.value !== undefined) {
    return second.value;
  }
  console.error("EduBuddy: Gemini answer failed validation twice.", second.issue, second.raw);

  throw new AiError("The AI answer could not be read. Please try again.");
}
