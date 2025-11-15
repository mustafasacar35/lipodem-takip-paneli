/**
 * 🖥️ CİHAZ YÖNETİM SİSTEMİ
 * Browser Fingerprinting + UUID Device ID Generation
 */

const DeviceManager = {
    /**
     * Browser fingerprint oluştur (cihaz tanımlama)
     */
    async generateFingerprint() {
        const components = [];

        // 1. User Agent
        components.push(navigator.userAgent);

        // 2. Screen Resolution
        components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);

        // 3. Timezone
        components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

        // 4. Language
        components.push(navigator.language);

        // 5. Platform
        components.push(navigator.platform);

        // 6. Hardware Concurrency (CPU cores)
        components.push(navigator.hardwareConcurrency || 'unknown');

        // 7. Canvas Fingerprint (en güçlü tanımlayıcı)
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = '#069';
            ctx.fillText('Device Fingerprint 🔒', 2, 15);
            ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
            ctx.fillText('Device Fingerprint 🔒', 4, 17);
            components.push(canvas.toDataURL());
        } catch (e) {
            components.push('canvas-error');
        }

        // Hash oluştur
        const fingerprintString = components.join('|||');
        const hash = await this.hashString(fingerprintString);
        
        return hash;
    },

    /**
     * String'i SHA-256 ile hashle
     */
    async hashString(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    /**
     * UUID v4 oluştur
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    /**
     * Cihaz ID al veya oluştur
     */
    async getDeviceId() {
        let deviceId = localStorage.getItem('device_id');
        
        if (!deviceId) {
            // Yeni cihaz - UUID oluştur
            deviceId = `device_${this.generateUUID()}`;
            localStorage.setItem('device_id', deviceId);
            console.log('🆕 Yeni cihaz ID oluşturuldu:', deviceId);
        }

        return deviceId;
    },

    /**
     * Cihaz fingerprint al veya oluştur
     */
    async getDeviceFingerprint() {
        let fingerprint = localStorage.getItem('device_fingerprint');
        
        if (!fingerprint) {
            fingerprint = await this.generateFingerprint();
            localStorage.setItem('device_fingerprint', fingerprint);
            console.log('🔒 Cihaz fingerprint oluşturuldu');
        }

        return fingerprint;
    },

    /**
     * Cihaz bilgilerini al
     */
    async getDeviceInfo() {
        const deviceId = await this.getDeviceId();
        const fingerprint = await this.getDeviceFingerprint();

        // Cihaz türünü tahmin et
        const ua = navigator.userAgent;
        let deviceType = 'Desktop';
        let deviceName = 'Bilinmeyen Cihaz';
        let browser = 'Bilinmeyen Tarayıcı';

        // Mobil/Tablet kontrolü
        if (/mobile/i.test(ua)) {
            deviceType = 'Mobile';
            if (/iPad/i.test(ua)) deviceType = 'Tablet';
            if (/iPhone/i.test(ua)) deviceName = 'iPhone';
            else if (/Android/i.test(ua)) deviceName = 'Android Telefon';
            else if (/iPad/i.test(ua)) deviceName = 'iPad';
        } else {
            if (/Mac/i.test(ua)) deviceName = 'Mac';
            else if (/Windows/i.test(ua)) deviceName = 'Windows PC';
            else if (/Linux/i.test(ua)) deviceName = 'Linux PC';
        }

        // Tarayıcı tespiti
        if (/Chrome/i.test(ua) && !/Edge/i.test(ua)) browser = 'Chrome';
        else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
        else if (/Firefox/i.test(ua)) browser = 'Firefox';
        else if (/Edge/i.test(ua)) browser = 'Edge';

        return {
            deviceId: deviceId,
            fingerprint: fingerprint,
            deviceType: deviceType,
            deviceName: deviceName,
            browser: browser,
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            screenResolution: `${screen.width}x${screen.height}`,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    },

    /**
     * Cihaz limitini kontrol et
     * @param {string} patientId - Hasta ID
     * @param {object} currentDeviceInfo - Mevcut cihaz bilgisi
     * @returns {object} - { allowed: boolean, reason: string, currentDevices: number, maxDevices: number }
     */
    async checkDeviceLimit(patientId, currentDeviceInfo) {
        try {
            const detailsKey = `patientDetails_${patientId}`;
            const patientDetailsStr = localStorage.getItem(detailsKey);
            
            if (!patientDetailsStr) {
                console.warn('⚠️ Hasta detayları bulunamadı');
                return { allowed: true, reason: 'Hasta detayları yok, varsayılan izin' };
            }

            const patientDetails = JSON.parse(patientDetailsStr);
            
            // maxDevices yoksa default 1
            const maxDevices = patientDetails.maxDevices || 1;
            
            // devices array yoksa oluştur
            if (!patientDetails.devices) {
                patientDetails.devices = [];
            }

            // Mevcut cihaz zaten kayıtlı mı kontrol et
            const existingDevice = patientDetails.devices.find(d => 
                d.deviceId === currentDeviceInfo.deviceId || 
                d.fingerprint === currentDeviceInfo.fingerprint
            );

            if (existingDevice) {
                // Cihaz kayıtlı, lastActive güncelle
                existingDevice.lastActive = new Date().toISOString();
                localStorage.setItem(detailsKey, JSON.stringify(patientDetails));
                
                console.log('✅ Kayıtlı cihaz - Giriş izinli');
                return { 
                    allowed: true, 
                    reason: 'Kayıtlı cihaz',
                    currentDevices: patientDetails.devices.length,
                    maxDevices: maxDevices,
                    isNewDevice: false
                };
            }

            // Yeni cihaz - limit kontrolü
            if (patientDetails.devices.length >= maxDevices) {
                console.warn(`❌ Cihaz limiti aşıldı: ${patientDetails.devices.length}/${maxDevices}`);
                return {
                    allowed: false,
                    reason: `Cihaz limiti aşıldı. Bu hesaba en fazla ${maxDevices} cihazdan giriş yapılabilir.`,
                    currentDevices: patientDetails.devices.length,
                    maxDevices: maxDevices,
                    isNewDevice: true
                };
            }

            // Yeni cihaz eklenebilir
            console.log(`✅ Yeni cihaz eklenebilir: ${patientDetails.devices.length + 1}/${maxDevices}`);
            return {
                allowed: true,
                reason: 'Yeni cihaz, limit uygun',
                currentDevices: patientDetails.devices.length,
                maxDevices: maxDevices,
                isNewDevice: true
            };

        } catch (error) {
            console.error('❌ Cihaz limit kontrolü hatası:', error);
            return { allowed: true, reason: 'Kontrol hatası, varsayılan izin' };
        }
    },

    /**
     * Yeni cihazı hasta kaydına ekle
     */
    async registerDevice(patientId, deviceInfo, ipInfo = null) {
        try {
            const detailsKey = `patientDetails_${patientId}`;
            const patientDetailsStr = localStorage.getItem(detailsKey);
            
            if (!patientDetailsStr) {
                console.warn('⚠️ Hasta detayları bulunamadı, cihaz kaydedilemedi');
                return false;
            }

            const patientDetails = JSON.parse(patientDetailsStr);

            if (!patientDetails.devices) {
                patientDetails.devices = [];
            }

            // Cihaz zaten kayıtlı mı kontrol et
            const existingDevice = patientDetails.devices.find(d => 
                d.deviceId === deviceInfo.deviceId
            );

            if (existingDevice) {
                console.log('ℹ️ Cihaz zaten kayıtlı');
                return true;
            }

            // Yeni cihaz kaydı
            const deviceRecord = {
                deviceId: deviceInfo.deviceId,
                fingerprint: deviceInfo.fingerprint,
                deviceInfo: {
                    name: `${deviceInfo.deviceName} / ${deviceInfo.browser}`,
                    type: deviceInfo.deviceType,
                    platform: deviceInfo.platform,
                    screenResolution: deviceInfo.screenResolution
                },
                firstLogin: new Date().toISOString(),
                lastActive: new Date().toISOString(),
                ipInfo: ipInfo ? {
                    ip: ipInfo.ip,
                    city: ipInfo.city,
                    country: ipInfo.country
                } : null
            };

            patientDetails.devices.push(deviceRecord);
            localStorage.setItem(detailsKey, JSON.stringify(patientDetails));

            // 🆕 GitHub'a da yaz (API endpoint üzerinden)
            try {
                const response = await fetch('/api/update-devices', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        patientId,
                        deviceId: deviceRecord.deviceId,
                        fingerprint: deviceRecord.fingerprint,
                        deviceInfo: deviceRecord.deviceInfo,
                        ipInfo: deviceRecord.ipInfo
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log(`✅ Cihaz GitHub'a kaydedildi: ${deviceRecord.deviceInfo.name} (Toplam: ${result.deviceCount})`);
                } else {
                    console.warn('⚠️ GitHub kaydı başarısız (localStorage\'da kaydedildi)');
                }
            } catch (apiError) {
                console.warn('⚠️ GitHub API hatası:', apiError.message);
                // API hatası cihaz kaydını engellemez
            }

            console.log(`✅ Yeni cihaz kaydedildi: ${deviceRecord.deviceInfo.name}`);
            return true;

        } catch (error) {
            console.error('❌ Cihaz kayıt hatası:', error);
            return false;
        }
    },

    /**
     * Hasta cihazlarını listele
     */
    getPatientDevices(patientId) {
        try {
            const detailsKey = `patientDetails_${patientId}`;
            const patientDetailsStr = localStorage.getItem(detailsKey);
            
            if (!patientDetailsStr) return [];

            const patientDetails = JSON.parse(patientDetailsStr);
            return patientDetails.devices || [];

        } catch (error) {
            console.error('Cihazlar okunamadı:', error);
            return [];
        }
    },

    /**
     * Cihazı sil
     */
    removeDevice(patientId, deviceId) {
        try {
            const detailsKey = `patientDetails_${patientId}`;
            const patientDetailsStr = localStorage.getItem(detailsKey);
            
            if (!patientDetailsStr) return false;

            const patientDetails = JSON.parse(patientDetailsStr);
            
            if (!patientDetails.devices) return false;

            const initialLength = patientDetails.devices.length;
            patientDetails.devices = patientDetails.devices.filter(d => d.deviceId !== deviceId);

            if (patientDetails.devices.length < initialLength) {
                localStorage.setItem(detailsKey, JSON.stringify(patientDetails));
                console.log(`✅ Cihaz silindi: ${deviceId}`);
                return true;
            }

            return false;

        } catch (error) {
            console.error('Cihaz silinemedi:', error);
            return false;
        }
    }
};

// Global erişim için
window.DeviceManager = DeviceManager;
