// Route-level tests for the ingest endpoints (POST /api/analyze and
// GET /api/materials/[id]), run directly against the exported route
// handlers, no server process involved. Run with:
//   node --env-file-if-exists=.env.local --import tsx scripts/test-ingest.ts
//
// DAILY_AI_CALL_CAP is set below to a small number before anything under
// "@/lib" loads: src/lib/env.ts reads process.env once per process and
// caches the result on globalThis, so whatever value is in place the first
// time getEnv() actually runs is what every later call reuses for the life
// of this script. A static "import ... from '@/...'" at the top of this
// file would be hoisted by the module system and evaluated before this
// assignment runs, no matter where the import line sits in the file, so
// every "@/..." module is loaded with a dynamic import() inside main()
// instead, after DAILY_AI_CALL_CAP is set. GEMINI_API_KEY and
// FIREBASE_SERVICE_ACCOUNT_JSON are left untouched (unset, unless a real
// .env.local sets them), so the mock AI and the in-memory store are used.
const DAILY_AI_CALL_CAP = 3;
process.env.DAILY_AI_CALL_CAP = String(DAILY_AI_CALL_CAP);

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";

let failures = 0;

function report(label: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`OK: ${label}`);
  } else {
    failures += 1;
    console.error(`FAIL: ${label}${detail ? ` - ${detail}` : ""}`);
  }
}

interface CaseResult {
  ok: boolean;
  detail?: string;
}

// Runs one named case, catching any unexpected throw so the rest of the
// suite still runs and every case still gets exactly one OK/FAIL line.
async function runCase(label: string, fn: () => Promise<CaseResult>): Promise<void> {
  try {
    const result = await fn();
    report(label, result.ok, result.detail);
  } catch (error) {
    report(label, false, error instanceof Error ? error.message : String(error));
  }
}

interface RequestOptions {
  method?: string;
  profileId?: string;
  body?: unknown;
}

function makeRequest(path: string, options: RequestOptions = {}): NextRequest {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (options.profileId !== undefined) {
    headers["x-profile-id"] = options.profileId;
  }
  const init: { method: string; headers: Record<string, string>; body?: string } = {
    method: options.method ?? "GET",
    headers,
  };
  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }
  return new NextRequest(`http://localhost${path}`, init);
}

// Several paragraphs of plain prose, each ending in full stops and none
// short enough or colon-terminated to read as a heading, so the mock AI's
// extractTopics falls back to its no-headings path (sectionsFromParagraphs
// in src/lib/ai/mock/index.ts) instead of the sample notes' pre-computed
// topics or a heading-based split.
const PLAIN_TEXT = `Photosynthesis is the process plants use to convert light energy into chemical energy. Chlorophyll in the leaves absorbs sunlight and captures carbon dioxide from the air. The plant combines carbon dioxide and water to produce glucose and oxygen.

Cellular respiration happens inside the mitochondria of both plants and animals. Glucose is broken down in the presence of oxygen to release the energy stored in its chemical bonds. This process produces carbon dioxide and water as byproducts, along with usable energy for the cell.

The water cycle describes how water moves between the oceans, the atmosphere and the land. Water evaporates from the surface, forms clouds, and eventually falls back down as precipitation. Rivers then carry the water back toward the sea, completing the cycle.

Rock layers can reveal the history of the earth over millions of years. Sedimentary rock forms in layers as particles settle and compress over long stretches of time. Fossils trapped inside these layers help scientists date the rock and understand past life.`;

interface Ctx {
  materialIdA: string | null;
  profileA: string | null;
}

async function main(): Promise<void> {
  console.log(
    "PARKED: this script exercises the retired no-login guest flow; the API now requires a Firebase sign-in token. Rewrite against authenticated flows to re-enable."
  );
  process.exit(0);

  const { POST: analyze } = await import("@/app/api/analyze/route");
  const { POST: analyzePdf } = await import("@/app/api/analyze-pdf/route");
  const { POST: createQuiz } = await import("@/app/api/quiz/route");
  const { GET: getMaterial } = await import("@/app/api/materials/[id]/route");
  const { SAMPLE_NOTES } = await import("@/content/sample-notes");
  const { MAX_PDF_BASE64_CHARS } = await import("@/lib/constants");
  const { MAX_SOURCE_NAME_CHARS } = await import("@/lib/limits");

  const testPdfBase64 = (await readFile(path.join(process.cwd(), "robot", "data", "test.pdf"))).toString(
    "base64"
  );

  const ctx: Ctx = { materialIdA: null, profileA: null };

  await runCase(
    "(a) analyze sample notes -> 201, ready, 5 unique topics, charCount matches",
    async () => {
      const profileId = randomUUID();
      const request = makeRequest("/api/analyze", {
        method: "POST",
        profileId,
        body: {
          title: SAMPLE_NOTES.title,
          text: SAMPLE_NOTES.text,
          sourceName: "sample",
          pageCount: 0,
        },
      });
      const response = await analyze(request);
      const json = await response.json();

      if (response.status !== 201) {
        return { ok: false, detail: `expected 201, got ${response.status}: ${JSON.stringify(json)}` };
      }
      const material = json.material;
      if (material?.status !== "ready") {
        return { ok: false, detail: `expected status "ready", got ${material?.status}` };
      }
      const topics = material.topics ?? [];
      if (topics.length !== 5) {
        return { ok: false, detail: `expected 5 topics, got ${topics.length}` };
      }
      const uniqueIds = new Set(topics.map((topic: { id: string }) => topic.id));
      if (uniqueIds.size !== topics.length) {
        return { ok: false, detail: "topic ids are not unique" };
      }
      if (material.charCount !== SAMPLE_NOTES.text.length) {
        return {
          ok: false,
          detail: `expected charCount ${SAMPLE_NOTES.text.length}, got ${material.charCount}`,
        };
      }

      ctx.materialIdA = material.id;
      ctx.profileA = profileId;
      return { ok: true };
    }
  );

  await runCase(
    "(b) get material back with same profile -> 200, same id, empty attempts/progress",
    async () => {
      if (!ctx.materialIdA || !ctx.profileA) {
        return { ok: false, detail: "material from case (a) is not available" };
      }
      const request = makeRequest(`/api/materials/${ctx.materialIdA}`, {
        method: "GET",
        profileId: ctx.profileA,
      });
      const response = await getMaterial(request, {
        params: Promise.resolve({ id: ctx.materialIdA }),
      });
      const json = await response.json();

      if (response.status !== 200) {
        return { ok: false, detail: `expected 200, got ${response.status}: ${JSON.stringify(json)}` };
      }
      if (json.material?.id !== ctx.materialIdA) {
        return { ok: false, detail: `expected material id ${ctx.materialIdA}, got ${json.material?.id}` };
      }
      if (!Array.isArray(json.attempts) || json.attempts.length !== 0) {
        return { ok: false, detail: `expected an empty attempts array, got ${JSON.stringify(json.attempts)}` };
      }
      if (!Array.isArray(json.progress) || json.progress.length !== 0) {
        return { ok: false, detail: `expected an empty progress array, got ${JSON.stringify(json.progress)}` };
      }
      return { ok: true };
    }
  );

  await runCase("(c) get material with a different profile -> 404", async () => {
    if (!ctx.materialIdA) {
      return { ok: false, detail: "material from case (a) is not available" };
    }
    const request = makeRequest(`/api/materials/${ctx.materialIdA}`, {
      method: "GET",
      profileId: randomUUID(),
    });
    const response = await getMaterial(request, {
      params: Promise.resolve({ id: ctx.materialIdA }),
    });
    if (response.status !== 404) {
      return { ok: false, detail: `expected 404, got ${response.status}` };
    }
    return { ok: true };
  });

  await runCase("(d) analyze with a missing profile header -> 400", async () => {
    const request = makeRequest("/api/analyze", {
      method: "POST",
      body: { title: "Missing header", text: "Some ordinary notes text." },
    });
    const response = await analyze(request);
    if (response.status !== 400) {
      return { ok: false, detail: `expected 400, got ${response.status}` };
    }
    return { ok: true };
  });

  await runCase("(e) analyze with an empty title -> 400", async () => {
    const request = makeRequest("/api/analyze", {
      method: "POST",
      profileId: randomUUID(),
      body: { title: "", text: "Some ordinary notes text." },
    });
    const response = await analyze(request);
    if (response.status !== 400) {
      return { ok: false, detail: `expected 400, got ${response.status}` };
    }
    return { ok: true };
  });

  await runCase("(f) analyze with whitespace-only text -> 400", async () => {
    const request = makeRequest("/api/analyze", {
      method: "POST",
      profileId: randomUUID(),
      body: { title: "Valid title", text: "   \n\t  " },
    });
    const response = await analyze(request);
    if (response.status !== 400) {
      return { ok: false, detail: `expected 400, got ${response.status}` };
    }
    return { ok: true };
  });

  await runCase("(g) get a made-up material id -> 404", async () => {
    const fakeId = randomUUID();
    const request = makeRequest(`/api/materials/${fakeId}`, {
      method: "GET",
      profileId: randomUUID(),
    });
    const response = await getMaterial(request, { params: Promise.resolve({ id: fakeId }) });
    if (response.status !== 404) {
      return { ok: false, detail: `expected 404, got ${response.status}` };
    }
    return { ok: true };
  });

  await runCase("(h) analyze plain text with no headings -> 4 to 8 topics", async () => {
    const request = makeRequest("/api/analyze", {
      method: "POST",
      profileId: randomUUID(),
      body: { title: "Science notes", text: PLAIN_TEXT },
    });
    const response = await analyze(request);
    const json = await response.json();
    if (response.status !== 201) {
      return { ok: false, detail: `expected 201, got ${response.status}: ${JSON.stringify(json)}` };
    }
    const count = json.material?.topics?.length ?? 0;
    if (count < 4 || count > 8) {
      return { ok: false, detail: `expected 4 to 8 topics, got ${count}` };
    }
    return { ok: true };
  });

  await runCase(`(i) the call after ${DAILY_AI_CALL_CAP} analyze calls -> 429`, async () => {
    const profileId = randomUUID();
    for (let i = 0; i < DAILY_AI_CALL_CAP; i += 1) {
      const request = makeRequest("/api/analyze", {
        method: "POST",
        profileId,
        body: { title: `Cap test ${i + 1}`, text: `This is call number ${i + 1} toward the daily AI cap.` },
      });
      const response = await analyze(request);
      if (response.status !== 201) {
        const json = await response.json();
        return {
          ok: false,
          detail: `call ${i + 1} of ${DAILY_AI_CALL_CAP} expected 201, got ${response.status}: ${JSON.stringify(json)}`,
        };
      }
    }

    const overRequest = makeRequest("/api/analyze", {
      method: "POST",
      profileId,
      body: { title: "One too many", text: "This call should be rejected by the daily cap." },
    });
    const overResponse = await analyze(overRequest);
    if (overResponse.status !== 429) {
      return { ok: false, detail: `expected 429, got ${overResponse.status}` };
    }
    return { ok: true };
  });

  await runCase(
    "(j) analyze-pdf with the test PDF -> 201, 4 to 8 topics, charCount > 0, sourceName/pageCount echoed, ready; then a quiz for it succeeds",
    async () => {
      const profileId = randomUUID();
      const request = makeRequest("/api/analyze-pdf", {
        method: "POST",
        profileId,
        body: { title: "Scanned test", sourceName: "test.pdf", pageCount: 1, pdfBase64: testPdfBase64 },
      });
      const response = await analyzePdf(request);
      const json = await response.json();

      if (response.status !== 201) {
        return { ok: false, detail: `expected 201, got ${response.status}: ${JSON.stringify(json)}` };
      }
      const material = json.material;
      const topics = material?.topics ?? [];
      if (topics.length < 4 || topics.length > 8) {
        return { ok: false, detail: `expected 4 to 8 topics, got ${topics.length}` };
      }
      if (!(material.charCount > 0)) {
        return { ok: false, detail: `expected charCount > 0, got ${material.charCount}` };
      }
      if (material.sourceName !== "test.pdf") {
        return { ok: false, detail: `expected sourceName "test.pdf", got ${JSON.stringify(material.sourceName)}` };
      }
      if (material.pageCount !== 1) {
        return { ok: false, detail: `expected pageCount 1, got ${material.pageCount}` };
      }
      if (material.status !== "ready") {
        return { ok: false, detail: `expected status "ready", got ${material.status}` };
      }

      const quizResponse = await createQuiz(
        makeRequest("/api/quiz", { method: "POST", profileId, body: { materialId: material.id, count: 5 } })
      );
      if (quizResponse.status !== 201) {
        const quizJson = await quizResponse.json();
        return {
          ok: false,
          detail: `expected quiz creation 201 (proves the chunks were stored), got ${quizResponse.status}: ${JSON.stringify(quizJson)}`,
        };
      }
      return { ok: true };
    }
  );

  await runCase("(k) analyze-pdf with pdfBase64 that is not base64 -> 400", async () => {
    const request = makeRequest("/api/analyze-pdf", {
      method: "POST",
      profileId: randomUUID(),
      body: { title: "Bad base64", sourceName: "test.pdf", pdfBase64: "not-base64-content!!!" },
    });
    const response = await analyzePdf(request);
    if (response.status !== 400) {
      return { ok: false, detail: `expected 400, got ${response.status}` };
    }
    return { ok: true };
  });

  await runCase("(l) analyze-pdf with base64 that does not decode to a PDF -> 400", async () => {
    const request = makeRequest("/api/analyze-pdf", {
      method: "POST",
      profileId: randomUUID(),
      body: {
        title: "Not a PDF",
        sourceName: "test.pdf",
        pdfBase64: Buffer.from("this is plain text, not a PDF file").toString("base64"),
      },
    });
    const response = await analyzePdf(request);
    if (response.status !== 400) {
      return { ok: false, detail: `expected 400, got ${response.status}` };
    }
    return { ok: true };
  });

  await runCase(
    `(m) analyze-pdf with pdfBase64 one character longer than MAX_PDF_BASE64_CHARS (${MAX_PDF_BASE64_CHARS}) -> 400`,
    async () => {
      const oversized = "A".repeat(MAX_PDF_BASE64_CHARS + 1);
      const request = makeRequest("/api/analyze-pdf", {
        method: "POST",
        profileId: randomUUID(),
        body: { title: "Too big", sourceName: "test.pdf", pdfBase64: oversized },
      });
      const response = await analyzePdf(request);
      if (response.status !== 400) {
        return { ok: false, detail: `expected 400, got ${response.status}` };
      }
      return { ok: true };
    }
  );

  await runCase("(n) analyze-pdf with a missing title -> 400", async () => {
    const request = makeRequest("/api/analyze-pdf", {
      method: "POST",
      profileId: randomUUID(),
      body: { sourceName: "test.pdf", pdfBase64: testPdfBase64 },
    });
    const response = await analyzePdf(request);
    if (response.status !== 400) {
      return { ok: false, detail: `expected 400, got ${response.status}` };
    }
    return { ok: true };
  });

  await runCase(
    `(o) analyze with a sourceName one character longer than MAX_SOURCE_NAME_CHARS (${MAX_SOURCE_NAME_CHARS}) -> 400`,
    async () => {
      const request = makeRequest("/api/analyze", {
        method: "POST",
        profileId: randomUUID(),
        body: {
          title: "Source name too long",
          text: "Some ordinary notes text.",
          sourceName: "a".repeat(MAX_SOURCE_NAME_CHARS + 1),
        },
      });
      const response = await analyze(request);
      if (response.status !== 400) {
        return { ok: false, detail: `expected 400, got ${response.status}` };
      }
      return { ok: true };
    }
  );

  console.log(`\n${failures === 0 ? "All cases passed." : `${failures} case(s) failed.`}`);
  if (failures > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("FAIL: unexpected error running the suite:", error instanceof Error ? error.message : error);
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});
