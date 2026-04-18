import { useCallback, useState } from "react";
import { apiClient } from "../../../shared/api-client";
import type { components } from "../../../shared/api-types";

type TranslateResponse = components["schemas"]["TranslateResponse"];
type SupportedLanguagesResponse = components["schemas"]["SupportedLanguagesResponse"];

export function useTranslator() {
  const [translatedText, setTranslatedText] = useState<string>("");
  const [languages, setLanguages] = useState<SupportedLanguagesResponse["languages"]>([]);
  const [loading, setLoading] = useState(false);

  const translate = useCallback(
    async (text: string, source: string, target: string) => {
      if (!text) return;

      setLoading(true);

      const res = await apiClient.POST("/travel-assistance/translator/translate", {
        body: {
          text,
          source_language: source,
          target_language: target
        }
      });

      if (!res.error && res.data) {
        const data = res.data as TranslateResponse;
        setTranslatedText(data.translated_text);
      } else {
        setTranslatedText("Error");
      }

      setLoading(false);
    },
    []
  );

  const fetchLanguages = useCallback(async () => {
    const res = await apiClient.GET("/travel-assistance/translator/supported-languages", {});

    if (!res.error && res.data) {
      const data = res.data as SupportedLanguagesResponse;
      setLanguages(data.languages);
    }
  }, []);

  return {
    translatedText,
    languages,
    loading,
    translate,
    fetchLanguages
  };
}