# Google Sheets Leaderboard - Instrukcja Integracji

System online leaderboard używający Google Sheets jako bazy danych.

---

## 📋 Przegląd

System składa się z:
1. **Apps Script (backend)** - endpoint API w Google Sheets
2. **LeaderboardAPI (frontend)** - moduł JS do pobierania danych
3. **ScoreManager** - zarządzanie wynikami (online + localStorage fallback)

---

## 🚀 Krok 1: Przygotuj Google Sheet

### 1.1. Utwórz arkusz (jeśli jeszcze nie masz)

1. Otwórz [Google Sheets](https://sheets.google.com)
2. Stwórz nowy arkusz lub użyj istniejącego
3. Nazwa arkusza: dowolna (np. "Space Invaders Stats")
4. Nazwa zakładki: **Sheet1** (lub zmień w kodzie Apps Script)

### 1.2. Dodaj nagłówki (opcjonalne - Apps Script zrobi to automatycznie)

Jeśli chcesz ręcznie dodać nagłówki, wklej w wiersz 1:
```
Timestamp | Date | Time | Nick | Email | Score | Wave | Enemies Killed | Game Time (s) | Total Shots | Shots/Second | Basic Shots | Triple Shots | Rocket Shots | Life Powerups | Shield Powerups | Autofire Powerups | Tripleshot Powerups | Rocket Powerups | Device | Browser
```

---

## 🔧 Krok 2: Dodaj Apps Script

### 2.1. Otwórz Apps Script Editor

1. W Google Sheets: **Extensions → Apps Script**
2. Usuń domyślny kod (`function myFunction() {}`)

### 2.2. Wklej kod Apps Script

Skopiuj **cały kod** z pliku `AppsScript.gs` i wklej do Apps Script Editor.

**Pełny kod Apps Script:**

\`\`\`javascript
/**
 * Space Invaders - Google Sheets Integration
 * Apps Script Endpoint do zbierania statystyk graczy i zwracania leaderboard
 *
 * INSTRUKCJA:
 * 1. Otwórz Google Sheets
 * 2. Extensions → Apps Script
 * 3. Skopiuj cały ten kod i wklej zamiast domyślnego
 * 4. Zmień SHEET_NAME jeśli twój arkusz ma inną nazwę
 * 5. Save (Ctrl+S)
 * 6. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 7. Skopiuj Web App URL
 */

// ⚙️ KONFIGURACJA
const SHEET_NAME = 'Sheet1'; // Zmień jeśli twój arkusz ma inną nazwę

/**
 * Endpoint POST - odbiera dane z gry
 */
function doPost(e) {
  try {
    // Parse JSON data
    const data = JSON.parse(e.postData.contents);

    // Otwórz spreadsheet i arkusz
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Sheet not found: ' + SHEET_NAME
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Przygotuj wiersz danych
    const timestamp = new Date(data.timestamp || Date.now());
    const row = [
      timestamp.toISOString(),                    // A: Timestamp (ISO)
      Utilities.formatDate(timestamp, 'GMT+1', 'yyyy-MM-dd'), // B: Date
      Utilities.formatDate(timestamp, 'GMT+1', 'HH:mm:ss'),   // C: Time
      data.nick || '',                            // D: Nick
      data.email || '',                           // E: Email
      data.finalScore || 0,                       // F: Score
      data.finalWave || 0,                        // G: Wave
      data.enemiesKilled || 0,                    // H: Enemies Killed
      parseFloat(data.totalGameTime) || 0,        // I: Game Time
      data.totalShots || 0,                       // J: Total Shots
      parseFloat(data.shotsPerSecond) || 0,       // K: Shots/Second
      data.shotsByWeapon?.basic || 0,             // L: Basic Shots
      data.shotsByWeapon?.triple || 0,            // M: Triple Shots
      data.shotsByWeapon?.rocket || 0,            // N: Rocket Shots
      data.powerUpsCollected?.life || 0,          // O: Life Powerups
      data.powerUpsCollected?.shield || 0,        // P: Shield Powerups
      data.powerUpsCollected?.autofire || 0,      // Q: Autofire Powerups
      data.powerUpsCollected?.tripleshot || 0,    // R: Tripleshot Powerups
      data.powerUpsCollected?.rocket || 0,        // S: Rocket Powerups
      data.device || 'Unknown',                   // T: Device
      data.browser || 'Unknown'                   // U: Browser
    ];

    // Dodaj wiersz na końcu arkusza
    sheet.appendRow(row);

    // Zwróć sukces
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Data saved successfully',
      row: sheet.getLastRow()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // Zwróć błąd
    Logger.log('Error: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Endpoint GET - zwraca top wyniki z leaderboard
 * Parametry:
 *   - action: 'leaderboard' (wymagane)
 *   - limit: liczba wyników do zwrócenia (domyślnie 10)
 *
 * Przykład: ?action=leaderboard&limit=10
 */
function doGet(e) {
  try {
    const params = e.parameter;

    // Check if requesting leaderboard
    if (params.action === 'leaderboard') {
      const limit = parseInt(params.limit) || 10;
      return getTopScores(limit);
    }

    // Default: status check
    return ContentService.createTextOutput(JSON.stringify({
      status: 'OK',
      message: 'Space Invaders Stats Endpoint is running',
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Pobierz top wyniki z arkusza
 */
function getTopScores(limit) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Sheet not found: ' + SHEET_NAME
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Pobierz wszystkie dane (bez nagłówka)
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      // Brak danych (tylko nagłówek)
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        scores: []
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Pobierz dane: kolumny D (Nick), E (Email), F (Score), G (Wave), I (Time)
    const dataRange = sheet.getRange(2, 1, lastRow - 1, 9); // A-I columns
    const data = dataRange.getValues();

    // Przekształć do obiektów i posortuj po Score (descending), potem Time (ascending)
    const scores = data.map(row => ({
      nick: row[3] || 'Anonymous',     // D: Nick
      email: row[4] || '',              // E: Email
      score: row[5] || 0,               // F: Score
      wave: row[6] || 0,                // G: Wave
      time: Math.floor(row[8]) || 0,   // I: Game Time (s)
      timestamp: row[0]                 // A: Timestamp
    }))
    .filter(s => s.score > 0) // Odfiltruj wyniki z 0 punktami
    .sort((a, b) => {
      // Sortuj po score (descending)
      if (b.score !== a.score) return b.score - a.score;
      // Jeśli równe, sortuj po time (ascending - szybszy czas = lepszy)
      return a.time - b.time;
    });

    // Zwróć top N wyników
    const topScores = scores.slice(0, limit);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      scores: topScores,
      total: scores.length
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error in getTopScores: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Funkcja testowa - możesz uruchomić w Script Editor
 * 1. Wybierz "testEndpoint" z dropdown u góry
 * 2. Kliknij "Run"
 * 3. Sprawdź Google Sheet - powinien pojawić się testowy wiersz
 */
function testEndpoint() {
  const testData = {
    nick: 'TestPlayer',
    email: 'test@example.com',
    finalScore: 12345,
    finalWave: 10,
    enemiesKilled: 150,
    totalGameTime: '123.45',
    totalShots: 400,
    shotsPerSecond: '3.24',
    shotsByWeapon: {
      basic: 250,
      triple: 100,
      rocket: 50
    },
    powerUpsCollected: {
      life: 1,
      shield: 2,
      autofire: 3,
      tripleshot: 2,
      rocket: 1
    },
    device: 'Desktop',
    browser: 'Chrome',
    timestamp: Date.now()
  };

  const mockEvent = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };

  const result = doPost(mockEvent);
  Logger.log(result.getContent());
}

/**
 * Setup funkcja - automatyczne tworzenie nagłówków
 * Uruchom raz na początku (wybierz z dropdown i kliknij Run)
 */
function setupSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

  if (!sheet) {
    Logger.log('Error: Sheet "' + SHEET_NAME + '" not found!');
    return;
  }

  // Sprawdź czy nagłówki już istnieją
  if (sheet.getRange('A1').getValue() !== '') {
    Logger.log('Headers already exist. Skipping setup.');
    return;
  }

  // Dodaj nagłówki
  const headers = [
    'Timestamp', 'Date', 'Time', 'Nick', 'Email',
    'Score', 'Wave', 'Enemies Killed', 'Game Time (s)',
    'Total Shots', 'Shots/Second',
    'Basic Shots', 'Triple Shots', 'Rocket Shots',
    'Life Powerups', 'Shield Powerups', 'Autofire Powerups',
    'Tripleshot Powerups', 'Rocket Powerups',
    'Device', 'Browser'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Formatowanie
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#4285f4')
    .setFontColor('#ffffff');

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);

  Logger.log('✅ Sheet setup complete! Headers added and formatted.');
}
\`\`\`

### 2.3. Zapisz i przetestuj

1. **Save** (Ctrl+S)
2. **Uruchom setupSheet()**:
   - Dropdown u góry: wybierz `setupSheet`
   - Kliknij **Run**
   - Authorize access (zaloguj się)
   - Sprawdź Google Sheet - powinny pojawić się nagłówki

3. **Uruchom testEndpoint()**:
   - Dropdown: wybierz `testEndpoint`
   - Kliknij **Run**
   - Sprawdź Google Sheet - powinien pojawić się testowy wiersz

---

## 🌐 Krok 3: Deploy Web App

### 3.1. Deploy

1. W Apps Script Editor: **Deploy → New deployment**
2. Kliknij ikonę koła zębatego → **Web app**
3. Ustawienia:
   - **Description**: "Space Invaders API v1"
   - **Execute as**: **Me** (twoje konto)
   - **Who has access**: **Anyone** (publiczny dostęp)
4. Kliknij **Deploy**
5. **Authorize access** (zaloguj się)

### 3.2. Skopiuj URL

Po deployment skopiuj **Web App URL**:
```
https://script.google.com/macros/s/AKfycbz.../exec
```

**WAŻNE**: To jest ten sam URL co używany w `analytics.js`!

---

## 🎮 Krok 4: Konfiguracja w Grze

### 4.1. Zaktualizuj leaderboardAPI.js

Otwórz plik: `js/utils/leaderboardAPI.js`

Znajdź linię:
```javascript
const GOOGLE_SHEETS_ENDPOINT = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
```

Zamień `YOUR_DEPLOYMENT_ID` na swój URL z kroku 3.2:
```javascript
const GOOGLE_SHEETS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbz.../exec';
```

**UWAGA**: Jeśli już skonfigurowałeś `analytics.js`, użyj **tego samego URL** w obu plikach!

### 4.2. (Opcjonalnie) Wyłącz online leaderboard

Jeśli chcesz używać tylko localStorage (bez Google Sheets):

Otwórz: `js/systems/ScoreManager.js`

Zmień:
```javascript
this.useOnlineLeaderboard = true;
```

Na:
```javascript
this.useOnlineLeaderboard = false;
```

---

## 🧪 Krok 5: Testowanie

### 5.1. Test API w Console

1. Uruchom grę: `http-server -c-1`
2. Otwórz Console (F12)
3. Wywołaj:
   ```javascript
   testLeaderboardAPI()
   ```
4. Powinieneś zobaczyć:
   ```
   ✅ Leaderboard API works!
   ```
   oraz tabelę z wynikami

### 5.2. Test w grze

1. Zagraj kilka razy (różne wyniki)
2. Wyniki zapisują się lokalnie + do Google Sheets
3. Zakończ grę (game over)
4. Sprawdź leaderboard w game over screen
5. **Powinny być widoczne wyniki z Google Sheets** (jeśli jest połączenie z internetem)

### 5.3. Test fallback (bez internetu)

1. Wyłącz internet
2. Zagraj i zakończ grę
3. **Leaderboard powinien pokazać wyniki z localStorage** (fallback)
4. Włącz internet
5. Odśwież stronę
6. **Leaderboard pokaże wyniki z Google Sheets**

---

## 📊 Jak to działa?

### Flow zapisywania wyniku:
1. Gracz kończy grę
2. **localStorage**: Wynik zapisywany lokalnie (natychmiastowo)
3. **Google Sheets API**: Wynik wysyłany do Google Sheets (POST)
4. Cache leaderboard jest czyszczony

### Flow pobierania leaderboard:
1. Gra startuje → `preloadLeaderboard()` (background)
2. Google Sheets zwraca TOP 10 wyników (GET)
3. Wyniki cachowane w pamięci (60s)
4. Game over screen → wyświetla cached wyniki
5. **Fallback**: Jeśli API zawiedzie, wyświetla localStorage

### Cache:
- **Czas życia**: 60 sekund
- **Czyszczenie**: Automatyczne po zapisaniu nowego wyniku
- **Fallback**: Jeśli API nie odpowiada, używa localStorage

---

## 🔍 API Endpoints

### GET: Status Check
```
GET https://script.google.com/macros/s/.../exec
```

Odpowiedź:
```json
{
  "status": "OK",
  "message": "Space Invaders Stats Endpoint is running",
  "timestamp": "2025-11-07T12:34:56.789Z"
}
```

### GET: Leaderboard
```
GET https://script.google.com/macros/s/.../exec?action=leaderboard&limit=10
```

Odpowiedź:
```json
{
  "success": true,
  "scores": [
    {
      "nick": "Player1",
      "email": "player1@example.com",
      "score": 15000,
      "wave": 18,
      "time": 345,
      "timestamp": "2025-11-07T12:00:00.000Z"
    },
    ...
  ],
  "total": 42
}
```

### POST: Submit Score
```
POST https://script.google.com/macros/s/.../exec
Content-Type: application/json

{
  "nick": "Player1",
  "email": "player1@example.com",
  "finalScore": 15000,
  "finalWave": 18,
  ...
}
```

Odpowiedź:
```json
{
  "success": true,
  "message": "Data saved successfully",
  "row": 123
}
```

---

## ⚙️ Limity i Performance

### Google Apps Script Limity:
- **Quota dzienny**: 20,000 wywołań/dzień (darmowe konto)
- **Czas wykonania**: max 6 minut (nie problem dla małych zapytań)
- **Latencja**: 200-500ms (wolniejsze niż prawdziwa baza)

### Optymalizacje w grze:
- **Cache 60s** - redukuje liczbę zapytań
- **Preload na starcie** - leaderboard gotowy przed game over
- **Fallback localStorage** - działa offline
- **Async loading** - nie blokuje gry

### Dla małej/średniej gry:
- **100 graczy/dzień** = ~200 API calls (OK)
- **1000 graczy/dzień** = ~2000 API calls (OK)
- **10,000 graczy/dzień** = ~20,000 API calls (limit)

---

## 🐛 Troubleshooting

### Problem: "Leaderboard API works!" ale brak wyników

**Rozwiązanie**:
1. Sprawdź czy w Google Sheet są jakieś dane
2. Sprawdź nazwę arkusza (domyślnie: `Sheet1`)
3. W Apps Script zmień `SHEET_NAME` jeśli potrzeba
4. Re-deploy Apps Script

### Problem: Leaderboard pokazuje tylko localStorage

**Rozwiązanie**:
1. Sprawdź Console (F12) - czy są błędy?
2. Sprawdź czy URL w `leaderboardAPI.js` jest poprawny
3. Sprawdź czy deployment ma "Who has access: **Anyone**"
4. Test w Console: `testLeaderboardAPI()`

### Problem: CORS errors

**Rozwiązanie**:
Apps Script powinien automatycznie obsługiwać CORS. Jeśli nie:
1. Re-deploy Web App
2. Sprawdź czy deployment jest typu "Web app" (nie "API Executable")

### Problem: Wyniki się duplikują

**Wyjaśnienie**: To normalne - każda gra tworzy nowy wpis.

**Opcje**:
1. Pozostaw tak (pełna historia gier)
2. Lub: zmodyfikuj Apps Script aby sprawdzać duplikaty po (nick + score + time)

---

## 📁 Struktura Plików

```
js/
├── utils/
│   ├── analytics.js          - Wysyłanie statystyk (POST)
│   └── leaderboardAPI.js     - Pobieranie leaderboard (GET) ← NOWY
├── systems/
│   └── ScoreManager.js       - Zarządzanie wynikami (localStorage + API) ← ZMODYFIKOWANY
└── sketch.js                 - Main loop, preload leaderboard ← ZMODYFIKOWANY

AppsScript.gs                 - Backend API w Google Sheets ← ZMODYFIKOWANY
GOOGLE_SHEETS_LEADERBOARD.md  - Ten plik (dokumentacja)
```

---

## 🎉 Gotowe!

Teraz masz:
- ✅ **Zapisywanie wyników** lokalnie + na Google Sheets
- ✅ **Pobieranie leaderboard** z Google Sheets
- ✅ **Cache 60s** dla wydajności
- ✅ **Fallback localStorage** gdy brak internetu
- ✅ **Auto-preload** przy starcie gry

---

_Utworzono: 2025-11-07_
_Wersja: 1.0_
