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

    // Get top N scores (from online or localStorage)
    async getTopScores(limit = 4) {
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
                this.onlineScoresCache = onlineScores.filter(s => s.score > 0);
                return this.onlineScoresCache;
            }
        } catch (error) {
            console.error('Failed to fetch online scores, using local:', error);
        }

        // Fallback to localStorage if API fails (filter out 0 scores)
        const localScores = this.getLocalScores();
        return localScores.filter(s => s.score > 0).slice(0, limit);
    }

    // Get top scores synchronously (for immediate rendering)
    // Returns merged scores (local + online cache) for most accurate leaderboard
    getTopScoresSync(limit = 4) {
        const localScores = this.getLocalScores();

        // If we have online cache, merge with local scores
        if (this.onlineScoresCache && this.onlineScoresCache.length > 0) {
            // Create a map to deduplicate by nick+score+time
            const scoresMap = new Map();

            // Add local scores first (highest priority - most up-to-date)
            localScores.forEach(score => {
                // Filter out scores of 0 or less
                if (score.score > 0) {
                    const key = `${score.nick}_${score.score}_${score.time}`;
                    scoresMap.set(key, score);
                }
            });

            // Add online scores (won't overwrite local duplicates)
            this.onlineScoresCache.forEach(score => {
                // Filter out scores of 0 or less
                if (score.score > 0) {
                    const key = `${score.nick}_${score.score}_${score.time}`;
                    if (!scoresMap.has(key)) {
                        scoresMap.set(key, score);
                    }
                }
            });

            // Convert back to array and sort
            const mergedScores = Array.from(scoresMap.values());
            mergedScores.sort((a, b) => {
                if (b.score !== a.score) {
                    return b.score - a.score;
                }
                return a.time - b.time;
            });

            return mergedScores.slice(0, limit);
        }

        // Fallback to local only (filter out 0 scores)
        return localScores.filter(score => score.score > 0).slice(0, limit);
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
        // Validate playerData
        if (!playerData || typeof playerData !== 'object' || !playerData.nick) {
            console.error('❌ Cannot find rank: playerData is null or invalid');
            return null;
        }

        // Don't rank scores of 0 or less
        if (score <= 0) {
            return null;
        }

        // ALWAYS use localStorage for finding player rank (most up-to-date)
        // Online cache might not have the latest score yet
        const scores = this.getLocalScores();

        // Filter out scores of 0 or less before finding rank
        const validScores = scores.filter(s => s.score > 0);

        // IMPORTANT: Sort scores to ensure correct ranking
        // (in case localStorage was manually edited or corrupted)
        validScores.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return a.time - b.time;
        });

        // Find ALL matching entries for this player with this score
        let bestMatch = null;
        let bestMatchIndex = -1;
        let newestTimestamp = 0;

        for (let i = 0; i < validScores.length; i++) {
            const scoreData = validScores[i];
            if (scoreData.nick === playerData.nick &&
                Math.abs(scoreData.score - score) < 1 &&
                Math.abs(Math.floor(scoreData.time) - Math.floor(time)) < 1) {

                // If this match has a newer timestamp, use it instead
                if (scoreData.timestamp > newestTimestamp) {
                    newestTimestamp = scoreData.timestamp;
                    bestMatch = scoreData;
                    bestMatchIndex = i;
                }
            }
        }

        if (bestMatch) {
            return {
                rank: bestMatchIndex + 1, // 1-indexed
                data: bestMatch
            };
        }

        return null;
    }

    // Preload online leaderboard (call on game start)
    async preloadLeaderboard(limit = 10) {
        if (!this.useOnlineLeaderboard) return;

        try {
            const scores = await fetchTopScores(limit);
            if (scores && scores.length > 0) {
                this.onlineScoresCache = scores;
            }
        } catch (error) {
            console.error('Failed to preload leaderboard:', error);
        }
    }
}
