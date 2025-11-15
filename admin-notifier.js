/**
 * 📢 ADMİN BİLDİRİM SİSTEMİ
 * Güvenlik uyarılarını admin_chat.html'e iletir
 */

const AdminNotifier = {
    /**
     * Güvenlik uyarısı gönder
     */
    async sendSecurityAlert(alertData) {
        try {
            const alert = {
                type: 'security_alert',
                timestamp: new Date().toISOString(),
                patientId: alertData.patientId,
                username: alertData.username,
                reason: alertData.reason,
                severity: alertData.severity || 'medium', // 'low', 'medium', 'high'
                ipInfo: alertData.ipInfo,
                deviceId: alertData.deviceId || 'unknown'
            };

            // localStorage'da admin uyarıları tutulacak array
            const alertsKey = 'admin_security_alerts';
            let alerts = [];
            
            try {
                const existingAlerts = localStorage.getItem(alertsKey);
                if (existingAlerts) {
                    alerts = JSON.parse(existingAlerts);
                }
            } catch (e) {
                console.warn('Mevcut uyarılar okunamadı');
            }

            // Yeni uyarıyı ekle
            alerts.unshift(alert);
            
            // Son 50 uyarıyı tut
            if (alerts.length > 50) {
                alerts = alerts.slice(0, 50);
            }

            // Kaydet
            localStorage.setItem(alertsKey, JSON.stringify(alerts));

            // Badge sayısını güncelle
            const unreadCount = alerts.filter(a => !a.read).length;
            localStorage.setItem('admin_unread_alerts', unreadCount.toString());

            console.log(`📢 Güvenlik uyarısı kaydedildi: ${alert.reason}`);

            // OneSignal ile bildirim gönder (opsiyonel, eğer kuruluysa)
            if (window.OneSignal && window.OneSignal.User) {
                try {
                    await window.OneSignal.User.addTag('security_alert', 'true');
                    console.log('🔔 OneSignal bildirimi gönderildi');
                } catch (e) {
                    console.warn('OneSignal bildirimi gönderilemedi:', e);
                }
            }

            return true;
        } catch (error) {
            console.error('❌ Admin bildirim hatası:', error);
            return false;
        }
    },

    /**
     * Cihaz limiti aşıldığında uyarı gönder
     */
    async sendDeviceLimitAlert(alertData) {
        return await this.sendSecurityAlert({
            ...alertData,
            reason: `Cihaz limiti aşıldı: ${alertData.currentDevices}/${alertData.maxDevices}`,
            severity: 'high'
        });
    },

    /**
     * Tüm uyarıları getir
     */
    getAlerts() {
        try {
            const alertsKey = 'admin_security_alerts';
            const alerts = localStorage.getItem(alertsKey);
            return alerts ? JSON.parse(alerts) : [];
        } catch (error) {
            console.error('Uyarılar okunamadı:', error);
            return [];
        }
    },

    /**
     * Uyarıyı okundu olarak işaretle
     */
    markAsRead(timestamp) {
        try {
            const alertsKey = 'admin_security_alerts';
            let alerts = this.getAlerts();
            
            const alert = alerts.find(a => a.timestamp === timestamp);
            if (alert) {
                alert.read = true;
                localStorage.setItem(alertsKey, JSON.stringify(alerts));
                
                // Unread sayısını güncelle
                const unreadCount = alerts.filter(a => !a.read).length;
                localStorage.setItem('admin_unread_alerts', unreadCount.toString());
                
                return true;
            }
            return false;
        } catch (error) {
            console.error('Uyarı işaretlenemedi:', error);
            return false;
        }
    },

    /**
     * Tüm uyarıları okundu işaretle
     */
    markAllAsRead() {
        try {
            const alertsKey = 'admin_security_alerts';
            let alerts = this.getAlerts();
            
            alerts.forEach(a => a.read = true);
            localStorage.setItem(alertsKey, JSON.stringify(alerts));
            localStorage.setItem('admin_unread_alerts', '0');
            
            return true;
        } catch (error) {
            console.error('Uyarılar işaretlenemedi:', error);
            return false;
        }
    },

    /**
     * Okunmamış uyarı sayısı
     */
    getUnreadCount() {
        const count = localStorage.getItem('admin_unread_alerts');
        return count ? parseInt(count) : 0;
    }
};

// Global erişim için
window.AdminNotifier = AdminNotifier;
