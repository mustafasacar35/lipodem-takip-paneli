// Service Worker - PWA için offline çalışma ve hızlı yükleme - CACHE KILLER 2025
const CACHE_NAME = 'lipodem-takip-v18-PWA'; // ✅ V18 - PWA Cache (OneSignal ayrı)
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
  '/manifest-patient-nutrition.json',  // ✅ Patient Nutrition Manifest
  '/manifest-admin-settings.json',
  '/manifest-admin-patients.json',
  '/manifest-admin-chat.json',
  '/logo.png',
  '/logo2.png',  // ✅ Admin Settings
  '/logo3.png',  // ✅ Admin Patients
  '/logo4.png'   // ✅ Admin Chat
];

// Service Worker kurulumu
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker v18 PWA kuruluyor...');
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

// 🔔 Push Notification Event - Background bildirimler için
self.addEventListener('push', (event) => {
  console.log('📬 Push notification alındı:', event);
  
  let notificationData = {
    title: 'Yeni Mesaj',
    body: 'Yeni bir mesajınız var',
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [200, 100, 200, 100, 200]
  };

  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || data.message || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        vibrate: data.vibrate || notificationData.vibrate,
        tag: data.tag || 'default',
        data: data
      };
    } catch (error) {
      console.error('Push data parse hatası:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      vibrate: notificationData.vibrate,
      tag: notificationData.tag,
      data: notificationData.data,
      requireInteraction: false
    })
  );
});

// 🖱️ Notification Click Event - Bildirimine tıklandığında
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Bildirime tıklandı:', event);
  event.notification.close();

  // Get the URL from notification data or default to root
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (let client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
