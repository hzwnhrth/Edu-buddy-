*** Settings ***
Documentation     Builds and starts EduBuddy once for every suite under this
...               directory, in forced mock mode (no secrets needed), and
...               stops it again after the last suite finishes. Individual
...               suite files each open their own browser context against
...               the one running server; see app.resource.
...
...               The Browser library's own output directory (traces,
...               videos, and the default location for Take Screenshot) is
...               not set explicitly here because it does not need to be:
...               Browser always saves under Robot Framework's own
...               ${OUTPUTDIR}, so running the suite with
...               "--outputdir robot/results" (as robot/README.md and the
...               "test:e2e" npm script both do) already keeps every Browser
...               artifact under robot/results.
Resource          ../resources/app.resource
Suite Setup       Build App And Start App
Suite Teardown    Stop App

*** Keywords ***
Build App And Start App
    Build App
    Start App
