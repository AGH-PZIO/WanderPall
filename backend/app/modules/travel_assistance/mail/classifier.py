import re
from dataclasses import dataclass

from app.modules.travel_assistance.mail.schemas import AttachmentInfo

KNOWN_FROM_SUBSTRINGS = (
    "booking.com",
    "airbnb",
    "ryanair",
    "wizzair",
    "lufthansa",
    "klm",
    "ryanair",
    "easyjet",
    "intercity",
    "pkp",
    "koleo",
    "blablacar",
    "uber",
    "bolt",
    "trip.com",
    "expedia",
    "hotels.com",
    "agoda",
    "skyscanner",
    "eurowings",
    "lot.com",
    "flytap",
    "emirates.com",
    "delta.com",
    "interia.pl"
)

SUBJECT_SNIPPET_KEYWORDS = (
    "boarding",
    "check-in",
    "check in",
    "itinerary",
    "e-ticket",
    "eticket",
    "flight",
    "pnr",
    "confirmation",
    "reservation",
    "booking",
    "hotel",
    "ticket",
    "bilet",
    "lot ",
    "rezerwacja",
    "potwierdzenie",
    "podróż",
    "podroz",
    "train",
    "pociąg",
    "pociag",
)

TRAVEL_MIME_HINTS = (
    "application/pdf",
    "application/vnd.apple.pkpass",
    "text/calendar",
)

TRAVEL_FILENAME_HINTS = (
    ".pdf",
    ".pkpass",
    ".ics",
    "boarding",
    "ticket",
    "itinerary",
    "invoice",
    "faktura",
    "bilet",
)


@dataclass(frozen=True)
class Classification:
    is_travel_related: bool
    category: str
    confidence: str


def _text_blob(subject: str | None, snippet: str | None, from_addr: str | None) -> str:
    parts = [subject or "", snippet or "", from_addr or ""]
    return " ".join(parts).lower()


def _score_from_known_senders(from_addr: str | None) -> int:
    if not from_addr:
        return 0
    lower = from_addr.lower()
    return 3 if any(s in lower for s in KNOWN_FROM_SUBSTRINGS) else 0


def _score_keywords(text: str) -> int:
    score = 0
    for kw in SUBJECT_SNIPPET_KEYWORDS:
        if kw in text:
            score += 2
    if re.search(r"\b[A-Z]{2}\s?\d{3,4}\b", text.upper()):
        score += 1
    return score


def _score_attachments(attachments: list[AttachmentInfo]) -> int:
    score = 0
    for att in attachments:
        fn = (att.filename or "").lower()
        mt = (att.mime_type or "").lower()
        if any(mt.startswith(h) or h in mt for h in TRAVEL_MIME_HINTS):
            score += 2
        if any(h in fn for h in TRAVEL_FILENAME_HINTS):
            score += 2
    return score


def classify_travel_message(
    *,
    from_addr: str | None,
    subject: str | None,
    snippet: str | None,
    attachments: list[AttachmentInfo],
) -> Classification:

    if not attachments:
        return Classification(
            is_travel_related=False,
            category="other",
            confidence="low",
    )

    text = _text_blob(subject, snippet, from_addr)
    score = _score_from_known_senders(from_addr) + _score_keywords(text) + _score_attachments(attachments)

    category = "other"
    lower_all = text
    if any(x in lower_all for x in ("flight", "boarding", "lot ", "wizz", "ryanair", "lufthansa", "bilet lot")):
        category = "flight"
    elif any(x in lower_all for x in ("hotel", "hostel", "airbnb", "nocleg", "pokój")):
        category = "hotel"
    elif any(x in lower_all for x in ("train", "pociąg", "pociag", "pkp", "intercity", "koleo")):
        category = "train"
    elif "car" in lower_all or "wypożycz" in lower_all or "rental" in lower_all:
        category = "car"

    if score >= 6:
        confidence = "high"
    elif score >= 3:
        confidence = "medium"
    else:
        confidence = "low"

    is_travel = score >= 3

    return Classification(
        is_travel_related=is_travel,
        category=category if is_travel else "other",
        confidence=confidence if is_travel else "low",
    )
