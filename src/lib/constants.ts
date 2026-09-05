// Plain-number ceilings shared by server and browser code. This file has no
// imports of its own, so it is always safe to pull into a client bundle.
// limits.ts re-exports the ones server code has historically imported from
// there, so every existing import keeps working unchanged.

// Longest notes text /api/analyze (and the upload form) will accept, in characters.
export const MAX_TEXT_CHARS = 300000;

// Longest material title, in characters.
export const MAX_TITLE_CHARS = 120;

// Longest sourceName (the file name or label a material came from), in characters.
export const MAX_SOURCE_NAME_CHARS = 200;

// Most questions a single quiz can have.
export const MAX_QUIZ_QUESTIONS = 20;

// Fewest characters in-browser PDF extraction must find before the result
// counts as readable text; below this the PDF goes to the scanned-PDF route instead.
export const MIN_EXTRACTED_CHARS = 200;

// Largest PDF, in bytes, the scanned-PDF route (/api/analyze-pdf) accepts.
export const MAX_PDF_BYTES = 3 * 1024 * 1024;

// Largest base64-encoded PDF the scanned-PDF route accepts, in characters:
// exactly the base64 length of MAX_PDF_BYTES.
export const MAX_PDF_BASE64_CHARS = 4 * 1024 * 1024;

// Largest PDF the browser will upload when it already has a readable text layer, in bytes.
export const MAX_UPLOAD_PDF_BYTES = 25 * 1024 * 1024;

// Days since a topic was last practised before it joins the dashboard's
// "Review today" queue.
export const REVIEW_STALE_DAYS = 3;
