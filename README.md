# Moje Audio v2 — prywatna aplikacja PWA

## Co nowego
- Tworzenie katalogów, np. „Lekcje”, „Audiobooki”.
- Import MP3/MP4 do aktualnie wybranego katalogu.
- Odtwarzanie katalogu kolejno od pierwszego do ostatniego i zapętlenie od początku.
- Przyciski poprzednie/następne oraz zmiana kolejności przyciskami ↑ ↓.
- Przenoszenie plików między katalogami (opcja „Przenieś”).
- Usunięcie katalogu przenosi pliki do „Bez katalogu”; nie usuwa samych plików.
- Aktualizacja poprzedniej bazy IndexedDB z wersji 1 do 2. Stare nagrania pozostają w „Bez katalogu”.

## Aktualizacja GitHub Pages
1. Rozpakuj archiwum ZIP.
2. W repozytorium semioticsolutions/moje-audio wgraj pliki z folderu (nie folder nadrzędny): index.html, app.js, style.css, sw.js, manifest.webmanifest, icon.svg. Zastąp stare wersje. Możesz również wgrać ten README.
3. Zatwierdź zmiany (Commit changes) i poczekaj na zakończenie publikacji w Actions / Pages.
4. Zamknij i otwórz ponownie aplikację na iPhonie. W przypadku starej wersji zamknij ją całkowicie i uruchom ponownie. Service Worker ma nową wersję cache v2.
5. Nie usuwaj aplikacji z ekranu początkowego i nie czyść danych Safari, jeśli masz w niej nagrania.

## Odtwarzanie
- Wybierz katalog i kliknij „Odtwarzaj katalog w pętli”, aby rozpocząć od pierwszego pliku.
- Po końcu pliku automatycznie rozpocznie się kolejny z tego samego katalogu. Po ostatnim będzie pierwszy.
- Kliknięcie pojedynczego nagrania zaczyna od niego, a potem kontynuuje w tym samym katalogu.
- Zmiana katalogu na ekranie nie zmienia aktualnej kolejki; nową pętlę uruchom przyciskiem w wybranym katalogu.
- Odtwarzanie w tle jest zależne od Safari/iOS i nie jest gwarantowane.

## Ważne
Pliki i ich postęp są zapisywane w lokalnym IndexedDB iPhone'a. GitHub przechowuje jedynie kod aplikacji. Zachowaj kopie nagrań poza PWA. Nie wyłączaj/nie usuwaj PWA, nie czyść danych witryny i nie używaj prywatnej karty Safari do biblioteki.
