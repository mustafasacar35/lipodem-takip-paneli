/**
 * 🔐 HASTA YÖNETİM SİSTEMİ - KİMLİK DOĞRULAMA
 * SHA-256 Hash + Session Yönetimi
 */

const PatientAuth = {
    REPO_OWNER: 'mustafasacar35',
    REPO_NAME: 'lipodem-takip-paneli',
    PATIENTS_INDEX_PATH: 'hastalar/index.json',
    SESSION_STORAGE_KEY: 'patient_session',
    
    /**
     * Metni SHA-256 ile hashle
     */
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },
    
    /**
     * Hasta listesini GitHub'dan yükle
     */
    async loadPatientIndex() {
        try {
            const response = await fetch(`https://raw.githubusercontent.com/${this.REPO_OWNER}/${this.REPO_NAME}/main/${this.PATIENTS_INDEX_PATH}`);
            if (!response.ok) {
                console.warn('⚠️ Hasta listesi bulunamadı, boş liste oluşturuluyor');
                return { version: 1, lastUpdated: new Date().toISOString(), patients: [] };
            }
            return await response.json();
        } catch (error) {
            console.error('❌ Hasta listesi yüklenemedi:', error);
            return { version: 1, lastUpdated: new Date().toISOString(), patients: [] };
        }
    },
    
    /**
     * Hasta detaylarını GitHub'dan yükle
     */
    async loadPatientDetails(patientId) {
        try {
            const response = await fetch(`https://raw.githubusercontent.com/${this.REPO_OWNER}/${this.REPO_NAME}/main/hastalar/${patientId}.json`);
            if (!response.ok) throw new Error('Hasta dosyası bulunamadı');
            return await response.json();
        } catch (error) {
            console.error('❌ Hasta detayları yüklenemedi:', error);
            return null;
        }
    },
    
    /**
     * Kullanıcı adı ve şifre ile giriş yap
     */
    async login(username, password, rememberMe = false) {
        try {
            // Hasta listesini yükle
            const index = await this.loadPatientIndex();
            
            // Kullanıcıyı bul (önce index.json, sonra local override'larda ara)
            let patient = index.patients.find(p => p.username === username.toLowerCase());
            let patientDetailsLocal = null;
            if (!patient) {
                // Eğer index'te yoksa, her hasta için localStorage'daki patientDetails_{id} içinde username override var mı kontrol et
                for (const p of index.patients) {
                    try {
                        const local = localStorage.getItem(`patientDetails_${p.id}`);
                        if (local) {
                            const d = JSON.parse(local);
                            if (d.username && d.username.toLowerCase() === username.toLowerCase()) {
                                patient = p;
                                patientDetailsLocal = d;
                                break;
                            }
                        }
                    } catch (e) { /* ignore parse errors */ }
                }
            }

            if (!patient) {
                return { success: false, error: 'Kullanıcı adı veya şifre hatalı' };
            }

            // Arşivlenmiş hasta kontrolü
            if (patient.status === 'archived') {
                return { success: false, error: 'Bu hesap arşivlenmiştir. Lütfen yöneticinizle iletişime geçin.' };
            }

            // Şifre kontrolü - önce hastalar/patient_XXX.json'dan güncel hash'i al
            const passwordHash = await this.hashPassword(password);
            
            // GitHub'daki hasta dosyasından güncel hash'i çek
            let githubHash = null;
            try {
                const cleanId = patient.id.replace(/^patient_/i, '');
                const patientFileName = `hastalar/patient_${cleanId}.json`;
                const response = await fetch(`${patientFileName}?t=${new Date().getTime()}`);
                if (response.ok) {
                    const patientData = await response.json();
                    githubHash = patientData.passwordHash;
                }
            } catch (e) {
                console.warn('GitHub hasta dosyası okunamadı, index.json kullanılacak');
            }
            
            // Sırayla kontrol et: GitHub hash, index.json hash, localStorage hash
            const remoteHash = githubHash || patient.passwordHash || null;
            let localHash = null;
            try {
                const localDetailsStr = localStorage.getItem(`patientDetails_${patient.id}`);
                if (localDetailsStr) {
                    const loc = JSON.parse(localDetailsStr);
                    localHash = loc.passwordHashLocal || null;
                }
            } catch (e) { /* ignore */ }

            if (passwordHash !== remoteHash && passwordHash !== localHash) {
                return { success: false, error: 'Kullanıcı adı veya şifre hatalı' };
            }

            // 🖥️ CİHAZ KONTROLÜ - Şifre doğru ama cihaz limiti var mı?
            let deviceCheckResult = null;
            let currentDeviceInfo = null;
            let ipInfo = null;

            try {
                if (window.DeviceManager) {
                    // Mevcut cihaz bilgisini al
                    currentDeviceInfo = await window.DeviceManager.getDeviceInfo();
                    console.log('🖥️ Cihaz bilgisi alındı:', currentDeviceInfo.deviceName);

                    // IP bilgisini al (şüpheli aktivite kontrolü için)
                    if (window.IPLogger) {
                        ipInfo = await window.IPLogger.getIPInfo();
                    }

                    // Hasta detaylarını yükle (cihaz limiti için gerekli)
                    const patientDetails = await this.loadPatientDetails(patient.id);
                    if (patientDetails) {
                        // localStorage'a kaydet (cihaz kontrolü için gerekli)
                        const detailsKey = `patientDetails_${patient.id}`;
                        if (!localStorage.getItem(detailsKey)) {
                            localStorage.setItem(detailsKey, JSON.stringify(patientDetails));
                        }
                    }

                    // Cihaz limiti kontrolü
                    deviceCheckResult = await window.DeviceManager.checkDeviceLimit(patient.id, currentDeviceInfo);

                    if (!deviceCheckResult.allowed) {
                        // ❌ CİHAZ LİMİTİ AŞILDI - GİRİŞ ENGELLENDİ
                        console.warn(`❌ Cihaz limiti aşıldı: ${deviceCheckResult.currentDevices}/${deviceCheckResult.maxDevices}`);

                        // IP logu kaydet (status: blocked)
                        if (window.IPLogger && ipInfo) {
                            await window.IPLogger.logLogin(patient.id, currentDeviceInfo.deviceId, ipInfo, 'blocked');
                        }

                        // Admin'e bildirim gönder
                        if (window.AdminNotifier) {
                            await window.AdminNotifier.sendDeviceLimitAlert({
                                patientId: patient.id,
                                username: username,
                                deviceId: currentDeviceInfo.deviceId,
                                deviceInfo: `${currentDeviceInfo.deviceName} / ${currentDeviceInfo.browser}`,
                                currentDevices: deviceCheckResult.currentDevices,
                                maxDevices: deviceCheckResult.maxDevices,
                                ipInfo: ipInfo
                            });
                        }

                        return { 
                            success: false, 
                            error: deviceCheckResult.reason,
                            errorType: 'device_limit_exceeded'
                        };
                    }

                    // ✅ Cihaz limiti uygun, yeni cihazsa kaydet
                    if (deviceCheckResult.isNewDevice) {
                        await window.DeviceManager.registerDevice(patient.id, currentDeviceInfo, ipInfo);
                        console.log(`✅ Yeni cihaz kaydedildi: ${currentDeviceInfo.deviceName}`);
                    }
                }
            } catch (deviceError) {
                console.error('❌ CİHAZ KONTROLÜ HATASI - GİRİŞ ENGELLENDİ:', deviceError);
                return {
                    success: false,
                    error: 'Cihaz doğrulama hatası. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.',
                    errorType: 'device_check_failed'
                };
            }
            
            // Hasta detaylarını yükle (isAdmin için gerekli)
            let isAdminUser = false;
            try {
                const patientDetails = await this.loadPatientDetails(patient.id);
                if (patientDetails && patientDetails.isAdmin === true) {
                    isAdminUser = true;
                    console.log('👑 Admin kullanıcı tespit edildi:', patient.username);
                }
            } catch (e) {
                console.warn('Hasta detayları isAdmin kontrolü başarısız:', e);
            }
            
            // Session oluştur
            // Oturum bilgilerini oluştururken local override'lı alanları tercih et
            const sessionData = {
                patientId: patient.id,
                username: (patientDetailsLocal && patientDetailsLocal.username) ? patientDetailsLocal.username : patient.username,
                name: (patientDetailsLocal && patientDetailsLocal.name) ? patientDetailsLocal.name : patient.name,
                surname: (patientDetailsLocal && patientDetailsLocal.surname) ? patientDetailsLocal.surname : patient.surname,
                loginTime: new Date().toISOString(),
                expiresAt: this.calculateExpiry(patient.sessionDays),
                rememberMe: rememberMe,
                isAdmin: isAdminUser  // ✅ Admin yetkisi eklendi
            };

            // Session'ı kaydet
            localStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(sessionData));

            // � IP LOG: Login başarılı - IP ve konum bilgisini kaydet
            try {
                if (window.IPLogger) {
                    const ipInfo = await window.IPLogger.getIPInfo();
                    const deviceId = localStorage.getItem('device_id') || 'unknown';
                    await window.IPLogger.logLogin(patient.id, deviceId, ipInfo, 'success');
                    
                    // Şüpheli aktivite kontrolü
                    const suspiciousCheck = await window.IPLogger.checkSuspiciousActivity(patient.id, ipInfo);
                    if (suspiciousCheck.suspicious) {
                        console.warn('⚠️ ŞÜPHELİ AKTİVİTE:', suspiciousCheck.reason);
                        // Admin'e bildirim gönder (opsiyonel)
                        if (window.AdminNotifier) {
                            window.AdminNotifier.sendSecurityAlert({
                                patientId: patient.id,
                                username: username,
                                reason: suspiciousCheck.reason,
                                severity: suspiciousCheck.severity,
                                ipInfo: ipInfo
                            });
                        }
                    }
                }
            } catch (ipError) {
                console.warn('⚠️ IP log kaydı başarısız:', ipError);
                // IP log hatası login'i engellemez
            }

            // �🆕 Hasta detaylarını yükle ve localStorage'a kaydet
            try {
                const patientDetails = await this.loadPatientDetails(patient.id);
                if (patientDetails) {
                    const detailsKey = `patientDetails_${patient.id}`;
                    // Her login'de GitHub'dan gelen güncel data'yı localStorage'a kaydet
                    // (maxDevices, devices[], securityAlerts[] gibi alanlar admin tarafından güncellenebilir)
                    localStorage.setItem(detailsKey, JSON.stringify(patientDetails));
                    console.log('✅ Hasta detayları localStorage\'a güncellendi (GitHub source)');
                    
                    // alternativeCount varsa logla
                    if (patientDetails.alternativeCount) {
                        console.log(`📊 Hasta alternatif yemek sayısı: ${patientDetails.alternativeCount}`);
                    }
                }
            } catch (detailsError) {
                console.warn('⚠️ Hasta detayları yüklenemedi:', detailsError.message);
            }

            console.log('✅ Giriş başarılı:', username);
            return { success: true, patient: sessionData };        } catch (error) {
            console.error('❌ Giriş hatası:', error);
            return { success: false, error: 'Giriş sırasında bir hata oluştu' };
        }
    },
    
    /**
     * Session süresini hesapla
     */
    calculateExpiry(days) {
        const now = new Date();
        now.setDate(now.getDate() + days);
        return now.toISOString();
    },
    
    /**
     * Aktif session kontrolü
     */
    checkSession() {
        try {
            const sessionStr = localStorage.getItem(this.SESSION_STORAGE_KEY);
            if (!sessionStr) return null;
            
            const session = JSON.parse(sessionStr);
            const now = new Date();
            const expiresAt = new Date(session.expiresAt);
            
            // Süre dolmuş mu?
            if (now > expiresAt) {
                console.warn('⚠️ Session süresi doldu');
                this.logout();
                return null;
            }
            
            return session;
        } catch (error) {
            console.error('❌ Session kontrolü hatası:', error);
            return null;
        }
    },

    /**
     * Aktif session'ı al (checkSession ile aynı)
     */
    getSession() {
        return this.checkSession();
    },
    
    /**
     * Çıkış yap
     */
    logout() {
        localStorage.removeItem(this.SESSION_STORAGE_KEY);
        console.log('✅ Çıkış yapıldı');
    },
    
    /**
     * Session süresini yenile (kullanıcı aktif olduğunda)
     */
    async refreshSession() {
        const session = this.checkSession();
        if (!session) return false;
        
        try {
            const index = await this.loadPatientIndex();
            const patient = index.patients.find(p => p.id === session.patientId);
            
            if (patient && patient.status === 'active') {
                session.expiresAt = this.calculateExpiry(patient.sessionDays);
                localStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(session));
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ Session yenileme hatası:', error);
            return false;
        }
    },
    
    /**
     * Sayfa yüklendiğinde session kontrolü yap
     */
    requireAuth(redirectUrl = 'login.html') {
        const session = this.checkSession();
        if (!session) {
            window.location.href = redirectUrl;
            return null;
        }
        return session;
    }
};

// Global kullanım için export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PatientAuth;
}
