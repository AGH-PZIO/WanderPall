from app.modules.travel_assistance.mail.classifier import classify_travel_message
from app.modules.travel_assistance.mail.schemas import AttachmentInfo


def test_classifier_rejects_without_attachments() -> None:
    c = classify_travel_message(
        from_addr="booking.com <noreply@booking.com>",
        subject="Your booking confirmation",
        snippet="Thanks for booking",
        attachments=[],
    )
    assert c.is_travel_related is False
    assert c.category == "other"
    assert c.confidence == "low"


def test_classifier_accepts_travel_like_pdf_attachment() -> None:
    c = classify_travel_message(
        from_addr="noreply@ryanair.com",
        subject="Boarding pass for your flight",
        snippet="Flight FR 1234",
        attachments=[
            AttachmentInfo(
                attachment_id="att1",
                filename="boarding-pass.pdf",
                mime_type="application/pdf",
                size=123,
            )
        ],
    )
    assert c.is_travel_related is True
    assert c.category in {"flight", "other"}  # depends on keyword hits
    assert c.confidence in {"medium", "high"}


def test_classifier_detects_train_keywords_and_ics_attachment() -> None:
    c = classify_travel_message(
        from_addr="intercity@pkp.pl",
        subject="Bilet na pociąg - rezerwacja",
        snippet="Twoja podróż pociąg IC",
        attachments=[
            AttachmentInfo(
                attachment_id="att1",
                filename="ticket.ics",
                mime_type="text/calendar",
                size=321,
            )
        ],
    )
    assert c.is_travel_related is True
    assert c.category == "train"

