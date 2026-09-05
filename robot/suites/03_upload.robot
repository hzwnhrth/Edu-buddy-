*** Settings ***
Documentation     The Upload screen's two input paths: pasted text and a PDF
...               file, plus the title requirement that gates the "Analyse
...               notes" button. Both tests share one browser context but
...               each starts from a fresh /upload page load, since the
...               form's own state (not app data) is what matters here.
Resource          ../resources/app.resource
Suite Setup       Open App
Suite Teardown    Close Browser

*** Variables ***
${TEST_PDF}         ${APP_DIR}${/}robot${/}data${/}test.pdf
${PASTED_NOTES}     SEPARATOR=\n
...                 How rivers form:
...                 ${EMPTY}
...                 A river begins as a small stream fed by rain, melting snow or a spring. As more water joins from smaller streams, the channel grows wider and carries more water downhill toward a sea, a lake or another river. Fast sections form where the land drops quickly, while slow bends form where the land is flatter.
...                 ${EMPTY}
...                 Why lakes stay full:
...                 ${EMPTY}
...                 A lake fills a low point in the land where water collects faster than it drains away. Some lakes are fed by rivers and rain, while others sit inside old glacial basins that trap water for thousands of years. A lake with more inflow than outflow keeps a steady water level through most of the year.
...                 ${EMPTY}
...                 Life in fresh water:
...                 ${EMPTY}
...                 Rivers and lakes support fish, insects and plants that need fresh water rather than the salt water of the ocean. Fast river currents favour different species than the still water near a lake shore. A single watershed can hold many different habitats side by side.

*** Test Cases ***
Pasted Text Analyses Into Between Four And Eight Topics
    [Documentation]    Typing a title, pasting original notes with three
    ...    headings, and analysing lands on the topics page with a plausible
    ...    number of topics (the mock guarantees 4 to 8 regardless of input).
    Go To    ${BASE_URL}/upload
    Wait For Elements State    id=title    visible    timeout=15s
    Fill Text    id=title    Rivers and Lakes
    Fill Text    id=pasted-text    ${PASTED_NOTES}
    Click    "Analyse notes"
    Wait Until Url Contains    /notes/
    Wait For Elements State    h1    visible    timeout=15s
    Get Text    h1    ==    Rivers and Lakes

    ${checkbox_count} =    Get Element Count    css=input[type="checkbox"]
    Should Be True    4 <= ${checkbox_count} <= 8
    ...    msg=Expected between 4 and 8 topic checkboxes, got ${checkbox_count}.
    Take Screenshot    03-pasted-text-topics

PDF Upload Extracts Text And Requires A Title
    [Documentation]    Uploading the one-page sample PDF shows its extracted
    ...    page and character counts and fills the title from the file name;
    ...    clearing the title disables "Analyse notes" with the expected
    ...    hint, and restoring it re-enables the button, which then leads to
    ...    the topics page.
    Go To    ${BASE_URL}/upload
    Wait For Elements State    css=input[type="file"]    attached    timeout=15s
    Upload File By Selector    css=input[type="file"]    ${TEST_PDF}

    Wait For Elements State    text=244 characters extracted.    visible    timeout=15s
    Wait For Elements State    text=1 page    visible
    Get Text    id=title    ==    test
    Get Element States    "Analyse notes"    contains    enabled

    Fill Text    id=title    ${EMPTY}
    Get Element States    "Analyse notes"    contains    disabled
    Wait For Elements State    text="Add a title for your notes."    visible
    Take Screenshot    03-pdf-upload-title-cleared

    Fill Text    id=title    test
    Get Element States    "Analyse notes"    contains    enabled
    Take Screenshot    03-pdf-upload-ready

    Click    "Analyse notes"
    Wait Until Url Contains    /notes/
    Wait For Elements State    h1    visible    timeout=15s
    Get Text    h1    ==    test
    Take Screenshot    03-pdf-upload-topics
