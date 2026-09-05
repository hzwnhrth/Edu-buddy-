import { z } from "zod";
import { AiError, getAi } from "@/lib/ai";
import { splitIntoChunks } from "@/lib/ai/text";
import { jsonError, jsonOk, parseBody, withProfile } from "@/lib/api";
import { MAX_PDF_BASE64_CHARS, MAX_PDF_BYTES } from "@/lib/constants";
import { consumeAiCall, MAX_SOURCE_NAME_CHARS, MAX_TEXT_CHARS, MAX_TITLE_CHARS } from "@/lib/limits";
import type { AnalyzeResponse } from "@/lib/api-types";

// Scanned-PDF fallback for /api/analyze: the browser could not find a text
// layer in the PDF (see MIN_EXTRACTED_CHARS), so it sends the file itself,
// base64-encoded, for Gemini to transcribe and extract topics from. Answers
// with the same AnalyzeResponse shape as /api/analyze, status 201.

// Standard base64: A-Z, a-z, 0-9, +, /, with up to two trailing "=" padding
// characters. Charset only; the byte-level checks below (size, "%PDF"
// header) catch anything that decodes to something other than a real PDF.
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

const analyzePdfSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(MAX_TITLE_CHARS, `Title must be ${MAX_TITLE_CHARS} characters or fewer`),
  sourceName: z
    .string()
    .max(MAX_SOURCE_NAME_CHARS, `Source name must be ${MAX_SOURCE_NAME_CHARS} characters or fewer`)
    .optional(),
  pageCount: z.number().int().min(0).optional(),
  pdfBase64: z
    .string()
    .min(1, "PDF data is required")
    .max(MAX_PDF_BASE64_CHARS, `PDF data must be ${MAX_PDF_BASE64_CHARS} characters or fewer`)
    .regex(BASE64_RE, "PDF data must be base64 encoded"),
});

export const POST = withProfile(async ({ request, profile, store }) => {
  const body = await parseBody(request, analyzePdfSchema);

  const pdfBytes = Buffer.from(body.pdfBase64, "base64");
  if (pdfBytes.byteLength > MAX_PDF_BYTES) {
    return jsonError(400, `The PDF is larger than ${MAX_PDF_BYTES / (1024 * 1024)} MB`);
  }
  if (pdfBytes.subarray(0, 4).toString("latin1") !== "%PDF") {
    return jsonError(400, "The file does not look like a PDF");
  }

  await consumeAiCall(profile, store);

  const sourceName = body.sourceName ?? "upload.pdf";

  let text: string;
  let topics;
  try {
    const result = await getAi().extractTopicsFromPdf({
      title: body.title,
      pdfBase64: body.pdfBase64,
      sourceName,
    });
    text = result.text;
    topics = result.topics;
  } catch (error) {
    if (error instanceof AiError) {
      return jsonError(503, error.message);
    }
    throw error;
  }

  text = text.trim().slice(0, MAX_TEXT_CHARS);
  if (text.length === 0) {
    text = "No text could be read from this PDF.";
  }

  const material = await store.createMaterial(
    {
      profileId: profile.id,
      title: body.title,
      sourceName,
      pageCount: body.pageCount ?? 0,
      charCount: text.length,
      status: "ready",
      topics,
      createdAt: new Date().toISOString(),
    },
    splitIntoChunks(text).map((chunkText, order) => ({ order, text: chunkText }))
  );

  return jsonOk<AnalyzeResponse>({ material }, 201);
});
