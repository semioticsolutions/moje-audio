# Moje Audio — prywatna PWA

Prototyp bez serwera aplikacyjnego i bez zewnętrznej bazy danych. Pliki MP3/MP4 są kopiowane do IndexedDB urządzenia, a odtwarzacz używa HTMLAudioElement. MP4 musi zawierać kodek audio obsługiwany przez Safari.

## Uruchomienie
1. Umieść zawartość katalogu na statycznym hostingu HTTPS (np. Cloudflare Pages, GitHub Pages). Nie trzeba uruchamiać npm ani kompilować projektu. Nie wrzucaj plików MP3/MP4 na hosting — tylko kod PWA.
2. Otwórz adres HTTPS w Safari na iPhonie. Użyj opcji Udostępnij > Dodaj do ekranu początkowego.
3. Uruchom ikonę „Moje Audio”, dodaj nagrania przez przycisk i sprawdź odtwarzanie offline w trybie samolotowym.
4. Sprawdź kilkudziesięciominutowe odtwarzanie przy zablokowanym ekranie. iOS nie gwarantuje nieprzerwanej pracy audio w PWA.

## Ograniczenia
- IndexedDB nie stanowi niezawodnej kopii zapasowej. Zachowaj oryginały plików w aplikacji Pliki / na komputerze.
- Import może zawieść przy dużych plikach lub braku miejsca. WebKit może usunąć przechowywane dane.
- W trybie standalone i w Safari mogą istnieć osobne magazyny danych; importuj pliki w aplikacji uruchomionej z ikony na ekranie początkowym.
- HTTPS jest wymagane do normalnej instalacji PWA i działania Service Workera (lokalny localhost na komputerze jest wyjątkiem dla programowania).
- To demonstrator: brak eksportu bazy, playlist, wykrywania duplikatów, transkodowania, testów automatycznych. Przed używaniem jako główna biblioteka audio zalecane są testy na konkretnym iPhonie.
