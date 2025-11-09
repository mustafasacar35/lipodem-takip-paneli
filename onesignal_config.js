// ====================================
// ONESIGNAL YAPILANDIRMASI
// ====================================
// OneSignal Dashboard'dan aldığın kodları buraya yapıştır

window.ONESIGNAL_CONFIG = {
    // OneSignal App ID (Dashboard -> Settings -> Keys & IDs)
    appId: '109f129c-cd73-4708-ba9a-b3c8103c52dc',
    
    // REST API Key (Dashboard -> Settings -> Keys & IDs)
    restApiKey: 'os_v2_app_ccprfhgnondqrou2wpebapcs3sshs5tdqpwelm5zm7xysb6kq3boen3vmnhijjcqhecxomvo6rbdvdyjj5t3ijkpxpkg46qnf6kdnba',
    
    // Safari Web ID (Safari için gerekli, şimdilik boş bırak)
    safariWebId: null,
    
    // Bildirim ayarları
    notificationSettings: {
        // Bildirim isteği zamanı
        autoPrompt: true, // Sayfa açılınca otomatik izin iste
        
        // Bildirim metni
        promptOptions: {
            actionMessage: "Yeni hasta mesajlarından haberdar olmak ister misiniz?",
            acceptButtonText: "İzin Ver",
            cancelButtonText: "Şimdi Değil"
        },
        
        // Ses ve badge
        sound: true,
        badge: true,
        vibration: true
    }
};

// Test için log
console.log('OneSignal Config yüklendi:', window.ONESIGNAL_CONFIG.appId ? '✅ APP_ID mevcut' : '❌ APP_ID eksik');
