# Patient Update API

Hasta bilgilerini GitHub'a güncelleyen Vercel serverless function.

## Endpoint

```
POST https://lipodem-takip-paneli.vercel.app/api/update-patient
```

## Request Body

```json
{
  "name": "Ali",
  "surname": "Yılmaz",
  "age": 35,
  "gender": "Erkek",
  "weight": 80.5,
  "height": 175,
  "username": "ali123",
  "password": "yenisifre" // opsiyonel
}
```

## Parameters

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `name` | string | ✅ | Hastanın adı |
| `surname` | string | ✅ | Hastanın soyadı |
| `age` | number | ✅ | Yaş (1-150 arası) |
| `gender` | string | ✅ | Cinsiyet (Kadın/Erkek/Diğer) |
| `weight` | number | ✅ | Kilo (kg) |
| `height` | number | ✅ | Boy (cm) |
| `username` | string | ✅ | Kullanıcı adı (değiştirilemez) |
| `password` | string | ❌ | Yeni şifre (varsa) |
| `passwordHash` | string | ❌ | SHA-256 hash'lenmiş şifre |

## Response

### Success (200)

```json
{
  "success": true,
  "message": "Hasta bilgileri başarıyla güncellendi",
  "data": {
    "name": "Ali",
    "surname": "Yılmaz",
    "age": 35,
    "gender": "Erkek",
    "weight": 80.5,
    "height": 175,
    "bmi": "26.3"
  }
}
```

### Error (400/404/500)

```json
{
  "success": false,
  "error": "Hasta dosyası bulunamadı"
}
```

## Ne Yapar?

1. 📥 İstek verisini alır
2. ✅ Validasyon yapar (eksik alan kontrolü)
3. 📂 GitHub'dan hasta dosyasını çeker (`hastalar/patient_USERNAME.json`)
4. 🔄 Bilgileri günceller (ad, soyad, yaş, cinsiyet, kilo, boy, BMI)
5. 🔒 Şifre varsa hash'leyip ekler
6. 💾 GitHub'a geri yazar (commit yapar)
7. 🔑 Şifre değiştiyse `hastalar/index.json`'u da günceller

## Security

- 🔐 GitHub token environment variable olarak saklanır
- 🔒 Şifreler SHA-256 ile hash'lenir
- ✅ CORS headers yapılandırılmış
- 🚫 Sadece POST metoduna izin verir

## Environment Variables

Vercel'de şu environment variable gerekli:

```
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxx
```

## GitHub Integration

API şu dosyaları günceller:

1. **Hasta dosyası:** `hastalar/patient_${username}.json`
   - Tüm hasta bilgileri
   - BMI otomatik hesaplanır
   - `lastUpdated` timestamp eklenir

2. **Index dosyası:** `hastalar/index.json` (sadece şifre değişirse)
   - Kullanıcı listesi
   - Login bilgileri (username, passwordHash)

## BMI Calculation

```javascript
BMI = weight / (height/100)²
```

Örnek:
- Kilo: 80 kg
- Boy: 175 cm
- BMI: 80 / (1.75)² = 26.1

## Error Codes

| Code | Açıklama |
|------|----------|
| 200 | ✅ Başarılı |
| 400 | ❌ Eksik/geçersiz veri |
| 404 | ❌ Hasta dosyası bulunamadı |
| 405 | ❌ Yanlış HTTP metodu |
| 500 | ❌ Sunucu/GitHub hatası |

## Testing

```bash
# cURL ile test
curl -X POST https://lipodem-takip-paneli.vercel.app/api/update-patient \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "surname": "Kullanıcı",
    "age": 30,
    "gender": "Kadın",
    "weight": 65,
    "height": 160,
    "username": "test123"
  }'
```

## Logs

Vercel Dashboard → Deployments → Latest → View Function Logs

Hata ayıklama için `console.error` kullanılır.

## Rate Limits

- GitHub API: 5000 request/hour (authenticated)
- Vercel: Function execution 10 saniye timeout
