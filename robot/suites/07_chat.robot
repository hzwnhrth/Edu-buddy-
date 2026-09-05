*** Settings ***
Documentation     The AI Tutor chat on a fresh profile: the empty state with
...               its suggestions, sending a message and getting the mock's
...               deterministic reply, the history surviving a page reload
...               through GET /api/chat, "Clear" emptying it again, and the
...               study-context pill once a material is active. All tests
...               share one browser context and run in the written order.
Resource          ../resources/app.resource
Suite Setup       Open App
Suite Teardown    Close Browser

*** Test Cases ***
Chat Sends A Message And Gets A Deterministic Reply
    [Documentation]    With no active material the chat opens on its empty
    ...    state with suggestion buttons; sending a message shows the user
    ...    bubble and then a substantive assistant reply (the mock always
    ...    answers with the same general study help, at least 40
    ...    characters).
    Go To    ${BASE_URL}/chat
    Wait For Elements State    text="How can I help you study?"    visible    timeout=15s
    Wait For Elements State    text="Explain the main concepts from my notes"    visible    timeout=15s
    Get Element States    css=.chat-input    contains    visible
    Fill Text    css=.chat-input    What is a packet?
    Click    css=.chat-input-container .btn-primary
    Wait For Elements State    css=.chat-message.user    visible    timeout=10s
    Get Text    css=.chat-message.user    contains    What is a packet?
    ${reply} =    Wait Until Keyword Succeeds    20s    0.5s    Get Nonempty Tutor Reply
    Take Screenshot    07-chat-reply

Chat History Survives A Reload
    [Documentation]    Reloading the page loads the stored history through
    ...    GET /api/chat, so both the question and the reply reappear, and
    ...    the "Clear" button is available.
    Reload
    Wait For Elements State    css=.chat-message.user    visible    timeout=20s
    ${user_count} =    Get Element Count    css=.chat-message.user
    Should Be Equal As Integers    ${user_count}    1
    ...    msg=Expected the stored user message to reappear after reload.
    ${reply} =    Wait Until Keyword Succeeds    20s    0.5s    Get Nonempty Tutor Reply
    Get Element States    "Clear"    contains    visible
    Take Screenshot    07-chat-history-after-reload

Clear Empties The Chat
    [Documentation]    Clicking "Clear" empties the message list (and the
    ...    server-side history), brings the empty state back, and removes
    ...    the "Clear" button itself.
    Click    "Clear"
    Wait For Elements State    text="How can I help you study?"    visible    timeout=10s
    ${messages} =    Get Element Count    css=.chat-message
    Should Be Equal As Integers    ${messages}    0
    ...    msg=Expected no chat messages after Clear.
    ${clear_count} =    Get Element Count    "Clear"
    Should Be Equal As Integers    ${clear_count}    0
    ...    msg=Expected the Clear button to disappear after Clear.
    Take Screenshot    07-chat-cleared

Chat Shows The Study Context Pill With An Active Material
    [Documentation]    After loading the sample notes (which store the
    ...    active material id), the chat shows its green "Study context
    ...    loaded" pill naming that material.
    Go To    ${BASE_URL}/dashboard
    Wait For Elements State    "Try sample notes"    visible    timeout=15s
    Click    "Try sample notes"
    Wait Until Url Contains    /notes?material=
    Go To    ${BASE_URL}/chat
    Wait For Elements State    text=Study context loaded    visible    timeout=20s
    Take Screenshot    07-chat-context-pill

*** Keywords ***
Get Nonempty Tutor Reply
    [Documentation]    Reads the assistant bubble's text and fails while it
    ...    is still the typing indicator (or while the reply has not
    ...    landed), so this can be retried by Wait Until Keyword Succeeds
    ...    until the deterministic reply is on screen. Returns that text
    ...    once it is at least 40 characters long.
    ${text} =    Get Text    css=.chat-message.assistant
    Should Be True    len($text) >= 40
    ...    msg=Assistant bubble still empty or too short: '${text}'
    RETURN    ${text}
