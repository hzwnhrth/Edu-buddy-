*** Settings ***
Documentation     The Notes Generator's three input paths: pasted text, a
...               small readable PDF, and a scanned PDF with no readable
...               text. Each test starts from a fresh /notes page load, since
...               the form's own state (not app data) is what changes here.
...               None of the three Generate flows changes the URL: the
...               upload card swaps for the result view in place, so the
...               tests wait on the material title instead of a route.
Resource          ../resources/app.resource
Suite Setup       Open App
Suite Teardown    Close Browser

*** Variables ***
${TEST_PDF}         ${APP_DIR}${/}robot${/}data${/}test.pdf
${SCANNED_PDF}      ${APP_DIR}${/}robot${/}data${/}scanned.pdf
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
Pasted Text Generates Between Four And Eight Topics
    [Documentation]    Typing a title, pasting original notes with three
    ...    headings, and clicking Generate Notes swaps the form for the
    ...    result view showing that title and a plausible number of topic
    ...    rows (the mock guarantees 4 to 8 regardless of input).
    Go To    ${BASE_URL}/notes
    Wait For Elements State    id=title    visible    timeout=15s
    Fill Text    id=title    Rivers and Lakes
    Fill Text    id=pasted-notes    ${PASTED_NOTES}
    Click    "Generate Notes"
    Wait For Elements State    text="Rivers and Lakes"    visible    timeout=30s
    ${topic_rows} =    Wait Until Keyword Succeeds    15s    0.5s    Count Topic Rows Between Four And Eight
    Take Screenshot    04-pasted-text-topics

PDF Upload Autofills Title And Generates Notes
    [Documentation]    Uploading the one-page sample PDF shows its extracted
    ...    page and character counts and fills the title from the file
    ...    name; clearing the title disables Generate Notes with the
    ...    expected hint, restoring it re-enables the button, and the
    ...    generated result view carries that title and at least four
    ...    topics.
    Go To    ${BASE_URL}/notes
    Wait For Elements State    css=input[type="file"]    attached    timeout=15s
    Upload File By Selector    css=input[type="file"]    ${TEST_PDF}

    Wait For Elements State    text=1 page, 244 characters extracted.    visible    timeout=15s
    Get Text    id=title    ==    test
    Get Element States    "Generate Notes"    contains    enabled

    Fill Text    id=title    ${EMPTY}
    Get Element States    "Generate Notes"    contains    disabled
    Wait For Elements State    text="Add a title for your notes."    visible
    Take Screenshot    04-pdf-title-cleared

    Fill Text    id=title    test
    Get Element States    "Generate Notes"    contains    enabled
    Take Screenshot    04-pdf-upload-ready

    Click    "Generate Notes"
    Wait For Elements State    text="test"    visible    timeout=30s
    Wait Until Keyword Succeeds    15s    0.5s    Count Topic Rows At Least Four
    Take Screenshot    04-pdf-topics

Scanned PDF Warns And Builds File Name Topics
    [Documentation]    Uploading data/scanned.pdf (no extractable text)
    ...    shows the exact "no readable text" message instead of a
    ...    character count and fills the title from the file name. The
    ...    generated result view then shows the four "Scanned: <suffix>"
    ...    topics the mock builds from the file name.
    Go To    ${BASE_URL}/notes
    Wait For Elements State    css=input[type="file"]    attached    timeout=15s
    Upload File By Selector    css=input[type="file"]    ${SCANNED_PDF}

    Wait For Elements State
    ...    text="No readable text was found in this PDF. The PDF itself will be sent for reading when you analyse it."
    ...    visible    timeout=15s
    Get Text    id=title    ==    scanned
    Get Element States    "Generate Notes"    contains    enabled
    Take Screenshot    04-scanned-message

    Click    "Generate Notes"
    Wait For Elements State    text="scanned"    visible    timeout=30s
    Wait For Elements State    css=h4:has-text("Scanned: overview")    visible    timeout=15s
    Wait For Elements State    css=h4:has-text("Scanned: key terms")    visible
    Wait For Elements State    css=h4:has-text("Scanned: how it works")    visible
    Wait For Elements State    css=h4:has-text("Scanned: common mistakes")    visible
    Wait Until Keyword Succeeds    15s    0.5s    Count Exactly Four Topic Rows
    Take Screenshot    04-scanned-topics

*** Keywords ***
Count Topic Rows Between Four And Eight
    [Documentation]    Counts the result view's topic rows and fails unless
    ...    there are 4 to 8, so this can be retried by Wait Until Keyword
    ...    Succeeds while the material fetch behind the topic list is still
    ...    in flight. Returns the count once it is inside the range.
    ${count} =    Get Element Count    text="Not practised yet"
    Should Be True    4 <= ${count} <= 8
    ...    msg=Expected 4 to 8 topic rows, got ${count}.
    RETURN    ${count}

Count Topic Rows At Least Four
    [Documentation]    Same topic-row count as above, but only bounded from
    ...    below: the small sample PDF must produce at least four topics.
    ${count} =    Get Element Count    text="Not practised yet"
    Should Be True    ${count} >= 4
    ...    msg=Expected at least 4 topic rows, got ${count}.
    RETURN    ${count}

Count Exactly Four Topic Rows
    [Documentation]    The scanned-PDF mock builds exactly four topics from
    ...    the file name, so the result view must show exactly four topic
    ...    rows once the material fetch has landed.
    ${count} =    Get Element Count    text="Not practised yet"
    Should Be Equal As Integers    ${count}    4
    ...    msg=Expected exactly 4 topic rows for the scanned PDF, got ${count}.
    RETURN    ${count}
