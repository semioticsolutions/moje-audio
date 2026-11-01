# Moje Audio v4 — poprawka nawigacji nagrań

Wersja v3 zapisywała cały rekord wraz z dużym plikiem Blob przy każdej aktualizacji pozycji odtwarzania. Safari/iOS może wtedy zgłosić `error preparing blob/file data to be stored in object store`.

Wersja v4 zapisuje pozycję w osobnym magazynie IndexedDB `progress`. Istniejący magazyn `tracks` i pliki pozostają nietknięte podczas aktualizacji schematu 2 → 3. Odczyt postępu ma zgodność wsteczną ze starym polem `position`.

## Instalacja
1. Rozpakuj ZIP. Wgraj **pliki z archiwum**, nie sam ZIP, do głównego katalogu repozytorium.
2. Commit changes i sprawdź zielony status deployment w GitHub Actions.
3. Otwórz stronę w Safari i ponownie uruchom istniejącą PWA. Na dole powinien być napis `Moje Audio v4`.
4. Sprawdź przełączanie następnego/poprzedniego nagrania i zapamiętywanie pozycji.

**Nie usuwaj zainstalowanej PWA, nie czyść danych Safari i nie usuwaj bazy IndexedDB.** Przed testami zachowaj oryginały nagrań poza PWA.

Uwaga: operacje zmiany kolejności i przenoszenia nagrań nadal aktualizują rekordy w `tracks`. Przy bardzo dużych plikach mogą nadal wystąpić ograniczenia magazynu Safari.
