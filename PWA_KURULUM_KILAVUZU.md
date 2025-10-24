# 📱 iPhone PWA Kurulum Kılavuzu

## ✅ Eklenen Dosyalar

1. **manifest.json** - PWA manifest dosyası (uygulama bilgileri)
2. **service-worker.js** - Offline çalışma ve performans için
3. **ios-install-prompt.js** - iPhone kullanıcıları için otomatik yönlendirme
4. **pwa-register.html** - Service Worker kayıt scripti (isteğe bağlı)

## 🎯 Nasıl Çalışır?

### iOS Kullanıcıları İçin Otomatik Rehber

iPhone veya iPad'den hasta paneline girdiğinizde:

1. **Otomatik Popup Gösterilir** (2 saniye sonra)
   - Kullanıcı Safari'de ana sayfayı açtığında
   - Henüz ana ekrana eklememişse
   - Daha önce görmediyse

2. **Adım Adım Talimat**
   - "Ana Ekrana Ekle" için nasıl yapılacağı gösterilir
   - Paylaş butonu (⬆️📤) gösterilir
   - 3 basit adım ile rehberlik edilir

3. **Bir Kez Gösterilir**
   - Kullanıcı "Anladım" derse bir daha gösterilmez
   - "Daha Sonra" derse kapatılır ama tekrar gösterilebilir

### Android Kullanıcıları İçin

- Chrome otomatik olarak "Ana Ekrana Ekle" önerisi gösterir
- Mevcut kod zaten bunu destekliyor

## 📋 patient_dashboard.html'e Eklenenler

```html
<!-- Manifest linki (zaten vardı, href eklendi) -->
<link id="manifestLink" rel="manifest" href="manifest.json">

<!-- iOS Install Prompt Script (yeni eklendi) -->
<script src="ios-install-prompt.js"></script>
```

## 🚀 Kurulum

### Seçenek 1: Mevcut Dosya Yapısını Kullan (Önerilen)
Tüm dosyalar zaten oluşturuldu ve `patient_dashboard.html` güncellendi. Hiçbir şey yapmanız gerekmiyor!

### Seçenek 2: Manuel Kontrol

1. **manifest.json** dosyasının root dizininde olduğundan emin olun
2. **service-worker.js** dosyasının root dizininde olduğundan emin olun
3. **ios-install-prompt.js** dosyasının root dizininde olduğundan emin olun

## 📱 Test Etme

### iOS'ta Test:
1. iPhone Safari'de `patient_dashboard.html` sayfasını açın
2. 2 saniye bekleyin
3. Alt kısımdan mavi bir popup çıkmalı
4. Talimatları takip edin

### Android'de Test:
1. Chrome'da sayfayı açın
2. Chrome otomatik olarak "Ana Ekrana Ekle" önerisi gösterecek

## 🎨 Özelleştirmeler

### Popup Renklerini Değiştirme
`ios-install-prompt.js` dosyasındaki CSS'i düzenleyin:
```javascript
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Popup Gösterilme Süresini Değiştirme
```javascript
setTimeout(showInstallPrompt, 2000); // 2000ms = 2 saniye
```

### Popup'ı Tamamen Kapatma
`patient_dashboard.html` dosyasından şu satırı silin:
```html
<script src="ios-install-prompt.js"></script>
```

## ⚠️ Önemli Notlar

1. **iOS Kısıtlaması**: Apple, PWA'ların programatik olarak (otomatik) ana ekrana eklenmesine izin vermiyor. Bu yüzden kullanıcıya rehberlik ediyoruz.

2. **HTTPS Gerekli**: PWA özellikleri sadece HTTPS üzerinden çalışır (localhost hariç).

3. **Safari Zorunlu**: iOS'ta PWA'lar sadece Safari ile ana ekrana eklenebilir (Chrome, Firefox değil).

4. **LocalStorage**: Popup'ın gösterilip gösterilmediği localStorage'da tutulur. Tarayıcı önbelleği temizlenirse tekrar gösterilir.

## 🔧 Sorun Giderme

### Popup Gösterilmiyor
- Safari Developer Console'u açın (Settings > Safari > Advanced > Web Inspector)
- Konsola bakın, hata var mı kontrol edin
- `localStorage.removeItem('ios-install-prompt-seen')` komutu ile sıfırlayın

### Service Worker Çalışmıyor
- HTTPS kullandığınızdan emin olun
- Console'da service worker hatalarına bakın
- Chrome DevTools > Application > Service Workers

### Manifest Yüklenmiyor
- `manifest.json` dosyasının doğru yolda olduğundan emin olun
- Browser console'da 404 hatası var mı kontrol edin
- JSON formatının geçerli olduğundan emin olun

## 📚 Ek Kaynaklar

- [Apple PWA Documentation](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev PWA](https://web.dev/progressive-web-apps/)

---

**Not**: Bu sistem iOS'un teknik kısıtlamaları nedeniyle %100 otomatik değil, ama kullanıcıya mümkün olan en iyi rehberliği sağlıyor. 🎯
