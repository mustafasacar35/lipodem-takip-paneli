// Service Worker - PWA için offline çalışma ve hızlı yükleme
const CACHE_NAME = 'lipodem-takip-v1';
const urlsToCache = [
  '/patient_dashboard.html',
  '/index.html',
  '/login.html'
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
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Başarılı yanıtı cache'e kaydet
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network başarısız, cache'den dön
        return caches.match(event.request);
      })
  );
});
