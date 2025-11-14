# LODIS - GALAGA Debug Server

System zdalnego debugowania dla gry LODIS - GALAGA. Przechwytuje wszystkie wywołania `console.log`, `console.warn`, `console.error` z aplikacji i wyświetla je na osobnym serwerze HTTP.

## 🚀 Szybki start

### 1. Uruchom serwer debugowania

```bash
cd debugging
npm install          # Tylko przy pierwszym uruchomieniu
node server.js
```

Serwer uruchomi się na **http://localhost:3001**

### 2. Uruchom grę (w osobnym terminalu)

```bash
cd ..
http-server -c-1
```

Gra uruchomi się na **http://127.0.0.1:8080**

### 3. Otwórz interfejs debugowania

Otwórz w przeglądarce: **http://localhost:3001**

## 📋 Funkcje

### Serwer debugowania
- ✅ **Endpoint GET:** `/log?message=...&level=...&file=...&timestamp=...`
- ✅ **Endpoint POST:** `/log` (batch logging)
- ✅ **Endpoint GET:** `/logs?limit=N` (pobierz logi jako JSON)
- ✅ **Endpoint DELETE:** `/logs` (wyczyść wszystkie logi)
- ✅ **Interfejs webowy:** `/` (auto-refresh co 1s)
- ✅ **Bufor w pamięci:** Ostatnie 500 logów
- ✅ **Kolorowe logi w konsoli Node.js**

### Interfejs webowy
- 🎮 **Auto-refresh** (1s) z możliwością pauzy
- 🔄 **Manualne odświeżanie**
- 🗑️ **Czyszczenie logów**
- 🔍 **Filtrowanie po poziomie** (INFO, WARN, ERROR, DEBUG)
- 🎨 **Kolorowe wyświetlanie**
- 📊 **Statystyki** (liczba logów, ostatnia aktualizacja)

### Logger w aplikacji
- 🔌 **Auto-inicjalizacja** (import w sketch.js)
- 📦 **Batching** (500ms, max 50 logów)
- 🔁 **Retry logic** (3 próby przy błędzie sieci)
- 📝 **Zachowanie oryginalnych logów** w konsoli przeglądarki
- 🎯 **Automatyczna detekcja pliku źródłowego**
- ⚙️ **Łatwa konfiguracja** (js/debug/config.js)

## 🔧 Konfiguracja

### Włączanie/wyłączanie

Edytuj `js/debug/config.js`:

```javascript
export const DebugConfig = {
  enabled: true,  // false = wyłącz zdalne logowanie
  // ...
};
```

### Zmiana adresu serwera

```javascript
export const DebugConfig = {
  serverUrl: 'http://localhost:3001',  // Zmień port jeśli potrzeba
  // ...
};
```

### Włączanie/wyłączanie poziomów logów

```javascript
export const DebugConfig = {
  levels: {
    log: true,      // console.log
    info: true,     // console.info
    warn: true,     // console.warn
    error: true,    // console.error
    debug: false    // console.debug (wyłączony)
  }
};
```

## 📁 Struktura plików

```
debugging/
├── server.js              # Node.js Express server
├── package.json           # Zależności (express, cors)
├── README.md              # Ta dokumentacja
├── logs/                  # Opcjonalne logi do pliku
└── public/
    └── index.html         # Interfejs webowy

js/debug/
├── DebugLogger.js         # Główny logger (przechwytuje console.*)
└── config.js              # Konfiguracja
```

## 🎯 Użycie

### Standardowe logowanie (automatyczne)

Wszystkie wywołania `console.*` są automatycznie przechwytywane:

```javascript
console.log('Test message');           // INFO
console.warn('Warning message');       // WARN
console.error('Error message');        // ERROR
console.debug('Debug message');        // DEBUG
```

### Wyświetlanie w interfejsie

1. Otwórz http://localhost:3001
2. Logi są automatycznie odświeżane co 1s
3. Użyj przycisków filtrów aby wyświetlić tylko wybrane poziomy
4. Kliknij "Pause" aby zatrzymać auto-refresh
5. Kliknij "Clear Logs" aby wyczyścić wszystkie logi

## 🐛 Rozwiązywanie problemów

### Serwer nie startuje

```bash
# Sprawdź czy port 3001 jest wolny
netstat -ano | findstr :3001

# Jeśli zajęty, zmień port w:
# - debugging/server.js (PORT = 3001)
# - js/debug/config.js (serverUrl)
```

### Logi nie są wysyłane

1. Sprawdź konsolę przeglądarki - powinieneś zobaczyć:
   ```
   ✅ DebugLogger: Connected to http://localhost:3001
   ```

2. Jeśli widzisz błąd CORS, sprawdź czy serwer działa

3. Sprawdź konfigurację w `js/debug/config.js`:
   ```javascript
   enabled: true  // Musi być true
   ```

### Interfejs webowy nie ładuje logów

1. Otwórz konsolę deweloperską (F12)
2. Sprawdź błędy fetch
3. Sprawdź czy serwer działa na http://localhost:3001

## 📊 Przykłady

### Test logowania

Otwórz konsolę w grze (F12) i wpisz:

```javascript
console.log('Test INFO');
console.warn('Test WARN');
console.error('Test ERROR');
```

Logi powinny pojawić się zarówno w konsoli przeglądarki jak i na http://localhost:3001

### Fetch logów przez API

```bash
# Pobierz ostatnie 10 logów
curl http://localhost:3001/logs?limit=10

# Wyczyść wszystkie logi
curl -X DELETE http://localhost:3001/logs
```

## ⚡ Wydajność

- **Batching:** Logi są grupowane co 500ms (maksymalnie 50 logów na raz)
- **Minimalne opóźnienie:** Logi są wysyłane asynchronicznie (nie blokują gry)
- **Retry logic:** Automatyczne ponowne wysyłanie przy błędzie sieci (max 3 próby)
- **Buffer overflow:** Serwer przechowuje maksymalnie 500 logów (starsze są usuwane)

## 📝 Notatki

- System debugowania działa niezależnie od gry
- Wszystkie oryginalne logi w konsoli przeglądarki są zachowane
- Emoji w logach (✅, ⚠️, ❌) są poprawnie przechwytywane
- Polski tekst w logach jest wspierany
- Serwer działa tylko lokalnie (brak zewnętrznego dostępu)

## 🔒 Bezpieczeństwo

- Serwer działa tylko na localhost (127.0.0.1)
- Brak uwierzytelniania (tylko do użytku developerskiego)
- CORS włączony dla wszystkich origin (tylko localhost)
- Nie używaj w produkcji!

## 📄 Licencja

MIT License - Adrian Apanowicz
