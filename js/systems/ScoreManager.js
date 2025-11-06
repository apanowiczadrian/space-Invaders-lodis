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
        const scores = this.getLocalScores();

        const newScore = {
            nick: playerData.nick,
            email: playerData.email,
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

    // DEPRECATED: Używaj getLocalScores() lub getTopScores()
    getScores() {
        return this.getLocalScores();
    }

    // Get top N scores (from online or localStorage)
    async getTopScores(limit = 4) {
        if (!this.useOnlineLeaderboard) {
            // Fallback to localStorage
            const scores = this.getLocalScores();
            return scores.slice(0, limit);
        }

        try {
            // Pobierz z Google Sheets
            const onlineScores = await fetchTopScores(limit);

            if (onlineScores && onlineScores.length > 0) {
                this.onlineScoresCache = onlineScores;
                return onlineScores;
            }
        } catch (error) {
            console.error('Failed to fetch online scores, using local:', error);
        }

        // Fallback to localStorage if API fails
        const localScores = this.getLocalScores();
        return localScores.slice(0, limit);
    }

    // Get top scores synchronously (for immediate rendering)
    // Returns cached online scores or local scores
    getTopScoresSync(limit = 4) {
        if (this.onlineScoresCache && this.onlineScoresCache.length > 0) {
            return this.onlineScoresCache.slice(0, limit);
        }

        // Fallback to local
        const localScores = this.getLocalScores();
        return localScores.slice(0, limit);
    }

    // Clear all scores (for testing)
    clearScores() {
        localStorage.removeItem(this.storageKey);
    }

    // Check if a score makes it to top N
    isTopScore(score, limit = 4) {
        const topScores = this.getTopScores(limit);
        if (topScores.length < limit) return true;
        return score > topScores[topScores.length - 1].score;
    }

    // Find player's rank in leaderboard (1-indexed)
    // Returns object with rank and score data, or null if not found
    findPlayerRank(playerData, score, time) {
        // Use cached online scores if available, otherwise local
        const scores = this.onlineScoresCache && this.onlineScoresCache.length > 0
            ? this.onlineScoresCache
            : this.getLocalScores();

        // Find the exact score entry matching player, score, and time
        for (let i = 0; i < scores.length; i++) {
            const scoreData = scores[i];
            if (scoreData.nick === playerData.nick &&
                Math.abs(scoreData.score - score) < 1 &&
                Math.abs(scoreData.time - time) < 1) {
                return {
                    rank: i + 1, // 1-indexed
                    data: scoreData
                };
            }
        }

        return null;
    }

    // Preload online leaderboard (call on game start)
    async preloadLeaderboard(limit = 10) {
        if (!this.useOnlineLeaderboard) return;

        try {
            console.log('📊 Preloading online leaderboard...');
            const scores = await fetchTopScores(limit);
            if (scores && scores.length > 0) {
                this.onlineScoresCache = scores;
                console.log(`✅ Preloaded ${scores.length} scores`);
            }
        } catch (error) {
            console.error('Failed to preload leaderboard:', error);
        }
    }
}
