*** Settings ***
Documentation     A phone-width (375x812) walk across every screen: dashboard
...               empty state, sample notes to Topics, Start quiz to Quiz,
...               submit to Results, then Upload. Each screen is checked with
...               the same JavaScript rule the brief specifies,
...               document.documentElement.scrollWidth <= window.innerWidth,
...               through the Browser library's own "Evaluate JavaScript"
...               keyword (see Browser/keywords/evaluation.py under the
...               robotframework-browser package's own install location,
...               reachable by importing Browser from Python and reading its
...               __file__, for that keyword's signature: a blank first
...               argument runs the script on the page itself rather than on
...               one found element). All tests share one browser context and
...               run in the written order.
Resource          ../resources/app.resource
Suite Setup       Open App    viewport={'width': 375, 'height': 812}
Suite Teardown    Close Browser

*** Test Cases ***
Dashboard Empty State Fits Phone Width
    Go To    ${BASE_URL}
    Wait For Elements State    h1    visible    timeout=15s
    Wait For Elements State    text="No notes yet"    visible    timeout=15s
    Page Must Not Scroll Sideways
    Take Screenshot    07-dashboard-empty-state

Sample Notes Topics Page Fits Phone Width
    Open Sample Notes From Dashboard
    Wait For Elements State    h1    visible    timeout=15s
    Wait For Elements State    "Start quiz"    visible    timeout=15s
    Page Must Not Scroll Sideways
    Take Screenshot    07-topics

Quiz Page Fits Phone Width
    Start Quiz From Topics Page
    Wait For Elements State    text=Question 1 of 10    visible    timeout=15s
    Page Must Not Scroll Sideways
    Take Screenshot    07-quiz

Results Page Fits Phone Width
    Answer Every Question Choosing Option    1
    Submit Quiz
    Wait For Elements State    h1    visible    timeout=15s
    Page Must Not Scroll Sideways
    Take Screenshot    07-results

Upload Page Fits Phone Width
    Go To    ${BASE_URL}/upload
    Wait For Elements State    id=title    visible    timeout=15s
    Page Must Not Scroll Sideways
    Take Screenshot    07-upload

*** Keywords ***
Page Must Not Scroll Sideways
    [Documentation]    Fails unless the document is no wider than the
    ...    viewport, i.e. nothing forces horizontal scrolling at 375px.
    ...    Passing an empty first argument to Evaluate JavaScript runs the
    ...    given script on the page rather than on one located element (the
    ...    keyword's ``selector`` argument is optional; an empty string takes
    ...    the same "whole page" branch as leaving it out, confirmed by
    ...    reading the keyword's implementation).
    ${fits} =    Evaluate JavaScript    ${EMPTY}
    ...    document.documentElement.scrollWidth <= window.innerWidth
    Should Be True    ${fits}    msg=Page is wider than the 375px viewport (horizontal scroll).
