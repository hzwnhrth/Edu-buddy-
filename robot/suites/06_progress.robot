*** Settings ***
Documentation     The Progress screen with real activity behind it: the four
...               stat cards, the Performance Trends chart and Recent
...               Quizzes list, the Focus Areas weak-topic cards with their
...               expandable explanations, and the ?material=&topic= deep
...               link that opens exactly one card. The suite builds its own
...               activity first (sample notes plus two 10 question quizzes
...               choosing option 1), because every suite opens a fresh
...               browser context and therefore a fresh profile.
Resource          ../resources/app.resource
Suite Setup       Open App
Suite Teardown    Close Browser

*** Test Cases ***
Progress Shows Stats, Chart Heading And Recent Quizzes
    [Documentation]    Builds the activity, then checks the Progress screen:
    ...    four stat cards, the "Performance Trends" heading (asserted on
    ...    the heading, not the chart's SVG internals, since the chart
    ...    renders inside a ResponsiveContainer), and two Recent Quizzes
    ...    entries, one per attempt, each showing 3 of 10 correct.
    ${material_url} =    Open Sample Notes From Dashboard
    Set Suite Variable    ${MATERIAL_URL}    ${material_url}
    Start Quiz With Question Count    10
    Answer Quiz Choosing First Option    10
    Wait For Quiz Results
    Start Quiz With Question Count    10
    Answer Quiz Choosing First Option    10
    Wait For Quiz Results

    Go To    ${BASE_URL}/progress
    Wait For Elements State    text="Your Progress"    visible    timeout=15s
    ${stat_cards} =    Get Element Count    css=.stat-card
    Should Be Equal As Integers    ${stat_cards}    4
    ...    msg=Expected four stat cards on the Progress screen.
    Wait For Elements State    text="Performance Trends"    visible    timeout=15s
    Wait For Elements State    text="Recent Quizzes"    visible    timeout=15s
    ${entries} =    Wait Until Keyword Succeeds    15s    0.5s    Count Recent Quiz Entries
    Should Be Equal As Integers    ${entries}    2
    ...    msg=Expected two Recent Quizzes entries, one per attempt.
    Take Screenshot    06-progress-overview

Focus Areas List The Weak Topics And Expand To Key Points
    [Documentation]    After two quizzes all five topics are weak, so Focus
    ...    Areas shows five cards, each with a Weak badge. Opening the
    ...    first card fetches its explanation: the card's aria-expanded
    ...    flips, and the explanation arrives with its "Key points" block
    ...    and a Regenerate action.
    ${focus_cards} =    Wait Until Keyword Succeeds    15s    0.5s    Count Focus Cards
    Should Be Equal As Integers    ${focus_cards}    5
    ...    msg=Expected five weak-topic cards under Focus Areas.
    ${weak_count} =    Get Element Count    "Weak"
    Should Be True    ${weak_count} >= 5
    ...    msg=Expected a Weak badge per Focus Area card, got ${weak_count}.
    Click    css=button[aria-expanded="false"] >> nth=0
    Wait For Elements State    text="Key points"    visible    timeout=20s
    Get Element States    "Regenerate"    contains    visible
    ${expanded} =    Get Element Count    css=button[aria-expanded="true"]
    Should Be Equal As Integers    ${expanded}    1
    ...    msg=Expected exactly one Focus Area card open after the click.
    Take Screenshot    06-focus-card-expanded

Deep Link Opens Exactly One Focus Card
    [Documentation]    The "Study this topic" links on the dashboard point
    ...    at /progress?material=<id>&topic=<id>; following one lands on
    ...    the Progress screen with exactly that card already expanded and
    ...    its explanation loaded.
    Go To    ${BASE_URL}/dashboard
    Wait For Elements State    text="Review today"    visible    timeout=15s
    ${deep_link} =    Get Attribute    css=a[href*="/progress?material="] >> nth=0    href
    ${deep_link} =    Evaluate    $deep_link.replace("&amp;", "&")
    Go To    ${BASE_URL}${deep_link}
    Wait For Elements State    text="Focus Areas"    visible    timeout=15s
    ${expanded} =    Wait Until Keyword Succeeds    15s    0.5s    Count Expanded Focus Cards
    Should Be Equal As Integers    ${expanded}    1
    ...    msg=Expected the deep link to open exactly one Focus Area card.
    Wait For Elements State    text="Key points"    visible    timeout=20s
    Take Screenshot    06-deep-link-expanded

*** Keywords ***
Count Recent Quiz Entries
    [Documentation]    Counts the Recent Quizzes rows by their "3/10
    ...    correct" line (both attempts score 30 percent with the mock) and
    ...    fails unless there are two, so this can be retried while
    ...    GET /api/me is still in flight. Returns the count once it is two.
    ${count} =    Get Element Count    text=3/10 correct
    Should Be Equal As Integers    ${count}    2
    ...    msg=Expected two "3/10 correct" entries, got ${count}.
    RETURN    ${count}

Count Focus Cards
    [Documentation]    Counts the Focus Area cards through their
    ...    aria-expanded toggle buttons and fails unless there are five,
    ...    so this can be retried while GET /api/me is still in flight.
    ...    Returns the count once it is five.
    ${count} =    Get Element Count    css=button[aria-expanded]
    Should Be Equal As Integers    ${count}    5
    ...    msg=Expected five Focus Area cards, got ${count}.
    RETURN    ${count}

Count Expanded Focus Cards
    [Documentation]    Counts the Focus Area cards whose aria-expanded is
    ...    true and fails unless exactly one is, so this can be retried
    ...    while the screen's data fetch is still landing. Returns the
    ...    count once it is one.
    ${count} =    Get Element Count    css=button[aria-expanded="true"]
    Should Be Equal As Integers    ${count}    1
    ...    msg=Expected exactly one expanded Focus Area card, got ${count}.
    RETURN    ${count}
