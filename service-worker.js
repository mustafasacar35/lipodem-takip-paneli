// Service Worker - PWA için offline çalışma ve hızlı yükleme
const CACHE_NAME = 'lipodem-takip-v11'; // ✅ Versiyon artırıldı - ZORLA YENİLEME
const BASE_PATH = ''; // ✅ Root path - manifest.json ile uyumlu
const urlsToCache = [
  '/entry.html',
  '/login.html',
  '/patient_nutrition.html',
  '/patient_dashboard.html',
  '/mobil_versiyon_v1.html', // ✅ Mobil yemek bulucu
  '/admin_settings.html',
  '/admin_patients.html',
  '/admin_chat.html',
  '/sabloncu.html',
  '/auth.js',
  '/admin_auth.js',
  '/admin_chat.js',
  '/nutrition_data_manager.js',
  '/template_manager.js',
  '/chat_manager.js',
  '/badge_manager.js',
  '/ios-install-prompt.js',
  '/onesignal_config.js',
  '/manifest.json',
  '/logo.png'
  // logo2.png, logo3.png, logo4.png yok - kaldırıldı
];

// Service Worker kurulumu
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker v11 kuruluyor...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ Cache açıldı:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting(); // Hemen yeni versiyona geç
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

  // GitHub API ve raw.githubusercontent çağrılarını ASLA cache'leme
  const url = event.request.url;
  if (url.includes('api.github.com') || 
      url.includes('raw.githubusercontent.com') || 
      url.includes('settings/config.json')) {
    console.log('🌐 GitHub API - cache atlanıyor:', url);
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
