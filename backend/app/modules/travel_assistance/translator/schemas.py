from pydantic import BaseModel, Field


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Text to translate")
    source_language: str = Field(..., description="Source language code (e.g., 'en', 'pl')")
    target_language: str = Field(..., description="Target language code (e.g., 'es', 'fr')")


class TranslateResponse(BaseModel):
    original_text: str
    translated_text: str
    source_language: str
    target_language: str


class SupportedLanguage(BaseModel):
    code: str
    name: str


class SupportedLanguagesResponse(BaseModel):
    languages: list[SupportedLanguage]
