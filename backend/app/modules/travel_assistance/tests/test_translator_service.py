import pytest

from app.modules.travel_assistance.translator import service as translator_service


def test_validate_language_code() -> None:
    assert translator_service.validate_language_code("en") is True
    assert translator_service.validate_language_code("pl") is True
    assert translator_service.validate_language_code("xx") is False


def test_get_supported_languages_returns_copy() -> None:
    langs1 = translator_service.get_supported_languages()
    langs1["xx"] = "Fake"
    langs2 = translator_service.get_supported_languages()
    assert "xx" not in langs2


@pytest.mark.anyio
async def test_translate_text_returns_same_text_for_same_language() -> None:
    out = await translator_service.translate_text("hello", "en", "en")
    assert out == "hello"


@pytest.mark.anyio
async def test_translate_text_rejects_unsupported_languages() -> None:
    with pytest.raises(ValueError):
        await translator_service.translate_text("hello", "xx", "en")
    with pytest.raises(ValueError):
        await translator_service.translate_text("hello", "en", "xx")


@pytest.mark.anyio
async def test_translate_text_uses_translator_and_returns_text(monkeypatch: pytest.MonkeyPatch) -> None:
    class _FakeTranslated:
        def __init__(self, text: str) -> None:
            self.text = text

    class _FakeTranslator:
        async def translate(self, text: str, src: str, dest: str):
            assert text == "hello"
            assert src == "en"
            assert dest == "pl"
            return _FakeTranslated("cześć")

    monkeypatch.setattr(translator_service, "translator", _FakeTranslator())

    out = await translator_service.translate_text("hello", "en", "pl")
    assert out == "cześć"


@pytest.mark.anyio
async def test_translate_text_wraps_unexpected_errors(monkeypatch: pytest.MonkeyPatch) -> None:
    class _BoomTranslator:
        async def translate(self, text: str, src: str, dest: str):
            raise RuntimeError("boom")

    monkeypatch.setattr(translator_service, "translator", _BoomTranslator())

    with pytest.raises(RuntimeError) as exc:
        await translator_service.translate_text("hello", "en", "pl")
    assert "Translation error" in str(exc.value)

