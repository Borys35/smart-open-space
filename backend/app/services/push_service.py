import json
from urllib.request import Request, urlopen
from urllib.error import URLError

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def send_push_notification(
    push_token: str,
    title: str,
    body: str,
    data: dict | None = None,
):
    payload = {
        "to": push_token,
        "title": title,
        "body": body,
        "priority": "high",
    }

    if data:
        payload["data"] = data

    req = Request(
        EXPO_PUSH_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )

    try:
        urlopen(req, timeout=5)
    except URLError:
        pass
