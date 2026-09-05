*** Settings ***
Documentation     The dashboard's first-visit empty state, and the "Try
...               sample notes" path from the dashboard to the topics
...               screen, including the topic checkboxes and the "Start
...               quiz" enable/disable rule. All three tests share one
...               browser context (one localStorage profile id).
Resource          ../resources/app.resource
Suite Setup       Open App
Suite Teardown    Close Browser

*** Test Cases ***
Dashboard Shows Empty State And Primary Actions
    [Documentation]    A first-time visitor sees the dashboard heading, the
    ...    mock-mode badges in the header, the "No notes yet" empty state,
    ...    and both dashboard actions.
    Go To    ${BASE_URL}
    Wait For Elements State    h1    visible    timeout=15s
    Get Text    h1    ==    Your study dashboard
    Wait For Elements State    text="Mock AI"    visible    timeout=15s
    Wait For Elements State    text="Memory store"    visible    timeout=15s
    Wait For Elements State    text="No notes yet"    visible    timeout=15s
    Get Element States    "Upload notes"    contains    visible
    Get Element States    "Try sample notes"    contains    visible
    Take Screenshot    01-dashboard-empty-state

Try Sample Notes Opens Topics With All Selected
    [Documentation]    "Try sample notes" creates the bundled material and
    ...    lands on its topics page with every topic pre-selected and
    ...    "Start quiz" enabled.
    Open Sample Notes From Dashboard
    Get Url    contains    /notes/
    Wait For Elements State    h1    visible    timeout=15s
    Get Text    h1    ==    How the Internet Works: A First Tour
    ${checkbox_count} =    Get Element Count    css=input[type="checkbox"]
    Should Be Equal As Integers    ${checkbox_count}    5
    ...    msg=Expected five topic checkboxes on the sample notes.
    FOR    ${i}    IN RANGE    ${checkbox_count}
        Get Element States    css=input[type="checkbox"] >> nth=${i}    contains    checked
    END
    Get Element States    "Start quiz"    contains    enabled
    Take Screenshot    01-sample-notes-topics-all-selected

Deselecting All Topics Disables Start Quiz
    [Documentation]    Unchecking every topic disables "Start quiz" and shows
    ...    the "select at least one" hint; re-checking them restores it, so
    ...    the material is left in its normal state for later suites.
    Get Url    contains    /notes/
    FOR    ${i}    IN RANGE    5
        Uncheck Checkbox    css=input[type="checkbox"] >> nth=${i}
    END
    Get Element States    "Start quiz"    contains    disabled
    Wait For Elements State    text="Select at least one topic to start a quiz."    visible
    Take Screenshot    01-topics-all-deselected

    FOR    ${i}    IN RANGE    5
        Check Checkbox    css=input[type="checkbox"] >> nth=${i}
    END
    Get Element States    "Start quiz"    contains    enabled
    Take Screenshot    01-topics-reselected
