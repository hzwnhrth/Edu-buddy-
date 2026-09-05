# EduBuddy

## What EduBuddy is

EduBuddy is a study companion for students, built as a hackathon entry for Hackathon Sedia! for United Nations Sustainable Development Goal 4, Quality Education. A student uploads or pastes lecture notes and the app:

- splits the notes into topics and writes study notes, flashcards and key points from them,
- builds multiple-choice quizzes where the student picks the difficulty and the number of questions,
- flags weak topics after a quiz and explains them in plain language,
- answers questions in an AI tutor chat that reads from the student's notes,
- tracks mastery per topic on a Progress screen with written feedback and a "Review today" queue,
- schedules practice with a spaced-repetition scheduler (rate a card again, hard, good or easy and it comes back at the right time),
- offers a built-in Malaysian history quiz bank, Form 4 Sejarah (Warisan Negara Bangsa), which runs without any AI at all,
- and includes teacher and admin demo views for showing the product to educators.

There is no login and no account. On first visit the browser creates a random profile id and keeps it in localStorage; every note, quiz, result and progress entry belongs to that browser.

The screens: Landing (`/`), Dashboard (`/dashboard`), Notes Generator (`/notes`), Quiz Arena (`/quiz`), AI Tutor (`/chat`), Progress (`/progress`), plus the demo views (`/teacher-dashboard` and `/admin-dashboard`).

## Quick start

You need Node.js with npm. Then, from this folder:

```
npm install
npm run dev
```

Open the local address the terminal prints. That is the whole setup: with zero configuration the app already works in fallback mode. AI answers come from a deterministic mock built into the project (no network calls), and all data is kept in memory for the life of the server process. Whenever a fallback is active the header shows a "Mock AI" badge, a "Memory store" badge, or both, so mock output is never mistaken for the real thing. To see the full flow without typing anything, use "Try sample notes" on the dashboard.

## Real mode (optional)

Copy `.env.example` to `.env.local` and fill in what you have. The four variables:

| Variable | Meaning |
| --- | --- |
| `OPENROUTER_API_KEY` | A key from https://openrouter.ai/keys. Empty means mock AI. |
| `OPENROUTER_MODEL` | Optional. One specific model id, which replaces the default model chain entirely. Empty means the chain described below. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | The service account JSON of your Firebase project, pasted on one line. Empty, or the URL below missing, means in-memory storage that resets on every restart. |
| `FIREBASE_DATABASE_URL` | The Realtime Database URL of the same project, for example `https://your-project-default-rtdb.firebaseio.com/`. Real storage needs this together with the service account. |

The service account JSON must be flattened to one line and wrapped in single quotes. Recipe: open the downloaded JSON file, join all of it onto a single line, and put single quotes around the whole thing, exactly like this:

```
FIREBASE_SERVICE_ACCOUNT_JSON='{"project_id":"...","client_email":"...","private_key":"..."}'
```

If you would rather set the variables for one PowerShell session than create the file:

```
$env:OPENROUTER_API_KEY = "your key here"
$env:FIREBASE_SERVICE_ACCOUNT_JSON = '{"project_id":"...","client_email":"...","private_key":"..."}'
$env:FIREBASE_DATABASE_URL = "https://your-project-default-rtdb.firebaseio.com/"
npm run dev
```

Run `npm run check` any time. It verifies whichever secrets you did set against the real OpenRouter and Firebase services and prints one line per check:

- `OK: OPENROUTER_API_KEY present`: the key is set.
- `OK: OpenRouter reachable (model ...)`: a real call to the model answered, and the model in use is named.
- `OK: FIREBASE_SERVICE_ACCOUNT_JSON present (parsed as JSON)`: the JSON has the fields the app needs.
- `OK: Realtime Database reachable`: a write and read back to a fixed health path in your database worked.

Anything you left empty is reported as SKIPPED, not FAIL, and the script only exits with an error when something you did configure does not work.

The AI model chain: with `OPENROUTER_MODEL` empty, every AI job first tries the free `google/gemma-4-31b-it:free`. When that model answers 429 or a quota or credits error, the app automatically retries the same call once with the paid `google/gemma-4-31b-it`. Setting `OPENROUTER_MODEL` replaces this whole chain with that single model id.

`.env.local` holds only local secrets and is never committed; only `.env.example`, which contains no real values, is checked in.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Starts the development server. |
| `npm run build` | Creates a production build. |
| `npm run start` | Serves the production build. |
| `npm run lint` | Runs ESLint over the project. |
| `npm run check` | Verifies the secrets you set against the real services and prints the model in use. |
| `npm run list-models` | Prints the Gemma models OpenRouter lists publicly and the model chain the app would use. |
| `npm run smoke:ai` | Runs every AI job on the bundled sample notes, plus the scanned-PDF job on `robot/data/test.pdf`, and validates the shape of every answer, in whichever mode the environment gives. |
| `npm run test:routes` | Runs the five API route test scripts in sequence, in plain Node.js, with no server running. |
| `npm run test:e2e` | Runs the Robot Framework end-to-end suite under `robot/`. |

The e2e suite needs Python 3 with the `py` launcher on the PATH, and the pinned packages from `robot/requirements.txt` installed once per machine:

```
py -m pip install -r robot/requirements.txt
py -m Browser.entry init
```

It then runs `npm run build` itself, serves the app on port 3105 in forced fallback mode (mock AI, memory store, no secrets needed, same result every time), runs every test in a real Chromium browser, and stops the app afterwards. A full run includes a production build, so expect a few minutes. When nothing under `src/` has changed since the last build, skip it:

```
$env:EDUBUDDY_SKIP_BUILD = "1"; npm run test:e2e
```

Results land in `robot/results`; see `robot/README.md` for details.

## Deploying

1. Push the repository to the team branch, `development_umar`.
2. Import the project in Vercel from that branch.
3. Add the same four environment variables from the table above in the Vercel project settings.
4. Deploy, done.

Vercel's free tier is enough to run the app, as are the free tiers of OpenRouter and Firebase for a demo.

## Known limitations

- Scanned, image-only PDFs are not supported by the current AI, which receives text only. Upload a PDF with selectable text, or paste the notes.
- Each browser is a separate profile. Progress made in one browser does not appear in another, and clearing a browser's storage starts a new, empty profile.
- The free model has rate limits. The app absorbs them by retrying on the paid model, so the OpenRouter account should hold a small credit balance for busy moments.
