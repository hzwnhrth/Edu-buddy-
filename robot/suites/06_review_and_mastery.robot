*** Settings ***
Documentation     The Phase 3 "Review today" queue on the dashboard and the
...               per-topic mastery overview on the Topics page, from a clean
...               profile through two full quizzes on the sample notes,
...               always choosing the first option. All tests share one
...               browser context and run in the written order, each
...               continuing where the previous one left off.
...
...               With the mock AI, "always choose option 1" scores exactly
...               30% on a 10-question quiz (see the comment on
...               04_dashboard_after_activity.robot) and splits those ten
...               questions evenly over the sample notes' five topics, two
...               each, landing every topic on 0% or 50% mastery, one
...               question short of the three needed to ever be flagged
...               weak. A second quiz the same way pushes every topic to four
...               answered questions, still 0% or 50%, so all five end up
...               below the 60% weak threshold. That is why the assertions
...               below go from "nothing to review, no Weak badge anywhere"
...               straight to "every one of the five topics is weak", rather
...               than something in between.
Resource          ../resources/app.resource
Suite Setup       Open App
Suite Teardown    Close Browser

*** Test Cases ***
Sample Notes Through A First Full Quiz
    [Documentation]    Opens the sample notes and answers a full 10-question
    ...    quiz choosing the first option throughout, the same procedure
    ...    04_dashboard_after_activity.robot documents as leaving every topic
    ...    on exactly two answered questions.
    ${material_url} =    Open Sample Notes From Dashboard
    Set Suite Variable    ${MATERIAL_URL}    ${material_url}

    Start Quiz From Topics Page
    Answer Every Question Choosing Option    1
    Submit Quiz
    Get Url    contains    /results?attempt=

Dashboard Has Nothing To Review After One Quiz
    [Documentation]    With no topic yet at three answered questions, none
    ...    can be weak, and a topic quizzed moments ago is not stale either,
    ...    so the "Review today" queue is present but empty of items.
    Go To    ${BASE_URL}
    Wait For Elements State    text="Review today"    visible    timeout=15s
    Wait For Elements State
    ...    text="Nothing to review today. Take a quiz to keep your topics fresh."
    ...    visible    timeout=15s
    ${weak_badge_count} =    Get Element Count    "Weak"
    Should Be Equal As Integers    ${weak_badge_count}    0
    ...    msg=Expected no Weak badge on the dashboard after a single quiz.
    Take Screenshot    06-dashboard-nothing-to-review

Topics Page Shows A Mastery Bar Per Topic With No Weak Badge
    [Documentation]    Back on the Topics page, every one of the five topics
    ...    now has an attempt behind it, so each shows a mastery bar, but
    ...    none has reached the three-answer minimum to be flagged weak.
    Go To    ${MATERIAL_URL}
    Wait For Elements State    "Start quiz"    visible    timeout=15s

    ${bar_count} =    Get Element Count    css=[role="progressbar"]
    Should Be Equal As Integers    ${bar_count}    5
    ...    msg=Expected one mastery bar per topic (five) on the Topics page.
    ${weak_badge_count} =    Get Element Count    "Weak"
    Should Be Equal As Integers    ${weak_badge_count}    0
    ...    msg=Expected no Weak badge on the Topics page after a single quiz.
    Take Screenshot    06-topics-bars-no-weak

Second Full Quiz The Same Way
    [Documentation]    Starts a second quiz from the Topics page already open
    ...    and answers it the same way, pushing every topic to four answered
    ...    questions.
    Start Quiz From Topics Page
    Answer Every Question Choosing Option    1
    Submit Quiz
    Get Url    contains    /results?attempt=

Dashboard Review Queue Lists Every Weak Topic
    [Documentation]    All five topics are now weak (see the suite
    ...    documentation above), so the "Review today" queue lists all five,
    ...    each with a Weak badge and a "Study this topic" link, still within
    ...    the queue's five-item cap.
    Go To    ${BASE_URL}
    Wait For Elements State    text="Review today"    visible    timeout=15s

    ${weak_badge_count} =    Wait Until Keyword Succeeds    15s    0.5s
    ...    Get Five Weak Badges
    ${study_link_count} =    Get Element Count    "Study this topic"
    Should Be Equal As Integers    ${study_link_count}    ${weak_badge_count}
    ...    msg=Expected one "Study this topic" link per weak item in the queue.
    Take Screenshot    06-dashboard-weak-topics

Topics Page Shows A Weak Badge On Every Topic
    [Documentation]    The same five topics, viewed from the Topics page
    ...    instead of the dashboard queue, each show a Weak badge alongside
    ...    their mastery bar.
    Go To    ${MATERIAL_URL}
    Wait For Elements State    "Start quiz"    visible    timeout=15s

    ${bar_count} =    Get Element Count    css=[role="progressbar"]
    Should Be Equal As Integers    ${bar_count}    5
    ...    msg=Expected one mastery bar per topic (five) on the Topics page.
    ${weak_badge_count} =    Get Element Count    "Weak"
    Should Be Equal As Integers    ${weak_badge_count}    5
    ...    msg=Expected all five topics to be flagged weak after two quizzes.
    Take Screenshot    06-topics-all-weak

*** Keywords ***
Get Five Weak Badges
    [Documentation]    Reads the current count of exact "Weak" text matches
    ...    and fails unless it is five, so this can be retried by
    ...    Wait Until Keyword Succeeds while the dashboard's GET /api/me call
    ...    is still in flight after the navigation above. Returns the count
    ...    once it is five.
    ${count} =    Get Element Count    "Weak"
    Should Be Equal As Integers    ${count}    5
    ...    msg=Expected all five topics to be weak in the Review today queue, got ${count}.
    RETURN    ${count}
