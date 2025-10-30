// Service Worker - PWA için offline çalışma ve hızlı yükleme
const CACHE_NAME = 'lipodem-takip-v2';
const urlsToCache = [
  './patient_nutrition.html',
  './patient_dashboard.html',
  './index.html',
  './login.html',
  './nutrition_data_manager.js',
  './manifest.json'
];

// Service Worker kurulumu
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache açıldı');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Eski cache'leri temizle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network-first stratejisi (önce internetten, sonra cache'den)
self.addEventListener('fetch', (event) => {
  // Skip caching for non-GET requests (PUT, POST, DELETE etc.)
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Başarılı yanıtı cache'e kaydet (sadece GET istekleri için)
        if (response.status === 200 && event.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          }).catch(err => {
            console.warn('Cache put failed:', err);
          });
        }
        return response;
      })
      .catch(() => {
        // Network başarısız, cache'den dön (sadece GET istekleri için)
        return caches.match(event.request);
      })
  );
});
