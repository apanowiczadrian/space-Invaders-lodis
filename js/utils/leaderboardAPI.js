/**
 * Leaderboard API - Pobieranie top wyników z Google Sheets
 *
 * KONFIGURACJA:
 * Wklej tutaj swój Web App URL z Google Apps Script
 */

// 🔧 WKLEJ TUTAJ SWÓJ WEB APP URL (ten sam co w analytics.js)
const GOOGLE_SHEETS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbz6woC_vz5LuvxwLErWYyC_4GXa5GGsTK_X2TfouvteNs4pPE_in922Ctpu5ClRyDclkw/exec';

// Cache dla leaderboard (żeby nie odpytywać za często)
let leaderboardCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 60 sekund cache

/**
 * Pobierz top wyniki z Google Sheets
 * @param {number} limit - Liczba wyników do pobrania (domyślnie 10)
 * @param {boolean} forceRefresh - Wymuś odświeżenie (ignoruj cache)
 * @returns {Promise<Array>} - Tablica z top wynikami
 */
export async function fetchTopScores(limit = 10, forceRefresh = false) {
    // Sprawdź cache
    const now = Date.now();
    if (!forceRefresh && leaderboardCache && (now - lastFetchTime) < CACHE_DURATION) {
        console.log('📊 Leaderboard: Using cached data');
        return leaderboardCache.slice(0, limit);
    }

    // Sprawdź czy endpoint jest skonfigurowany
    if (GOOGLE_SHEETS_ENDPOINT.includes('YOUR_DEPLOYMENT_ID')) {
        console.warn('⚠️ Google Sheets endpoint not configured in leaderboardAPI.js');
        return [];
    }

    try {
        console.log('📊 Fetching leaderboard from Google Sheets...');

        const url = `${GOOGLE_SHEETS_ENDPOINT}?action=leaderboard&limit=${limit}`;
        console.log('🔗 URL:', url);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        console.log('📡 Response status:', response.status, response.statusText);

        if (!response.ok) {
            console.error('❌ HTTP error:', response.status, response.statusText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseText = await response.text();
        console.log('📄 Raw response:', responseText);

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('❌ JSON parse error:', parseError);
            console.error('Response was:', responseText);
            return [];
        }

        console.log('📦 Parsed data:', data);

        if (data.success && data.scores) {
            // Zaktualizuj cache
            leaderboardCache = data.scores;
            lastFetchTime = now;

            console.log(`✅ Leaderboard fetched: ${data.scores.length} scores (total: ${data.total})`);
            return data.scores;
        } else {
            console.error('❌ Leaderboard fetch failed:', data.error || 'Unknown error');
            console.error('Full response:', data);
            return [];
        }

    } catch (error) {
        console.error('❌ Error fetching leaderboard:', error);

        // Zwróć cache jeśli dostępny (lepsze niż nic)
        if (leaderboardCache) {
            console.log('⚠️ Using stale cached data due to fetch error');
            return leaderboardCache.slice(0, limit);
        }

        return [];
    }
}

/**
 * Wyczyść cache leaderboard (użyj po zapisaniu nowego wyniku)
 */
export function clearLeaderboardCache() {
    leaderboardCache = null;
    lastFetchTime = 0;
    console.log('🗑️ Leaderboard cache cleared');
}

/**
 * Testowa funkcja do sprawdzenia czy API działa
 * Wywołaj w console: testLeaderboardAPI()
 */
export async function testLeaderboardAPI() {
    console.log('🧪 Testing leaderboard API...');

    const scores = await fetchTopScores(10, true); // force refresh

    if (scores.length > 0) {
        console.log('✅ Leaderboard API works!');
        console.table(scores);
    } else {
        console.log('❌ No scores received. Check endpoint configuration.');
    }
}

// Udostępnij funkcję testową globalnie
if (typeof window !== 'undefined') {
    window.testLeaderboardAPI = testLeaderboardAPI;
}
