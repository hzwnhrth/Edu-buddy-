"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { motion } from "framer-motion";
import { HiOutlineDocumentArrowUp, HiOutlineDocumentText } from "react-icons/hi2";
import { extractPdfText } from "@/lib/pdf";
import { pluralize } from "@/lib/format";
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

// What the Generate Notes button hands to the page: extracted or pasted
// text for /api/analyze, or the whole file as base64 for the scanned-PDF
// route /api/analyze-pdf. All fields except the kind and the title map
// straight onto those request shapes.
export type NotesUploadPayload =
  | { kind: "text"; title: string; text: string; sourceName?: string; pageCount?: number }
  | { kind: "pdf"; title: string; pdfBase64: string; sourceName?: string; pageCount?: number };

export interface UploadCardProps {
  // True while the page runs the analyze call; the button and the hints
  // reflect it, and the page shows its own loading card meanwhile.
  analyzing: boolean;
  submitError: string | null;
  submitNotReady: boolean;
  onSubmit: (payload: NotesUploadPayload) => void;
}

// Text the browser managed to pull out of the chosen PDF.
interface ExtractedPdf {
  text: string;
  pageCount: number;
}

// A PDF whose extraction found no readable text but that is still small
// enough to send whole to /api/analyze-pdf. Only the page count is needed
// here on top of the file itself.
interface ScannedPdf {
  pageCount: number;
}

// The title starts as the file name without its extension, with dashes and
// underscores read as spaces, capped at the API's title limit.
function titleFromFileName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^./\\]+$/, "");
  const spaced = withoutExtension.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return spaced.slice(0, MAX_TITLE_CHARS);
}

function looksLikePdf(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

// Reads a File as plain base64 (no data: prefix) through
// FileReader.readAsDataURL, which is the shape /api/analyze-pdf expects.
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

// The upload half of the Notes Generator: the drop zone, the chosen-file
// pill, the paste box, the title field and the Generate Notes button. The
// page owns the analyze call itself; this component only gathers the input.
export function UploadCard({ analyzing, submitError, submitNotReady, onSubmit }: UploadCardProps) {
  // Counts nested dragenter/dragleave pairs so moving across the zone's
  // children does not flicker the highlight off.
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [extracted, setExtracted] = useState<ExtractedPdf | null>(null);
  const [scanned, setScanned] = useState<ScannedPdf | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<{ page: number; total: number } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [pastedText, setPastedText] = useState("");
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);

  async function handleFile(chosen: File) {
    setFileError(null);
    setExtracted(null);
    setScanned(null);
    setProgress(null);

    if (!looksLikePdf(chosen)) {
      setFileError("Choose a PDF file.");
      return;
    }
    if (chosen.size > MAX_UPLOAD_PDF_BYTES) {
      setFileError(`This PDF is larger than ${MAX_UPLOAD_PDF_MB} MB. Choose a smaller file.`);
      return;
    }

    setFile(chosen);
    if (!titleTouched) {
      setTitle(titleFromFileName(chosen.name));
    }

    // Extract the text in the browser so the student sees the page and
    // character counts immediately, and so scanned PDFs (under the minimum
    // readable length) can take the base64 fallback route instead.
    setProcessing(true);
    try {
      const result = await extractPdfText(chosen, (page, total) => {
        setProgress({ page, total });
      });
      if (result.text.length < MIN_EXTRACTED_CHARS) {
        if (chosen.size <= MAX_PDF_BYTES) {
          setScanned({ pageCount: result.pageCount });
        } else {
          setFileError(
            `This PDF has no readable text and is larger than ${MAX_SCANNED_PDF_MB} MB, so it cannot be sent for reading. Choose a smaller PDF or paste the text instead.`
          );
        }
      } else {
        setExtracted(result);
      }
    } catch {
      setFileError("Could not read this PDF. Try another file, or paste the text instead.");
    } finally {
      setProcessing(false);
      setProgress(null);
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    if (chosen) void handleFile(chosen);
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragging(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const chosen = event.dataTransfer.files?.[0];
    if (chosen) void handleFile(chosen);
  }

  // Clicking the chosen-file pill clears it, so the paste box becomes the
  // way in again without a page reload.
  function removeFile() {
    setFile(null);
    setExtracted(null);
    setScanned(null);
    setFileError(null);
    setProgress(null);
  }

  async function handleGenerate() {
    if (submitDisabled) return;
    const trimmedTitle = title.trim();

    if (scanned) {
      if (!file) return;
      try {
        const pdfBase64 = await fileToBase64(file);
        onSubmit({
          kind: "pdf",
          title: trimmedTitle,
          pdfBase64,
          sourceName: file.name.slice(0, MAX_SOURCE_NAME_CHARS),
          pageCount: scanned.pageCount,
        });
      } catch {
        setFileError("Could not read this PDF. Try another file, or paste the text instead.");
      }
      return;
    }

    onSubmit({
      kind: "text",
      title: trimmedTitle,
      text: extracted ? extracted.text : pastedText.trim(),
      sourceName: file ? file.name.slice(0, MAX_SOURCE_NAME_CHARS) : undefined,
      pageCount: extracted ? extracted.pageCount : undefined,
    });
  }

  const hasPdfContent = extracted !== null || scanned !== null;
  const effectiveText = extracted ? extracted.text : pastedText;
  const trimmedTitle = title.trim();
  const titleValid = trimmedTitle.length > 0 && trimmedTitle.length <= MAX_TITLE_CHARS;
  const textValid = effectiveText.trim().length > 0 && effectiveText.length <= MAX_TEXT_CHARS;
  const submitDisabled = analyzing || processing || !titleValid || (!scanned && !textValid);

  let disabledHint: string | null = null;
  if (submitDisabled && !processing && !analyzing) {
    if (!titleValid) {
      disabledHint = "Add a title for your notes.";
    } else if (!scanned) {
      if (effectiveText.trim().length === 0) {
        disabledHint = "Add some notes: drop a PDF above or paste text below.";
      } else if (effectiveText.length > MAX_TEXT_CHARS) {
        disabledHint = `Your notes are longer than the ${MAX_TEXT_CHARS.toLocaleString()} character limit. Trim them and try again.`;
      }
    }
  }

  // While the page runs the analyze call, this card shows the spinner card
  // in the reference design's place. Staying mounted (rather than being
  // swapped out by the page) keeps the chosen file, title and pasted text
  // intact when a failed call returns the student to the form.
  if (analyzing) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
        <div className="loading-spinner" style={{ margin: "0 auto 1.5rem auto" }} />
        <h3 style={{ fontSize: "1.2rem", marginBottom: "0.4rem", color: "#111827" }}>
          Processing your study materials...
        </h3>
        <p style={{ color: "#6B7280" }}>Analyzing document structure...</p>
      </div>
    );
  }

  return (
    <div>
      <div
        className={`upload-zone ${dragging ? "dragging" : ""}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* The stylesheet positions this input over the whole zone, so
            clicking or keyboard-activating the zone opens the picker. */}
        <input
          type="file"
          accept="application/pdf"
          onChange={handleInputChange}
          aria-label="Choose a PDF lecture file"
        />
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <HiOutlineDocumentArrowUp className="upload-zone-icon" />
        </motion.div>
        <h3>{dragging ? "Drop PDF here" : "Drag & drop a PDF lecture"}</h3>
        <p style={{ color: "#6B7280", fontSize: "0.9rem" }}>or click to browse from your computer</p>
      </div>

      {file && (
        <button
          type="button"
          onClick={removeFile}
          title="Click to remove this file"
          aria-label={`Remove ${file.name}`}
          style={{
            marginTop: "1.25rem",
            padding: "0.6rem 1rem",
            background: "#DCFCE7",
            borderRadius: "9999px",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "#16A34A",
            fontWeight: 600,
            fontSize: "0.9rem",
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <HiOutlineDocumentText /> {file.name}
        </button>
      )}

      {(processing || fileError || extracted || scanned) && (
        <div
          style={{
            marginTop: "0.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem",
            fontSize: "0.85rem",
          }}
        >
          {processing && (
            <p style={{ color: "#6B7280", margin: 0 }} role="status" aria-live="polite">
              {progress
                ? `Reading page ${progress.page} of ${progress.total}...`
                : "Reading the PDF..."}
            </p>
          )}
          {extracted && (
            <p style={{ color: "#6B7280", margin: 0 }}>
              {pluralize(extracted.pageCount, "page")},{" "}
              {extracted.text.length.toLocaleString()} characters extracted.
            </p>
          )}
          {scanned && (
            <p style={{ color: "#6B7280", margin: 0 }}>
              No readable text was found in this PDF. The PDF itself will be sent for reading when
              you analyse it.
            </p>
          )}
          {fileError && <p style={{ color: "#DC2626", margin: 0 }}>{fileError}</p>}
        </div>
      )}

      <div style={{ marginTop: "1.5rem" }}>
        <label
          htmlFor="pasted-notes"
          style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#111827", fontSize: "0.9rem" }}
        >
          Or paste your notes
        </label>
        <textarea
          id="pasted-notes"
          className="input-glass"
          value={pastedText}
          onChange={(event) => setPastedText(event.target.value)}
          disabled={hasPdfContent}
          rows={6}
          placeholder="Paste your lecture notes here"
        />
        {extracted && file ? (
          <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#6B7280" }}>
            Using the text extracted from {file.name}. Click the green file pill above to paste text
            instead.
          </p>
        ) : scanned && file ? (
          <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#6B7280" }}>
            Using {file.name} itself, since it has no readable text. Click the green file pill above
            to paste text instead.
          </p>
        ) : (
          <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#6B7280" }}>
            {pastedText.length.toLocaleString()} / {MAX_TEXT_CHARS.toLocaleString()} characters
          </p>
        )}
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <label
          htmlFor="title"
          style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#111827", fontSize: "0.9rem" }}
        >
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
          style={{
            width: "100%",
            padding: "1rem 1.25rem",
            borderRadius: "12px",
            border: "1px solid #E5E7EB",
            background: "#FFFFFF",
            color: "#111827",
            fontFamily: "inherit",
            fontSize: "0.95rem",
          }}
        />
      </div>

      <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
        <button
          type="button"
          className="btn btn-primary"
          style={{ padding: "0.85rem 2.5rem", fontSize: "1rem", borderRadius: "9999px" }}
          disabled={submitDisabled}
          onClick={() => void handleGenerate()}
        >
          <HiOutlineDocumentText /> Generate Notes
        </button>
        {disabledHint && (
          <p style={{ marginTop: "0.75rem", fontSize: "0.9rem", color: "#6B7280" }}>{disabledHint}</p>
        )}
        {submitNotReady && (
          <p style={{ marginTop: "0.75rem", fontSize: "0.9rem", color: "#6B7280" }}>
            This part is not ready yet.
          </p>
        )}
        {submitError && (
          <p style={{ marginTop: "0.75rem", fontSize: "0.9rem", color: "#DC2626" }}>{submitError}</p>
        )}
      </div>
    </div>
  );
}
