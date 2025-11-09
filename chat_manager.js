// ====================================
// CHAT MANAGER - SUPABASE MESAJLAŞMA
// ====================================

// SUPABASE BAĞLANTISI
// ⚠️ ÖNEMLİ: Supabase projenizi oluşturduktan sonra bu bilgileri güncelleyin!
const SUPABASE_URL = 'https://rorkccxpjndllxemsmlo.supabase.co'; // Buraya kendi URL'nizi yazın
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvcmtjY3hwam5kbGx4ZW1zbWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTQxNTIsImV4cCI6MjA3NzkzMDE1Mn0.dVuUrVvBigxo2rMpUQcHKoemD7ovqejupi2OkkrxE7c'; // Buraya kendi ANON KEY'inizi yazın

let supabaseClient = null;
let currentPatientId = null;
let messagesSubscription = null;

// Supabase başlatma
function initializeChat() {
    // Supabase client oluştur
    if (typeof supabase === 'undefined') {
        console.error('Supabase kütüphanesi yüklenmedi!');
        return;
    }
    
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Mevcut hasta ID'sini al (birden fazla kaynaktan)
    currentPatientId = sessionStorage.getItem('currentPatientId') || 
                       localStorage.getItem('currentPatientId') ||
                       getPatientIdFromAuth();
    
    if (!currentPatientId) {
        console.error('❌ Hasta ID bulunamadı! Chat devre dışı.');
        // Chat widget'ı gizle
        const chatWidget = document.getElementById('chatWidget');
        if (chatWidget) {
            chatWidget.style.display = 'none';
        }
        return;
    }
    
    // Chat widget'ı göster (gizliyse)
    const chatWidget = document.getElementById('chatWidget');
    if (chatWidget) {
        chatWidget.style.display = 'block';
    }
    
    console.log('✅ Chat başlatıldı. Hasta ID:', currentPatientId);
    
    // OneSignal başlat (arka planda)
    initializePatientOneSignal().catch(err => {
        console.error('OneSignal başlatılamadı:', err);
    });
    
    // Mesajları yükle
    loadMessages();
    
    // Realtime dinlemeyi başlat
    subscribeToMessages();
    
    // Okunmamış mesaj sayısını güncelle
    updateUnreadCount();
    
    // Online status heartbeat başlat (her 30 saniyede bir)
    startHeartbeat();
}

// Auth sisteminden hasta ID al
function getPatientIdFromAuth() {
    // 1. Auth.js session kontrolü - DOĞRU KEY İSİMLERİ
    try {
        // Auth.js'in kullandığı key isimleri dene
        const sessionKeys = ['patient_session', 'patientSession', 'SESSION_STORAGE_KEY'];
        
        for (let key of sessionKeys) {
            const sessionData = localStorage.getItem(key);
            if (sessionData) {
                const session = JSON.parse(sessionData);
                if (session && session.patientId) {
                    console.log(`✅ Auth sisteminden hasta ID alındı (${key}):`, session.patientId);
                    return session.patientId;
                }
            }
        }
    } catch (e) {
        console.warn('Auth session okunamadı:', e);
    }
    
    // 2. Global getCurrentUser fonksiyonu
    if (typeof getCurrentUser === 'function') {
        const user = getCurrentUser();
        if (user && user.patientId) {
            return user.patientId;
        }
    }
    
    // 3. URL parametresinden al (test için)
    const urlParams = new URLSearchParams(window.location.search);
    const patientIdFromUrl = urlParams.get('patientId');
    if (patientIdFromUrl) {
        console.log('URL parametresinden hasta ID alındı:', patientIdFromUrl);
        return patientIdFromUrl;
    }
    
    return null;
}

// Chat penceresi aç/kapat
function toggleChat() {
    const chatBox = document.getElementById('chatBox');
    chatBox.classList.toggle('open');
    
    // Açıldığında okunmamış mesajları okundu işaretle
    if (chatBox.classList.contains('open')) {
        markMessagesAsRead();
    }
}

// Mesajları yükle
async function loadMessages() {
    if (!supabaseClient || !currentPatientId) return;
    
    try {
        // Son 50 mesajı getir
        const { data, error } = await supabaseClient
            .from('messages')
            .select('*')
            .or(`sender_id.eq.${currentPatientId},receiver_id.eq.${currentPatientId}`)
            .order('created_at', { ascending: true })
            .limit(50);
        
        if (error) throw error;
        
        // Mesajları göster
        displayMessages(data);
        
        // En alta scroll
        scrollToBottom();
        
    } catch (error) {
        console.error('Mesajlar yüklenemedi:', error);
        showError('Mesajlar yüklenirken bir hata oluştu.');
    }
}

// Mesajları ekrana yazdır
function displayMessages(messages) {
    const container = document.getElementById('chatMessages');
    
    if (!messages || messages.length === 0) {
        container.innerHTML = `
            <div class="no-messages">
                Henüz mesaj yok.<br>
                Yöneticinize mesaj gönderin!
            </div>
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

// Tek bir mesaj elementi oluştur
function createMessageElement(msg) {
    const div = document.createElement('div');
    const isSent = msg.sender_id === currentPatientId;
    
    div.className = `message ${isSent ? 'sent' : 'received'}`;
    
    // Admin mesajı için kim gönderdi göster
    let senderName = 'Siz';
    if (!isSent) {
        // Eğer sender_admin varsa göster
        if (msg.sender_admin) {
            senderName = `👨‍⚕️ ${msg.sender_admin === 'admin' ? 'Dr. Mustafa SACAR' : 
                                   msg.sender_admin === 'admin2' ? 'Dyt. Merve' : 'Yönetici'}`;
        } else {
            senderName = '👨‍⚕️ Yönetici';
        }
    }
    
    const time = formatMessageTime(msg.created_at);
    
    // Görüldü tiki (sadece gönderilen mesajlarda)
    const checkmark = isSent ? `<span class="message-checkmark ${msg.is_read ? 'read' : 'sent'}">✓✓</span>` : '';
    
    div.innerHTML = `
        ${!isSent ? `<div class="message-sender">${senderName}</div>` : ''}
        <div class="message-bubble">
            <div class="message-content">${escapeHtml(msg.message)}</div>
            <div class="message-time-inline">${time} ${checkmark}</div>
        </div>
    `;
    
    return div;
}

// Mesaj gönder
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    if (!supabaseClient || !currentPatientId) {
        showError('Mesaj gönderilemedi. Lütfen sayfayı yenileyin.');
        return;
    }
    
    try {
        // Gönder butonunu devre dışı bırak
        const sendBtn = document.getElementById('sendButton');
        sendBtn.disabled = true;
        
        // Mesajı veritabanına ekle
        const { data, error } = await supabaseClient
            .from('messages')
            .insert([
                {
                    sender_id: currentPatientId,
                    sender_type: 'patient',
                    receiver_id: 'admin', // Tüm adminlere gider
                    receiver_type: 'admin',
                    message: message
                }
            ])
            .select();
        
        if (error) throw error;
        
        // Input'u temizle
        input.value = '';
        
        // Mesajı ekrana ekle (realtime zaten ekleyecek ama anında gösterelim)
        if (data && data[0]) {
            const messageElement = createMessageElement(data[0]);
            document.getElementById('chatMessages').appendChild(messageElement);
            scrollToBottom();
            
            // 🔔 ADMIN'E BİLDİRİM GÖNDER
            await sendNotificationToAdmin(currentPatientId, message);
        }
        
        // Gönder butonunu aktif et
        sendBtn.disabled = false;
        input.focus();
        
    } catch (error) {
        console.error('Mesaj gönderilemedi:', error);
        showError('Mesaj gönderilemedi. Lütfen tekrar deneyin.');
        document.getElementById('sendButton').disabled = false;
    }
}

// Realtime dinleme başlat
function subscribeToMessages() {
    if (!supabaseClient || !currentPatientId) return;
    
    // Önceki subscription varsa kaldır
    if (messagesSubscription) {
        messagesSubscription.unsubscribe();
    }
    
    // Yeni mesajları dinle
    messagesSubscription = supabaseClient
        .channel('messages-channel')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${currentPatientId}`
            },
            (payload) => {
                console.log('Yeni mesaj geldi:', payload);
                
                // Mesajı ekrana ekle
                const messageElement = createMessageElement(payload.new);
                document.getElementById('chatMessages').appendChild(messageElement);
                scrollToBottom();
                
                // Okunmamış sayıyı güncelle
                updateUnreadCount();
                
                // Bildirim göster (chat kapalıysa)
                const chatBox = document.getElementById('chatBox');
                if (!chatBox.classList.contains('open')) {
                    // Admin mesajı için başlık
                    const notificationTitle = payload.new.sender_type === 'admin' 
                        ? '💬 Yönetici Mesajı' 
                        : 'Yeni mesaj';
                    showNotification(notificationTitle, payload.new.message);
                }
            }
        )
        .subscribe();
}

// Okunmamış mesaj sayısını güncelle
async function updateUnreadCount() {
    if (!supabaseClient || !currentPatientId) return;
    
    try {
        const { count, error } = await supabaseClient
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', currentPatientId)
            .eq('is_read', false);
        
        if (error) throw error;
        
        const badge = document.getElementById('unreadBadge');
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Okunmamış mesaj sayısı alınamadı:', error);
    }
}

// Mesajları okundu işaretle
async function markMessagesAsRead() {
    if (!supabaseClient || !currentPatientId) return;
    
    try {
        const { error } = await supabaseClient
            .from('messages')
            .update({ is_read: true })
            .eq('receiver_id', currentPatientId)
            .eq('is_read', false);
        
        if (error) throw error;
        
        // Badge'i gizle
        document.getElementById('unreadBadge').style.display = 'none';
        
    } catch (error) {
        console.error('Mesajlar okundu işaretlenemedi:', error);
    }
}

// Yardımcı fonksiyonlar
function scrollToBottom() {
    const container = document.getElementById('chatMessages');
    container.scrollTop = container.scrollHeight;
}

function formatMessageTime(timestamp) {
    // Sadece saat:dakika göster (tarih yok - zaten tarih başlıkları var)
    const date = new Date(timestamp);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    alert(message); // Basit alert, isterseniz toast notification yapabiliriz
}

// 🔊 Bildirim sesi çal (Web Audio API ile)
function playNotificationSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800; // 800Hz
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
        console.error('🔇 Bildirim sesi çalınamadı:', error);
    }
}

function showNotification(title, body) {
    // Browser notification (izin verilmişse)
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
            body: body,
            icon: '/logo.png',
            badge: '/logo.png',
            vibrate: [200, 100, 200, 100, 200], // 5-pulse vibration pattern
            tag: 'new-message',
            requireInteraction: false, // Auto-close after a few seconds
            data: {
                url: window.location.href
            }
        });

        // Click handler - Focus window and open chat
        notification.onclick = () => {
            window.focus();
            notification.close();
            
            // Open chat widget if closed
            const chatWidget = document.getElementById('chatWidget');
            const minimizedChat = document.getElementById('minimizedChat');
            if (chatWidget && minimizedChat) {
                if (chatWidget.style.display === 'none') {
                    chatWidget.style.display = 'flex';
                    minimizedChat.style.display = 'none';
                }
            }
        };

        // Play notification sound
        playNotificationSound();

        // Vibrate if supported
        if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200, 100, 200]);
        }
    }
}

// Sayfa yüklendiğinde chat'i başlat
window.addEventListener('DOMContentLoaded', () => {
    // Notification izni iste (ilk seferde)
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    // Chat'i başlat - Birden fazla deneme yap
    let attempts = 0;
    const maxAttempts = 10;
    
    const tryInitialize = () => {
        attempts++;
        
        // Session kontrolü - DOĞRU KEY İSİMLERİ
        const sessionKeys = ['patient_session', 'patientSession'];
        let sessionFound = false;
        
        for (let key of sessionKeys) {
            const session = localStorage.getItem(key);
            if (session) {
                sessionFound = true;
                console.log(`✅ Session bulundu (${key}), chat başlatılıyor...`);
                initializeChat();
                return;
            }
        }
        
        if (!sessionFound && attempts < maxAttempts) {
            console.log(`⏳ Session bekleniyor... (${attempts}/${maxAttempts})`);
            setTimeout(tryInitialize, 500); // 500ms sonra tekrar dene
        } else if (!sessionFound) {
            console.warn('⚠️ Session bulunamadı, chat başlatılamıyor.');
            // Chat widget'ı gizleme - belki daha sonra login olur
        }
    };
    
    // İlk deneme 500ms sonra
    setTimeout(tryInitialize, 500);
});

// Sayfa kapanırken subscription'ı temizle
window.addEventListener('beforeunload', () => {
    if (messagesSubscription) {
        messagesSubscription.unsubscribe();
    }
});

// ====================================
// ONESIGNAL BİLDİRİM GÖNDERİMİ
// ====================================
async function sendNotificationToAdmin(patientId, message) {
    try {
        // Hasta adını al
        let patientName = `Hasta #${patientId}`;
        try {
            // Önce patient_session'dan dene
            const session = JSON.parse(localStorage.getItem('patient_session') || '{}');
            if (session.name && session.surname) {
                patientName = `${session.name} ${session.surname}`.trim();
            } else {
                // Yoksa patient_data'dan dene
                const patientData = JSON.parse(localStorage.getItem(`patient_data_${patientId}`) || '{}');
                if (patientData.personalInfo) {
                    patientName = `${patientData.personalInfo.name || ''} ${patientData.personalInfo.surname || ''}`.trim();
                }
            }
            console.log('📝 Bildirim için hasta adı:', patientName);
        } catch (e) {
            console.log('Hasta adı alınamadı:', e);
        }
        
        // Localhost kontrolü - CORS hatası önleme
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        if (isLocalhost) {
            console.log('⚠️ Localhost - Admin bildirim atlanıyor (CORS hatası önleme)');
            console.log('📱 Production\'da otomatik çalışacak');
            return;
        }
        
        console.log('🔔 Admin\'e bildirim gönderiliyor (serverless)...');
        
        // Vercel Serverless Function üzerinden güvenli gönderim
        const resp = await fetch('/api/send-admin-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patientId,
                patientName,
                message
            })
        });
        
        const result = await resp.json();
        
        if (!resp.ok) {
            console.error('❌ Admin bildirim gönderilemedi:', result);
        } else {
            console.log('✅ Admin bildirim gönderildi:', result.id, '- Alıcı sayısı:', result.recipients || 'bilinmiyor');
        }
        
    } catch (error) {
        console.error('❌ Admin bildirim gönderme hatası:', error);
    }
}

// ====================================
// HASTA TARAFINDA ONESIGNAL (BİLDİRİM ALMAK İÇİN)
// ====================================
async function initializePatientOneSignal() {
    try {
        // OneSignal SDK'nın yüklenmesini bekle
        let attempts = 0;
        const maxAttempts = 20;
        
        while (!((typeof OneSignal !== 'undefined') || (window.parent && typeof window.parent.OneSignal !== 'undefined')) && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }
        
        const OS = (typeof OneSignal !== 'undefined') ? OneSignal : (window.parent && window.parent.OneSignal ? window.parent.OneSignal : undefined);
        
        if (!OS) {
            console.warn('⚠️ OneSignal SDK bu sayfada veya üst pencerede bulunamadı');
            // Üst pencereye init ve login isteği gönder (iOS iframe senaryosu)
            try {
                if (window.top && window.top !== window.self && currentPatientId) {
                    window.top.postMessage({ type: 'onesignal:ensure-init', externalId: currentPatientId }, '*');
                }
            } catch (e) {}
            return;
        }
        
        if (!window.ONESIGNAL_CONFIG || !window.ONESIGNAL_CONFIG.appId) {
            console.warn('⚠️ OneSignal config eksik');
            return;
        }
        
        console.log('🔔 Hasta OneSignal başlatılıyor...');
        
        // Bildirim izni kontrol et
        const permission = await OS.Notifications.permission;
        console.log('📱 Mevcut izin durumu:', permission);
        
        if (permission !== 'granted') {
            console.log('🔔 Bildirim izni isteniyor...');
            const result = await OS.Notifications.requestPermission();
            console.log('📝 İzin sonucu:', result);
        }
        
        // Push subscription oluştur (ARKA PLAN BİLDİRİMLERİ İÇİN)
        console.log('🔄 Push subscription kontrol ediliyor...');
        const subscriptionState = await OS.User.PushSubscription.optedIn;
        
        if (!subscriptionState) {
            console.log('📬 Push subscription oluşturuluyor...');
            await OS.User.PushSubscription.optIn();
            console.log('✅ Push subscription aktif - arka plan bildirimleri çalışacak');
        } else {
            console.log('✅ Push subscription zaten aktif');
        }
        
        // External User ID olarak patient ID'yi set et
        try {
            await OS.login(currentPatientId);
            console.log('✅ OneSignal login başarılı:', currentPatientId);
            
            // Patient tag ekle
            await OS.User.addTag('user_type', 'patient');
            await OS.User.addTag('patient_id', currentPatientId);
            console.log('✅ Patient tags eklendi');
        } catch (e) {
            console.error('❌ OneSignal login hatası:', e);
            // Üst pencereden login dene (özellikle iOS iframe)
            try {
                if (window.top && window.top !== window.self) {
                    window.top.postMessage({ type: 'onesignal:login', externalId: currentPatientId }, '*');
                }
            } catch (e2) {}
        }
        
        // OneSignal mesaj listener'ı ekle (foreground notifications)
        OS.Notifications.addEventListener('foregroundWillDisplay', (event) => {
            console.log('📬 OneSignal foreground notification:', event);
            // Native notification'ı da göster
            if (event.notification && event.notification.body) {
                showNotification('💬 Yöneticinizden Mesaj', event.notification.body);
            }
        });
        
        console.log('✅ Hasta OneSignal başlatıldı - arka plan bildirimleri aktif, External ID:', currentPatientId);
        
    } catch (error) {
        console.error('❌ Hasta OneSignal hatası:', error);
    }
}

// ====================================
// ONLINE STATUS HEARTBEAT
// ====================================
let heartbeatInterval = null;

async function startHeartbeat() {
    // İlk heartbeat'i hemen gönder
    await sendHeartbeat();
    
    // Her 30 saniyede bir heartbeat gönder
    heartbeatInterval = setInterval(async () => {
        await sendHeartbeat();
    }, 30000); // 30 saniye
    
    // Sayfa kapatıldığında temizle
    window.addEventListener('beforeunload', () => {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
        }
    });
}

async function sendHeartbeat() {
    if (!supabaseClient || !currentPatientId) return;
    
    try {
        // Hasta adını al
        const patientName = getPatientName();
        
        // UPSERT: Hasta yoksa ekle, varsa last_seen güncelle
        const { error } = await supabaseClient
            .from('patients')
            .upsert({
                patient_id: currentPatientId,
                name: patientName,
                last_seen: new Date().toISOString()
            }, {
                onConflict: 'patient_id'
            });
        
        if (error) {
            console.warn('Heartbeat güncellenemedi:', error);
        } else {
            console.log('🟢 Heartbeat gönderildi:', currentPatientId);
        }
    } catch (error) {
        console.warn('Heartbeat hatası:', error);
    }
}

// Hasta adını al
function getPatientName() {
    try {
        // sessionStorage'dan hasta bilgilerini al
        const sessionKeys = ['patient_session', 'patientSession'];
        for (let key of sessionKeys) {
            const session = sessionStorage.getItem(key) || localStorage.getItem(key);
            if (session) {
                const data = JSON.parse(session);
                if (data.name) return data.name;
                if (data.patientName) return data.patientName;
            }
        }
    } catch (e) {
        console.warn('Hasta adı alınamadı:', e);
    }
    return 'Bilinmeyen Hasta';
}
