# Ikony WanderPall — dokumentacja

Specyfikacja ikon dla frontendu WanderPall, oparta na audycie istniejącego kodu (`frontend/src/`).

## Pliki

| Plik | Zawartość |
|------|-----------|
| [inventory.md](./inventory.md) | Co już jest w aplikacji (emoji, Unicode, SVG) — moduł po module |
| [specification.md](./specification.md) | Konkretna specyfikacja: biblioteka, rozmiary, tokeny, mapowanie nazw |

## Stan obecny (skrót)

Aplikacja **nie ma spójnego systemu ikon**. Używa:

- **emoji** — głównie Travel Assistance, Maps, Travel Buddies,
- **znaków Unicode** — `✕`, `←`, `✓`, `✎`, `⬇`, `+`,
- **jednego SVG** — kosz (`maps-icon-trash`) w module Maps,
- **samych etykiet tekstowych** — Account, zakładki Buddies, strona główna App.

## Rekomendacja

Wdrożyć zestaw **Lucide React** (`lucide-react`) zgodnie ze [specification.md](./specification.md). Emoji zastąpić ikonami SVG w Tier 1 i Tier 2; reakcje (Tier 3) mogą pozostać emoji.

## Priorytety wdrożenia

1. **Tier 1** — akcje globalne + kategorie map + kafelki Travel Assistance
2. **Tier 2** — Account, home App, zakładki Buddies, edytor przewodnika
3. **Tier 3** — reakcje emoji (opcjonalna migracja)
