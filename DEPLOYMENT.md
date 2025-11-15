# Lipodem Takip Paneli - Vercel Deployment Rehberi

## 🚀 Hızlı Başlangıç

### 1. GitHub Token Oluştur

1. GitHub'da sağ üst **Profile** → **Settings** → **Developer settings**
2. **Personal access tokens** → **Tokens (classic)** → **Generate new token**
3. Token adı: `lipodem-vercel-api`
4. Permissions (izinler):
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Action workflows)
5. **Generate token** butonuna tıkla
6. **Tokeni kopyala** (bir daha gösterilmez!)

---

### 2. Vercel'e Deploy

#### Yöntem A: Web Dashboard (Önerilen)

1. https://vercel.com adresine git
2. **Add New** → **Project** tıkla
3. GitHub hesabını bağla (Connect GitHub)
4. `lipodem-takip-paneli` repository'sini seç
5. **Import** butonuna tıkla

**Environment Variables Ekle:**
- `GITHUB_TOKEN` → (Yukarıda oluşturduğun token)

6. **Deploy** butonuna tıkla
7. ✅ Deployment tamamlanınca URL'ini al (örn: `https://lipodem-takip-paneli.vercel.app`)

---

#### Yöntem B: Vercel CLI

```bash
# Vercel CLI kur (ilk kez)
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Environment variable ekle
vercel env add GITHUB_TOKEN
# → Token'ı yapıştır
# → Production için "y"
# → Preview için "y"
# → Development için "n"

# Production'a deploy
vercel --prod
```

---

### 3. Deployment Sonrası Kontrol

#### API Test Et:

```bash
# POST isteği gönder (örnek)
curl -X POST https://lipodem-takip-paneli.vercel.app/api/update-patient \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "surname": "Hasta",
    "age": 30,
    "gender": "Kadın",
    "weight": 70,
    "height": 165,
    "username": "test123",
    "passwordHash": "abc123..."
  }'
```

**Beklenen Yanıt:**
```json
{
  "success": true,
  "message": "Hasta bilgileri başarıyla güncellendi",
  "data": {
    "name": "Test",
    "surname": "Hasta",
    "age": 30,
    "gender": "Kadın",
    "weight": 70,
    "height": 165,
    "bmi": "25.7"
  }
}
```

---

### 4. Mobil Sayfada URL'i Güncelle

`mobil_versiyon_v1.html` dosyasında API URL'ini güncelle:

```javascript
// Satır ~1445
const apiUrl = 'https://lipodem-takip-paneli.vercel.app/api/update-patient';
```

✅ Artık hasta ayarları modalı GitHub'a yazacak!

---

## 🔧 Sorun Giderme

### "GitHub token yapılandırılmamış" Hatası

**Çözüm:**
1. Vercel Dashboard → Proje → **Settings** → **Environment Variables**
2. `GITHUB_TOKEN` değişkenini kontrol et
3. Yoksa ekle, varsa değerini güncelle
4. **Redeploy** et (Deployments → Latest → ⋯ → Redeploy)

---

### "Hasta dosyası bulunamadı" Hatası

**Çözüm:**
- Hastanın GitHub'da dosyası var mı kontrol et:
  `hastalar/patient_USERNAME.json`
- Yoksa önce admin panelinden hasta oluştur

---

### CORS Hatası

**Çözüm:**
- `vercel.json` dosyası doğru yapılandırılmış mı kontrol et
- Headers bölümünde `Access-Control-Allow-Origin: *` var mı?
- Redeploy et

---

## 📊 Deployment Durumu

Deployment sonrası kontrol:
- ✅ Vercel Dashboard → Deployments → Latest → "Ready"
- ✅ Functions → `api/update-patient.js` → "Success"
- ✅ Domains → URL'in çalıştığı

---

## 🎯 Son Adımlar

1. ✅ GitHub Token oluştur
2. ✅ Vercel'e deploy et
3. ✅ Environment variables ekle
4. ✅ API test et
5. ✅ mobil_versiyon_v1.html'de URL güncelle
6. ✅ GitHub'a commit & push
7. ✅ Gerçek hasta ile test et

---

## 📝 Notlar

- **Token Güvenliği:** GitHub token'ı asla kodda yazmayın, sadece Vercel environment variable olarak kullanın
- **Rate Limiting:** GitHub API 5000 request/hour limiti var (authenticated)
- **Backup:** Deployment öncesi GitHub'da commit edin
- **Monitoring:** Vercel Dashboard → Analytics → Function calls

---

## 🆘 Yardım

Hata durumunda:
1. Vercel Dashboard → Deployments → Latest → "View Function Logs"
2. Console'da hata mesajlarını kontrol et
3. GitHub token'ın yetkilerini kontrol et

**Başarılar! 🚀**
