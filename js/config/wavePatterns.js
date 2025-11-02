// Wave Pattern Configurations
// Each pattern defines enemy formation rows with type, count, and starting X position

export const WAVE_PATTERNS = {
    // 1. Basic Rectangle - klasyczny prostokąt (4 wiersze)
    basic: {
        rows: [
            { type: 'basic', count: 10, startX: 60 },
            { type: 'basic', count: 10, startX: 60 },
            { type: 'basic', count: 10, startX: 60 },
            { type: 'basic', count: 10, startX: 60 }
        ]
    },

    // 2. V-Formation - kształt V (jak lecące gęsi)
    vformation: {
        rows: [
            { type: 'basic', count: 2, startX: 60 },      // Końce V
            { type: 'basic', count: 4, startX: 120 },     // Szersze ramiona
            { type: 'basic', count: 6, startX: 180 },     // Jeszcze szersze
            { type: 'basic', count: 8, startX: 120 },     // Prawie pełne
            { type: 'basic', count: 10, startX: 60 }      // Pełna podstawa
        ]
    },

    // 3. Arrow (Strzałka) - odwrócona piramida wskazująca na gracza
    arrow: {
        rows: [
            { type: 'basic', count: 10, startX: 60 },     // Szeroka góra
            { type: 'basic', count: 8, startX: 120 },     // Zwęża się
            { type: 'basic', count: 6, startX: 180 },     // Jeszcze węższe
            { type: 'basic', count: 4, startX: 240 },     // Prawie ostrze
            { type: 'basic', count: 2, startX: 300 }      // Ostrze strzałki
        ]
    },

    // 4. Walls (Korytarz) - dwie ściany z przejściem w środku
    walls: {
        rows: [
            { type: 'basic', count: 4, startX: 60 },      // Lewa ściana
            { type: 'basic', count: 4, startX: 660 },     // Prawa ściana
            { type: 'basic', count: 4, startX: 60 },
            { type: 'basic', count: 4, startX: 660 },
            { type: 'basic', count: 4, startX: 60 },
            { type: 'basic', count: 4, startX: 660 }
        ]
    },

    // 5. Cross (Krzyż) - formacja plus
    cross: {
        rows: [
            { type: 'basic', count: 2, startX: 300 },     // Pionowa góra
            { type: 'basic', count: 2, startX: 300 },     // Pionowa
            { type: 'basic', count: 10, startX: 60 },     // Pozioma przez środek
            { type: 'basic', count: 2, startX: 300 },     // Pionowa
            { type: 'basic', count: 2, startX: 300 }      // Pionowa dół
        ]
    },

    // 6. BOSS: Diamond Formation - szeroki diament z bossem w górze
    diamondBoss: {
        rows: [
            {
                type: 'boss',
                count: 1,
                startX: 560,  // Boss w centrum (80px wide, więc 560 = center)
                weaponType: 'triple',  // Boss z potrójnym strzałem
                fireRateMultiplier: 1.2
            },
            { type: 'basic', count: 3, startX: 360 },     // Ochrona bossa
            { type: 'basic', count: 6, startX: 240 },     // Szeroki diament
            { type: 'basic', count: 10, startX: 60 },     // Najszersza część
            { type: 'basic', count: 8, startX: 120 },     // Zwęża się
            { type: 'basic', count: 4, startX: 300 }      // Koniec diamentu
        ]
    },

    // 7. BOSS: Fortress - gruby prostokąt z bossem nad nim (trudny)
    fortress: {
        rows: [
            {
                type: 'boss',
                count: 1,
                startX: 560,  // Boss w centrum
                weaponType: 'rapid',  // Boss rapid fire - bardzo niebezpieczny!
                fireRateMultiplier: 2.5  // Strzela 2.5x częściej
            },
            { type: 'basic', count: 10, startX: 60 },     // Pierwsza warstwa ochrony
            { type: 'basic', count: 10, startX: 60 },     // Druga warstwa
            { type: 'basic', count: 10, startX: 60 },     // Trzecia warstwa
            { type: 'basic', count: 10, startX: 60 },     // Czwarta warstwa
            { type: 'basic', count: 10, startX: 60 }      // Gruba ściana
        ]
    }
};

// Pattern rotation sequence - creates variety and progression
const PATTERN_SEQUENCE = [
    'basic',        // Wave 1
    'vformation',   // Wave 2
    'arrow',        // Wave 3
    'walls',        // Wave 4
    'diamondBoss',  // Wave 5 - Boss!
    'cross',        // Wave 6
    'basic',        // Wave 7
    'vformation',   // Wave 8
    'arrow',        // Wave 9
    'fortress'      // Wave 10 - Trudny Boss!
];

// Pattern selection logic - determines which pattern to use for a given wave
export function getPatternForWave(waveNumber) {
    // Use sequence rotation (every 10 waves repeats)
    const sequenceIndex = (waveNumber - 1) % PATTERN_SEQUENCE.length;
    const patternName = PATTERN_SEQUENCE[sequenceIndex];

    return WAVE_PATTERNS[patternName];
}
