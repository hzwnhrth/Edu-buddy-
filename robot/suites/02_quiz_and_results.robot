*** Settings ***
Documentation     The Quiz Arena end to end on the sample notes: the start
...               screen's study-content pill, a full 10 question quiz always
...               choosing the first option with "Check Answer" then "Next"
...               per question, and the results view: exactly 30 percent in
...               the score circle, ten Detailed Results cards, and no Weak
...               badge anywhere after only one quiz. All tests share one
...               browser context and run in the written order.
Resource          ../resources/app.resource
Suite Setup       Open App
Suite Teardown    Close Browser

*** Test Cases ***
Quiz Start Screen Shows The Study Content Pill
    [Documentation]    After opening the sample notes the Quiz Arena start
    ...    screen confirms the active material with its green "Study
    ...    content loaded" pill, offers the difficulty buttons and the
    ...    question count select, and starts a 10 question quiz on demand.
    ${material_url} =    Open Sample Notes From Dashboard
    Set Suite Variable    ${MATERIAL_URL}    ${material_url}
    Go To    ${BASE_URL}/quiz
    Wait For Elements State    text=Study content loaded    visible    timeout=20s
    Wait For Elements State    text="Select Difficulty"    visible    timeout=15s
    Get Element States    "Easy"    contains    visible
    Get Element States    "Medium"    contains    visible
    Get Element States    "Hard"    contains    visible
    Take Screenshot    02-quiz-start-screen
    Start Quiz With Question Count    10

First Quiz Scores Thirty Percent With Ten Detailed Results
    [Documentation]    Answers all ten questions with the first option,
    ...    finishes the quiz, and checks the results view: 30 percent in
    ...    the score circle (3 of 10 correct, see app.resource), ten
    ...    Detailed Results cards each with a "Correct:" line, and the
    ...    verdict line under the circle.
    Answer Quiz Choosing First Option    10
    Wait For Quiz Results
    Get Text    css=.score-value    ==    30%
    Get Text    css=.score-label    ==    3/10
    Wait For Elements State    text="Detailed Results"    visible    timeout=15s
    ${result_count} =    Get Element Count
    ...    xpath=//strong[normalize-space(text())="Correct:"]
    Should Be Equal As Integers    ${result_count}    10
    ...    msg=Expected ten Detailed Results cards, got ${result_count}.
    Wait For Elements State    text=You answered 3 of 10 questions correctly.    visible
    Take Screenshot    02-first-results-thirty-percent

No Topic Is Weak After One Quiz
    [Documentation]    With only one quiz behind it every topic has just two
    ...    answered questions, one short of the three the weak flag needs,
    ...    so the Topics section shows no Weak badge, the "no weak topics"
    ...    note appears, and both follow-up actions stay disabled.
    Wait For Elements State    text="No weak topics this time."    visible    timeout=15s
    ${weak_count} =    Get Element Count    "Weak"
    Should Be Equal As Integers    ${weak_count}    0
    ...    msg=Expected no Weak badge on the results after a single quiz.
    ${topic_bars} =    Get Element Count    css=[role="progressbar"]
    Should Be Equal As Integers    ${topic_bars}    5
    ...    msg=Expected five topic cards under Topics.
    Get Element States    "Study weak topics"    contains    disabled
    Get Element States    "Practise weak topics"    contains    disabled
    Take Screenshot    02-no-weak-topics-after-one-quiz
