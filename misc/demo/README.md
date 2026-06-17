# WanderPall Design Demos

Ten folder zawiera 10 samodzielnych konwencji design language dla frontendu WanderPall.

Dokumentacja ikon aplikacji: [`icons/`](./icons/) — inwentaryzacja stanu obecnego i specyfikacja (Lucide, rozmiary, mapowanie).

Każda konwencja ma opis zasad w `overview.md` oraz statyczne demo w `demo/`:

| Konwencja | Charakter | Demo |
| --- | --- | --- |
| `1` Horizon | spokojny travel workspace z sidebarem i akcentem teal | `designs/1/demo/index.html` |
| `2` Meridian | cieply, plaski interfejs z gorna nawigacja i akcentem terracotta | `designs/2/demo/index.html` |
| `3` Atlas | techniczny, mapowy interfejs z akcentem indigo | `designs/3/demo/index.html` |
| `4` Drift | miekki, przestronny interfejs z floating nav i akcentem blue | `designs/4/demo/index.html` |
| `5` Slate | redakcyjny minimalizm z waskim sidebarem i akcentem amber | `designs/5/demo/index.html` |
| `6` Compass Ops | operacyjny command center z lewa szyna narzedzi | `designs/6/demo/index.html` |
| `7` Postcard | magazynowy, wizualny widok z pelnoekranowym medium | `designs/7/demo/index.html` |
| `8` Logbook | terminalowy dziennik trasy, decyzji i statusow | `designs/8/demo/index.html` |
| `9` Gather | mobile-first social feed dla ekip podrozniczych | `designs/9/demo/index.html` |
| `10` Boarding | planner inspirowany biletami i check-inem | `designs/10/demo/index.html` |
| `C1` Together | landing wideo + app shell (teal + brown), topbar i sidebar | `designs/C1/demo/index.html` |

Kazde demo sklada sie z:

- `index.html` - strona startowa/dashboard,
- `trips.html` - lista planow podrozy,
- `detail.html` - szczegoly wyjazdu,
- `components.html` - przeglad komponentow UI.

Konwencja **C1 Together** ma dodatkowo landing bez sidebara (`index.html`), panel aplikacji (`dashboard.html`) i strony narzedzi. Opis: [`C1/overview.md`](./C1/overview.md).

Wszystkie dema wspieraja tryb jasny i ciemny przez przelacznik w nawigacji. Preferencja jest zapisywana w `localStorage`.

Uruchomienie: otworz wybrany plik `demo/index.html` bezposrednio w przegladarce.
