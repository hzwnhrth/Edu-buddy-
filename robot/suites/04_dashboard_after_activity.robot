*** Settings ***
Documentation     The dashboard once there is real activity behind it: the
...               sample material listed, quiz-taking reflected in the
...               progress stats, a generated study plan that names a real
...               topic, and the "material not found" panel instead of a
...               crash. All tests share one browser context and run in the
...               written order.
...
...               Setup here runs the sample-notes-and-quiz flow TWICE, not
...               once. With the mock AI, "always choose option 1" scores
...               exactly 30% and leaves every topic with only 2 answered
...               questions after a single quiz, one short of the 3 needed
...               to ever be flagged weak or strong; with nothing weak or
...               strong yet, the generated study plan falls back to fully
...               generic sentences that name no topic at all. A second quiz
...               pushes every topic's answered-question count to 4 and its
...               mastery below 60%, so the study plan starts naming real
...               topics, which is what this suite's feedback test checks
...               for. This is a deliberate test-design choice, not a change
...               to any pass/fail rule from the task brief.
Resource          ../resources/app.resource
Suite Setup       Open App
Suite Teardown    Close Browser

*** Variables ***
@{TOPIC_NAMES}      IP addresses and packets    DNS: finding the right server
...                 HTTP: how browsers ask for pages    TCP and UDP: reliable or fast
...                 HTTPS: keeping the conversation private

*** Test Cases ***
Dashboard Lists Notes And Progress After Quiz Activity
    [Documentation]    Builds up activity (sample notes, two quizzes) then
    ...    checks the dashboard reflects it: the material is listed, quizzes
    ...    taken is at least one, and the study feedback section is present.
    ${material_url} =    Open Sample Notes From Dashboard
    Start Quiz From Topics Page
    Answer Every Question Choosing Option    1
    Submit Quiz

    Go To    ${material_url}
    Wait For Elements State    "Start quiz"    visible    timeout=15s
    Start Quiz From Topics Page
    Answer Every Question Choosing Option    1
    Submit Quiz
    Get Url    contains    /results?attempt=

    Go To    ${BASE_URL}
    Wait For Elements State    text="Your notes"    visible    timeout=15s
    Wait For Elements State    text=How the Internet Works    visible

    Wait For Elements State    text="Your progress"    visible
    ${quizzes_taken_text} =    Get Text
    ...    xpath=//dt[normalize-space(text())="Quizzes taken"]/following-sibling::dd[1]
    ${quizzes_taken} =    Convert To Integer    ${quizzes_taken_text}
    Should Be True    ${quizzes_taken} >= 1
    ...    msg=Expected at least one quiz taken, got ${quizzes_taken}.

    Wait For Elements State    text="Study feedback"    visible
    Take Screenshot    04-dashboard-after-activity

Refresh Study Plan Mentions A Topic
    [Documentation]    "Refresh study plan" fetches a fresh study plan of 80
    ...    to 150 words (the mock's own guarantee) that names at least one
    ...    real topic from the sample notes.
    Click    "Refresh study plan"
    # The "No study plan yet..." placeholder paragraph already occupies this
    # same xpath position before the click, and stays visible while the
    # refresh request is in flight, so a plain visibility wait would not
    # actually wait for the new text. Polling for a paragraph that is
    # already far longer than that placeholder (11 words) is what actually
    # waits for the real, freshly-generated feedback to land.
    ${feedback_text} =    Wait Until Keyword Succeeds    15s    0.5s    Get Long Enough Feedback Text

    ${word_count} =    Evaluate    len($feedback_text.split())
    Should Be True    80 <= ${word_count} <= 150
    ...    msg=Expected 80 to 150 words, got ${word_count}: ${feedback_text}

    # A plain FOR loop rather than a Python generator expression inside
    # Evaluate: Evaluate's automatic "$name" substitution got confused with
    # two different Robot variables referenced in the one expression
    # (raised "used in a scope where it cannot be seen" even though
    # ${feedback_text} was clearly set above), so this sidesteps that
    # mechanism entirely instead of chasing it further.
    ${mentions_topic} =    Set Variable    ${False}
    FOR    ${topic_name}    IN    @{TOPIC_NAMES}
        ${found} =    Run Keyword And Return Status    Should Contain    ${feedback_text}    ${topic_name}
        IF    ${found}
            ${mentions_topic} =    Set Variable    ${True}
            BREAK
        END
    END
    Should Be True    ${mentions_topic}
    ...    msg=Expected the feedback to mention a topic name. Got: ${feedback_text}
    Take Screenshot    04-study-feedback-refreshed

Unknown Material Shows Not Found Instead Of Crashing
    [Documentation]    Visiting a material id that does not exist shows the
    ...    shared "not found" error panel with a retry action rather than
    ...    crashing the page.
    Go To    ${BASE_URL}/notes/does-not-exist
    Wait For Elements State    text="Not found"    visible    timeout=15s
    Get Element States    "Try again"    contains    visible
    Take Screenshot    04-material-not-found

*** Keywords ***
Get Long Enough Feedback Text
    [Documentation]    Reads the study feedback paragraph and fails unless it
    ...    is already clearly longer than the "No study plan yet..."
    ...    placeholder (11 words), so this can be retried by
    ...    Wait Until Keyword Succeeds until the real feedback has replaced
    ...    the placeholder, and returns that text once it has.
    ${text} =    Get Text    xpath=//section[@aria-label="Study feedback"]//p[1]
    ${word_count} =    Evaluate    len($text.split())
    Should Be True    ${word_count} >= 50
    ...    msg=Feedback paragraph still looks like the placeholder (${word_count} words): ${text}
    RETURN    ${text}
