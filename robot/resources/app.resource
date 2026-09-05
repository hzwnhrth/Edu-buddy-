*** Settings ***
Documentation     Shared variables and keywords for the EduBuddy end-to-end
...               suite: building and starting the app in forced mock mode,
...               stopping it cleanly, opening a browser against it, and a
...               few small actions every suite repeats (answering a quiz,
...               waiting for one of the app's own routes to appear).
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

*** Keywords ***
Build App
    [Documentation]    Runs "npm run build" in APP_DIR so "npm start" has a
    ...    production build to serve. Fails the suite immediately on a
    ...    non-zero exit code. Skipped entirely when the environment
    ...    variable EDUBUDDY_SKIP_BUILD is set to 1, for fast re-runs while a
    ...    build from a previous run is still valid.
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
    ...    background, forcing mock mode by overriding GEMINI_API_KEY and
    ...    FIREBASE_SERVICE_ACCOUNT_JSON to empty strings for this process
    ...    only (even if a .env.local with real secrets exists), and raising
    ...    the per-IP request cap through IP_REQUESTS_PER_MINUTE=1000 so the
    ...    roughly 65 profiled requests a full run makes inside one minute
    ...    cannot trip the rate limiter (the app's default is 60), then waits
    ...    until GET ${BASE_URL}/api/status reports ai "mock" and store
    ...    "memory". Stores the server process in ${SERVER_PROCESS} (a suite
    ...    variable) so Stop App can find it again later.
    Log    Starting npm start in ${APP_DIR} on port ${PORT} ...    console=True
    ${process} =    Start Process
    ...    npm.cmd    start    --    -p    ${PORT}
    ...    cwd=${APP_DIR}
    ...    env:GEMINI_API_KEY=
    ...    env:FIREBASE_SERVICE_ACCOUNT_JSON=
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
    ...    to the dashboard. Call once per suite file (as Suite Setup) so
    ...    every test in that file shares one browser context, and therefore
    ...    one localStorage profile id. ``viewport`` is forwarded to
    ...    New Context as-is (see that keyword's own documentation, under the
    ...    installed Browser library, for the argument's dictionary shape);
    ...    it defaults to the desktop size every suite used before the phone-
    ...    width suite needed something narrower.
    [Arguments]    ${viewport}={'width': 1280, 'height': 900}
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
    ...    triggered by a plain link click. A first version of this suite
    ...    used "Wait For Navigation" and saw it time out waiting for a
    ...    navigation that, per its own debug log, had already happened: it
    ...    is an event-based wait, and Next.js client-side route changes can
    ...    complete before such a listener attaches, since they update the
    ...    URL through the History API rather than loading a new document.
    ...    Polling the current URL has no such race, since a check that
    ...    runs after the fact simply passes immediately.
    [Arguments]    ${fragment}    ${timeout}=20s
    Wait Until Keyword Succeeds    ${timeout}    0.5s    Get Url    contains    ${fragment}

Open Sample Notes From Dashboard
    [Documentation]    From the dashboard, clicks "Try sample notes" and
    ...    waits for the resulting topics page. Returns that page's URL so
    ...    callers can navigate straight back to it later without depending
    ...    on nav-link text that may be ambiguous on other pages.
    Go To    ${BASE_URL}
    Click    "Try sample notes"
    Wait Until Url Contains    /notes/
    ${url} =    Get Url
    RETURN    ${url}

Start Quiz From Topics Page
    [Documentation]    Clicks "Start quiz" on the topics page currently open
    ...    (all topics selected by default) and waits for the quiz page.
    Click    "Start quiz"
    Wait Until Url Contains    /quiz?quiz=

Answer Every Question Choosing Option
    [Documentation]    On the quiz page currently open, clicks the given
    ...    1-based option number on every question, advancing with Next,
    ...    and stops as soon as Submit is visible, i.e. after the last
    ...    question has been answered but before Submit is clicked.
    [Arguments]    ${option_number}=1
    ${index} =    Evaluate    int($option_number) - 1
    WHILE    True    limit=50
        Click    role=button >> nth=${index}
        ${submit_count} =    Get Element Count    "Submit"
        IF    ${submit_count} > 0    BREAK
        Click    "Next"
    END

Submit Quiz
    [Documentation]    Clicks Submit on a fully answered quiz page and waits
    ...    for the results page.
    Click    "Submit"
    Wait Until Url Contains    /results?attempt=
