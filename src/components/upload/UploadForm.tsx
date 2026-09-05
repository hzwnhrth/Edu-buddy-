"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useApiMutation } from "@/lib/hooks/useApi";
import { extractPdfText } from "@/lib/pdf";
import { pluralize } from "@/lib/format";
import type { AnalyzePdfRequest, AnalyzeRequest, AnalyzeResponse } from "@/lib/api-types";

// constants.ts has no imports of its own, so pulling these straight into the
// client bundle is safe (confirmed by the project's own comment on
// src/lib/limits.ts, which re-exports the same values for server code).
import {
  MAX_PDF_BYTES,
  MAX_SOURCE_NAME_CHARS,
  MAX_TEXT_CHARS,
  MAX_TITLE_CHARS,
  MAX_UPLOAD_PDF_BYTES,
  MIN_EXTRACTED_CHARS,
} from "@/lib/constants";

const MAX_UPLOAD_PDF_MB = MAX_UPLOAD_PDF_BYTES / (1024 * 1024);
const MAX_SCANNED_PDF_MB = MAX_PDF_BYTES / (1024 * 1024);

interface PdfResult {
  text: string;
  pageCount: number;
}

// A PDF whose in-browser text extraction found fewer than MIN_EXTRACTED_CHARS
// characters, but which is still small enough to send whole to the
// scanned-PDF route. Keeps only what that route needs beyond the file itself.
interface ScannedPdf {
  pageCount: number;
}

function titleFromFileName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^./\\]+$/, "");
  const spaced = withoutExtension.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return spaced.slice(0, MAX_TITLE_CHARS);
}

// Reads a File as base64, without its raw bytes, via FileReader.readAsDataURL
// (async, so it never blocks the page) and stripping the
// "data:application/pdf;base64," prefix up to and including the first comma.
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read this PDF."));
        return;
      }
      const commaIndex = result.indexOf(",");
      resolve(commaIndex === -1 ? result : result.slice(commaIndex + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read this PDF."));
    reader.readAsDataURL(file);
  });
}

export function UploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [pastedText, setPastedText] = useState("");

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfResult, setPdfResult] = useState<PdfResult | null>(null);
  const [scannedPdf, setScannedPdf] = useState<ScannedPdf | null>(null);
  const [pdfProgress, setPdfProgress] = useState<{ page: number; total: number } | null>(null);
  const [pdfProcessing, setPdfProcessing] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const analyzeMutation = useApiMutation<AnalyzeRequest, AnalyzeResponse>("/api/analyze");
  const analyzePdfMutation = useApiMutation<AnalyzePdfRequest, AnalyzeResponse>("/api/analyze-pdf");

  const isScanned = scannedPdf !== null;
  // Only one of these two mutations is ever actually run, chosen by mode; the
  // other stays at its untouched initial state, so picking state from
  // whichever one is active is always the right one to show.
  const activeMutation = isScanned ? analyzePdfMutation : analyzeMutation;
  const { loading, notReady, error } = activeMutation;

  async function handleFile(file: File) {
    setPdfError(null);
    setPdfResult(null);
    setScannedPdf(null);
    setPdfProgress(null);

    if (file.type !== "application/pdf") {
      setPdfError("Choose a PDF file.");
      return;
    }
    if (file.size > MAX_UPLOAD_PDF_BYTES) {
      setPdfError(`This PDF is larger than ${MAX_UPLOAD_PDF_MB} MB. Choose a smaller file.`);
      return;
    }

    setPdfFile(file);
    if (!titleTouched) {
      setTitle(titleFromFileName(file.name));
    }

    setPdfProcessing(true);
    try {
      const result = await extractPdfText(file, (page, total) => {
        setPdfProgress({ page, total });
      });
      if (result.text.length < MIN_EXTRACTED_CHARS) {
        if (file.size <= MAX_PDF_BYTES) {
          setScannedPdf({ pageCount: result.pageCount });
        } else {
          setPdfError(
            `This PDF has no readable text and is larger than ${MAX_SCANNED_PDF_MB} MB, so it cannot be sent for reading. Choose a smaller PDF or paste the text instead.`
          );
        }
      } else {
        setPdfResult(result);
      }
    } catch {
      setPdfError("Could not read this PDF. Try another file, or paste the text instead.");
    } finally {
      setPdfProcessing(false);
      setPdfProgress(null);
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void handleFile(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  function handleRemovePdf() {
    setPdfFile(null);
    setPdfResult(null);
    setScannedPdf(null);
    setPdfError(null);
    setPdfProgress(null);
  }

  const hasPdfContent = pdfResult !== null || isScanned;
  const effectiveText = pdfResult ? pdfResult.text : pastedText;
  const trimmedTitle = title.trim();
  const titleValid = trimmedTitle.length > 0 && trimmedTitle.length <= MAX_TITLE_CHARS;
  const textValid = effectiveText.trim().length > 0 && effectiveText.length <= MAX_TEXT_CHARS;
  const submitDisabled = isScanned
    ? !titleValid || pdfProcessing || loading
    : !titleValid || !textValid || pdfProcessing || loading;

  let disabledHint: string | null = null;
  if (submitDisabled && !pdfProcessing && !loading) {
    if (!titleValid) {
      disabledHint = "Add a title for your notes.";
    } else if (!isScanned) {
      if (effectiveText.trim().length === 0) {
        disabledHint = "Add some notes: drop a PDF above or paste text below.";
      } else if (effectiveText.length > MAX_TEXT_CHARS) {
        disabledHint = `Your notes are longer than the ${MAX_TEXT_CHARS.toLocaleString()} character limit. Trim them and try again.`;
      }
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitDisabled) return;

    if (isScanned && pdfFile && scannedPdf) {
      const pdfBase64 = await fileToBase64(pdfFile);
      const result = await analyzePdfMutation.run({
        title: trimmedTitle,
        pdfBase64,
        sourceName: pdfFile.name.slice(0, MAX_SOURCE_NAME_CHARS),
        pageCount: scannedPdf.pageCount,
      });
      if (result) {
        router.push(`/notes/${result.material.id}`);
      }
      return;
    }

    const body: AnalyzeRequest = {
      title: trimmedTitle,
      text: pdfResult ? pdfResult.text : pastedText.trim(),
      // /api/analyze caps sourceName at MAX_SOURCE_NAME_CHARS characters;
      // most file names are far shorter, but this keeps an unusually long
      // one from turning a valid upload into a 400.
      sourceName: pdfFile ? pdfFile.name.slice(0, MAX_SOURCE_NAME_CHARS) : undefined,
      pageCount: pdfResult ? pdfResult.pageCount : undefined,
    };

    const result = await analyzeMutation.run(body);
    if (result) {
      router.push(`/notes/${result.material.id}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4">
        <p id="pdf-drop-label" className="text-sm font-medium text-ink">
          Lecture notes (PDF)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleInputChange}
        />
        <div
          role="group"
          aria-labelledby="pdf-drop-label"
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center gap-3 rounded-card border-2 border-dashed px-6 py-10 text-center transition-colors ${
            dragActive ? "border-accent bg-accent-soft" : "border-border bg-background"
          }`}
        >
          <p className="text-base text-muted">Drag a PDF here, or</p>
          <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
            Choose PDF file
          </Button>
          <p className="text-sm text-muted">PDF only, up to {MAX_UPLOAD_PDF_MB} MB.</p>
        </div>

        {pdfFile ? (
          <div className="flex flex-col gap-2 rounded-card border border-border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-ink">{pdfFile.name}</p>
              <Button type="button" variant="ghost" onClick={handleRemovePdf}>
                Remove
              </Button>
            </div>
            {pdfProcessing && pdfProgress ? (
              <p className="text-sm text-muted" role="status" aria-live="polite">
                Reading page {pdfProgress.page} of {pdfProgress.total}
              </p>
            ) : null}
            {pdfProcessing && !pdfProgress ? (
              <p className="text-sm text-muted" role="status" aria-live="polite">
                Reading the PDF...
              </p>
            ) : null}
            {pdfError ? <p className="text-sm text-ink">{pdfError}</p> : null}
            {pdfResult ? (
              <p className="text-sm text-muted">
                {pluralize(pdfResult.pageCount, "page")}, {pdfResult.text.length.toLocaleString()}{" "}
                characters extracted.
              </p>
            ) : null}
            {scannedPdf ? (
              <p className="text-sm text-muted">
                No readable text was found in this PDF. The PDF itself will be sent for reading when
                you analyse it.
              </p>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-2">
        <label htmlFor="pasted-text" className="text-sm font-medium text-ink">
          Or paste your notes
        </label>
        <textarea
          id="pasted-text"
          value={pastedText}
          onChange={(event) => setPastedText(event.target.value)}
          disabled={hasPdfContent}
          rows={8}
          placeholder="Paste your lecture notes here"
          className="w-full rounded-card border border-border bg-background p-3 text-base text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-60"
        />
        {pdfResult ? (
          <p className="text-sm text-muted">
            Using the text extracted from {pdfFile?.name}. Remove the PDF above to paste text
            instead.
          </p>
        ) : scannedPdf ? (
          <p className="text-sm text-muted">
            Using {pdfFile?.name} itself, since it has no readable text. Remove the PDF above to
            paste text instead.
          </p>
        ) : (
          <p className="text-sm text-muted">
            {pastedText.length.toLocaleString()} / {MAX_TEXT_CHARS.toLocaleString()} characters
          </p>
        )}
      </Card>

      <Card className="flex flex-col gap-2">
        <label htmlFor="title" className="text-sm font-medium text-ink">
          Title
        </label>
        <input
          id="title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value.slice(0, MAX_TITLE_CHARS));
            setTitleTouched(true);
          }}
          maxLength={MAX_TITLE_CHARS}
          placeholder="Give your notes a title"
          className="w-full rounded-card border border-border bg-background p-3 text-base text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        />
      </Card>

      <div className="flex flex-col items-start gap-2">
        <Button type="submit" disabled={submitDisabled} loading={loading}>
          Analyse notes
        </Button>
        {disabledHint ? <p className="text-sm text-muted">{disabledHint}</p> : null}
        {notReady ? <p className="text-sm text-muted">This part is not ready yet.</p> : null}
        {error ? <p className="text-sm text-ink">{error}</p> : null}
      </div>
    </form>
  );
}
