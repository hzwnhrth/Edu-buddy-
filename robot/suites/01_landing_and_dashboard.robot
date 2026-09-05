*** Settings ***
Documentation     The landing page hero with its two entry buttons, the
...               dashboard's first-visit empty state with the mock-mode
...               badges, and the "Try sample notes" path onto the Notes
...               Generator's result view, including the three study tabs and
...               a flashcard flip. All tests share one browser context (one
...               localStorage profile id) and run in the written order, each
...               continuing where the previous one left off.
Resource          ../resources/app.resource
Suite Setup       Open App
Suite Teardown    Close Browser

*** Test Cases ***
Landing Hero Shows And Both Buttons Navigate
    [Documentation]    The landing page renders its hero, and both hero
    ...    buttons take the visitor into the app: "Upload Notes" to the
    ...    Notes Generator and "Get Started Free" to the dashboard.
    Go To    ${BASE_URL}
    Wait For Elements State    h1    visible    timeout=15s
    Get Text    h1    contains    Study Platform
    Get Element States    "Get Started Free"    contains    visible
    Get Element States    css=button:has-text("Upload Notes")    contains    visible
    Take Screenshot    01-landing-hero

    Click    css=button:has-text("Upload Notes")
    Wait Until Url Contains    /notes
    Wait For Elements State    id=title    visible    timeout=15s

    Go To    ${BASE_URL}
    Wait For Elements State    "Get Started Free"    visible    timeout=15s
    Click    "Get Started Free"
    Wait Until Url Contains    /dashboard
    Take Screenshot    01-landing-get-started

Dashboard Shows Empty State And Mock Badges
    [Documentation]    A first-time visitor sees the "No notes yet" empty
    ...    state with both ways in, the streak and quick action blocks, and
    ...    the "Mock AI" and "Memory store" badges in the navbar, which
    ...    proves the suite's server really runs in mock mode.
    Go To    ${BASE_URL}/dashboard
    Wait For Elements State    text="No notes yet"    visible    timeout=15s
    Wait For Elements State    text="Mock AI"    visible    timeout=15s
    Wait For Elements State    text="Memory store"    visible    timeout=15s
    Get Element States    "Upload notes"    contains    visible
    Get Element States    "Try sample notes"    contains    visible
    Wait For Elements State    text=Day Streak    visible    timeout=15s
    Wait For Elements State    text="Quick Actions"    visible
    Take Screenshot    01-dashboard-empty-state

Try Sample Notes Lands On Notes With Tabs And Five Topics
    [Documentation]    "Try sample notes" creates the bundled material and
    ...    lands on /notes?material=<id>, where the result view shows the
    ...    sample title, the Notes / Flashcards / Key Points tabs, and five
    ...    topic rows in the Notes tab (one per sample topic, each still
    ...    showing its "Not practised yet" line).
    ${material_url} =    Open Sample Notes From Dashboard
    Set Suite Variable    ${MATERIAL_URL}    ${material_url}
    Get Url    contains    /notes?material=
    ${tab_count} =    Get Element Count    css=[role="tab"]
    Should Be Equal As Integers    ${tab_count}    3
    ...    msg=Expected the Notes, Flashcards and Key Points tabs.
    Get Element States    css=[role="tab"] >> nth=0    contains    visible
    ${topic_rows} =    Wait Until Keyword Succeeds    15s    0.5s    Count Sample Topic Rows
    Should Be Equal As Integers    ${topic_rows}    5
    ...    msg=Expected five topic rows on the sample notes.
    Take Screenshot    01-sample-notes-result-view

Flashcards Flip On Click
    [Documentation]    On the Flashcards tab, clicking a card toggles its
    ...    "flipped" class and reveals the answer side's "Answer" label.
    Click    css=[role="tab"] >> nth=1
    Wait For Elements State    css=.flashcard >> nth=0    visible    timeout=15s
    ${card_count} =    Get Element Count    css=.flashcard
    Should Be True    ${card_count} >= 6
    ...    msg=Expected at least six flashcards on the sample notes.
    ${class} =    Get Attribute    css=.flashcard >> nth=0    class
    Should Not Contain    ${class}    flipped
    Click    css=.flashcard >> nth=0
    Wait Until Keyword Succeeds    5s    0.3s    First Flashcard Is Flipped
    Take Screenshot    01-flashcard-flipped

*** Keywords ***
Count Sample Topic Rows
    [Documentation]    Counts the sample notes' topic rows and fails unless
    ...    there are five, so this can be retried by Wait Until Keyword
    ...    Succeeds while the material fetch behind the topic list is still
    ...    in flight after the navigation above. Returns the count once it
    ...    is five.
    ${count} =    Get Element Count    text="Not practised yet"
    Should Be Equal As Integers    ${count}    5
    ...    msg=Expected five "Not practised yet" topic rows, got ${count}.
    RETURN    ${count}

First Flashcard Is Flipped
    [Documentation]    Fails unless the first flashcard carries the
    ...    "flipped" class and shows its answer side, so this can be
    ...    retried while the flip animation is still running.
    ${class} =    Get Attribute    css=.flashcard >> nth=0    class
    Should Contain    ${class}    flipped
    Get Element States    css=.flashcard.flipped >> text="Answer"    contains    visible
