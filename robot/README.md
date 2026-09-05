# EduBuddy end-to-end tests

Robot Framework tests, using the Browser library (Playwright underneath) to
drive a real Chromium browser against a real running copy of the app. The
suite builds and starts the app itself, in forced mock mode (mock AI,
in-memory store), so it needs no secrets and gives the same result every
time.

## Install

From the EduBuddy folder:

```
py -m pip install -r robot/requirements.txt
py -m Browser.entry init
```

The second command downloads the Playwright browsers the Browser library
drives. It only needs to run once per machine; if it has already run (for
example because another Robot Framework project on this machine already did
it), the test run below still works without repeating it.

## Run

```
npm run test:e2e
```

which is the same as:

```
py -m robot --outputdir robot/results robot/suites
```

This runs `npm run build` and then `npm start -- -p 3105` itself (see
`Suite Setup` in `robot/suites/__init__.robot`), waits for the app to report
mock mode at `/api/status`, runs every suite, and stops the app again
afterwards. A full run therefore includes a production build, so expect it
to take a few minutes.

### Skipping the build

If a build from a previous run is still valid (nothing under `src/` changed
since), set `EDUBUDDY_SKIP_BUILD=1` to skip straight to `npm start`:

```
EDUBUDDY_SKIP_BUILD=1 npm run test:e2e
```

In PowerShell:

```
$env:EDUBUDDY_SKIP_BUILD = "1"; npm run test:e2e
```

## Where the results go

Everything lands under `robot/results`, which is not committed:

- `robot/results/log.html`: the detailed run log, one entry per keyword.
- `robot/results/report.html`: the pass/fail summary.
- `robot/results/browser/screenshot/`: the screenshot every test takes at
  its end, plus one on any failure.
- `server_stdout.log` / `server_stderr.log` / `build_stdout.log` /
  `build_stderr.log`: the app's own output from the build and the server
  the suite started, useful when a test fails for reasons outside the
  browser (for example the app failing to start).

## Mock mode

`Start App` (in `robot/resources/app.resource`) launches `npm start` with
`OPENROUTER_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_JSON` and
`FIREBASE_DATABASE_URL` all forced to empty strings for that process,
regardless of anything set in a local `.env.local`.
That keeps the app on the deterministic mock AI and the in-memory store, so
the suite needs no API keys or service account and gives the same answers
every run. The header badges "Mock AI" and "Memory store" are part of what
the first suite checks, precisely to confirm this held.

The same keyword also raises the per-IP request limit to 1000 per minute
through `IP_REQUESTS_PER_MINUTE`, again for the started process only. The
full run makes roughly 65 profiled API requests from localhost inside one
minute, which the app's default cap of 60 would silently reject with 429s;
production keeps that default of 60.

## Layout

- `robot/requirements.txt`: the two Python packages this suite needs.
- `robot/resources/app.resource`: shared variables and keywords (building
  and starting the app, opening a browser, small actions several suites
  repeat).
- `robot/resources/wait_for_status.py`: a small standard-library helper that
  polls `/api/status` once; used by `Start App` through the Process library.
- `robot/data/test.pdf`: a one-page PDF with a small amount of text, used by
  the upload suite.
- `robot/data/scanned.pdf`: a one-page PDF with no readable text at all, used
  by the scanned-PDF suite.
- `robot/suites/__init__.robot`: builds and starts the app once for every
  suite in this directory, and stops it again afterwards.
- `robot/suites/01_landing_and_dashboard.robot` through
  `08_phone_width.robot`: the test suites themselves, in the order they are
  meant to be read. Each suite opens its own browser context, so each one
  starts from a fresh profile: the suites that need quiz history build it
  themselves (the sample notes plus two 10 question quizzes choosing the
  first option, which the mock scores at exactly 30 percent and which leaves
  all five topics weak after the second run).
- `robot/results/`: everything a run produces (not committed).
