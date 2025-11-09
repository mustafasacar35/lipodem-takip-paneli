# 🏥 Lipodem Takip Paneli

Diyetisyen ve hastalar için beslenme takip sistemi. Admin-hasta mesajlaşma, online status, bildirimler.

## 🚀 Özellikler

- ✅ **Admin-Hasta Mesajlaşma**: Gerçek zamanlı chat
- ✅ **Online Status**: Yeşil nokta ile aktif hastalar
- ✅ **Push Bildirimleri**: OneSignal ile anlık bildirimler
- ✅ **Mesaj Silme**: "Benden sil" veya "Herkesten sil"
- ✅ **Bildirim Kontrolü**: Tüm bildirimler veya hastaya özel sessize alma
- ✅ **WhatsApp Tarzı UI**: Tarih grupları, inline saatler, görüldü tikleri

---

## 📋 Gereksinimler

### 1. Supabase Hesabı
- [supabase.com](https://supabase.com) - Ücretsiz hesap
- PostgreSQL veritabanı
- Realtime subscriptions

### 2. OneSignal Hesabı
- [onesignal.com](https://onesignal.com) - Ücretsiz hesap
- Web Push bildirimleri

---

## 🔧 Kurulum

### 1️⃣ Repository'yi Klonlayın
```bash
git clone https://github.com/KULLANICI_ADI/lipodem-takip-paneli.git
cd lipodem-takip-paneli
```

### 2️⃣ Config Dosyası Oluşturun
```bash
cp config.example.js config.js
```

**config.js** dosyasını düzenleyin:
```javascript
// OneSignal ayarları
window.ONESIGNAL_CONFIG = {
    appId: 'YOUR_ONESIGNAL_APP_ID',
    restApiKey: 'YOUR_REST_API_KEY'
};
```

### 3️⃣ Supabase Kurulumu

#### A. Proje Oluşturun
1. [Supabase Dashboard](https://supabase.com/dashboard)
2. "New Project" → Proje adı ve şifre belirleyin
3. Region seçin (yakın lokasyon)

#### B. Database Bilgilerini Alın
1. Project Settings → API
2. Şu bilgileri kopyalayın:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGc...`

#### C. Kod Dosyalarına Ekleyin

**admin_chat.js** ve **chat_manager.js** dosyalarında:
```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

#### D. SQL Tablolarını Oluşturun
1. Supabase Dashboard → SQL Editor
2. `supabase_SAFE_UPDATE.sql` dosyasını açın
3. Tüm içeriği kopyalayıp SQL Editor'e yapıştırın
4. **RUN** butonuna basın

**Beklenen Çıktı**:
```
NOTICE: ✅ sender_admin sütunu eklendi
NOTICE: ✅ deleted_for_admin sütunu eklendi
NOTICE: ✅ deleted_for_patient sütunu eklendi
Success. No rows returned
```

### 4️⃣ OneSignal Kurulumu

#### A. OneSignal App Oluşturun
1. [OneSignal Dashboard](https://onesignal.com)
2. New App/Website
3. Platform: **Web Push**
4. Site URL: `http://localhost:8000` (geliştirme için)

#### B. Bilgileri Alın
1. Settings → Keys & IDs
2. Kopyalayın:
   - **App ID**: `109f129c-...`
   - **REST API Key**: `os_v2_app_...`

#### C. config.js'e Ekleyin
```javascript
window.ONESIGNAL_CONFIG = {
    appId: 'BURAYA_APP_ID',
    restApiKey: 'BURAYA_REST_API_KEY'
};
```

### 5️⃣ Sunucuyu Başlatın

**Python** (önerilen):
```bash
python -m http.server 8000
```

**Node.js**:
```bash
npm install -g http-server
http-server -p 8000
```

**PHP**:
```bash
php -S localhost:8000
```

### 6️⃣ Sayfaları Açın

- **Admin Panel**: http://localhost:8000/admin_chat.html
  - Kullanıcı: `admin`
  - Şifre: `admin123`

- **Hasta Panel**: http://localhost:8000/patient_nutrition.html
  - Kullanıcı: `ssacar`
  - Şifre: `1234`

---

## 🌐 Canlı Yayına Alma (Vercel/Netlify)

### Vercel ile Deploy

```bash
# Vercel CLI kur
npm install -g vercel

# Deploy et
vercel

# Domain ayarları
vercel --prod
```

**vercel.json** zaten hazır:
```json
{
  "cleanUrls": true,
  "trailingSlash": false
}
```

### Netlify ile Deploy

1. GitHub repo'yu bağlayın
2. Build settings:
   - Build command: (boş)
   - Publish directory: `/`
3. Deploy!

### ⚠️ Önemli: Canlı Yayında

**OneSignal Site URL Güncelleme**:
1. OneSignal Dashboard → Settings → All Browsers
2. Site URL: `https://YOUR_DOMAIN.vercel.app`
3. Allowed Origins: Domain'inizi ekleyin

**Supabase RLS Politikaları**:
- Zaten `USING (true)` - herkes erişebilir
- Güvenlik için kullanıcı bazlı filtre ekleyebilirsiniz

---

## 📁 Dosya Yapısı

```
lipodem-takip-paneli/
├── admin_chat.html           # Admin panel UI
├── admin_chat.js             # Admin chat mantığı
├── chat_manager.js           # Hasta chat mantığı
├── patient_nutrition.html    # Hasta paneli
├── config.example.js         # Config şablonu
├── config.js                 # Gerçek config (gitignore)
├── supabase_SAFE_UPDATE.sql  # Database kurulum
├── settings/
│   └── admins.js             # Admin kullanıcıları
├── hastalar/                 # Hasta JSON dosyaları
└── .gitignore                # Gizli dosyalar
```

---

## 🔐 Güvenlik Notları

### ❌ GitHub'a Asla Yüklemeyin
- `config.js` (OneSignal keys)
- Hasta dosyaları (`hastalar/`, `patients/`)
- `.env` dosyaları

### ✅ Güvenli Yükleme
- `config.example.js` yükleyin (örnek template)
- README'de kurulum talimatları verin
- Her kullanıcı kendi config'ini oluştursun

### 💾 Chat Ayarları ve localStorage
**GÜNCELLENDİ**: Chat ayarları artık **GitHub'a kaydediliyor**! 🎉

Her admin için ayrı JSON dosyası:
```
settings/chat_admin_USERNAME.json
```

**Nasıl Çalışır:**
1. `admin_chat_settings.html` sayfasından GitHub token girin (Admin Profilleri tab)
2. Chat ayarlarını yapın (sessize alınanlar, bildirimler, vb.)
3. "💾 GitHub'a Kaydet" butonuna tıklayın
4. Dosya otomatik olarak GitHub'a yüklenir
5. Başka cihazda "🔄 GitHub'dan Yükle" ile senkronize edin

**GitHub'a Kaydedilen Ayarlar:**
```javascript
{
    "adminUsername": "admin",
    "mutedPatients": ["patient_001"],           // Sessize alınan hastalar
    "allNotificationsMuted": false,             // Tüm bildirimler kapalı mı?
    "soundEnabled": true,                       // Ses açık mı?
    "chatSettings": {...},                      // Mesaj ayarları
    "displaySettings": {...}                    // Görünüm ayarları
}
```

**localStorage Yedeği:**
Sistem hem GitHub'a kaydeder, hem de localStorage'a. Böylece offline da çalışır.

### Admin Şifreleri
`settings/admins.js` dosyasında **SHA256 hash** kullanılıyor - güvenli!

Şifre değiştirmek için:
```javascript
// Console'da çalıştır
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

hashPassword('YeniSifre123').then(hash => console.log(hash));
```

---

## 🎯 Özellikler

### Mesaj Silme
- **Herkesten Sil**: Veritabanından tamamen sil
- **Benden Sil**: Sadece admin için gizle

### Bildirim Kontrolü
- **Tüm Bildirimler**: Header toggle ile tümünü kapat
- **Hastaya Özel**: Her hasta için ayrı mute

### Online Status
- 🟢 Yeşil nokta: Son 2 dakikada aktif
- ⚪ Gri nokta: Offline
- Her 30 saniyede heartbeat

---

## 🐛 Sorun Giderme

### "Could not find table 'patients'"
```bash
# Supabase SQL Editor'de çalıştır:
supabase_SAFE_UPDATE.sql
```

### Bildirimler Gelmiyor
1. OneSignal Site URL doğru mu?
2. `http://localhost:8000` (127.0.0.1 DEĞIL!)
3. Tarayıcı izni var mı?

### Online Status Çalışmıyor
1. `patients` tablosu var mı?
2. Console'da "🟢 Heartbeat gönderildi" görüyor musunuz?
3. Admin panelinde 10 saniye bekleyin (otomatik yenileme)

---

## 📞 Destek

Sorularınız için:
- GitHub Issues
- README.md güncellemeleri
- Kod içi yorumlar

---

## 📄 Lisans

MIT License - Kişisel ve ticari kullanım serbest

---

**Hazırlayan**: Dr. Mustafa SACAR  
**Tarih**: Kasım 2025  
**Versiyon**: 3.0
