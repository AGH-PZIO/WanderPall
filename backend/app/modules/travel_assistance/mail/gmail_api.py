import base64
from typing import Any
import html
import re

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly"


def credentials_from_refresh_token(refresh_token: str, client_id: str, client_secret: str) -> Credentials:
    return Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret,
        scopes=[GMAIL_READONLY_SCOPE],
    )


def ensure_fresh_credentials(creds: Credentials) -> Credentials:
    if creds.expired or not creds.token:
        creds.refresh(Request())
    return creds


def build_gmail_service(creds: Credentials):
    return build("gmail", "v1", credentials=creds, cache_discovery=False)


def list_message_ids(service, *, query: str, max_results: int, page_token: str | None = None) -> dict[str, Any]:
    req = (
        service.users()
        .messages()
        .list(userId="me", q=query, maxResults=max_results, pageToken=page_token)
    )
    return req.execute()


def get_message_metadata(service, message_id: str) -> dict[str, Any]:
    return (
        service.users()
        .messages()
        .get(
            userId="me",
            id=message_id,
            format="full",
        )
        .execute()
    )


def get_attachment_body(service, message_id: str, attachment_id: str) -> bytes:
    att = (
        service.users()
        .messages()
        .attachments()
        .get(userId="me", messageId=message_id, id=attachment_id)
        .execute()
    )
    data = att.get("data") or ""
    pad = len(data) % 4
    if pad:
        data += "=" * (4 - pad)
    return base64.urlsafe_b64decode(data.encode("ascii"))


def clean_header_value(value: str) -> str:
    """Decode HTML entities and clean header values."""
    if not value:
        return ""
    # Decode HTML entities like &quot; &amp; etc.
    cleaned = html.unescape(value)
    # Remove excess whitespace
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned


def parse_email_address(value: str) -> tuple[str, str]:
    """Parse RFC 5322 email format: 'Name' <email@domain> -> (Name, email@domain)"""
    if not value:
        return "", ""

    value = clean_header_value(value)

    # Extract email and name
    email_match = re.search(r'<(.+?)>', value)
    if email_match:
        email = email_match.group(1).strip()
        # Name is everything before the email
        name = value[:email_match.start()].strip().strip('"\'')
        return name, email
    else:
        # If no angle brackets, assume it's just an email
        return "", value.strip()


def header_map(payload: dict[str, Any]) -> dict[str, str]:
    out: dict[str, str] = {}
    for h in payload.get("headers") or []:
        name = (h.get("name") or "").lower()
        if name:
            out[name] = clean_header_value(h.get("value") or "")
    return out


def collect_attachments(payload: dict) -> list[dict]:
    result = []

    def walk(part: dict):
        if not part:
            return

        filename = part.get("filename")
        body = part.get("body") or {}
        mime_type = part.get("mimeType")

        if filename and body.get("attachmentId"):
            result.append({
                "attachment_id": body["attachmentId"],
                "filename": filename,
                "mime_type": mime_type,
                "size": body.get("size"),
            })

        for p in part.get("parts", []) or []:
            walk(p)

    walk(payload)
    return result
