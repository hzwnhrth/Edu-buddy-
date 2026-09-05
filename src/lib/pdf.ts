// Browser-only PDF text extraction, built on pdfjs-dist. Only ever called
// from a client component, after a user picks a file, so it is safe to touch
// Worker and other browser globals inside the exported function. Nothing here
// runs at module scope, so importing this file during server rendering of a
// "use client" component is harmless.

// pdfjs-dist ships no "exports" map (see node_modules/pdfjs-dist/package.json,
// only "main" and "types"), so the worker file is reachable as a plain deep
// import. The library's own bundler helper (node_modules/pdfjs-dist/webpack.mjs)
// builds the worker exactly this way:
//
//   GlobalWorkerOptions.workerPort = new Worker(
//     new URL("./build/pdf.worker.mjs", import.meta.url),
//     { type: "module" }
//   );
//
// `new Worker(new URL(specifier, import.meta.url), ...)` is the pattern
// Turbopack documents as a statically recognised asset reference (Next.js
// 16's default bundler for both `next dev` and `next build`; see
// node_modules/next/dist/docs/01-app/03-api-reference/08-turbopack.md). That
// analysis is a static, syntactic match, so the specifier is written as an
// inline string literal directly inside `new URL(...)` below rather than a
// named constant: a variable reference would not be bundled and would resolve
// to a broken URL at runtime.
//
// A fresh Worker is created for every extraction call rather than reused as a
// module-level singleton. Tracing PDFDocumentLoadingTask.destroy() in
// node_modules/pdfjs-dist/build/pdf.mjs shows it unconditionally terminates
// the worker it was given ("Abort all network requests and destroy the
// worker", per the type docs); a shared singleton would therefore be
// permanently killed the first time a document's loading task is destroyed,
// leaving every later upload to hang waiting on a dead worker. One worker per
// call, destroyed with its document, avoids that entirely.

export interface ExtractPdfTextResult {
  text: string;
  pageCount: number;
}

export type PdfProgressCallback = (page: number, total: number) => void;

// A minimal shape for the text items pdf.js hands back from getTextContent.
// The full TextItem type lives at pdfjs-dist/types/src/display/api.d.ts but
// is not re-exported from the package root, so this mirrors only the fields
// this module reads.
interface PdfTextItem {
  str: string;
  transform: number[];
  hasEOL: boolean;
}

function isTextItem(item: unknown): item is PdfTextItem {
  return (
    typeof item === "object" &&
    item !== null &&
    "str" in item &&
    typeof (item as { str: unknown }).str === "string"
  );
}

// Same-line tolerance for the vertical (baseline) position, in PDF user
// space units (1/72 inch). Items on a justified or kerned line can differ by
// a fraction of a unit; a real line break is much larger than this.
const LINE_EPSILON = 1;

function pageTextFromItems(items: unknown[]): string {
  let result = "";
  let lastY: number | null = null;
  let forceBreak = false;

  for (const item of items) {
    if (!isTextItem(item)) continue;
    const y = item.transform[5] ?? 0;
    const sameLine = lastY !== null && !forceBreak && Math.abs(y - lastY) <= LINE_EPSILON;

    if (result.length > 0) {
      result += sameLine ? " " : "\n";
    }
    result += item.str;

    lastY = y;
    forceBreak = item.hasEOL;
  }

  return result;
}

// Extracts readable text from a PDF File entirely in the browser. Text items
// on the same line (by vertical position) are joined with spaces; a changed
// vertical position, or pdf.js's own end-of-line flag, starts a new line. A
// blank line separates pages. The result is trimmed.
export async function extractPdfText(
  file: File,
  onProgress?: PdfProgressCallback
): Promise<ExtractPdfTextResult> {
  const pdfjsLib = await import("pdfjs-dist");

  const worker = new Worker(new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url), {
    type: "module",
  });
  pdfjsLib.GlobalWorkerOptions.workerPort = worker;

  const data = await file.arrayBuffer();
  // standardFontDataUrl points at pdfjs-dist's own Helvetica/Times/Courier
  // metrics, copied into public/standard_fonts/ (see next.config.ts's
  // neighbourhood for nothing extra required: this is a plain static file,
  // no bundler wiring needed). Lecture-note PDFs are often exported without
  // embedded fonts, relying on these standard 14 fonts instead, so this
  // gives pdf.js real glyph metrics to work with for them.
  const loadingTask = pdfjsLib.getDocument({ data, standardFontDataUrl: "/standard_fonts/" });

  try {
    const pdf = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      onProgress?.(pageNumber, pdf.numPages);
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pageTexts.push(pageTextFromItems(content.items));
    }

    return {
      text: pageTexts.join("\n\n").trim(),
      pageCount: pdf.numPages,
    };
  } finally {
    await loadingTask.destroy();
  }
}
