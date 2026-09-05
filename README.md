# EduBuddy

## What EduBuddy is

EduBuddy is an AI study assistant for university students. A student uploads lecture notes, as a PDF or as pasted text, and gets back the topics found in those notes, a quiz built from them, plain-language explanations for any topic they are weak on, and a short study plan. There is no account and no login. It was built for Hackathon Sedia!, a student hackathon, for United Nations Sustainable Development Goal 4, Quality Education.

## How it works

Six screens, each with one main action:

1. Dashboard (`/`): recent notes, overall mastery, and a short queue of what to review today.
2. Upload (`/upload`): drop a PDF or paste text; the app extracts the topics and moves on by itself.
3. Topics (`/notes/[id]`): the extracted topics, a mastery bar on each, and one button to start a quiz.
4. Quiz (`/notes/[id]/quiz`): one question at a time, four options, a progress bar, and a submit at the end.
5. Results (`/notes/[id]/results`): the score, a bar per topic, and the weak topics flagged.
6. Study (`/study/[materialId]/[topicId]`): a plain-language explanation of one topic, with its key points.

## What you need

- Node.js, with npm. Any current long-term-support (LTS) release of Node.js is enough.
- Python 3, with the `py` launcher on the PATH. This is only needed to run the end-to-end test suite; the app itself does not need Python.

## Setup

1. Clone the repository.
2. Install the dependencies: `npm install`.
3. Start the development server: `npm run dev`.
4. Open the local address the terminal prints, in a browser.

That is everything required to see the app work. By default it runs in mock mode, with no secrets configured: AI answers come from a deterministic mock built into the project instead of a real model, and all data is kept in memory for the life of that server process instead of a real database. Whenever a fallback like this is active, the header shows a "Mock AI" badge, a "Memory store" badge, or both, so it is always clear which parts are real. To see the whole flow without typing or uploading anything, use "Try sample notes" on the dashboard.

## Secrets

Copy `.env.example` to `.env.local` and fill in what you have.

- `GEMINI_API_KEY`: a key from Google AI Studio. Leave it empty to keep using the mock AI described above.
- `FIREBASE_SERVICE_ACCOUNT_JSON`: the Firebase service account JSON for a project, pasted as one line and wrapped in single quotes. Leave it empty to keep using the in-memory store.
- `GEMINI_MODEL`: optional. A specific Gemini model id. Leave it empty and the app picks a current model for itself.
- `DAILY_AI_CALL_CAP`: optional. The per-profile daily AI call cap described under Limits below. Defaults to 60 when not set.

Run `npm run check` at any time; it verifies whichever of these you have set, against the real services, without touching the ones left empty.

`.env.local` is never committed: it is listed in `.gitignore`, and only `.env.example`, which holds no real values, is checked in.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Starts the development server. |
| `npm run build` | Creates a production build. |
| `npm run start` | Runs the production build that `build` created. |
| `npm run lint` | Runs ESLint over the project. |
| `npm run check` | Verifies whichever of `GEMINI_API_KEY` and `FIREBASE_SERVICE_ACCOUNT_JSON` are set, against the real services, and prints the model in use. |
| `npm run list-models` | Prints the Gemini model ids the configured key can use. |
| `npm run smoke:ai` | Runs all five AI jobs, the four text jobs on the sample notes and the scanned-PDF job on a bundled test file, and checks the shape of every answer. |
| `npm run test:routes` | Runs the three route test scripts in sequence, with no server running. |
| `npm run test:e2e` | Runs the Robot Framework end-to-end suite, which builds and starts the app itself. |

## Tests

Two kinds of automated test exist.

`npm run test:routes` runs three scripts, `scripts/test-ingest.ts`, `scripts/test-quiz.ts` and `scripts/test-insight.ts`, that call the API route handlers directly, in plain Node.js, with no server running.

`npm run test:e2e` runs the Robot Framework suite under `robot/`. It builds and starts the app itself, on port 3105, in forced mock mode, so it needs no secrets and gives the same result every time. See `robot/README.md` for the install steps this needs first.

## Project layout

The top-level folders:

- `docs/`: the project specification, `spec.md`, the contract this README follows.
- `public/`: static files served as-is; currently the standard font metrics `pdfjs-dist` needs so it can read PDFs that do not embed their own fonts.
- `robot/`: the end-to-end test suite. See `robot/README.md`.
- `scripts/`: small command-line programs: the AI checks described above, and the route tests.
- `src/`: the application itself.

The main subfolders of `src/`:

- `src/app/`: pages and routes, using the Next.js App Router. `src/app/api/` holds the backend routes; `src/app/dev/preview` is a development-only preview page.
- `src/components/`: shared UI building blocks in `ui/`, and the components for each screen (`dashboard/`, `notes/`, `quiz/`, `results/`, `status/`, `study/`, `upload/`).
- `src/content/`: the bundled sample lecture notes behind "Try sample notes".
- `src/lib/`: shared code: types, environment reading, the API client, formatting, size limits, PDF text extraction, quiz grading, the AI layer (`src/lib/ai/`), and the storage layer (`src/lib/store/`).

## Deploy on Vercel

Push the repository to GitHub. Import it in Vercel. Add `GEMINI_API_KEY` and `FIREBASE_SERVICE_ACCOUNT_JSON`, the same two secrets described above, as environment variables in the Vercel project. Deploy. Nothing else is needed: the free tiers of Vercel, Google AI Studio and Firebase are enough to run a demo.

## Limits worth knowing

These limits keep a shared demo usable for everyone and keep AI costs bounded. They are defined in full in `docs/spec.md`.

- Each profile (each browser) can make at most 60 AI calls per day; the count resets at UTC midnight.
- Each IP address is limited to 60 requests per minute, across every route.
- Pasted text is capped at 300,000 characters.
- A PDF with readable text can be up to 25 MiB. A PDF with no readable text, which is sent to the AI to read directly, is capped at a smaller 3 MiB, so that it still fits in one request.

## Privacy

There is no account system of any kind. On first visit, the browser generates a random profile id and stores it in `localStorage`; every request to the app carries that id, and the server keeps every note, quiz and result under it. Progress therefore belongs to the browser it was made in: clearing that browser's storage, or visiting from a different browser, starts over with a new, empty profile. The text of anything uploaded is kept on the server (in memory, or in Firestore once configured) so that quizzes, explanations and the study plan can be built from it later.
