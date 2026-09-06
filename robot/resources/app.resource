*** Settings ***
Documentation     Shared variables and keywords for the EduBuddy end-to-end
...               suite: building and starting the app in forced mock mode,
...               stopping it cleanly, opening a browser against it, and the
...               small flow keywords several suites repeat (opening the
...               sample notes, running a quiz always choosing the first
...               option, waiting for a results view).
...
...               The suites are parked: since the no-login guest flow was
...               retired, Build App, Start App and Open App skip the run
...               straight away. See the Parking section in robot/README.md.
Library           Process
Library           Browser

*** Variables ***
# app.resource lives in robot/resources, so two levels up is the EduBuddy
# project folder regardless of where the repository itself is checked out.
${APP_DIR}        ${CURDIR}${/}..${/}..
${PORT}           3105
${BASE_URL}       http://localhost:${PORT}
${BROWSER}        chromium
${HEADLESS}       True
${SAMPLE_TITLE}    How the Internet Works: A First Tour
${PARKED_MESSAGE}    Parked: these suites drive the retired no-login guest flow, and the API now requires a Firebase sign-in token, so they need a rewrite against authenticated flows before they can run again.

*** Keywords ***
Build App
    [Documentation]    Runs "npm run build" in APP_DIR so "npm start" has a
    ...    production build to serve. Fails the suite immediately on a
    ...    non-zero exit code. Skipped entirely when the environment
    ...    variable EDUBUDDY_SKIP_BUILD is set to 1, for fast re-runs while a
    ...    build from a previous run is still valid.
    ...    Currently parked: skips immediately, so nothing is built; see the
    ...    Parking section in robot/README.md.
    Skip    ${PARKED_MESSAGE}
    IF    "%{EDUBUDDY_SKIP_BUILD=0}" == "1"
        Log    EDUBUDDY_SKIP_BUILD=1, skipping npm run build.    console=True
    ELSE
        Log    Running npm run build in ${APP_DIR} ...    console=True
        ${result} =    Run Process
        ...    npm.cmd    run    build
        ...    cwd=${APP_DIR}
        ...    stdout=${OUTPUTDIR}${/}build_stdout.log
        ...    stderr=${OUTPUTDIR}${/}build_stderr.log
        ...    timeout=10 minutes
        ...    on_timeout=terminate
        Log    npm run build exit code: ${result.rc}    console=True
        Should Be Equal As Integers    ${result.rc}    0
        ...    msg=npm run build failed (exit ${result.rc}). See ${OUTPUTDIR}${/}build_stdout.log and build_stderr.log.
    END

Start App
    [Documentation]    Starts "npm start -- -p ${PORT}" in APP_DIR in the
    ...    background, forcing mock mode by overriding OPENROUTER_API_KEY,
    ...    FIREBASE_SERVICE_ACCOUNT_JSON and FIREBASE_DATABASE_URL to empty
    ...    strings for this process only (even if a .env.local with real
    ...    secrets exists), and raising
    ...    the per-IP request cap through IP_REQUESTS_PER_MINUTE=1000 so the
    ...    many profiled requests a full run makes inside one minute cannot
    ...    trip the rate limiter (the app's default is 60), then waits until
    ...    GET ${BASE_URL}/api/status reports ai "mock" and store "memory".
    ...    Stores the server process in ${SERVER_PROCESS} (a suite variable)
    ...    so Stop App can find it again later.
    ...    Currently parked: skips immediately, so no server is started; see
    ...    the Parking section in robot/README.md.
    Skip    ${PARKED_MESSAGE}
    Log    Starting npm start in ${APP_DIR} on port ${PORT} ...    console=True
    ${process} =    Start Process
    ...    npm.cmd    start    --    -p    ${PORT}
    ...    cwd=${APP_DIR}
    ...    env:OPENROUTER_API_KEY=
    ...    env:FIREBASE_SERVICE_ACCOUNT_JSON=
    ...    env:FIREBASE_DATABASE_URL=
    ...    env:IP_REQUESTS_PER_MINUTE=1000
    ...    alias=edubuddy_server
    ...    stdout=${OUTPUTDIR}${/}server_stdout.log
    ...    stderr=${OUTPUTDIR}${/}server_stderr.log
    Set Suite Variable    ${SERVER_PROCESS}    ${process}
    Wait Until Keyword Succeeds    90x    2s    App Reports Mock Status
    Log    App is up at ${BASE_URL} in mock mode.    console=True

App Reports Mock Status
    [Documentation]    One attempt at reading GET /api/status through a small
    ...    stdlib-only Python helper (see wait_for_status.py) and checking it
    ...    reports mock AI and the in-memory store. Meant to be retried by
    ...    Wait Until Keyword Succeeds, not called on its own.
    ${result} =    Run Process    py    ${CURDIR}${/}wait_for_status.py    ${BASE_URL}/api/status
    Should Be Equal As Integers    ${result.rc}    0    msg=${result.stdout}

Stop App
    [Documentation]    Terminates the whole npm/node process tree started by
    ...    Start App. Killing just the npm.cmd process is not enough on
    ...    Windows (it is a wrapper that spawns further node processes), so
    ...    this uses "taskkill /PID <pid> /T /F" against the recorded
    ...    process id, then confirms the port is free.
    ...    While the run is parked, Start App never runs, so this returns
    ...    immediately when no server process was ever recorded, keeping the
    ...    suite teardown harmless after a skipped setup.
    ${server_started} =    Run Keyword And Return Status
    ...    Variable Should Exist    ${SERVER_PROCESS}
    IF    not ${server_started}
        Log    No server was started (the run is parked), nothing to stop.    console=True
        RETURN
    END
    ${still_running} =    Run Keyword And Return Status    Is Process Running    ${SERVER_PROCESS}
    IF    ${still_running}
        Log    Stopping server process tree (pid ${SERVER_PROCESS.pid}) ...    console=True
        Run Process    taskkill    /PID    ${SERVER_PROCESS.pid}    /T    /F
        Wait For Process    ${SERVER_PROCESS}    timeout=15s    on_timeout=kill
    ELSE
        Log    Server process was already stopped.    console=True
    END
    Wait Until Keyword Succeeds    10x    1s    Port Must Be Free

Port Must Be Free
    [Documentation]    Fails unless nothing is listening on ${PORT} on
    ...    localhost. Used after Stop App to confirm no server was left
    ...    running.
    ${in_use} =    Evaluate
    ...    socket.socket(socket.AF_INET, socket.SOCK_STREAM).connect_ex(('127.0.0.1', ${PORT})) == 0
    ...    modules=socket
    Should Not Be True    ${in_use}    msg=Port ${PORT} is still in use.

Open App
    [Documentation]    Opens a fresh browser, context and page, and navigates
    ...    to the app's root. Call once per suite file (as Suite Setup) so
    ...    every test in that file shares one browser context, and therefore
    ...    one localStorage profile id. ``viewport`` is forwarded to
    ...    New Context as-is (see that keyword's own documentation, under the
    ...    installed Browser library, for the argument's dictionary shape);
    ...    it defaults to the desktop size every suite used before the phone-
    ...    width suite needed something narrower.
    ...    Currently parked: skips immediately, so no browser is opened; see
    ...    the Parking section in robot/README.md.
    [Arguments]    ${viewport}={'width': 1280, 'height': 900}
    Skip    ${PARKED_MESSAGE}
    New Browser    ${BROWSER}    headless=${HEADLESS}
    New Context    viewport=${viewport}
    New Page    ${BASE_URL}

Wait Until Url Contains
    [Documentation]    Polls the current page URL (Get Url's own built-in
    ...    retry is too short for this, see below) until it contains
    ...    ``fragment``, or fails after ``timeout``.
    ...
    ...    Used instead of the Browser library's own "Wait For Navigation"
    ...    for every route change in this suite, including the ones
    ...    triggered by a plain link click or by router.push. A first
    ...    version of this suite used "Wait For Navigation" and saw it time
    ...    out waiting for a navigation that, per its own debug log, had
    ...    already happened: it is an event-based wait, and Next.js
    ...    client-side route changes can complete before such a listener
    ...    attaches, since they update the URL through the History API
    ...    rather than loading a new document. Polling the current URL has
    ...    no such race, since a check that runs after the fact simply
    ...    passes immediately.
    [Arguments]    ${fragment}    ${timeout}=20s
    Wait Until Keyword Succeeds    ${timeout}    0.5s    Get Url    contains    ${fragment}

Open Sample Notes From Dashboard
    [Documentation]    From the dashboard, clicks "Try sample notes" and
    ...    waits for the Notes Generator to open that material's result view
    ...    at /notes?material=<id>, the one generate flow that changes the
    ...    URL (it calls router.push). Returns that page's URL so callers
    ...    can navigate straight back to it later. The keyword only returns
    ...    once the sample title is visible, which means POST /api/notes has
    ...    answered and the result view's Notes tab is really rendered (the
    ...    first generation can show a brief loading card before that).
    Go To    ${BASE_URL}/dashboard
    Wait For Elements State    "Try sample notes"    visible    timeout=15s
    Click    "Try sample notes"
    Wait Until Url Contains    /notes?material=
    Wait For Elements State    text=${SAMPLE_TITLE}    visible    timeout=30s
    ${url} =    Get Url
    RETURN    ${url}

Start Quiz With Question Count
    [Documentation]    Starts a deck quiz at /quiz: waits for the topic
    ...    deck picker (the Quiz Arena is a self-contained spaced-repetition
    ...    quiz, no material needed), keeps the first deck selected, picks
    ...    ``count`` in the question-count select, clicks Start Quiz, and
    ...    waits until the first question's options and "Check Answer" button
    ...    are ready.
    [Arguments]    ${count}
    Go To    ${BASE_URL}/quiz
    Wait For Elements State    text="Select a topic deck"    visible    timeout=20s
    Select Options By    css=select    value    ${count}
    Click    "Start Quiz"
    Wait For Elements State    "Check Answer"    visible    timeout=20s

Answer Quiz Choosing First Option
    [Documentation]    Answers every question of the quiz currently in
    ...    progress by always choosing the first option: select it, click
    ...    "Check Answer", then advance with "Next" on every question but
    ...    the last, finishing with "Finish Quiz". Between questions the
    ...    keyword waits for the next question's counter text (for example
    ...    "2/10"), because the answer card animates out and in and clicking
    ...    the first option too early could hit the outgoing card.
    ...
    ...    Deck questions and options are scrambled every round, so the
    ...    score this procedure produces varies; suites assert on shapes
    ...    (a percentage, ten result cards), never on an exact score.
    [Arguments]    ${questions}=10
    FOR    ${i}    IN RANGE    ${questions}
        Click    css=.quiz-option >> nth=0
        Click    "Check Answer"
        IF    ${i} < ${questions} - 1
            Click    "Next"
            Wait For Elements State    text=${i + 2}/${questions}    visible    timeout=10s
        END
    END
    Click    "Finish Quiz"

Wait For Quiz Results
    [Documentation]    Waits for the results view to replace the question
    ...    flow after "Finish Quiz". There is no route change (the whole
    ...    quiz lives at /quiz) and no server round trip, so the score
    ...    circle element is what this waits for.
    Wait For Elements State    css=.score-value    visible    timeout=20s

Get Local Storage Item
    [Documentation]    Returns the value the current page stores in
    ...    localStorage under ``key`` (None when the key is not set).
    ...    Thin wrapper over the Browser library's "LocalStorage Get Item"
    ...    keyword (verified against the installed Browser 20.1.0 libdoc:
    ...    it takes the key and returns the stored string), so suites can
    ...    read the app's own localStorage keys by their plain name.
    [Arguments]    ${key}
    ${value} =    LocalStorage Get Item    ${key}
    RETURN    ${value}

Seed Graded Quiz Attempt
    [Documentation]    Creates one graded 10-question attempt on the
    ...    context's active material through the API: POST /api/quiz (the
    ...    mock AI serves the deterministic sample quiz) then POST
    ...    /api/attempt answering option 1 everywhere, which scores 30
    ...    percent. Used by the dashboard and progress suites to give the
    ...    profile real history, since the Quiz Arena itself is now the
    ...    browser-only spaced-repetition deck quiz and never calls these
    ...    routes. Fails unless the attempt is stored (helper exit code 0).
    ${profile_id} =    Get Local Storage Item    edubuddy.profileId
    ${material_id} =    Get Local Storage Item    edubuddy.activeMaterialId
    ${result} =    Run Process
    ...    py    ${CURDIR}${/}seed_attempt.py    ${BASE_URL}    ${profile_id}    ${material_id}
    ...    timeout=60s    on_timeout=kill
    Should Be Equal As Integers    ${result.rc}    0
    ...    msg=Seeding a graded attempt failed: ${result.stdout} ${result.stderr}
