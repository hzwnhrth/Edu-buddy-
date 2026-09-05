*** Settings ***
Documentation     Sample notes through a full quiz to the results screen, the
...               "no weak topics yet" state after one quiz, a second quiz
...               that pushes every topic below the mastery threshold, and
...               the resulting Study and Practise loop. All tests share one
...               browser context and run in the written order, each
...               continuing where the previous one left off.
Resource          ../resources/app.resource
Suite Setup       Open App
Suite Teardown    Close Browser

*** Test Cases ***
First Quiz Reaches Last Question With Submit Gated On All Answers
    [Documentation]    Starts a quiz from the sample notes, checks the
    ...    progress heading and that Back is disabled on question one,
    ...    answers questions 1-9 with the first option, and confirms Submit
    ...    stays disabled on question 10 until it too has an answer.
    ${material_url} =    Open Sample Notes From Dashboard
    Set Suite Variable    ${MATERIAL_URL}    ${material_url}

    Start Quiz From Topics Page
    Get Url    contains    /quiz?quiz=
    Wait For Elements State    text=Question 1 of 10    visible    timeout=15s
    Get Element States    "Back"    contains    disabled

    FOR    ${question_number}    IN RANGE    1    10
        Click    role=button >> nth=0
        Click    "Next"
    END
    Wait For Elements State    text=Question 10 of 10    visible    timeout=15s
    Get Element States    "Submit"    contains    disabled
    Click    role=button >> nth=0
    Get Element States    "Submit"    contains    enabled
    Take Screenshot    02-quiz-last-question-ready-to-submit

First Results Show Thirty Percent And No Weak Topics Yet
    [Documentation]    Submits the quiz from the previous test and checks the
    ...    score, the topic bars, the question review list, and that with
    ...    only one quiz behind it no topic has enough answers yet to be
    ...    flagged weak.
    Submit Quiz
    Get Url    contains    /results?attempt=
    Wait For Elements State    h1    visible    timeout=15s

    # The mock always answers correctly at options 0, 4 and 8 (0-based) of
    # ten when every choice is option 1, so this first attempt scores
    # exactly 30%; no per-topic mastery lands on 30% too (they land on 0%
    # or 50%), so the text "30%" is unambiguous on this page.
    Wait For Elements State    text="30%"    visible    timeout=20s

    ${topic_bar_count} =    Get Element Count    css=[role="progressbar"]
    Should Be Equal As Integers    ${topic_bar_count}    5
    ...    msg=Expected five topic bars under Topics.

    ${question_count} =    Get Element Count    css=summary
    Should Be Equal As Integers    ${question_count}    10
    ...    msg=Expected ten collapsed questions under Question review.

    # Every question's "Your answer: ..." line is present in the DOM even
    # while its <details> is collapsed (only hidden visually), so all ten
    # contain that text and a text-based locator hits a strict-mode
    # violation. Reading the first <details> element's own text and
    # checking its content instead scopes this to exactly the one just
    # expanded ("li" alone is not specific enough: the Topics section above
    # this one also renders its five topic bars as a <ul> of <li>, so a bare
    # "li >> nth=0" resolves to the first topic bar instead; "details" is
    # unique to the question review cards).
    Click    css=summary >> nth=0
    ${first_question_text} =    Get Text    css=details >> nth=0
    Should Contain    ${first_question_text}    Your answer:

    Wait For Elements State    text="No weak topics this time."    visible
    Get Element States    "Study weak topics"    contains    disabled
    Get Element States    "Practise weak topics"    contains    disabled
    Take Screenshot    02-first-results-thirty-percent-no-weak-topics

Second Quiz Produces A Weak Topic
    [Documentation]    Goes back to the topics page for the same material by
    ...    its stored URL, runs a second full quiz the same way, and checks
    ...    that accumulated wrong answers now flag at least one topic as
    ...    weak, enabling "Study weak topics".
    Go To    ${MATERIAL_URL}
    Wait For Elements State    "Start quiz"    visible    timeout=15s

    Start Quiz From Topics Page
    Answer Every Question Choosing Option    1
    Submit Quiz
    Get Url    contains    /results?attempt=
    # The Topics heading only renders once the attempt data has actually
    # arrived (there is no placeholder state for it, unlike the page's own
    # h1), so waiting for it first is what actually waits for the topic
    # bars, and the Weak badges inside them, to be there to count.
    Wait For Elements State    text="Topics"    visible    timeout=20s

    ${weak_badge_count} =    Get Element Count    "Weak"
    Should Be True    ${weak_badge_count} >= 1
    ...    msg=Expected at least one Weak badge after a second quiz.
    Get Element States    "Study weak topics"    contains    enabled
    Take Screenshot    02-second-results-weak-topic-present

Study Weak Topic Then Practise It
    [Documentation]    Follows "Study weak topics" to the explanation for the
    ...    weakest topic, checks the explanation, key points and actions are
    ...    all present, then follows "Practise this topic" to a five
    ...    question quiz.
    Click    "Study weak topics"
    Wait Until Url Contains    /study/
    # The study page's h1 has a fixed placeholder ("Study this topic") while
    # the explanation is still loading, so it becomes visible immediately
    # and does not by itself prove the explanation arrived. "Key points"
    # only renders as part of that same data, so waiting for it first is
    # what actually waits for the explanation paragraphs to be there to
    # count.
    Wait For Elements State    text="Key points"    visible    timeout=20s

    ${paragraph_count} =    Get Element Count    xpath=//p[string-length(normalize-space(text()))>50]
    Should Be True    ${paragraph_count} >= 1
    ...    msg=Expected at least one explanation paragraph.

    ${key_point_count} =    Get Element Count
    ...    xpath=//h3[normalize-space(text())="Key points"]/following-sibling::ul[1]/li
    Should Be True    ${key_point_count} >= 3
    ...    msg=Expected at least three key points.

    Get Element States    "Regenerate"    contains    visible
    Get Element States    "Practise this topic"    contains    visible
    Take Screenshot    02-study-explanation

    Click    "Practise this topic"
    Wait Until Url Contains    /quiz?quiz=
    Wait For Elements State    text=Question 1 of 5    visible    timeout=15s
    Take Screenshot    02-practise-topic-quiz-five-questions
