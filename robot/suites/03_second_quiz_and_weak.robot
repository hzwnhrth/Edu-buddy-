*** Settings ***
Documentation     A second run through the deck: "Practise bank again"
...               starts a fresh scrambled round straight from the results
...               view, a full second quiz still produces complete results,
...               and "Try Again" returns to the deck picker. The per-deck
...               spaced-repetition schedules live in localStorage, so the
...               second round's selection (and every later session in this
...               context) is driven by what the first round answered. All
...               tests share one browser context and run in the written
...               order.
Resource          ../resources/app.resource
Suite Setup       Open App
Suite Teardown    Close Browser

*** Test Cases ***
First Deck Quiz Of This Context
    [Documentation]    Runs one full 10 question deck quiz choosing the
    ...    first option throughout, landing on the results view.
    Start Quiz With Question Count    10
    Answer Quiz Choosing First Option    10
    Wait For Quiz Results
    Get Text    css=.score-value    matches    ^\\d+%$

Practise Bank Again Starts A Second Quiz
    [Documentation]    Clicking "Practise bank again" rebuilds the session
    ...    (due cards first, everything scrambled again) and the second
    ...    round completes with full results too.
    Click    "Practise bank again"
    Wait For Elements State    "Check Answer"    visible    timeout=20s
    Answer Quiz Choosing First Option    10
    Wait For Quiz Results
    Get Text    css=.score-value    matches    ^\\d+%$
    Take Screenshot    03-second-results

Try Again Returns To The Deck Picker
    [Documentation]    "Try Again" resets to the start screen, which offers
    ...    the deck picker again with the question count select.
    Click    "Try Again"
    Wait For Elements State    text="Select a topic deck"    visible    timeout=15s
    Take Screenshot    03-back-to-deck-picker
