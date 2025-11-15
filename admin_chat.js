// ====================================
// ADMIN CHAT MANAGER
// ====================================

// SUPABASE BAĞLANTISI
// ⚠️ ÖNEMLİ: chat_manager.js ile aynı bilgileri kullanın!
const SUPABASE_URL = 'https://rorkccxpjndllxemsmlo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvcmtjY3hwam5kbGx4ZW1zbWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTQxNTIsImV4cCI6MjA3NzkzMDE1Mn0.dVuUrVvBigxo2rMpUQcHKoemD7ovqejupi2OkkrxE7c';

let supabaseClient = null;
let selectedPatientId = null;
let messagesSubscription = null;
let allPatients = [];
let currentAdmin = null; // Giriş yapmış admin

// Admin authentication kontrolü - admin_auth.js session'ını kullan
async function checkAdminAuth() {
    // admin_auth.js'den session al
    if (typeof AdminAuth === 'undefined' || typeof AdminAuth.getSession !== 'function') {
        console.error('❌ AdminAuth sistemi yüklenmedi!');
        return false;
    }
    
    const session = AdminAuth.getSession();
    
    if (!session || !session.username) {
        console.log('⚠️ Session bulunamadı, admin_auth.js kontrol edecek');
        return false;
    }
    
    console.log('✅ Admin session aktif:', session.username);
    
    // currentAdmin objesi oluştur (uyumluluk için)
    currentAdmin = {
        username: session.username,
        loginTime: new Date(session.loginAt).toISOString(),
        expiresAt: new Date(session.expiresAt).toISOString()
    };
    
    // Header'a admin ismini ekle
    updateHeaderWithUsername();
    
    return true;
}

// Header'a kullanıcı adını ekle
function updateHeaderWithUsername() {
    const headerDiv = document.querySelector('.header div');
    if (headerDiv && currentAdmin) {
        // Eğer zaten eklenmişse tekrar ekleme
        if (headerDiv.querySelector('.admin-username-display')) return;
        
        const userSpan = document.createElement('span');
        userSpan.className = 'admin-username-display';
        userSpan.style.cssText = 'font-size: 14px; color: rgba(255,255,255,0.8); margin-top: 5px; display: block;';
        userSpan.textContent = `👤 ${currentAdmin.username}`;
        headerDiv.appendChild(userSpan);
    }
}

// Supabase başlat
async function initializeAdminChat() {
    console.log('🚀🚀🚀 INIT ADMIN CHAT - VERSION 2.0 🚀🚀🚀');
    
    // Admin kontrolü - admin_auth.js halledecek
    const isAuthenticated = await checkAdminAuth();
    if (!isAuthenticated) {
        console.log('⚠️ Session bulunamadı, admin_auth.js login overlay gösterecek');
        // admin_auth.js auto-guard devreye girecek, burada beklemeye gerek yok
        // Sayfayı durdurmuyoruz, sadece chat fonksiyonlarını başlatmıyoruz
        return;
    }
    
    if (typeof supabase === 'undefined') {
        alert('Supabase kütüphanesi yüklenmedi!');
        return;
    }
    
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // ✅ Hastaları yükle (AWAIT ile bekle - hasta isimleri yüklensin)
    console.log('📋 Hastalar yükleniyor...');
    await loadPatients();
    console.log('✅ Hastalar yüklendi, toplam:', allPatients.length);
    
    console.log('Admin chat başlatıldı');
    
    // OneSignal başlat (async, arka planda)
    initializeOneSignal().catch(err => {
        console.error('OneSignal başlatılamadı:', err);
    });
}

// ====================================
// ONESIGNAL BAŞLATMA (BİLDİRİM İÇİN)
// ====================================
// OneSignal v16 - HTML'de OneSignalDeferred ile init ediliyor
async function initializeOneSignal() {
    try {
        console.log('🔔 OneSignal v16 yapılandırması başlatılıyor...');
        console.log('🔍 DEBUG: OneSignal init VERSION 3.0');
        
        // OneSignal SDK'nın yüklenmesini bekle
        let attempts = 0;
        const maxAttempts = 20;
        
        while (typeof OneSignal === 'undefined' && attempts < maxAttempts) {
            console.log(`⏳ OneSignal SDK bekleniyor... (${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }
        
        // OneSignal yüklü mü kontrol et
        if (typeof OneSignal === 'undefined') {
            console.warn('⚠️ OneSignal SDK yüklenemedi (timeout), fallback aktif');
            await initNativeNotifications();
            return;
        }
        
        console.log('✅ OneSignal SDK yüklendi');
        
        // Bildirim izni durumunu kontrol et
        const permission = await OneSignal.Notifications.permission;
        console.log('📱 Bildirim izni:', permission);
        
        if (permission === 'default') {
            // İzin istenmemiş, iste
            console.log('🔔 Bildirim izni isteniyor...');
            const result = await OneSignal.Notifications.requestPermission();
            console.log('📝 İzin sonucu:', result);
        }
        
        // Push subscription oluştur (ARKA PLAN BİLDİRİMLERİ İÇİN)
        console.log('🔄 Push subscription kontrol ediliyor...');
        const subscriptionState = await OneSignal.User.PushSubscription.optedIn;
        console.log('🔍 DEBUG: Subscription state:', subscriptionState);
        
        if (!subscriptionState) {
            console.log('📬 Push subscription oluşturuluyor...');
            await OneSignal.User.PushSubscription.optIn();
            console.log('✅ Push subscription aktif - arka plan bildirimleri çalışacak');
        } else {
            console.log('✅ Push subscription zaten aktif');
        }
        
        // Subscription ID al (OneSignal v16 - Player ID yerine)
        const subscriptionId = OneSignal.User.PushSubscription.id;
        const token = OneSignal.User.PushSubscription.token;
        
        console.log('🔍 DEBUG: Subscription ID:', subscriptionId);
        console.log('🔍 DEBUG: Token:', token ? 'Var' : 'Yok');
        
        if (subscriptionId || token) {
            console.log('✅ OneSignal abone oldu - ID:', subscriptionId || 'Token mevcut');
            
            // Admin tag ekle (sadece adminlere bildirim göndermek için)
            await OneSignal.User.addTag('user_type', 'admin');
            await OneSignal.User.addTag('admin_username', currentAdmin.username);
            console.log('✅ Admin tags eklendi');
            
            // Local storage'a kaydet
            if (subscriptionId) {
                localStorage.setItem('onesignal_subscription_id', subscriptionId);
            }
        } else {
            console.warn('⚠️ Subscription ID henüz oluşmadı - bildirim izni verilmemiş olabilir.');
        }
        
        // OneSignal mesaj listener'ı ekle (foreground notifications)
        OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
            console.log('📬 OneSignal foreground notification:', event);
            // Native notification'ı da göster (çift bildirim için)
            if (event.notification && event.notification.body) {
                showNewMessageNotification({
                    message: event.notification.body,
                    sender_id: 'onesignal',
                    created_at: new Date().toISOString()
                });
            }
        });
        
        // Badge sayısını sıfırla (admin chat açıldığında)
        try {
            // Navigator Badge API ile PWA badge sıfırla
            if (window.badgeManager) {
                await window.badgeManager.clear();
                console.log('🔄 PWA Badge temizlendi (Navigator API - init)');
            }
            
            // OneSignal iOS badge sıfırlama
            await OneSignal.User.PushSubscription.optIn();
            console.log('✅ OneSignal badge sıfırlandı (init)');
        } catch (badgeError) {
            console.warn('⚠️ Badge sıfırlama hatası:', badgeError);
        }
        
        console.log('✅ OneSignal başarıyla yapılandırıldı - arka plan bildirimleri aktif');
        
    } catch (error) {
        console.error('❌ OneSignal yapılandırma hatası:', error);
        
        // FALLBACK: Native Notification API kullan
        console.log('🔄 Fallback: Native bildirim sistemi devreye alınıyor...');
        await initNativeNotifications();
    }
}

// Native Notification Fallback (OneSignal çalışmazsa)
async function initNativeNotifications() {
    try {
        if (!('Notification' in window)) {
            console.warn('⚠️ Bu tarayıcı bildirimleri desteklemiyor');
            return;
        }
        
        // İzin durumunu kontrol et
        if (Notification.permission === 'default') {
            console.log('🔔 Native bildirim izni isteniyor...');
            const permission = await Notification.requestPermission();
            console.log('📝 İzin sonucu:', permission);
        }
        
        if (Notification.permission === 'granted') {
            console.log('✅ Native bildirimler aktif');
            
            // Test bildirimi
            new Notification('💬 Lipodem Takip', {
                body: 'Bildirimler başarıyla aktif edildi!',
                icon: '/logo.png',
                badge: '/logo.png',
                vibrate: [200, 100, 200],
                tag: 'test-notification'
            });
        }
    } catch (error) {
        console.error('❌ Native bildirim hatası:', error);
    }
}

// Yeni mesaj bildirimi göster
function showNewMessageNotification(message) {
    console.log('🔔 showNewMessageNotification çağrıldı:', message);
    
    // İzin kontrolü
    console.log('📱 Notification support:', 'Notification' in window);
    console.log('🔑 Notification.permission:', Notification.permission);
    
    if (!('Notification' in window)) {
        console.error('❌ Bu tarayıcı bildirimleri desteklemiyor!');
        return;
    }
    
    if (Notification.permission !== 'granted') {
        console.warn('⚠️ Bildirim izni yok! Permission:', Notification.permission);
        
        // İzin iste
        Notification.requestPermission().then(permission => {
            console.log('📝 Yeni izin durumu:', permission);
            if (permission === 'granted') {
                // İzin verildi, bildirimi göster
                showNewMessageNotification(message);
            }
        });
        return;
    }
    
    // Muted kontrolü
    if (mutedPatients.includes(message.sender_id)) {
        console.log('🔕 Bu hasta sessize alınmış, bildirim gösterilmiyor');
        return;
    }
    
    // Hasta adını bul
    const patient = allPatients.find(p => p.id === message.sender_id);
    const patientName = patient ? patient.name : 'Hasta';
    
    console.log('👤 Hasta:', patientName);
    console.log('💬 Mesaj:', message.message);
    
    try {
        // Bildirim oluştur
        const notification = new Notification(`💬 ${patientName}`, {
            body: message.message || 'Yeni mesaj',
            icon: '/logo.png',
            badge: '/logo.png',
            vibrate: [200, 100, 200, 100, 200], // Vibrate pattern
            tag: `message-${message.id}`,
            requireInteraction: false, // 5 saniye sonra otomatik kapansın
            data: {
                patientId: message.sender_id,
                messageId: message.id,
                url: window.location.origin + '/admin_chat.html'
            }
        });
        
        console.log('✅ Notification oluşturuldu:', notification);
        
        // Bildirime tıklayınca
        notification.onclick = function(event) {
            event.preventDefault();
            console.log('🖱️ Bildirime tıklandı');
            
            // Pencereyi focus et
            window.focus();
            
            // İlgili hastayı seç
            if (message.sender_id) {
                selectPatient(message.sender_id);
            }
            
            // Bildirimi kapat
            notification.close();
        };
        
        // Ses çal
        console.log('🔊 Ses çalınıyor...');
        playNotificationSound();
        
        // Titreşim
        if ('vibrate' in navigator) {
            console.log('📳 Titreşim aktif');
            navigator.vibrate([200, 100, 200, 100, 200]);
        } else {
            console.warn('⚠️ Titreşim desteklenmiyor');
        }
        
    } catch (error) {
        console.error('❌ Bildirim oluşturma hatası:', error);
    }
}

// Bildirim sesi (opsiyonel)
function playNotificationSound() {
    try {
        // HTML5 Audio API ile basit bir "ping" sesi
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800; // Frekans (Hz)
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
        // Ses çalmazsa sessiz devam et
        console.warn('Ses çalınamadı:', error);
    }
}

// Hastaları yükle
async function loadPatients() {
    try {
        // 1. Önce tüm hastaları yükle (hastalar/index.json'dan)
        await loadAllPatientsFromIndex();
        
        // 2. Sonra mesaj bilgilerini ekle
        await updatePatientsWithMessages();
        
        // 3. Hastaları göster
        displayPatients(allPatients);
        
    } catch (error) {
        console.error('Hastalar yüklenemedi:', error);
        document.getElementById('patientList').innerHTML = `
            <div class="loading" style="color: #f44336;">
                Hastalar yüklenirken hata oluştu.<br>
                <small>${error.message}</small>
            </div>
        `;
    }
}

// Tüm hastaları index.json'dan yükle (GitHub API kaldırıldı - rate limit sorunu)
async function loadAllPatientsFromIndex() {
    try {
        // 1️⃣ index.json'dan hastaları yükle (CACHE BYPASS)
        const response = await fetch('./hastalar/index.json?t=' + Date.now(), {
            cache: 'no-store'
        });
        
        if (!response.ok) {
            throw new Error('index.json yüklenemedi');
        }
        
        const data = await response.json();
        const indexPatients = data.patients || [];
        
        console.log(`📋 index.json'da ${indexPatients.length} hasta bulundu`);
        
        // 2️⃣ Supabase'den mesajı olan hastaları da ekle
        let supabasePatientIds = new Set();
        
        if (supabaseClient) {
            try {
                const { data: messages } = await supabaseClient
                    .from('messages')
                    .select('sender_id, receiver_id, sender_type, receiver_type');
                
                if (messages) {
                    messages.forEach(msg => {
                        if (msg.sender_type === 'patient') {
                            supabasePatientIds.add(msg.sender_id);
                        }
                        if (msg.receiver_type === 'patient') {
                            supabasePatientIds.add(msg.receiver_id);
                        }
                    });
                    console.log(`� Supabase'de ${supabasePatientIds.size} hasta mesajı bulundu`);
                }
            } catch (err) {
                console.warn('⚠️ Supabase hasta listesi alınamadı:', err);
            }
        }
        
        // 3️⃣ index.json + Supabase hastalarını birleştir
        const indexPatientIds = new Set(indexPatients.map(p => p.id));
        const missingPatients = [...supabasePatientIds].filter(id => !indexPatientIds.has(id));
        
        if (missingPatients.length > 0) {
            console.log(`⚠️ index.json'da EKSIK hastalar bulundu (Supabase'den):`, missingPatients);
        }
        
        // 4️⃣ Tüm hasta listesini oluştur
        const allPatientIds = [...indexPatients.map(p => p.id), ...missingPatients];
        
        // Her hasta için isim yükle
        const patientPromises = allPatientIds.map(async (patientId) => {
            const patientData = await loadPatientName(patientId);
            const indexData = indexPatients.find(p => p.id === patientId);
            
            return {
                id: patientId,
                name: patientData.name,
                username: indexData?.username || patientData.username || '',
                lastMessage: '',
                lastMessageTime: null,
                unreadCount: 0
            };
        });
        
        allPatients = await Promise.all(patientPromises);
        
        console.log(`✅ Toplam ${allPatients.length} hasta yüklendi (index: ${indexPatients.length}, Supabase'den eklenen: ${missingPatients.length})`);
        
    } catch (error) {
        console.warn('index.json yüklenemedi, mesajlardan yüklenecek:', error);
        // Yedek: Mesajlardan yükle
        await loadPatientsFromMessages();
    }
}

// Hastaların mesaj bilgilerini güncelle
async function updatePatientsWithMessages() {
    if (!supabaseClient) return;
    
    try {
        // Tüm mesajları al
        const { data, error } = await supabaseClient
            .from('messages')
            .select('sender_id, sender_type, receiver_id, receiver_type, message, created_at')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Online status bilgilerini al
        const { data: patientsData } = await supabaseClient
            .from('patients')
            .select('patient_id, last_seen');
        
        const onlineStatus = {};
        if (patientsData) {
            patientsData.forEach(p => {
                onlineStatus[p.patient_id] = p.last_seen;
            });
        }
        
        // Her hasta için son mesaj ve okunmamış sayı
        const patientMessages = {};
        
        if (data) {
            data.forEach(msg => {
                if (msg.sender_type === 'patient') {
                    const patientId = msg.sender_id;
                    if (!patientMessages[patientId]) {
                        patientMessages[patientId] = {
                            lastMessage: msg.message,
                            lastMessageTime: msg.created_at
                        };
                    }
                }
            });
        }
        
        // Hastaları güncelle
        for (let patient of allPatients) {
            if (patientMessages[patient.id]) {
                patient.lastMessage = patientMessages[patient.id].lastMessage;
                patient.lastMessageTime = patientMessages[patient.id].lastMessageTime;
            }
            
            // Online status ekle
            patient.lastSeen = onlineStatus[patient.id] || null;
            
            // Okunmamış mesaj sayısı
            await getUnreadCount(patient);
        }
        
        console.log(`✅ ${allPatients.length} hastanın mesaj bilgileri güncellendi`);
        
    } catch (error) {
        console.error('Mesaj bilgileri güncellenemedi:', error);
    }
}

// Mesajlardan hastaları al (Supabase'den)
async function loadPatientsFromMessages() {
    if (!supabaseClient) return;
    
    try {
        // Tüm mesajları al ve hasta ID'lerini çıkar
        const { data, error } = await supabaseClient
            .from('messages')
            .select('sender_id, sender_type, receiver_id, receiver_type, message, created_at')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Hasta ID'lerini topla
        const patientIds = new Set();
        const patientMessages = {};
        
        if (data) {
            data.forEach(msg => {
                // Hasta tarafından gönderilen mesajlar
                if (msg.sender_type === 'patient') {
                    patientIds.add(msg.sender_id);
                    if (!patientMessages[msg.sender_id]) {
                        patientMessages[msg.sender_id] = {
                            lastMessage: msg.message,
                            lastMessageTime: msg.created_at
                        };
                    }
                }
                // Hastaya gönderilen mesajlar
                if (msg.receiver_type === 'patient') {
                    patientIds.add(msg.receiver_id);
                }
            });
        }
        
        // Her hasta için obje oluştur
        const patientPromises = Array.from(patientIds).map(async (id) => {
            const patientData = await loadPatientName(id); // Gerçek ismi yükle
            return {
                id: id,
                name: patientData.name,
                lastMessage: patientMessages[id]?.lastMessage || '',
                lastMessageTime: patientMessages[id]?.lastMessageTime || null,
                unreadCount: 0
            };
        });
        
        allPatients = await Promise.all(patientPromises);
        
        // Okunmamış mesaj sayılarını al
        for (let patient of allPatients) {
            await getUnreadCount(patient);
        }
        
    } catch (error) {
        console.error('Mesajlardan hastalar alınamadı:', error);
    }
}

// Manuel hasta listesi (yedek çözüm)
async function loadPatientsManually() {
    // Sistemdeki mevcut hasta dosyalarından manuel liste
    const patientIds = [
        'patient_001',
        'patient_1761123223097',
        'patient_1761135747439',
        'patient_1761489943986',
        'patient_1761679326659',
        'patient_1762097712792',
        'patient_1762151674616',
        'patient_1762176120684',
        'patient_1762176209447'
    ];
    
    const patients = [];
    for (let id of patientIds) {
        const patientData = await loadPatientName(id);
        patients.push({
            id: id,
            name: patientData.name,
            lastMessage: '',
            lastMessageTime: null,
            unreadCount: 0
        });
    }
    
    return patients;
}

// Hasta dosyasından gerçek ismi yükle
async function loadPatientName(patientId) {
    try {
        // Hasta dosyasını yükle (CACHE BYPASS)
        const response = await fetch(`./hastalar/${patientId}.json?t=` + Date.now(), {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error('Hasta dosyası bulunamadı');
        }
        
        const data = await response.json();
        
        // İsim ve soyisim birleştir (personalInfo içinde)
        const name = data.personalInfo?.name || data.name || '';
        const surname = data.personalInfo?.surname || data.surname || '';
        const fullName = `${name} ${surname}`.trim();
        
        // Username'i de al
        const username = data.username || '';
        
        if (fullName) {
            console.log(`✅ Hasta ismi yüklendi: ${patientId} -> ${fullName} (${username})`);
            return { name: fullName, username: username };
        }
        
        // Eğer dosyada isim yoksa ID'den oluştur
        return { name: formatPatientName(patientId), username: username };
        
    } catch (error) {
        console.warn(`⚠️ Hasta ismi yüklenemedi (${patientId}):`, error.message);
        // Hata durumunda ID'den isim oluştur
        return { name: formatPatientName(patientId), username: '' };
    }
}

// Okunmamış mesaj sayısını al
async function getUnreadCount(patient) {
    if (!supabaseClient) return;
    
    try {
        const { count } = await supabaseClient
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', patient.id)
            .eq('receiver_type', 'admin')
            .eq('is_read', false);
        
        patient.unreadCount = count || 0;
    } catch (error) {
        console.error('Okunmamış sayı alınamadı:', error);
    }
}

// Hasta ID'den isim formatla
function formatPatientName(patientId) {
    // patient_001 -> Test Hasta 1
    // patient_1762176209447 -> Hasta #1762176209447
    
    if (patientId === 'patient_001') {
        return 'Test Hasta';
    }
    
    const num = patientId.replace('patient_', '');
    return `Hasta #${num}`;
}

// Hastaları listele
function displayPatients(patients) {
    const container = document.getElementById('patientList');
    const countElement = document.getElementById('patientCount');
    
    // Hasta sayısını güncelle
    if (countElement) {
        countElement.textContent = patients ? patients.length : 0;
    }
    
    if (!patients || patients.length === 0) {
        container.innerHTML = `
            <div class="loading">Hasta bulunamadı</div>
        `;
        return;
    }
    
    // Son mesaja göre sırala (en yeni üstte)
    patients.sort((a, b) => {
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
    });
    
    container.innerHTML = '';
    
    patients.forEach(patient => {
        const div = document.createElement('div');
        div.className = 'patient-item';
        div.onclick = () => selectPatient(patient.id);
        
        const initials = getInitials(patient.name);
        const lastMsg = patient.lastMessage ? 
            (patient.lastMessage.substring(0, 30) + (patient.lastMessage.length > 30 ? '...' : '')) :
            'Henüz mesaj yok';
        
        // Online status kontrolü (son 2 dakika içinde aktif mi?)
        const isOnline = patient.lastSeen ? 
            (new Date() - new Date(patient.lastSeen)) < 120000 : false;
        
        // Mute durumu
        const isMuted = mutedPatients.includes(patient.id);
        
        div.innerHTML = `
            <div class="online-status ${isOnline ? 'online' : ''}"></div>
            <div class="patient-avatar">${initials}</div>
            <div class="patient-info">
                <div class="patient-name">${patient.name}</div>
                <div class="patient-last-message">${lastMsg}</div>
            </div>
            ${patient.unreadCount > 0 ? `<span class="unread-badge">${patient.unreadCount}</span>` : ''}
            <button class="mute-btn ${isMuted ? 'muted' : ''}" 
                    data-patient-id="${patient.id}"
                    onclick="togglePatientMute('${patient.id}', event)"
                    title="${isMuted ? 'Bildirimleri Aç' : 'Sessize Al'}">
                ${isMuted ? '🔕' : '🔔'}
            </button>
        `;
        
        container.appendChild(div);
    });
}

// Hasta seç
function selectPatient(patientId) {
    selectedPatientId = patientId;
    
    // Aktif hasta işaretle
    document.querySelectorAll('.patient-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Event target kontrolü (mobilde çağrıldığında event olmayabilir)
    if (event && event.target) {
        event.target.closest('.patient-item').classList.add('active');
    } else {
        // Event yoksa ID'ye göre bul
        const patientItem = document.querySelector(`[onclick*="${patientId}"]`);
        if (patientItem) {
            patientItem.classList.add('active');
        }
    }
    
    // Chat alanını göster
    document.getElementById('noSelection').style.display = 'none';
    document.getElementById('chatContainer').style.display = 'flex';
    
    // MOBİL: Patient list tamamen gizle, chat area göster
    if (window.innerWidth <= 768) {
        const patientListContainer = document.getElementById('patientListContainer');
        const chatArea = document.querySelector('.chat-area');
        
        if (patientListContainer) {
            patientListContainer.classList.add('hidden');
        }
        if (chatArea) {
            chatArea.classList.remove('hidden');
        }
    }
    
    // Hasta bilgilerini göster
    const patient = allPatients.find(p => p.id === patientId);
    if (patient) {
        document.getElementById('chatPatientName').textContent = patient.name;
        document.getElementById('chatPatientId').textContent = `ID: ${patient.id}`;
    }
    
    // Mesajları yükle
    loadMessages();
    
    // Realtime dinle
    subscribeToMessages();
}

// Mesajları yükle
async function loadMessages() {
    if (!supabaseClient || !selectedPatientId) return;
    
    const container = document.getElementById('chatMessages');
    container.innerHTML = '<div class="loading">Mesajlar yükleniyor...</div>';
    
    try {
        const { data, error } = await supabaseClient
            .from('messages')
            .select('*')
            .or(`sender_id.eq.${selectedPatientId},receiver_id.eq.${selectedPatientId}`)
            .order('created_at', { ascending: true })
            .limit(100);
        
        if (error) throw error;
        
        // Admin için silinenleri filtrele
        const filteredMessages = data.filter(msg => !msg.deleted_for_admin);
        
        displayMessages(filteredMessages);
        scrollToBottom();
        
        // Mesajları okundu işaretle
        markAsRead();
        
    } catch (error) {
        console.error('Mesajlar yüklenemedi:', error);
        container.innerHTML = `
            <div class="loading" style="color: #f44336;">
                Mesajlar yüklenirken hata oluştu
            </div>
        `;
    }
}

// Mesajları göster (tarih gruplarıyla)
function displayMessages(messages) {
    const container = document.getElementById('chatMessages');
    
    if (!messages || messages.length === 0) {
        container.innerHTML = `
            <div class="loading">Henüz mesaj yok</div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    // Mesajları tarihe göre grupla
    let lastDate = null;
    
    messages.forEach(msg => {
        // Türkiye saatine çevir (UTC+3)
        const messageDate = new Date(new Date(msg.created_at).getTime() + (3 * 60 * 60 * 1000));
        const dateKey = messageDate.toLocaleDateString('tr-TR', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        // Eğer yeni bir gün başladıysa tarih başlığı ekle
        if (dateKey !== lastDate) {
            const dateHeader = createDateHeader(messageDate);
            container.appendChild(dateHeader);
            lastDate = dateKey;
        }
        
        const messageDiv = createMessageElement(msg);
        container.appendChild(messageDiv);
    });
    
    // Mesajlar eklendikten sonra scroll'u en alta indir
    scrollToBottom();
}

// Tarih başlığı oluştur (WhatsApp tarzı)
function createDateHeader(date) {
    const div = document.createElement('div');
    div.className = 'date-separator';
    
    // Türkiye saatine çevir (UTC+3)
    const localDate = new Date(date.getTime() + (3 * 60 * 60 * 1000));
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let dateText;
    
    // Bugün mü?
    if (localDate.toDateString() === today.toDateString()) {
        dateText = 'Bugün';
    }
    // Dün mü?
    else if (localDate.toDateString() === yesterday.toDateString()) {
        dateText = 'Dün';
    }
    // Diğer günler
    else {
        dateText = localDate.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
    
    div.innerHTML = `<span>${dateText}</span>`;
    return div;
}

// Mesaj elementi oluştur
function createMessageElement(msg) {
    const div = document.createElement('div');
    const isAdmin = msg.sender_type === 'admin';
    
    div.className = `message ${isAdmin ? 'sent' : 'received'}`;
    div.dataset.messageId = msg.id; // Mesaj ID'sini sakla
    
    const time = formatTime(msg.created_at);
    
    // Admin mesajı için hangi admin gönderdi göster
    let senderLabel = '👤 Hasta';
    if (isAdmin) {
        if (msg.sender_admin) {
            // Admin kullanıcı adından displayName bul
            const adminInfo = window.GH_ADMINS?.admins?.find(a => a.username === msg.sender_admin);
            const adminName = adminInfo?.displayName || msg.sender_admin;
            senderLabel = `👨‍⚕️ ${adminName}`;
        } else {
            senderLabel = '�‍⚕️ Admin';
        }
    }
    
    div.innerHTML = `
        <div class="message-sender" style="font-size: 11px; color: #666; margin-bottom: 3px;">${senderLabel}</div>
        <div class="message-bubble">
            <div class="message-content">${escapeHtml(msg.message)}</div>
            <div class="message-time-inline">${time}</div>
            <button class="delete-message-btn" onclick="deleteMessage('${msg.id}')" title="Mesajı Sil">
                🗑️
            </button>
        </div>
    `;
    
    return div;
}

// Mesaj gönder
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message || !selectedPatientId) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('messages')
            .insert([
                {
                    sender_id: 'admin',
                    sender_type: 'admin',
                    receiver_id: selectedPatientId,
                    receiver_type: 'patient',
                    message: message,
                    sender_admin: currentAdmin?.username || 'admin' // Kim gönderdi
                }
            ])
            .select();
        
        if (error) throw error;
        
        input.value = '';
        
        // Mesajı ekrana ekle
        if (data && data[0]) {
            const messageElement = createMessageElement(data[0]);
            document.getElementById('chatMessages').appendChild(messageElement);
            scrollToBottom();
            
            // 🔔 HASTAYA BİLDİRİM GÖNDER
            await sendNotificationToPatient(selectedPatientId, message);
        }
        
    } catch (error) {
        console.error('Mesaj gönderilemedi:', error);
        alert('Mesaj gönderilemedi!');
    }
}

// Realtime dinleme
function subscribeToMessages() {
    if (!supabaseClient || !selectedPatientId) return;
    
    if (messagesSubscription) {
        messagesSubscription.unsubscribe();
    }
    
    messagesSubscription = supabaseClient
        .channel('admin-messages')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `sender_id=eq.${selectedPatientId}`
            },
            (payload) => {
                console.log('Yeni mesaj:', payload);
                
                const messageElement = createMessageElement(payload.new);
                document.getElementById('chatMessages').appendChild(messageElement);
                scrollToBottom();
                
                // ✅ BİLDİRİM GÖSTER - HER ZAMAN (test için)
                console.log('📬 Yeni mesaj geldi, bildirim tetikleniyor...');
                console.log('📱 document.hidden:', document.hidden);
                console.log('🔍 hasFocus:', document.hasFocus());
                
                // TELEFONDA TEST: Her zaman bildirim göster
                showNewMessageNotification(payload.new);
                
                // Badge güncelle (PWA ikon sayısı)
                if (window.badgeManager && document.hidden) {
                    // Sayfa arka plandaysa badge'i artır
                    window.badgeManager.increment();
                }
                
                // Otomatik okundu işaretle
                markAsRead();
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'messages'
            },
            (payload) => {
                // Mesaj görüldü mü kontrol et
                if (payload.new.is_read && payload.new.sender_type === 'admin') {
                    console.log('✓✓ Mesaj görüldü:', payload.new.id);
                    
                    // Mesajı bul ve görüldü işareti ekle
                    const messageDiv = document.querySelector(`[data-message-id="${payload.new.id}"]`);
                    if (messageDiv) {
                        // Checkmark ekle veya güncelle
                        const timeDiv = messageDiv.querySelector('.message-time-inline');
                        if (timeDiv && !timeDiv.textContent.includes('✓✓')) {
                            timeDiv.innerHTML = timeDiv.innerHTML + ' <span style="color: #34B7F1;">✓✓</span>';
                        }
                    }
                }
            }
        )
        .subscribe();
}

// Mesajları okundu işaretle
async function markAsRead() {
    if (!supabaseClient || !selectedPatientId) return;
    
    try {
        await supabaseClient
            .from('messages')
            .update({ is_read: true })
            .eq('sender_id', selectedPatientId)
            .eq('receiver_type', 'admin')
            .eq('is_read', false);
        
        // Badge Manager ile PWA badge sıfırla (Navigator API)
        if (window.badgeManager) {
            await window.badgeManager.clear();
            console.log('🔄 PWA Badge temizlendi (Navigator API)');
        }
        
        // OneSignal badge sıfırla (mesaj okunduğunda)
        if (typeof OneSignal !== 'undefined') {
            try {
                // Tüm bildirimleri temizle (badge sıfırlanır)
                if (OneSignal.Notifications) {
                    await OneSignal.Notifications.requestPermission();
                }
                console.log('🔄 OneSignal badge sıfırlandı (mesaj okundu)');
            } catch (badgeErr) {
                console.warn('⚠️ Badge sıfırlama hatası:', badgeErr);
            }
        }
        
        // Hasta listesini güncelle
        loadPatients();
        
    } catch (error) {
        console.error('Okundu işaretlenemedi:', error);
    }
}

// Hasta filtrele
function filterPatients(query) {
    const filtered = allPatients.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.id.toLowerCase().includes(query.toLowerCase())
    );
    
    displayPatients(filtered);
}

// Toplu bildirim modalı
function showBroadcastModal() {
    const message = prompt('Tüm hastalara gönderilecek mesajı yazın:');
    
    if (!message || !message.trim()) return;
    
    const confirm = window.confirm(`"${message}" mesajı ${allPatients.length} hastaya gönderilecek. Onaylıyor musunuz?`);
    
    if (confirm) {
        sendBroadcastMessage(message.trim());
    }
}

// Toplu mesaj gönder
async function sendBroadcastMessage(message) {
    if (!supabaseClient) return;
    
    try {
        const messages = allPatients.map(patient => ({
            sender_id: 'admin',
            sender_type: 'admin',
            receiver_id: patient.id,
            receiver_type: 'patient',
            message: message
        }));
        
        const { error } = await supabaseClient
            .from('messages')
            .insert(messages);
        
        if (error) throw error;
        
        // 🔔 HER HASTAYA BİLDİRİM GÖNDER
        console.log(`📢 ${allPatients.length} hastaya toplu bildirim gönderiliyor...`);
        
        for (const patient of allPatients) {
            try {
                await sendNotificationToPatient(patient.id, message);
                console.log(`✅ Bildirim gönderildi: ${patient.name} (ID: ${patient.id})`);
            } catch (notifError) {
                console.error(`❌ Bildirim gönderilemedi (${patient.name}):`, notifError);
            }
        }
        
        alert(`✅ Mesaj ve bildirim ${allPatients.length} hastaya gönderildi!`);
        
    } catch (error) {
        console.error('Toplu mesaj gönderilemedi:', error);
        alert('❌ Mesaj gönderilemedi!');
    }
}

// Yardımcı fonksiyonlar
function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function formatTime(timestamp) {
    // Türkiye saatine çevir (UTC+3)
    const date = new Date(timestamp);
    const localDate = new Date(date.getTime() + (3 * 60 * 60 * 1000));
    return localDate.toLocaleTimeString('tr-TR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// ====================================
// HASTAYA BİLDİRİM GÖNDERİMİ
// ====================================
async function sendNotificationToPatient(patientId, message) {
    try {
        // Bildirim gönderilmeli mi kontrol et
        if (!shouldSendNotification(patientId)) {
            console.log('⚠️ Bildirim sessize alınmış, gönderilmedi');
            return;
        }
        
        // Hasta adını al
        let patientName = `Hasta #${patientId}`;
        const patient = allPatients.find(p => p.id === patientId);
        if (patient && patient.name) {
            patientName = patient.name;
        }
        
        // Admin görünen ismini al
        const currentAdmin = JSON.parse(sessionStorage.getItem('admin_session') || '{}');
        const adminInfo = window.GH_ADMINS?.admins?.find(a => a.username === currentAdmin.username);
        const adminDisplayName = adminInfo?.displayName || 'Yönetici';
        
        console.log('📋 Admin bilgisi:', {
            currentAdmin,
            adminInfo,
            displayName: adminDisplayName
        });
        
        // Mesajı kısalt
        const shortMessage = message.length > 50 ? message.substring(0, 50) + '...' : message;
        
        // Localhost kontrolü - CORS hatası önleme
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        if (isLocalhost) {
            console.log('⚠️ Localhost - Bildirim atlanıyor (CORS hatası önleme)');
            console.log('📱 Production\'da otomatik çalışacak');
            return; // Localhost'ta bildirim gönderme
        }
        
        console.log('🔔 Hastaya bildirim gönderiliyor (serverless):', patientName);
        
        // Sunucu üzerinden güvenli gönderim (sadece production)
        const resp = await fetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patientId,
                message: shortMessage,
                title: `💬 ${adminDisplayName}`,
                data: { from_admin: currentAdmin?.username || 'admin' }
            })
        });
        const result = await resp.json();
        if (!resp.ok) {
            console.error('❌ Bildirim gönderilemedi:', result);
        } else {
            console.log('✅ Bildirim gönderildi:', result);
        }
        
    } catch (error) {
        console.error('❌ Bildirim gönderme hatası:', error);
    }
}

// Mesaj silme fonksiyonu (WhatsApp tarzı)
async function deleteMessage(messageId) {
    // Önce silmek istediğinden emin ol
    const wantToDelete = confirm('Bu mesajı silmek istediğinizden emin misiniz?');
    
    if (!wantToDelete) {
        return; // İptal edildi, hiçbir şey yapma
    }
    
    // Silme tipini sor
    const deleteFromBoth = confirm(
        '🗑️ Mesajı nasıl silmek istersiniz?\n\n' +
        'OK = Herkesten Sil (Tam sil)\n' +
        'İptal = Sadece Benden Sil (Hasta görebilir)'
    );
    
    try {
        if (deleteFromBoth) {
            // HERKESTEN SİL - Veritabanından tamamen sil
            const { error } = await supabaseClient
                .from('messages')
                .delete()
                .eq('id', messageId);
                
            if (error) throw error;
            
            console.log('✅ Mesaj herkesten silindi:', messageId);
            
        } else {
            // BENDEN SİL - Sadece deleted_for_admin flag'i ekle
            const { error } = await supabaseClient
                .from('messages')
                .update({ deleted_for_admin: true })
                .eq('id', messageId);
                
            if (error) throw error;
            
            console.log('✅ Mesaj sadece admin için silindi:', messageId);
        }
        
        // UI'dan mesajı kaldır
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            messageElement.style.opacity = '0';
            setTimeout(() => messageElement.remove(), 300);
        }
        
    } catch (err) {
        console.error('❌ Mesaj silme hatası:', err);
        alert('Mesaj silinemedi: ' + err.message);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function scrollToBottom() {
    const container = document.getElementById('chatMessages');
    if (container) {
        // Smooth scroll için setTimeout
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 100);
    }
}

// Mobil geri butonu
function backToPatients() {
    document.getElementById('chatContainer').style.display = 'none';
    document.getElementById('noSelection').style.display = 'flex';
    
    // Seçili hastayı kaldır
    document.querySelectorAll('.patient-item').forEach(item => {
        item.classList.remove('active');
    });
    
    selectedPatientId = null;
}

// ====================================
// BİLDİRİM YÖNETİMİ
// ====================================

// Muted hastalar (localStorage'da sakla)
let mutedPatients = JSON.parse(localStorage.getItem('mutedPatients') || '[]');
let allNotificationsMuted = localStorage.getItem('allNotificationsMuted') === 'true';

// Tüm bildirimleri aç/kapa
function toggleNotifications() {
    const checkbox = document.getElementById('notificationToggle');
    const icon = document.getElementById('notificationIcon');
    
    allNotificationsMuted = !checkbox.checked;
    localStorage.setItem('allNotificationsMuted', allNotificationsMuted);
    
    icon.textContent = allNotificationsMuted ? '🔕' : '🔔';
    
    console.log(allNotificationsMuted ? '🔕 Tüm bildirimler kapatıldı' : '🔔 Bildirimler açıldı');
}

// Belirli hastayı sessize al/aç
function togglePatientMute(patientId, event) {
    event.stopPropagation(); // Hastayı seçmemek için
    
    const index = mutedPatients.indexOf(patientId);
    
    if (index > -1) {
        // Sessize alınmış, kaldır
        mutedPatients.splice(index, 1);
        console.log('🔔 Hasta bildirimleri açıldı:', patientId);
    } else {
        // Sessize al
        mutedPatients.push(patientId);
        console.log('🔕 Hasta sessize alındı:', patientId);
    }
    
    localStorage.setItem('mutedPatients', JSON.stringify(mutedPatients));
    
    // UI'yi güncelle
    updateMuteButtons();
}

// Mute butonlarını güncelle
function updateMuteButtons() {
    document.querySelectorAll('.mute-btn').forEach(btn => {
        const patientId = btn.dataset.patientId;
        const isMuted = mutedPatients.includes(patientId);
        
        btn.textContent = isMuted ? '🔕' : '🔔';
        btn.classList.toggle('muted', isMuted);
        btn.title = isMuted ? 'Bildirimleri Aç' : 'Sessize Al';
    });
}

// Bildirim göndermeden önce kontrol et
function shouldSendNotification(patientId) {
    // Tüm bildirimler kapalı mı?
    if (allNotificationsMuted) {
        console.log('⚠️ Tüm bildirimler kapalı, gönderilmedi');
        return false;
    }
    
    // Bu hasta sessize alınmış mı?
    if (mutedPatients.includes(patientId)) {
        console.log('⚠️ Hasta sessize alınmış, bildirim gönderilmedi:', patientId);
        return false;
    }
    
    return true;
}

// Sayfa yüklendiğinde durumu yükle
window.addEventListener('DOMContentLoaded', () => {
    const checkbox = document.getElementById('notificationToggle');
    const icon = document.getElementById('notificationIcon');
    
    if (checkbox && icon) {
        checkbox.checked = !allNotificationsMuted;
        icon.textContent = allNotificationsMuted ? '🔕' : '🔔';
    }
    
    // Badge temizle (sayfa açıksa okunmamış mesaj kalmadı)
    if (window.badgeManager) {
        window.badgeManager.clear();
        console.log('✅ Badge temizlendi (sayfa açıldı)');
    }
    
    // Online status'u her 10 saniyede bir güncelle
    setInterval(() => {
        if (allPatients.length > 0) {
            console.log('🔄 Online status güncelleniyor...');
            loadPatients();
        }
    }, 10000); // 10 saniye
});

// Sayfa yüklendiğinde başlat
window.addEventListener('DOMContentLoaded', initializeAdminChat);
