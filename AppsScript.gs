/**
 * Space Invaders - Google Sheets Integration
 * Apps Script Endpoint do zbierania statystyk graczy
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
      // email: row[4] || '',           // E: Email - UKRYTE dla prywatności
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
 * Test funkcja dla leaderboard
 * Sprawdź czy getTopScores działa poprawnie
 */
function testLeaderboard() {
  const result = getTopScores(10);
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
