from googletrans import Translator

# singleton (ważne – nie twórz za każdym razem)
translator = Translator()

SUPPORTED_LANGUAGES = {
    "en": "English",
    "pl": "Polish",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "ru": "Russian",
    "ja": "Japanese",
    "zh-cn": "Chinese",
    "ko": "Korean",
    "ar": "Arabic",
    "tr": "Turkish",
    "nl": "Dutch",
    "sv": "Swedish",
    "no": "Norwegian",
    "fi": "Finnish",
    "da": "Danish",
}


def validate_language_code(language_code: str) -> bool:
    return language_code in SUPPORTED_LANGUAGES


def get_supported_languages() -> dict[str, str]:
    return SUPPORTED_LANGUAGES.copy()


async def translate_text(
    text: str,
    source_language: str,
    target_language: str,
) -> str:
    if not validate_language_code(source_language):
        raise ValueError(f"Unsupported source language: {source_language}")
    if not validate_language_code(target_language):
        raise ValueError(f"Unsupported target language: {target_language}")

    if source_language == target_language:
        return text

    if not text:
        return "Unknown"

    try:
        translated = await translator.translate(
            text,
            src=source_language,
            dest=target_language,
        )

        return translated.text or "Unknown"

    except Exception as exc:
        raise RuntimeError(f"Translation error: {type(exc).__name__}: {exc}") from exc