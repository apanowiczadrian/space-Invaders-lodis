// Score management system using localStorage + Google Sheets API
import { fetchTopScores, clearLeaderboardCache } from '../utils/leaderboardAPI.js';

export class ScoreManager {
    constructor() {
        this.storageKey = 'spaceInvScores';
        this.useOnlineLeaderboard = true; // Ustaw na false aby używać tylko localStorage
        this.onlineScoresCache = null; // Cache dla online scores
    }

    // Save a new score
    saveScore(playerData, score, wave, time) {
        // Validate playerData
        if (!playerData || typeof playerData !== 'object') {
            console.error('❌ Cannot save score: playerData is null or invalid');
            return null;
        }

        if (!playerData.nick || typeof playerData.nick !== 'string') {
            console.error('❌ Cannot save score: playerData.nick is missing or invalid');
            return null;
        }

        // Don't save scores of 0 or negative
        if (score <= 0) {
            console.log('⚠️ Score of 0 or less not saved to leaderboard');
            return null;
        }

        const scores = this.getLocalScores();

        const newScore = {
            nick: playerData.nick,
            email: playerData.email || '', // Fallback to empty string if missing
            score: score,
            wave: wave,
            time: time, // in seconds
            timestamp: Date.now()
        };

        scores.push(newScore);

        // Sort by score (descending), then by time (ascending - faster is better)
        scores.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return a.time - b.time;
        });

        // Keep only top 100 scores locally
        const topScores = scores.slice(0, 100);

        localStorage.setItem(this.storageKey, JSON.stringify(topScores));

        // Wyczyść cache online leaderboard po zapisaniu nowego wyniku
        if (this.useOnlineLeaderboard) {
            clearLeaderboardCache();
        }

        return newScore;
    }

    // Get local scores from localStorage
    getLocalScores() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error loading local scores:', e);
            return [];
        }
    }

    // DEPRECATED: Use getTopScoresUniqueNicks() instead
    // Get top N scores (from online or localStorage)
    // This method does NOT deduplicate by nick
    async getTopScores(limit = 4) {
        console.warn('⚠️ getTopScores() is deprecated, use getTopScoresUniqueNicks() instead');

        if (!this.useOnlineLeaderboard) {
            // Fallback to localStorage (filter out 0 scores)
            const scores = this.getLocalScores();
            return scores.filter(s => s.score > 0).slice(0, limit);
        }

        try {
            // Pobierz z Google Sheets
            const onlineScores = await fetchTopScores(limit);

            if (onlineScores && onlineScores.length > 0) {
                // Filter out 0 scores (shouldn't happen with server-side filtering, but be safe)
                return onlineScores.filter(s => s.score > 0);
            }
        } catch (error) {
            console.error('Failed to fetch online scores, using local:', error);
        }

        // Fallback to localStorage if API fails (filter out 0 scores)
        const localScores = this.getLocalScores();
        return localScores.filter(s => s.score > 0).slice(0, limit);
    }

    // Get top N scores with unique nicks (async version)
    // Returns ONLY Google Sheets data (no localStorage), deduplicated by nick
    // Each player appears only once with their best score
    async getTopScoresUniqueNicks(limit = 4) {
        if (!this.useOnlineLeaderboard) {
            console.error('⚠️ Online leaderboard is disabled');
            return [];
        }

        try {
            // Fetch large dataset to ensure we have enough unique players
            // (e.g., if top 100 has duplicates, we need more data to get 100 unique nicks)
            const fetchLimit = Math.max(limit * 3, 300);
            const onlineScores = await fetchTopScores(fetchLimit);

            if (!onlineScores || onlineScores.length === 0) {
                console.error('❌ No online scores available');
                return [];
            }

            // Deduplicate by nick - keep only best score per player
            const uniqueScoresMap = new Map();

            onlineScores.forEach(score => {
                if (score.score <= 0) return; // Skip invalid scores

                const nick = score.nick;
                const existing = uniqueScoresMap.get(nick);

                // Keep this score if:
                // 1. Player not in map yet, OR
                // 2. This score is higher, OR
                // 3. Same score but faster time
                if (!existing ||
                    score.score > existing.score ||
                    (score.score === existing.score && score.time < existing.time)) {
                    uniqueScoresMap.set(nick, score);
                }
            });

            // Convert to array and sort
            const uniqueScores = Array.from(uniqueScoresMap.values());
            uniqueScores.sort((a, b) => {
                if (b.score !== a.score) {
                    return b.score - a.score;
                }
                return a.time - b.time;
            });

            // Update cache with deduplicated data
            this.onlineScoresCache = uniqueScores;

            return uniqueScores.slice(0, limit);
        } catch (error) {
            console.error('❌ Failed to fetch unique nick scores:', error);
            return [];
        }
    }

    // Get top N scores with unique nicks (synchronous version)
    // Uses cached data from previous async call
    // Returns ONLY Google Sheets data (no localStorage), deduplicated by nick
    getTopScoresUniqueNicksSync(limit = 4) {
        if (!this.onlineScoresCache || this.onlineScoresCache.length === 0) {
            console.warn('⚠️ No cached online scores available');
            return [];
        }

        // Cache already contains deduplicated data from getTopScoresUniqueNicks()
        return this.onlineScoresCache.slice(0, limit);
    }

    // Clear all scores (for testing)
    clearScores() {
        localStorage.removeItem(this.storageKey);
    }

    // Find player's rank in leaderboard (1-indexed)
    // Returns object with rank and score data, or null if not found
    // Uses deduplicated online leaderboard (same data as displayed)
    findPlayerRank(playerData, score, time) {
        // Validate playerData
        if (!playerData || typeof playerData !== 'object' || !playerData.nick) {
            console.error('❌ Cannot find rank: playerData is null or invalid');
            return null;
        }

        // Don't rank scores of 0 or less
        if (score <= 0) {
            return null;
        }

        // Use online cache (deduplicated by nick from getTopScoresUniqueNicks)
        // This ensures rank matches what's displayed in leaderboard
        if (!this.onlineScoresCache || this.onlineScoresCache.length === 0) {
            console.warn('⚠️ No online scores cache available for ranking');
            return null;
        }

        // Find player's best score in the deduplicated leaderboard
        const playerNick = playerData.nick;
        let playerRankIndex = -1;
        let playerScoreData = null;

        for (let i = 0; i < this.onlineScoresCache.length; i++) {
            const scoreData = this.onlineScoresCache[i];

            // Find this player's entry (deduplicated cache has only one entry per nick)
            if (scoreData.nick === playerNick) {
                playerRankIndex = i;
                playerScoreData = scoreData;
                break;
            }
        }

        if (playerRankIndex !== -1 && playerScoreData) {
            return {
                rank: playerRankIndex + 1, // 1-indexed
                data: playerScoreData
            };
        }

        // Player not found in online leaderboard
        // This can happen if:
        // 1. Score hasn't been synced to Google Sheets yet
        // 2. Player's score is outside top N fetched scores
        console.log(`ℹ️ Player "${playerNick}" not found in online leaderboard`);
        return null;
    }

    // Preload online leaderboard (call on game start)
    // Uses deduplicated unique nicks method
    async preloadLeaderboard(limit = 10) {
        if (!this.useOnlineLeaderboard) return;

        try {
            // Use the new deduplicated method
            await this.getTopScoresUniqueNicks(limit);
            console.log('✅ Leaderboard preloaded with unique nicks');
        } catch (error) {
            console.error('Failed to preload leaderboard:', error);
        }
    }
}
