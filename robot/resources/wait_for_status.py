"""Polls EduBuddy's GET /api/status once and checks it reports mock mode.

Used by the "Start App" keyword in app.resource, through the Process
library, so that keyword does not need RequestsLibrary or an open browser
just to find out whether the server has finished starting. Standard library
only, run as "py wait_for_status.py <url>".

Exit code 0 means the endpoint answered 200 with ai "mock" and store
"memory". Any other outcome (connection refused, non-200 status, wrong
values, bad JSON) exits 1 and prints why, so Wait Until Keyword Succeeds can
retry until the server is ready.
"""

import json
import sys
import urllib.error
import urllib.request

DEFAULT_URL = "http://localhost:3105/api/status"


def main() -> int:
    url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_URL

    try:
        with urllib.request.urlopen(url, timeout=5) as response:
            status = response.status
            body = response.read().decode("utf-8")
    except (urllib.error.URLError, OSError) as exc:
        print(f"status endpoint not reachable yet: {exc}")
        return 1

    if status != 200:
        print(f"status endpoint returned HTTP {status}: {body}")
        return 1

    try:
        data = json.loads(body)
    except json.JSONDecodeError as exc:
        print(f"status endpoint did not return valid JSON: {exc}: {body}")
        return 1

    if data.get("ai") != "mock" or data.get("store") != "memory":
        print(f"status endpoint reported {data!r}, expected ai=mock and store=memory")
        return 1

    print(f"status endpoint OK: {data!r}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
