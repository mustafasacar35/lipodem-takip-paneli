/**
 * ==========================================
 * TEMPLATE SENKRONİZASYON SİSTEMİ
 * ==========================================
 * 
 * Bu doküman, şablon sistemi senkronizasyonunun nasıl çalıştığını açıklar.
 * 
 * 1. MİMARİ
 * ----------
 * GitHub templates/ dizini:
 *   - index.json: Tüm şablonların metadata'sı (hafif, hızlı)
 *   - day_TIMESTAMP.json: Bireysel şablon dosyaları (lazy loading)
 * 
 * Cache Katmanları:
 *   - Memory: TemplateManager.indexCache, TemplateManager.templateCache
 *   - LocalStorage: templateIndexCache, templateManagerCache_*
 * 
 * 2. MUTEX SİSTEMİ
 * -----------------
 * index.json güncellemeleri MUTEX ile korunur (race condition önleme):
 *   - acquireIndexLock(): Lock alır, kuyrukta bekler
 *   - releaseIndexLock(): Lock serbest bırakır, kuyruktaki sonraki işlemi başlatır
 * 
 * 3. OPERASYONLAR
 * ----------------
 * 
 * a) KAYDETME (Save)
 * -------------------
 * sabloncu.html: gunSablonuKaydetOnay()
 *   ↓
 * template_manager.js: saveTemplate(template, token)
 *   1. Dosya adı oluştur: day_TIMESTAMP.json (timestamp benzersiz ID'den)
 *   2. SHA al (mevcut dosya varsa)
 *   3. Template dosyasını kaydet (GitHub API PUT)
 *   4. MUTEX LOCK → index.json'ı güncelle → UNLOCK
 *   5. Cache güncelle (memory + localStorage)
 *   ↓
 * sabloncu.html: Cache temizle + Accordion güncelle
 *   - TemplateManager.clearCache(true)
 *   - gunSablonlariAccordionGuncelle(forceRefresh=true)
 * 
 * b) SİLME (Delete)
 * ------------------
 * sabloncu.html: gunSablonuSil(sablonId)
 *   ↓
 * sabloncu.html: persistDayTemplateChange('delete', sablonId)
 *   ↓
 * template_manager.js: deleteTemplate(filename, templateId, token)
 *   1. SHA al (dosya kontrolü)
 *   2. Template dosyasını sil (GitHub API DELETE)
 *   3. MUTEX LOCK → index.json'dan kaldır → UNLOCK
 *   4. Cache temizle (memory + localStorage)
 *   ↓
 * sabloncu.html: Cache temizle + Accordion güncelle
 *   - TemplateManager.clearCache(true)
 *   - window.gunSablonlari güncelle
 *   - gunSablonlariAccordionGuncelle(forceRefresh=true)
 * 
 * c) GÜNCELLEME (Update)
 * -----------------------
 * sabloncu.html: persistDayTemplateChange('update', sablonId, partial)
 *   ↓
 * template_manager.js: saveTemplate(updatedTemplate, token)
 *   (Kaydetme ile aynı akış)
 * 
 * 4. SENKRONİZASYON GARANTİLERİ
 * -------------------------------
 * 
 * ✅ Dosya adları benzersiz: day_TIMESTAMP.json (çakışma yok)
 * ✅ index.json güncellemeleri atomik: MUTEX koruması
 * ✅ Cache tutarlılığı: Her operasyonda tam temizleme
 * ✅ UI yenileme: Her operasyonda accordion GitHub'dan fresh data
 * ✅ Hata yönetimi: Retry mekanizması (SHA conflict)
 * 
 * 5. PATIENT_NUTRITION.HTML UYUMLULUĞU
 * --------------------------------------
 * 
 * patient_nutrition.html şablonları şu şekilde kullanır:
 *   - TemplateManager.loadIndex(): Metadata listesi
 *   - TemplateManager.loadTemplates(filenames): Lazy loading
 *   - Format: { id, name, filename, ogunler, foods, totalMacros }
 * 
 * Tüm şablonlar bu formatta kaydedilir (sabloncu.html + patient_nutrition.html uyumlu)
 * 
 * 6. CACHE YÖNETİMİ
 * ------------------
 * 
 * clearCache(fullReset=false):
 *   - false: Sadece index.json cache temizle
 *   - true: Tüm template cache'leri temizle (index + individual files)
 * 
 * forceRefresh(token):
 *   - Full cache reset
 *   - GitHub'dan fresh index.json yükle
 *   - Kullanım: Save/Delete sonrası UI güncellemesi
 * 
 * 7. GÜNCEL DURUM (2025-01-04)
 * -----------------------------
 * 
 * ✅ template_manager.js: MUTEX korumalı, atomik operasyonlar
 * ✅ sabloncu.html: Tüm operasyonlarda accordion güncelleme
 * ✅ patient_nutrition.html: TemplateManager ile uyumlu
 * ✅ Cache yönetimi: clearCache + forceRefresh
 * 
 * KULLANIM TALİMATI:
 * ------------------
 * 
 * 1. Admin Settings'de GitHub token ayarla
 * 2. Templates dizinini reset et (isteğe bağlı):
 *    - node reset_templates.js
 * 3. Şablon kaydet: sabloncu.html → Kaydet butonu
 * 4. Şablon sil: sabloncu.html → Accordion → Sil butonu
 * 5. Hasta beslenme planında kullan: patient_nutrition.html → Şablon seç
 * 
 * SORUN GİDERME:
 * ---------------
 * 
 * 1. "404 Not Found" hatası:
 *    - GitHub token süresi dolmuş → Yeni token al (admin_settings.html)
 *    - Dosya gerçekten yok → reset_templates.js çalıştır
 * 
 * 2. "Duplicate template" uyarısı:
 *    - Normal (şablon zaten var, versiyon artırılmadı)
 * 
 * 3. Accordion güncellenmiyor:
 *    - F12 → Console → Hata kontrolü
 *    - Cache temizle: TemplateManager.clearCache(true)
 *    - Sayfa yenile (Ctrl+F5)
 * 
 * 4. Senkronizasyon bozuk:
 *    - Cache temizle: localStorage.clear()
 *    - Templates reset: node reset_templates.js (yeni token ile)
 *    - Sayfayı yenile
 */

console.log('📘 Template Senkronizasyon Dokümantasyonu yüklendi');
console.log('ℹ️ Detaylar için bu dosyayı okuyun: TEMPLATE_SYNC_DOCS.js');
