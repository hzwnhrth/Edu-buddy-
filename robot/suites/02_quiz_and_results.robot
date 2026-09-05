*** Settings ***
Documentation     The Quiz Arena end to end on the bundled decks: the start
...               screen's deck picker listing all four of them (no paste
...               box, no difficulty buttons any more), a full 10 question
...               quiz on the default first deck always choosing the first
...               option with "Check Answer" then "Next" per question, and
...               the local results view: a percentage in the score circle,
...               ten Detailed Results cards, the spaced-repetition "Next
...               review" line, and the deck's single topic card. Questions
...               and options are scrambled every round, so assertions are
...               on shapes, never on an exact score. All tests share one
...               browser context and run in the written order.
Resource          ../resources/app.resource
Suite Setup       Open App
Suite Teardown    Close Browser

*** Test Cases ***
Quiz Start Screen Lists The Topic Decks
    [Documentation]    The Quiz Arena start screen offers the four bundled
    ...    decks (Bab 1, Bab 2, Bab 3 and the mix of all chapters), keeps
    ...    the question count select, and no longer shows the paste-content
    ...    card or the difficulty buttons, then starts a 10 question quiz
    ...    on demand.
    Go To    ${BASE_URL}/quiz
    Wait For Elements State    text="Select a topic deck"    visible    timeout=20s
    ${deck_buttons} =    Get Element Count    css=button:has-text("due for review")
    Should Be Equal As Integers    ${deck_buttons}    4
    ...    msg=Expected four deck buttons on the start screen, got ${deck_buttons}.
    ${bab_one_cards} =    Get Element Count    text="Buku Teks Sejarah T4 - Bab 1"
    Should Be Equal As Integers    ${bab_one_cards}    1
    ...    msg=Expected exactly one Bab 1 deck title, got ${bab_one_cards}.
    Wait For Elements State    text="Buku Teks Sejarah T4 - Bab 2"    visible    timeout=15s
    Wait For Elements State    text="Buku Teks Sejarah T4 - Bab 3"    visible    timeout=15s
    Wait For Elements State    text="Semua Bab (Bab 1-3)"    visible    timeout=15s
    ${paste_cards} =    Get Element Count    text=Paste your study content
    Should Be Equal As Integers    ${paste_cards}    0
    ...    msg=The paste-content card should be gone from the Quiz Arena.
    ${difficulty_heading} =    Get Element Count    text="Select Difficulty"
    Should Be Equal As Integers    ${difficulty_heading}    0
    ...    msg=The difficulty selector should be gone from the Quiz Arena.
    ${easy_buttons} =    Get Element Count    "Easy"
    Should Be Equal As Integers    ${easy_buttons}    0
    ...    msg=The Easy difficulty button should be gone.
    Take Screenshot    02-quiz-start-screen
    Start Quiz With Question Count    10

A Ten Question Quiz Produces Full Results
    [Documentation]    Answers all ten questions with the first option,
    ...    finishes the quiz, and checks the results view: a percentage in
    ...    the score circle, ten Detailed Results cards each with a
    ...    "Correct:" line, the "You answered X of 10 questions correctly."
    ...    line, and the spaced-repetition next-review hint.
    Answer Quiz Choosing First Option    10
    Wait For Quiz Results
    Get Text    css=.score-value    matches    ^\\d+%$
    Get Text    css=.score-label    matches    ^\\d+/10$
    Wait For Elements State    text="Detailed Results"    visible    timeout=15s
    ${result_count} =    Get Element Count
    ...    xpath=//strong[normalize-space(text())="Correct:"]
    Should Be Equal As Integers    ${result_count}    10
    ...    msg=Expected ten Detailed Results cards, got ${result_count}.
    ${verdict_line} =    Get Text    xpath=//p[contains(., "questions correctly")]
    Should Match Regexp    ${verdict_line}    ^You answered \\d+ of 10 questions correctly\\.$
    Wait For Elements State    text=Next review    visible    timeout=15s
    Take Screenshot    02-first-results

The Deck Shows One Topic Card
    [Documentation]    The whole deck belongs to one topic, so the Topics
    ...    section has exactly one card with its mastery bar, whatever the
    ...    scrambled round scored.
    ${topic_bars} =    Get Element Count    css=[role="progressbar"]
    Should Be Equal As Integers    ${topic_bars}    1
    ...    msg=Expected one topic card under Topics.
    Wait For Elements State    text=Bab 1    visible    timeout=15s
    Take Screenshot    02-topic-card
