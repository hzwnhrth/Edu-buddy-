*** Settings ***
Documentation     The scanned-PDF fallback on the Upload screen (Phase 3): a
...               PDF with no extractable text still fills the title from its
...               file name, shows the "no readable text" message instead of
...               a character count, and on submit is sent to
...               /api/analyze-pdf instead of /api/analyze. The mock AI
...               builds four topics from the file name, which the Topics
...               page then shows.
Resource          ../resources/app.resource
Suite Setup       Open App
Suite Teardown    Close Browser

*** Variables ***
${SCANNED_PDF}      ${APP_DIR}${/}robot${/}data${/}scanned.pdf

*** Test Cases ***
Scanned PDF Warns Then Analyses Into File Name Topics
    [Documentation]    Uploading data/scanned.pdf (429 bytes, one page, zero
    ...    extractable characters) shows the exact "no readable text" message
    ...    from UploadForm instead of a character count, fills the title from
    ...    the file name ("scanned.pdf" minus its extension), and leaves
    ...    "Analyse notes" enabled without needing any pasted text. Clicking
    ...    it lands on the Topics page whose h1 is that title and which shows
    ...    the four "<Base>: <suffix>" topics the mock builds from the file
    ...    name ("Scanned", the title-cased base) when there is nothing
    ...    readable to extract.
    Go To    ${BASE_URL}/upload
    Wait For Elements State    css=input[type="file"]    attached    timeout=15s
    Upload File By Selector    css=input[type="file"]    ${SCANNED_PDF}

    Wait For Elements State
    ...    text="No readable text was found in this PDF. The PDF itself will be sent for reading when you analyse it."
    ...    visible    timeout=15s
    Get Text    id=title    ==    scanned
    Get Element States    "Analyse notes"    contains    enabled
    Take Screenshot    05-scanned-pdf-message

    Click    "Analyse notes"
    Wait Until Url Contains    /notes/
    Wait For Elements State    h1    visible    timeout=15s
    Get Text    h1    ==    scanned

    ${checkbox_count} =    Get Element Count    css=input[type="checkbox"]
    Should Be Equal As Integers    ${checkbox_count}    4
    ...    msg=Expected the four file-name topics the mock builds for a scanned PDF.
    Wait For Elements State    text="Scanned: overview"    visible
    Wait For Elements State    text="Scanned: key terms"    visible
    Wait For Elements State    text="Scanned: how it works"    visible
    Wait For Elements State    text="Scanned: common mistakes"    visible
    Take Screenshot    05-scanned-pdf-topics
