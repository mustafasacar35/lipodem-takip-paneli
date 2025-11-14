/**
 * 🌐 IP LOGLAMA SİSTEMİ
 * Kullanıcı IP adreslerini ve coğrafi bilgileri kaydeder
 */

const IPLogger = {
    /**
     * Kullanıcının IP adresini ve coğrafi bilgilerini al
     */
    async getIPInfo() {
        try {
            // ipify.org - Ücretsiz IP adresi servisi
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipResponse.json();
            const ip = ipData.ip;

            // ip-api.com - Ücretsiz coğrafi konum servisi (dakikada 45 istek limiti)
            const geoResponse = await fetch(`http://ip-api.com/json/${ip}`);
            const geoData = await geoResponse.json();

            return {
                ip: ip,
                country: geoData.country || 'Bilinmiyor',
                city: geoData.city || 'Bilinmiyor',
                region: geoData.regionName || 'Bilinmiyor',
                isp: geoData.isp || 'Bilinmiyor',
                timezone: geoData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.warn('⚠️ IP bilgisi alınamadı:', error);
            // Hata durumunda minimal bilgi döndür
            return {
                ip: 'Alınamadı',
                country: 'Bilinmiyor',
                city: 'Bilinmiyor',
                region: 'Bilinmiyor',
                isp: 'Bilinmiyor',
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    },

    /**
     * Login IP logunu hasta dosyasına kaydet
     * @param {string} patientId - Hasta ID
     * @param {string} deviceId - Cihaz ID
     * @param {object} ipInfo - IP bilgileri (getIPInfo() sonucu)
     * @param {string} status - 'success', 'blocked', 'suspicious'
     */
    async logLogin(patientId, deviceId, ipInfo, status = 'success') {
        try {
            // Patient details'i localStorage'dan al
            const detailsKey = `patientDetails_${patientId}`;
            const patientDetailsStr = localStorage.getItem(detailsKey);
            
            if (!patientDetailsStr) {
                console.warn('⚠️ Hasta detayları bulunamadı, IP logu kaydedilemedi');
                return false;
            }

            const patientDetails = JSON.parse(patientDetailsStr);

            // IP logs array yoksa oluştur
            if (!patientDetails.ipLogs) {
                patientDetails.ipLogs = [];
            }

            // Yeni log kaydı
            const logEntry = {
                timestamp: ipInfo.timestamp,
                deviceId: deviceId,
                ip: ipInfo.ip,
                country: ipInfo.country,
                city: ipInfo.city,
                region: ipInfo.region,
                isp: ipInfo.isp,
                timezone: ipInfo.timezone,
                status: status, // 'success', 'blocked', 'suspicious'
                userAgent: navigator.userAgent
            };

            // Logları ekle (son 100 kaydı tut)
            patientDetails.ipLogs.unshift(logEntry);
            if (patientDetails.ipLogs.length > 100) {
                patientDetails.ipLogs = patientDetails.ipLogs.slice(0, 100);
            }

            // localStorage'a kaydet
            localStorage.setItem(detailsKey, JSON.stringify(patientDetails));

            console.log(`📍 IP logu kaydedildi: ${ipInfo.ip} (${ipInfo.city}, ${ipInfo.country}) - Status: ${status}`);

            return true;
        } catch (error) {
            console.error('❌ IP log kaydı hatası:', error);
            return false;
        }
    },

    /**
     * Şüpheli aktivite kontrolü
     * @param {string} patientId - Hasta ID
     * @param {object} currentIP - Mevcut IP bilgisi
     * @returns {object} - { suspicious: boolean, reason: string }
     */
    async checkSuspiciousActivity(patientId, currentIP) {
        try {
            const detailsKey = `patientDetails_${patientId}`;
            const patientDetailsStr = localStorage.getItem(detailsKey);
            
            if (!patientDetailsStr) return { suspicious: false };

            const patientDetails = JSON.parse(patientDetailsStr);
            const ipLogs = patientDetails.ipLogs || [];

            if (ipLogs.length === 0) return { suspicious: false };

            // Son 24 saat içindeki başarılı girişler
            const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const recentLogins = ipLogs.filter(log => 
                log.status === 'success' && 
                new Date(log.timestamp) > last24h
            );

            if (recentLogins.length === 0) return { suspicious: false };

            // Farklı ülkelerden giriş kontrolü (24 saat içinde)
            const countries = [...new Set(recentLogins.map(log => log.country))];
            if (countries.length > 1 && !countries.includes(currentIP.country)) {
                return {
                    suspicious: true,
                    reason: `Son 24 saatte farklı ülkelerden giriş: ${countries.join(', ')} → ${currentIP.country}`,
                    severity: 'high'
                };
            }

            // Aynı anda farklı IP'lerden çok sayıda giriş (son 1 saat)
            const lastHour = new Date(Date.now() - 60 * 60 * 1000);
            const recentIPs = ipLogs.filter(log => 
                new Date(log.timestamp) > lastHour
            ).map(log => log.ip);

            const uniqueIPs = [...new Set(recentIPs)];
            if (uniqueIPs.length > 3) {
                return {
                    suspicious: true,
                    reason: `Son 1 saatte ${uniqueIPs.length} farklı IP'den giriş`,
                    severity: 'medium'
                };
            }

            return { suspicious: false };
        } catch (error) {
            console.warn('⚠️ Şüpheli aktivite kontrolü hatası:', error);
            return { suspicious: false };
        }
    }
};

// Global erişim için
window.IPLogger = IPLogger;
