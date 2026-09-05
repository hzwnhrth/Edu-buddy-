*** Settings ***
Documentation     The dashboard once there is real activity behind it: the
...               sample material listed, the stat cards carrying the quiz
...               counts, the "Review today" queue listing every weak topic
...               with its "Study this topic" link, and a refreshed study
...               plan that names a real topic. The suite builds its own
...               activity first (sample notes plus two seeded 30 percent
...               attempts through the API, since the Quiz Arena is now the
...               browser-only deck quiz), because every suite opens a fresh
...               browser context and therefore a fresh profile.
Resource          ../resources/app.resource
Suite Setup       Open App
Suite Teardown    Close Browser

*** Variables ***
@{TOPIC_NAMES}    IP addresses and packets    DNS: finding the right server
...               HTTP: how browsers ask for pages    TCP and UDP: reliable or fast
...               HTTPS: keeping the conversation private

*** Test Cases ***
Dashboard Reflects The Sample And Two Quizzes
    [Documentation]    Builds the activity, then checks the dashboard: the
    ...    streak card, the stat cards with non-zero numbers (two quizzes,
    ...    five weak topics, a 30 percent average), the "Review today"
    ...    queue with one "Study this topic" link per weak topic, and the
    ...    sample material in the list.
    ${material_url} =    Open Sample Notes From Dashboard
    Set Suite Variable    ${MATERIAL_URL}    ${material_url}
    Seed Graded Quiz Attempt
    Seed Graded Quiz Attempt
    Take Screenshot    05-activity-built

    Go To    ${BASE_URL}/dashboard
    Wait For Elements State    text="Review today"    visible    timeout=15s
    Wait For Elements State    text=Day Streak    visible
    Wait For Elements State    text="Quick Actions"    visible

    Wait Until Keyword Succeeds    15s    0.5s    Stat Cards Show Quiz Counts
    ${materials_stat} =    Get Stat Value    0
    ${materials_count} =    Convert To Integer    ${materials_stat}
    Should Be True    ${materials_count} >= 1
    ...    msg=Expected the Notes Generated card to be non-zero, got ${materials_stat}.
    ${avg} =    Get Stat Value    3
    Should Contain    ${avg}    %
    ...    msg=Expected the Avg. Score card to show a percentage, got ${avg}.
    ${study_links} =    Wait Until Keyword Succeeds    15s    0.5s    Count Study This Topic Links
    Should Be Equal As Integers    ${study_links}    5
    ...    msg=Expected one "Study this topic" link per weak topic.
    Wait For Elements State    text=How the Internet Works    visible    timeout=15s
    Take Screenshot    05-dashboard-after-activity

Refresh Study Plan Names A Topic
    [Documentation]    "Refresh study plan" fetches a fresh study plan (80
    ...    to 150 words with the mock) that names at least one real topic
    ...    from the sample notes; the poll waits out the placeholder and
    ...    the in-flight request together.
    Click    "Refresh study plan"
    ${feedback_text} =    Wait Until Keyword Succeeds    20s    0.5s    Get Long Enough Feedback Text
    ${word_count} =    Evaluate    len($feedback_text.split())
    Should Be True    ${word_count} >= 50
    ...    msg=Expected a real study plan of at least 50 words, got ${word_count}.
    ${mentions_topic} =    Set Variable    ${False}
    FOR    ${topic_name}    IN    @{TOPIC_NAMES}
        ${found} =    Run Keyword And Return Status    Should Contain    ${feedback_text}    ${topic_name}
        IF    ${found}
            ${mentions_topic} =    Set Variable    ${True}
            BREAK
        END
    END
    Should Be True    ${mentions_topic}
    ...    msg=Expected the study plan to mention a topic name. Got: ${feedback_text}
    Take Screenshot    05-study-feedback-refreshed

*** Keywords ***
Get Stat Value
    [Documentation]    Returns the big number text of the stat card at the
    ...    given 0-based index (Notes Generated, Quizzes Taken, Weak
    ...    Topics, Avg. Score).
    [Arguments]    ${index}
    ${value} =    Get Text    css=.stat-card >> nth=${index} >> h3
    RETURN    ${value}

Stat Cards Show Quiz Counts
    [Documentation]    Fails unless the Quizzes Taken and Weak Topics stat
    ...    cards carry the counts this suite's activity guarantees (two
    ...    quizzes, five weak topics), so this can be retried while
    ...    GET /api/me is still in flight after the navigation.
    ${quizzes} =    Get Stat Value    1
    ${weak} =    Get Stat Value    2
    Should Be Equal As Integers    ${quizzes}    2
    ...    msg=Expected the Quizzes Taken card to show 2, got ${quizzes}.
    Should Be Equal As Integers    ${weak}    5
    ...    msg=Expected the Weak Topics card to show 5, got ${weak}.

Count Study This Topic Links
    [Documentation]    Counts the "Study this topic" links in the Review
    ...    today queue and fails unless there are five (all five topics are
    ...    weak after two quizzes, and the queue caps at five items).
    ...    Returns the count once it is five.
    ${count} =    Get Element Count    "Study this topic"
    Should Be Equal As Integers    ${count}    5
    ...    msg=Expected five "Study this topic" links, got ${count}.
    RETURN    ${count}

Get Long Enough Feedback Text
    [Documentation]    Reads the study plan paragraph and fails unless it is
    ...    already clearly longer than the "No study plan yet..."
    ...    placeholder (11 words), so this can be retried by Wait Until
    ...    Keyword Succeeds until the refreshed feedback has replaced it.
    ...    Returns that text once it has.
    ${text} =    Get Text
    ...    xpath=//h2[normalize-space(text())="Your study plan"]/following::p[1]
    ${word_count} =    Evaluate    len($text.split())
    Should Be True    ${word_count} >= 50
    ...    msg=Study plan paragraph still looks like the placeholder (${word_count} words): ${text}
    RETURN    ${text}
