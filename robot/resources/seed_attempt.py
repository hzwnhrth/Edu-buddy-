"""Seeds one graded quiz attempt for the Robot suites (see the
"Seed Graded Quiz Attempt" keyword in app.resource).

Standard library only, like wait_for_status.py. Takes the app base URL, the
browser profile id and the active material id, generates a 10-question quiz
through POST /api/quiz, and submits an attempt through POST /api/attempt
answering option 1 on every question (3 of 10 correct with the mock AI's
deterministic sample quiz). Prints the stored attempt id on success; any HTTP
error raises and exits non-zero.
"""

import json
import sys
import urllib.request


def post(path: str, body: dict, profile_id: str) -> dict:
    request = urllib.request.Request(
        f"{path}",
        data=json.dumps(body).encode(),
        headers={"x-profile-id": profile_id, "content-type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode())


def main() -> int:
    base_url, profile_id, material_id = sys.argv[1], sys.argv[2], sys.argv[3]
    quiz = post(f"{base_url}/api/quiz", {"materialId": material_id, "count": 10, "difficulty": "medium"}, profile_id)["quiz"]
    answers = [{"qid": question["qid"], "chosenIndex": 0} for question in quiz["questions"]]
    attempt = post(f"{base_url}/api/attempt", {"quizId": quiz["id"], "answers": answers}, profile_id)
    print(attempt["attempt"]["id"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
