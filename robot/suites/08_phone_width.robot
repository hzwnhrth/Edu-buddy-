*** Settings ***
Documentation     A phone-width (375x812) walk across every screen: landing,
...               dashboard empty state, Notes Generator, Quiz Arena start
...               screen, Progress and Chat, each checked with the same
...               rule, document.documentElement.scrollWidth <=
...               window.innerWidth, and the hamburger flow: the navbar
...               button opens the sidebar, a nav item click navigates and
...               closes it again. All tests share one browser context and
...               run in the written order.
Resource          ../resources/app.resource
Suite Setup       Open App    viewport={'width': 375, 'height': 812}
Suite Teardown    Close Browser

*** Test Cases ***
Landing Fits Phone Width
    Go To    ${BASE_URL}
    Wait For Elements State    h1    visible    timeout=15s
    Page Must Not Scroll Sideways
    Take Screenshot    08-landing

Dashboard Empty State Fits Phone Width
    Go To    ${BASE_URL}/dashboard
    Wait For Elements State    text="No notes yet"    visible    timeout=15s
    Page Must Not Scroll Sideways
    Take Screenshot    08-dashboard

Notes Generator Fits Phone Width
    Go To    ${BASE_URL}/notes
    Wait For Elements State    id=title    visible    timeout=15s
    Page Must Not Scroll Sideways
    Take Screenshot    08-notes

Quiz Start Screen Fits Phone Width
    [Documentation]    The quiz start screen is now the deck picker; that
    ...    is what this waits for before measuring.
    Go To    ${BASE_URL}/quiz
    Wait For Elements State    text="Select a topic deck"    visible    timeout=15s
    Page Must Not Scroll Sideways
    Take Screenshot    08-quiz

Progress Fits Phone Width
    Go To    ${BASE_URL}/progress
    Wait For Elements State    text="Your Progress"    visible    timeout=15s
    Page Must Not Scroll Sideways
    Take Screenshot    08-progress

Chat Fits Phone Width
    Go To    ${BASE_URL}/chat
    Wait For Elements State    text="How can I help you study?"    visible    timeout=15s
    Page Must Not Scroll Sideways
    Take Screenshot    08-chat

Hamburger Opens Sidebar And A Nav Click Navigates And Closes It
    [Documentation]    Below 768px the navbar shows its hamburger button
    ...    (aria-label "Toggle navigation"). Clicking it slides the
    ...    sidebar in (the aside gains its "open" class; Playwright would
    ...    call the off-canvas sidebar "visible" either way, so the class
    ...    is what this asserts on). Clicking the Dashboard nav item then
    ...    navigates to /dashboard and closes the sidebar again.
    Go To    ${BASE_URL}/notes
    Wait For Elements State    id=title    visible    timeout=15s
    Get Element States    css=[aria-label="Toggle navigation"]    contains    visible
    Wait Until Keyword Succeeds    5s    0.3s    Sidebar Class Is Closed
    Click    css=[aria-label="Toggle navigation"]
    Wait Until Keyword Succeeds    5s    0.3s    Sidebar Class Contains Open
    Get Element States    css=.sidebar-nav .nav-item >> nth=0    contains    visible
    Take Screenshot    08-sidebar-open
    Click    css=.sidebar-nav .nav-item >> nth=0
    Wait Until Url Contains    /dashboard
    Wait Until Keyword Succeeds    5s    0.3s    Sidebar Class Is Closed
    Take Screenshot    08-sidebar-closed

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

Sidebar Class Contains Open
    [Documentation]    Fails unless the sidebar aside currently carries its
    ...    "open" class, i.e. it has slid into view.
    ${class} =    Get Attribute    css=.sidebar    class
    Should Contain    ${class}    open    msg=Expected the sidebar to be open (class '${class}').

Sidebar Class Is Closed
    [Documentation]    Fails unless the sidebar aside has lost its "open"
    ...    class again.
    ${class} =    Get Attribute    css=.sidebar    class
    Should Not Contain    ${class}    open    msg=Expected the sidebar to be closed (class '${class}').
