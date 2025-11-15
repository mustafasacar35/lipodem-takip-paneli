/**
 * Template Senkronizasyon Test Suite
 * 
 * Bu script, template sisteminin doğru çalıştığını test eder.
 * Manuel test senaryolarını takip edin.
 */

console.log('🧪 TEMPLATE SENKRONİZASYON TEST SÜİTİ\n');
console.log('=' .repeat(60));

// Test Senaryoları
const testSenaryolari = [
    {
        id: 1,
        baslik: 'GitHub Token Kontrolü',
        adimlar: [
            '1. admin_settings.html sayfasını aç',
            '2. GitHub Token alanını kontrol et',
            '3. Token yoksa veya süresi dolmuşsa YENİ token oluştur:',
            '   - GitHub → Settings → Developer settings → Personal access tokens',
            '   - Generate new token (classic)',
            '   - repo scope seç',
            '   - Token\'ı kopyala ve admin_settings.html\'de kaydet',
            '4. "Token Kaydet" butonuna tıkla'
        ],
        beklenen: 'Token başarıyla kaydedildi mesajı',
        kritik: true
    },
    {
        id: 2,
        baslik: 'Templates Dizini Reset (İsteğe Bağlı)',
        adimlar: [
            '1. Terminal aç',
            '2. Proje dizinine git',
            '3. reset_templates.js dosyasındaki TOKEN\'ı güncelle',
            '4. node reset_templates.js komutunu çalıştır',
            '5. Tüm day_*.json dosyalarının silindiğini doğrula',
            '6. index.json\'ın temiz (totalCount: 0) olduğunu doğrula'
        ],
        beklenen: 'Templates dizini tamamen temizlendi mesajı',
        kritik: false
    },
    {
        id: 3,
        baslik: 'Şablon Kaydetme Testi',
        adimlar: [
            '1. sabloncu.html sayfasını aç',
            '2. Bir hasta seç',
            '3. Bir hafta seç',
            '4. Bir gün seç (örn: PAZARTESİ)',
            '5. "Gün Şablonu Olarak Kaydet" butonuna tıkla',
            '6. Modal\'da şablon ismini gir (örn: "Test Menü 1")',
            '7. Tüm yemeklerin seçili olduğunu kontrol et',
            '8. "Kaydet" butonuna tıkla',
            '9. Console\'da şu logları kontrol et:',
            '   - "💾 GitHub\'a kayıt başlıyor..."',
            '   - "✅ GitHub\'a yeni kayıt başarılı (YENİ SİSTEM)"',
            '   - "🔄 window.gunSablonlari güncellendi: 1 template"',
            '10. Accordion\'da yeni şablonun göründüğünü doğrula'
        ],
        beklenen: 'Şablon başarıyla kaydedildi + Accordion güncellendi',
        kritik: true
    },
    {
        id: 4,
        baslik: 'Accordion Güncelleme Testi',
        adimlar: [
            '1. sabloncu.html → Gün Şablonları accordion\'ını aç',
            '2. Kaydedilen şablonun listelendiğini kontrol et',
            '3. Şablon kartında şu bilgilerin olduğunu doğrula:',
            '   - Şablon ismi',
            '   - Dosya adı (day_TIMESTAMP.json)',
            '   - Diyet türü',
            '   - Toplam kalori',
            '   - Makrolar (K/P/Y)',
            '4. Öğün listesinin doğru göründüğünü kontrol et',
            '5. Her yemeğin detaylarının göründüğünü kontrol et'
        ],
        beklenen: 'Tüm bilgiler doğru görüntüleniyor',
        kritik: true
    },
    {
        id: 5,
        baslik: 'Şablon Silme Testi',
        adimlar: [
            '1. sabloncu.html → Gün Şablonları accordion\'ı',
            '2. Test şablonunun yanındaki "🗑️ Sil" butonuna tıkla',
            '3. Onay dialog\'unda "OK" tıkla',
            '4. Console\'da şu logları kontrol et:',
            '   - "🗑️ GitHub\'dan siliniyor: day_XXXXX.json"',
            '   - "✅ GitHub\'dan silindi"',
            '   - "🔄 window.gunSablonlari güncellendi: 0 template"',
            '5. Accordion\'dan şablonun kaybolduğunu doğrula',
            '6. "Henüz kaydedilmiş gün şablonu yok" mesajını gör'
        ],
        beklenen: 'Şablon silindi + Accordion güncellendi',
        kritik: true
    },
    {
        id: 6,
        baslik: 'patient_nutrition.html Uyumluluk Testi',
        adimlar: [
            '1. Önce sabloncu.html\'de 2-3 şablon kaydet',
            '2. patient_nutrition.html sayfasını aç',
            '3. Bir hasta seç',
            '4. "Şablon Uygula" bölümünü bul',
            '5. Dropdown\'da kaydedilen şablonların listelendiğini kontrol et',
            '6. Bir şablon seç',
            '7. Şablonun detaylarının yüklendiğini kontrol et',
            '8. "Uygula" butonuna tıkla',
            '9. Şablon verilerinin hasta planına eklendiğini doğrula'
        ],
        beklenen: 'Şablonlar patient_nutrition.html\'de kullanılabiliyor',
        kritik: true
    },
    {
        id: 7,
        baslik: 'Cache Temizleme Testi',
        adimlar: [
            '1. F12 → Console',
            '2. Şu komutları çalıştır:',
            '   TemplateManager.clearCache(true)',
            '   gunSablonlariAccordionGuncelle(true)',
            '3. Console\'da "Full cache reset completed" mesajını gör',
            '4. Accordion\'ın GitHub\'dan fresh data ile yenilendiğini doğrula',
            '5. localStorage\'ı kontrol et (Application → Local Storage)',
            '6. Template-related key\'lerin silindiğini doğrula'
        ],
        beklenen: 'Cache tamamen temizlendi + Fresh data yüklendi',
        kritik: false
    },
    {
        id: 8,
        baslik: 'Çoklu Şablon Kaydetme Testi',
        adimlar: [
            '1. sabloncu.html → 5 farklı gün için şablon kaydet',
            '2. Her kayıt sonrası accordion\'ın güncellendiğini doğrula',
            '3. Console\'da filename\'lerin benzersiz olduğunu kontrol et:',
            '   day_TIMESTAMP1.json, day_TIMESTAMP2.json, ...',
            '4. index.json\'da totalCount\'un arttığını doğrula',
            '5. GitHub repo\'da templates/ dizinini kontrol et:',
            '   - index.json (güncel totalCount)',
            '   - 5 adet day_*.json dosyası'
        ],
        beklenen: 'Tüm şablonlar benzersiz dosyalara kaydedildi',
        kritik: true
    },
    {
        id: 9,
        baslik: 'Hata Durumu Testi (Token Yok)',
        adimlar: [
            '1. admin_settings.html → GitHub Token\'ı sil',
            '2. sabloncu.html → Şablon kaydetmeyi dene',
            '3. Console\'da "GitHub token bulunamadı!" hatasını gör',
            '4. Kullanıcıya anlamlı hata mesajı gösterildiğini doğrula',
            '5. Token\'ı tekrar ekle ve kaydetmeyi tekrar dene',
            '6. Bu sefer başarılı olduğunu doğrula'
        ],
        beklenen: 'Token yoksa anlamlı hata + Token varsa başarılı',
        kritik: false
    },
    {
        id: 10,
        baslik: 'Sayfa Yenileme Sonrası Tutarlılık',
        adimlar: [
            '1. sabloncu.html\'de birkaç şablon kaydet',
            '2. Accordion\'ı aç ve şablonları gör',
            '3. Sayfayı yenile (F5 veya Ctrl+F5)',
            '4. Sayfa yüklendikten sonra accordion\'ın otomatik güncellendiğini kontrol et',
            '5. Tüm şablonların doğru listelendiğini doğrula',
            '6. Console\'da "✅ Gün şablonları GitHub templates/ klasöründen yüklendi" mesajını gör'
        ],
        beklenen: 'Sayfa yenileme sonrası tüm şablonlar korunuyor',
        kritik: true
    }
];

// Test sonuçlarını raporla
function testRaporu() {
    console.log('\n📊 TEST RAPORU\n');
    console.log('=' .repeat(60));
    
    const kritikTestler = testSenaryolari.filter(t => t.kritik);
    const opsiyonelTestler = testSenaryolari.filter(t => !t.kritik);
    
    console.log(`\n🔴 KRİTİK TESTLER (${kritikTestler.length} adet):`);
    kritikTestler.forEach(t => {
        console.log(`  ${t.id}. ${t.baslik}`);
    });
    
    console.log(`\n🟡 OPSİYONEL TESTLER (${opsiyonelTestler.length} adet):`);
    opsiyonelTestler.forEach(t => {
        console.log(`  ${t.id}. ${t.baslik}`);
    });
    
    console.log('\n📝 TEST PROSEDÜRÜ:');
    console.log('  1. Kritik testleri sırayla çalıştır');
    console.log('  2. Her test için beklenen sonucu doğrula');
    console.log('  3. Hata varsa Console logları kontrol et');
    console.log('  4. Tüm kritik testler başarılı olmalı');
    console.log('\n' + '=' .repeat(60));
}

// Her test senaryosunu detaylı yazdır
function testDetaylari() {
    testSenaryolari.forEach(test => {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`TEST ${test.id}: ${test.baslik} ${test.kritik ? '🔴 [KRİTİK]' : '🟡 [OPSİYONEL]'}`);
        console.log('='.repeat(60));
        
        console.log('\n📋 ADIMLAR:');
        test.adimlar.forEach(adim => {
            console.log(`  ${adim}`);
        });
        
        console.log(`\n✅ BEKLENEN SONUÇ:`);
        console.log(`  ${test.beklenen}`);
        
        console.log('\n');
    });
}

// Menü
console.log('\n📖 KULLANIM:');
console.log('  testRaporu()     - Test özetini göster');
console.log('  testDetaylari()  - Tüm test adımlarını göster');
console.log('\n');

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testSenaryolari, testRaporu, testDetaylari };
}
