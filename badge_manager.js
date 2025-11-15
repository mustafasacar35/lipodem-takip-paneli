// ====================================
// PWA BADGE MANAGER (Mesaj Sayısı)
// ====================================
// WhatsApp tarzı ikon üzerinde kırmızı sayı

class BadgeManager {
    constructor() {
        this.unreadCount = 0;
        this.supported = 'setAppBadge' in navigator;
        
        if (!this.supported) {
            console.log('⚠️ Badge API desteklenmiyor (eski tarayıcı)');
        } else {
            console.log('✅ Badge API destekleniyor');
        }
    }

    /**
     * Mesaj sayısını güncelle
     * @param {number} count - Okunmamış mesaj sayısı
     */
    async setCount(count) {
        this.unreadCount = count;
        
        if (!this.supported) {
            console.log('Badge güncellenemedi (API yok)');
            return false;
        }

        try {
            if (count > 0) {
                // Badge'i göster (sayı ile)
                await navigator.setAppBadge(count);
                console.log(`🔴 Badge güncellendi: ${count}`);
                
                // Başlık güncelle
                this.updateTitle(count);
            } else {
                // Badge'i temizle
                await navigator.clearAppBadge();
                console.log('✅ Badge temizlendi');
                
                // Başlığı sıfırla
                this.updateTitle(0);
            }
            return true;
        } catch (error) {
            console.error('Badge güncelleme hatası:', error);
            return false;
        }
    }

    /**
     * Sayıyı artır
     * @param {number} increment - Artış miktarı (varsayılan 1)
     */
    async increment(increment = 1) {
        return await this.setCount(this.unreadCount + increment);
    }

    /**
     * Sayıyı azalt
     * @param {number} decrement - Azalış miktarı (varsayılan 1)
     */
    async decrement(decrement = 1) {
        const newCount = Math.max(0, this.unreadCount - decrement);
        return await this.setCount(newCount);
    }

    /**
     * Badge'i tamamen temizle
     */
    async clear() {
        return await this.setCount(0);
    }

    /**
     * Sayfa başlığını güncelle (PWA dışında görünür)
     */
    updateTitle(count) {
        const baseTitle = document.title.replace(/^\(\d+\)\s*/, '');
        
        if (count > 0) {
            document.title = `(${count}) ${baseTitle}`;
        } else {
            document.title = baseTitle;
        }
    }

    /**
     * Mevcut sayıyı al
     */
    getCount() {
        return this.unreadCount;
    }
}

// Global instance oluştur
window.badgeManager = new BadgeManager();

// Test fonksiyonu
window.testBadge = async function() {
    console.log('🧪 Badge test başlıyor...');
    await window.badgeManager.setCount(5);
    console.log('✅ Badge 5 olarak ayarlandı');
    
    setTimeout(async () => {
        await window.badgeManager.clear();
        console.log('✅ Badge temizlendi');
    }, 3000);
};

console.log('📛 Badge Manager yüklendi. Test için: testBadge()');
