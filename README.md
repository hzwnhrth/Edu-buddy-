# EduBuddy

## What EduBuddy is

EduBuddy is a study companion for students, built as a hackathon entry for Hackathon Sedia! for United Nations Sustainable Development Goal 4, Quality Education. A student signs in, uploads or pastes lecture notes and the app:

- splits the notes into topics and writes study notes, flashcards and key points from them,
- builds multiple-choice quizzes where the student picks the difficulty and the number of questions,
- flags weak topics after a quiz and explains them in plain language,
- answers questions in an AI tutor chat that reads from the student's notes,
- tracks mastery per topic on a Progress screen with written feedback and a "Review today" queue,
- schedules practice with a spaced-repetition scheduler (rate a card again, hard, good or easy and it comes back at the right time),
- offers a built-in Malaysian history quiz bank, Form 4 Sejarah (Warisan Negara Bangsa), which runs without any AI at all,
- and includes teacher and admin demo views for showing the product to educators.

EduBuddy is login-first: every feature needs a Firebase email/password sign-in. The server verifies a Firebase ID token on every API call, and every note, quiz, result and progress entry belongs to the signed-in account, not to a browser. There is no guest mode.

The main app's screens: Landing (`/`), Dashboard (`/dashboard`), Notes Generator (`/notes`), Quiz Arena (`/quiz`), AI Tutor (`/chat`), Progress (`/progress`), plus the demo views (`/teacher-dashboard` and `/admin-dashboard`). These screens have no sign-in form yet, so their requests reach the API without a token and surface sign-in-required errors; rework is planned. For a working sign-in flow today, use the teammates' preview frontend in `frontend/` (see the last section).

## Quick start

You need Node.js with npm, and a Firebase project with Email/Password sign-in enabled. Then, from this folder:

```
npm install
npm run dev
```

Two things decide whether anything works after that:

- The API needs `FIREBASE_SERVICE_ACCOUNT_JSON` (see Configuration below). Without it, every API route except `GET /api/status` answers 503, because sign-in cannot be verified.
- The main app's screens do not offer sign-in yet and currently surface sign-in-required errors instead of features. To exercise the product end to end, run the sign-in-capable frontend in `frontend/` (see the last section).

Whenever a fallback is active, the header shows a "Mock AI" badge, a "Memory store" badge, or both, so mock output is never mistaken for the real thing.

## Configuration

Copy `.env.example` to `.env.local` and fill in what you have. The four variables:

| Variable | Meaning |
| --- | --- |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Required for the API. The service account JSON of your Firebase project, pasted on one line; every route except `GET /api/status` answers 503 without it. |
| `FIREBASE_DATABASE_URL` | The Realtime Database URL of the same project, for example `https://your-project-default-rtdb.firebaseio.com/`. Real storage needs this together with the service account. Without them, data is kept in memory and resets on every restart. |
| `OPENROUTER_API_KEY` | A key from https://openrouter.ai/keys. Empty means mock AI. |
| `OPENROUTER_MODEL` | Optional. One specific model id, which replaces the default model chain entirely. Empty means the chain described below. |

The service account JSON must be flattened to one line and wrapped in single quotes. Recipe: open the downloaded JSON file, join all of it onto a single line, and put single quotes around the whole thing, exactly like this:

```
FIREBASE_SERVICE_ACCOUNT_JSON='{"project_id":"...","client_email":"...","private_key":"..."}'
```

If you would rather set the variables for one PowerShell session than create the file:

```
$env:FIREBASE_SERVICE_ACCOUNT_JSON = '{"project_id":"...","client_email":"...","private_key":"..."}'
$env:FIREBASE_DATABASE_URL = "https://your-project-default-rtdb.firebaseio.com/"
$env:OPENROUTER_API_KEY = "your key here"
npm run dev
```

Run `npm run check` any time. It verifies whichever secrets you did set against the real OpenRouter and Firebase services and prints one line per check:

- `OK: FIREBASE_SERVICE_ACCOUNT_JSON present (parsed as JSON)`: the JSON has the fields the app needs.
- `OK: Realtime Database reachable`: a write and read back to a fixed health path in your database worked.
- `OK: OPENROUTER_API_KEY present`: the key is set.
- `OK: OpenRouter reachable (model ...)`: a real call to the model answered, and the model in use is named.

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
| `npm run test:srs` | Tests the spaced-repetition scheduler and session builder as pure logic, with no server and no secrets. Still runs. |
| `npm run test:routes` | Parked. The five route scripts exercised the retired no-login guest flow; each now prints a PARKED notice and exits 0. |
| `npm run test:e2e` | Parked. The eight Robot suites under `robot/` drove the app as a guest; they now report skipped, each with a reason. |

The route scripts and browser suites are parked, not deleted, because sign-in became mandatory and they only exercised the retired no-login guest flow. A rewrite against authenticated flows is planned. `npm run test:srs` is unaffected and still runs. The Robot tooling setup is unchanged for that rewrite: Python 3 with the `py` launcher on the PATH, plus the pinned packages from `robot/requirements.txt` installed once per machine:

```
py -m pip install -r robot/requirements.txt
py -m Browser.entry init
```

Robot results land in `robot/results`; see `robot/README.md` for details.

## Deploying

1. Push the repository to the team branch, `development_umar`.
2. Import the project in Vercel from that branch.
3. Add the environment variables from the table above in the Vercel project settings; `FIREBASE_SERVICE_ACCOUNT_JSON` is required, the others are optional.
4. Deploy, done.

The `frontend/` app deploys separately as its own Vercel project and needs the four `VITE_FIREBASE_*` variables described below.

Vercel's free tier is enough to run the app, as are the free tiers of OpenRouter and Firebase for a demo.

## Known limitations

- The main Next.js app screens cannot sign in yet and surface sign-in-required errors instead of features; rework is planned, and the working flow is the `frontend/` app below.
- Without `FIREBASE_SERVICE_ACCOUNT_JSON` and `FIREBASE_DATABASE_URL`, storage is in memory and everything resets when the server restarts.
- Scanned, image-only PDFs are not supported by the current AI, which receives text only. Upload a PDF with selectable text, or paste the notes.
- The free model has rate limits. The app absorbs them by retrying on the paid model, so the OpenRouter account should hold a small credit balance for busy moments.
- The guest-flow browser suites and route scripts are parked, so automated coverage of the API and UI is thin until the planned rewrite against authenticated flows lands.

## Team preview frontend and extra APIs

The repository also contains the teammates' preview frontend in the `frontend/` folder. It is a separate Vite React app with its own `package.json`, so it runs independently of the main app, and it has a working Firebase email/password sign-in. It reads `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` and `VITE_FIREBASE_APP_ID` from `frontend/.env.local` and sends the resulting ID token as a Bearer token on every API call. To run it:

1. Copy `frontend/.env.example` to `frontend/.env.local` and fill in the four `VITE_FIREBASE_*` values. They are public identifiers, not secrets; find them in the Firebase console under Project settings, Your apps.
2. In the same Firebase project, enable Email/Password as a sign-in provider under Authentication, Sign-in method.
3. Run `npm install` and then `npm run dev` inside `frontend/`.

The server verifies that token with the Firebase Admin SDK, using the same `FIREBASE_SERVICE_ACCOUNT_JSON` documented above. Every API route except `GET /api/status` now requires a valid signed-in user and answers 401 without one, or 503 when `FIREBASE_SERVICE_ACCOUNT_JSON` is not set, so the main app's no-login guest flow no longer reaches the API. `GET /api/teacher/classroom` and `GET /api/admin/overview` additionally require the matching `teacher` or `admin` role custom claim (403 otherwise), aggregate live data from the store, and have no mock fallback. Roles are assigned only through the Admin SDK, with `node scripts/promote-role.mjs <email> <teacher|admin>`, and new signups default to the `student` role.
