Zaimplementuj nowy design language dla całego projektu WanderPall!
Zmiany UI dotyczą tylko frontendu (ostrzeż jeśli jest inaczej)
Zmień kod tak, by strony miały całą funkcjonalność ale w nowym wyglądzie.

Zapisz obecną stronę w jakimś folderze (np frontend/legacy), by dało się porównać/wrócić zmiany.

Zastosuj design language użyty w [demo C1](../demo/C1/).
niech strona startowa wygląda tak, jak w C1.
Niech przycisk "W drogę" przenosi do strony tworzącej konto.
niech przycisk "przejrzyj projekt" przenosi do strony z listą modułów i autorami (obecnie to jest strona startowa). 

Po zalogowaniu się otwórz stronę z twoim dashboardem i nawigacją do wyboru.
Utwórz strony tak, by ich drzewko w głównym flow (nie w trybie deweloperskim) przypominało to z tree.md.

Przetestuj działanie.
Jeśli działa - zaktualizuj dokumentację itp.

---

## Status implementacji (2026-05-29)

Zaimplementowano w `frontend/`:

- Design language C1 (Together) — tokeny, layout, komponenty w `frontend/src/shared/design/`
- Strona startowa `/` — hero C1 z animacją i wideo; **W drogę!** → `/register`; **Przejrzyj projekt** → `/projects`
- Po logowaniu przekierowanie na `/dashboard` z nawigacją boczną (Dashboard, Trips, Groups, Guides, Journal, Tools, Account)
- Drzewo tras zgodne z `tree.md` (moduły zmapowane: maps→trips, travel-buddies→groups, travel-assistance→guides/tools)
- Stary UI zachowany w `frontend/legacy/` do porównania
- Przekierowania ze starych URL (`/travel-assistance`, `/travel-buddies`, `/maps`, `/account/login`, …)

Testy: `npm run lint` i `npm run build` w `frontend/` — OK.