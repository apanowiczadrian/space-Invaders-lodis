// LODIS - GALAGA Service Worker
// Version 2.0.0

const CACHE_NAME = 'lodis-galaga-v2.1';

// Get the base path from the service worker's own location
const getBasePath = () => {
  const swPath = self.location.pathname;
  return swPath.substring(0, swPath.lastIndexOf('/') + 1);
};

const basePath = getBasePath();

const urlsToCache = [
  `${basePath}`,
  `${basePath}index.html`,
  `${basePath}manifest.json`,
  `${basePath}css/style.css`,
  `${basePath}js/sketch.js`,
  `${basePath}js/Game.js`,
  `${basePath}js/core/constants.js`,
  `${basePath}js/core/viewport.js`,
  `${basePath}js/core/input.js`,
  `${basePath}js/core/GameStates.js`,
  `${basePath}js/entities/Player.js`,
  `${basePath}js/entities/Enemy.js`,
  `${basePath}js/entities/Projectile.js`,
  `${basePath}js/entities/PowerUp.js`,
  `${basePath}js/entities/Comet.js`,
  `${basePath}js/systems/PowerUpManager.js`,
  `${basePath}js/systems/CometManager.js`,
  `${basePath}js/systems/ScoreManager.js`,
  `${basePath}js/systems/WeaponHeatSystem.js`,
  `${basePath}js/systems/SpatialGrid.js`,
  `${basePath}js/systems/EnemyBatchRenderer.js`,
  `${basePath}js/systems/TextCache.js`,
  `${basePath}js/ui/StartMenu.js`,
  `${basePath}js/ui/GameOverScreen.js`,
  `${basePath}js/ui/DevOverlay.js`,
  `${basePath}js/ui/PerformanceMonitor.js`,
  `${basePath}js/ui/TouchStrip.js`,
  `${basePath}js/ui/CanvasButton.js`,
  `${basePath}js/ui/WeaponHeatBar.js`,
  `${basePath}js/utils/leaderboardAPI.js`,
  `${basePath}js/utils/analytics.js`,
  `${basePath}js/config/wavePatterns.js`,
  `${basePath}assets/spaceship.png`,
  `${basePath}assets/spaceship512.png`,
  `${basePath}assets/boss.png`,
  `${basePath}assets/penguin/1.png`,
  `${basePath}assets/penguin/2.png`,
  `${basePath}assets/penguin/3.png`,
  `${basePath}assets/penguin/4.png`,
  `${basePath}assets/penguin/5.png`,
  `${basePath}assets/penguin/6.png`,
  `${basePath}assets/penguin/7.png`,
  `${basePath}assets/penguin/8.png`,
  `${basePath}assets/penguin/9.png`,
  `${basePath}assets/comet.png`,
  `${basePath}assets/heart.png`,
  `${basePath}assets/shield.png`,
  `${basePath}assets/autofire.png`,
  `${basePath}assets/tripleshot.png`,
  `${basePath}assets/rocket.png`,
  `${basePath}assets/PressStart2P-Regular.ttf`
];

// Install event - cache all assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activation complete');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event - cache-first strategy with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip cross-origin requests (Google Fonts, Google Sheets API, etc.)
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((response) => {
        // Cache hit - return cached response
        if (response) {
          return response;
        }

        // Cache miss - fetch from network
        return fetch(request)
          .then((response) => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response (can only be consumed once)
            const responseToCache = response.clone();

            // Cache the new resource
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              });

            return response;
          })
          .catch((error) => {
            console.error('[Service Worker] Fetch failed:', error);
            throw error;
          });
      })
  );
});

// Message event - handle commands from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
