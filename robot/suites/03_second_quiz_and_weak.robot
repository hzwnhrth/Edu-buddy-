*** Settings ***
Documentation     A second 10 question quiz on the sample notes, run the same
...               way as the first (always choosing the first option), which
...               pushes every one of the five topics below the weak
...               threshold: the results view then shows a Weak badge on all
...               five, "Study weak topics" and "Practise weak topics" come
...               alive, and "Practise weak topics" starts a fresh quiz.
...               All tests share one browser context and run in the written
...               order, each continuing where the previous one left off.
Resource          ../resources/app.resource
Suite Setup       Open App
Suite Teardown    Close Browser

*** Test Cases ***
First Quiz Of This Context
    [Documentation]    Opens the sample notes and runs one full 10 question
    ...    quiz choosing the first option throughout, leaving every topic
    ...    on two answered questions and nothing weak yet.
    ${material_url} =    Open Sample Notes From Dashboard
    Set Suite Variable    ${MATERIAL_URL}    ${material_url}
    Start Quiz With Question Count    10
    Answer Quiz Choosing First Option    10
    Wait For Quiz Results
    Get Text    css=.score-value    ==    30%

Second Quiz Flags All Five Topics Weak
    [Documentation]    Starts another 10 question quiz straight from the
    ...    results view's "Try Again" (the question count select keeps its
    ...    value), answers it the same way, and checks that all five topics
    ...    now carry a Weak badge and the follow-up actions are enabled.
    Click    "Try Again"
    Wait For Elements State    text=Study content loaded    visible    timeout=15s
    Click    "Start Quiz"
    Wait For Elements State    "Check Answer"    visible    timeout=20s
    Answer Quiz Choosing First Option    10
    Wait For Quiz Results
    ${weak_count} =    Wait Until Keyword Succeeds    15s    0.5s    Count Five Weak Badges
    Should Be Equal As Integers    ${weak_count}    5
    ...    msg=Expected all five topics weak after a second quiz.
    Get Element States    "Study weak topics"    contains    enabled
    Get Element States    "Practise weak topics"    contains    enabled
    ${study_href} =    Get Attribute    "Study weak topics"    href
    Should Contain    ${study_href}    /progress?material=
    Take Screenshot    03-second-results-all-weak

Practise Weak Topics Starts A New Quiz
    [Documentation]    Clicking "Practise weak topics" generates a fresh
    ...    quiz focused on the weak topics; the keyword waits out the
    ...    loading card until the first question is ready to answer.
    Click    "Practise weak topics"
    Wait For Elements State    "Check Answer"    visible    timeout=20s
    Take Screenshot    03-practise-weak-quiz-started

*** Keywords ***
Count Five Weak Badges
    [Documentation]    Reads the count of exact "Weak" text matches on the
    ...    results view and fails unless it is five, so this can be retried
    ...    by Wait Until Keyword Succeeds while the grading response is
    ...    still landing. Returns the count once it is five.
    ${count} =    Get Element Count    "Weak"
    Should Be Equal As Integers    ${count}    5
    ...    msg=Expected five Weak badges on the results, got ${count}.
    RETURN    ${count}
