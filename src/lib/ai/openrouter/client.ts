import type { z } from "zod";
import { getEnv } from "@/lib/env";
import { jsonSchemaFor } from "@/lib/ai/schemas";
import { AiError } from "@/lib/ai/types";

// REST client for OpenRouter serving Google Gemma, written against plain
// fetch: OpenRouter is used as a raw HTTP API here, no SDK is installed.
//
// Request and response shapes below were read from the official chat
// completion reference at
// https://openrouter.ai/docs/api-reference/chat-completion
// (fetched 2026-09-05; OpenAPI 3.1 document "OpenRouter API" 1.0.0, server
// https://openrouter.ai/api/v1). The fields used are:
// - Auth: the "apiKey" security scheme, sent as "Authorization: Bearer <key>".
// - Request body (ChatRequest): "model" (a model slug string such as
//   "google/gemma-4-31b-it:free"), "messages" (array of { role, content };
//   this client sends a single user message), "temperature" (number, 0 to 2),
//   "max_tokens" (integer; the reference deprecates it in favour of
//   "max_completion_tokens", but the Gemma endpoint's own "supported_parameters"
//   list on GET /api/v1/models advertises "max_tokens", so that spelling is
//   sent), and "response_format" of the ChatFormatJsonSchemaConfig variant:
//   { type: "json_schema", json_schema: { name (required, at most 64
//   characters of letters, digits, underscores and dashes), schema (a JSON
//   Schema object), description?, strict? } }.
// - Success response (ChatResult): "choices" (array of ChatChoice:
//   { finish_reason, index, message }), whose "message.content" is documented
//   as string | array | null and carries the answer text; the top-level
//   "model" is "Model used for completion", which is how the client records
//   which entry of the model chain actually answered.
// - Errors: { error: { code, message } }, with 401 unauthorized, 402
//   "Payment Required - Insufficient credits or quota to complete request",
//   403 forbidden, 429 "Rate limit exceeded" and 5xx for provider or server
//   failures.
// - GET /api/v1/models returns { data: [{ id, name, pricing, ... }] };
//   confirmed against the live endpoint on 2026-09-05, which also confirmed
//   the slugs google/gemma-4-31b-it:free and google/gemma-4-31b-it exist.

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// The model chain used when OPENROUTER_MODEL is not set: try the free Gemma
// first and, when it answers 429 or a quota/credits error, retry the same
// call once with the paid Gemma. OPENROUTER_MODEL replaces the whole chain
// with that single id.
export const FREE_MODEL = "google/gemma-4-31b-it:free";
export const PAID_MODEL = "google/gemma-4-31b-it";

// Roomy completion budget so the largest job (generateNotes) is never
// truncated by a small provider default.
const MAX_TOKENS = 8192;
const DEFAULT_TEMPERATURE = 0.4;

// json_schema.name, per the ChatJsonSchemaConfig rules quoted above.
const SCHEMA_NAME = "edubuddy_response";

declare global {
  var __edubuddyOpenRouterAnsweredModel: string | undefined;
  var __edubuddyOpenRouterNoStructuredOutput: Set<string> | undefined;
}

// An HTTP-level failure from the OpenRouter API. Kept separate from AiError
// so the model chain can tell a quota problem (fall back to the next model)
// from anything else (map to a student-readable AiError and throw).
class OpenRouterHttpError extends Error {
  readonly status: number;
  readonly apiMessage: string;

  constructor(status: number, apiMessage: string) {
    super(`OpenRouter returned ${status}: ${apiMessage}`);
    this.status = status;
    this.apiMessage = apiMessage;
  }
}

function isQuotaLike(error: unknown): boolean {
  if (!(error instanceof OpenRouterHttpError)) {
    return false;
  }
  if (error.status === 429 || error.status === 402) {
    return true;
  }
  return /quota|insufficient|credit/i.test(error.apiMessage);
}

// True when the API refused response_format for this model (a 400 whose
// message points at structured output), which switches that model to plain
// prompting for the rest of the process.
function isResponseFormatRejection(error: unknown): boolean {
  if (!(error instanceof OpenRouterHttpError) || error.status !== 400) {
    return false;
  }
  return /response_format|json_schema|json schema|structured/i.test(error.apiMessage);
}

interface OpenRouterResponseShape {
  choices?: Array<{ message?: { content?: unknown } }>;
  model?: string;
  error?: { message?: string };
}

function preferredModel(): string {
  return getEnv().openrouterModel || FREE_MODEL;
}

// The ids to try, in order: OPENROUTER_MODEL alone when set, otherwise the
// free Gemma followed by the paid Gemma.
export function modelChain(): string[] {
  const configured = getEnv().openrouterModel;
  return configured ? [configured] : [FREE_MODEL, PAID_MODEL];
}

// The model the next call will try first. Synchronous: no listing is needed
// because the chain is fixed.
export function resolveModel(): string {
  return preferredModel();
}

function recordAnsweredModel(model: string): void {
  globalThis.__edubuddyOpenRouterAnsweredModel = model;
}

// Which model actually answered the last completed call, for describe().
export function lastAnsweredModel(): string | null {
  return globalThis.__edubuddyOpenRouterAnsweredModel ?? null;
}

function structuredUnsupportedModels(): Set<string> {
  if (!globalThis.__edubuddyOpenRouterNoStructuredOutput) {
    globalThis.__edubuddyOpenRouterNoStructuredOutput = new Set<string>();
  }
  return globalThis.__edubuddyOpenRouterNoStructuredOutput;
}

// The documented message.content is string | array | null; fold any array
// of text parts into one string and treat other shapes as empty.
function contentText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string"
          ? (part as { text: string }).text
          : ""
      )
      .join("");
  }
  return "";
}

// Turns a failure into a short message a student could read, while keeping
// the real error in the server log. Same discipline as the former Gemini
// client, plus the 402 case the OpenRouter docs define for credits.
function toAiError(error: unknown): AiError {
  console.error(error);

  if (error instanceof OpenRouterHttpError) {
    if (error.status === 429) {
      return new AiError("The AI service is busy right now. Please try again in a moment.");
    }
    if (error.status === 401 || error.status === 403) {
      return new AiError("The AI service rejected the request. Please check the API key.");
    }
    if (error.status === 402) {
      return new AiError(
        "The AI service account is out of credits, so the request was refused. Please check the OpenRouter balance."
      );
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

interface ChatArgs {
  model: string;
  prompt: string;
  temperature: number;
  // A JSON Schema object when structured output should be requested, null
  // for plain prompting.
  jsonSchema: Record<string, unknown> | null;
}

interface ChatSuccess {
  content: string;
  answeredModel: string;
}

// One POST /chat/completions call, per the shapes quoted at the top of this
// file. Never logs the request body or headers, so the key cannot leak into
// the server log.
async function chatOnce(args: ChatArgs): Promise<ChatSuccess> {
  const apiKey = getEnv().openrouterApiKey;
  if (!apiKey) {
    throw new AiError("OPENROUTER_API_KEY is not set, so OpenRouter cannot be reached.");
  }

  const body: Record<string, unknown> = {
    model: args.model,
    messages: [{ role: "user", content: args.prompt }],
    temperature: args.temperature,
    max_tokens: MAX_TOKENS,
  };
  if (args.jsonSchema) {
    body.response_format = {
      type: "json_schema",
      json_schema: { name: SCHEMA_NAME, schema: args.jsonSchema },
    };
  }

  let response: Response;
  try {
    response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw toAiError(error);
  }

  const payload = (await response.json().catch(() => null)) as OpenRouterResponseShape | null;
  if (!response.ok) {
    throw new OpenRouterHttpError(response.status, payload?.error?.message ?? response.statusText);
  }

  const content = contentText(payload?.choices?.[0]?.message?.content);
  if (content.length === 0) {
    throw new AiError("The AI returned an empty answer. Please try again.");
  }
  return { content, answeredModel: payload?.model ?? args.model };
}

interface AttemptResult<T> {
  ok: boolean;
  value?: T;
  issue?: string;
  raw?: string;
}

// Strips a leading ```json (or plain ```) fence and trailing ``` if the
// model wrapped its answer in one despite being asked not to.
function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

async function attemptGenerate<T>(args: {
  prompt: string;
  schema: z.ZodType<T>;
  model: string;
  temperature: number;
}): Promise<AttemptResult<T>> {
  const { prompt, schema, model, temperature } = args;
  const useStructured = !structuredUnsupportedModels().has(model);

  let result: ChatSuccess;
  try {
    try {
      result = await chatOnce({ model, prompt, temperature, jsonSchema: useStructured ? jsonSchemaFor(schema) : null });
    } catch (error) {
      if (!useStructured || !isResponseFormatRejection(error)) {
        throw error;
      }
      // The API rejected response_format for this model: remember that and
      // fall back to plain prompting. The answer still has to validate
      // against the same zod schema below.
      structuredUnsupportedModels().add(model);
      console.error(`EduBuddy: OpenRouter rejected response_format for ${model}, falling back to plain prompting.`);
      result = await chatOnce({ model, prompt, temperature, jsonSchema: null });
    }
  } catch (error) {
    // Let HTTP errors through so the model chain can read the status and
    // fall back on quota failures; everything else is mapped for students.
    if (error instanceof OpenRouterHttpError) {
      throw error;
    }
    throw toAiError(error);
  }
  recordAnsweredModel(result.answeredModel);

  const cleaned = stripJsonFence(result.content);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { ok: false, raw: cleaned, issue: "The response was not valid JSON." };
  }

  const parsedResult = schema.safeParse(parsed);
  if (!parsedResult.success) {
    const issue = parsedResult.error.issues[0];
    const issueMessage = issue
      ? `${issue.path.length ? issue.path.join(".") : "value"}: ${issue.message}`
      : "The response did not match the expected shape.";
    return { ok: false, raw: cleaned, issue: issueMessage };
  }

  return { ok: true, value: parsedResult.data };
}

// Asks the OpenRouter model chain for JSON matching `schema`, validates it,
// and retries once with a corrective instruction if an answer could not be
// parsed or did not validate. A 429 or quota/credits failure on one chain
// entry automatically retries the whole job once with the next entry (free
// Gemma then paid Gemma; with OPENROUTER_MODEL set the chain has a single
// entry and no fallback). Throws AiError on a final failure, or immediately
// on any other API-level error (bad key, network, and so on).
export async function generateJson<T>(args: {
  prompt: string;
  schema: z.ZodType<T>;
  temperature?: number;
}): Promise<T> {
  const { prompt, schema, temperature = DEFAULT_TEMPERATURE } = args;
  const chain = modelChain();

  for (let index = 0; index < chain.length; index += 1) {
    const model = chain[index];
    try {
      const first = await attemptGenerate({ prompt, schema, model, temperature });
      if (first.ok && first.value !== undefined) {
        return first.value;
      }
      console.error("EduBuddy: OpenRouter answer failed validation, retrying once.", first.issue, first.raw);

      const corrective = `${prompt}\n\nYour previous answer was invalid: ${first.issue} Return corrected JSON that matches the schema exactly, with no markdown formatting and no extra text.`;
      const second = await attemptGenerate({ prompt: corrective, schema, model, temperature });
      if (second.ok && second.value !== undefined) {
        return second.value;
      }
      console.error("EduBuddy: OpenRouter answer failed validation twice.", second.issue, second.raw);

      throw new AiError("The AI answer could not be read. Please try again.");
    } catch (error) {
      if (index + 1 < chain.length && isQuotaLike(error)) {
        console.error(`EduBuddy: OpenRouter model ${model} hit a quota or rate limit, retrying with ${chain[index + 1]}.`);
        continue;
      }
      throw toAiError(error);
    }
  }

  // Unreachable: modelChain() never returns an empty array.
  throw new AiError("The AI service could not process this request.");
}

export interface OpenRouterModelInfo {
  id: string;
  name: string;
  free: boolean;
}

// Lists every model OpenRouter offers, for scripts/list-models.ts. The
// endpoint is public and returns { data: [{ id, name, pricing, ... }] }
// (shape confirmed against the live endpoint on 2026-09-05); a model counts
// as free when both its prompt and completion prices are "0".
export async function listOpenRouterModels(): Promise<OpenRouterModelInfo[]> {
  const response = await fetch(`${OPENROUTER_BASE_URL}/models`);
  if (!response.ok) {
    throw new OpenRouterHttpError(response.status, response.statusText);
  }
  const payload = (await response.json().catch(() => null)) as {
    data?: Array<{ id?: unknown; name?: unknown; pricing?: { prompt?: unknown; completion?: unknown } }>;
  } | null;

  return (payload?.data ?? [])
    .filter((entry): entry is { id: string; name?: string; pricing?: { prompt?: string; completion?: string } } =>
      typeof entry.id === "string"
    )
    .map((entry) => ({
      id: entry.id,
      name: typeof entry.name === "string" ? entry.name : entry.id,
      free: entry.pricing?.prompt === "0" && entry.pricing?.completion === "0",
    }));
}
