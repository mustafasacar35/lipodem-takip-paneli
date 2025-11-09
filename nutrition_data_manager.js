/**
 * 🥗 NUTRITION DATA MANAGER
 * GitHub tabanlı beslenme verileri yönetimi
 */

const NutritionDataManager = {
    REPO_OWNER: 'mustafasacar35',
    REPO_NAME: 'lipodem-takip-paneli',
    BASE_PATH: 'nutrition',
    
    /**
     * GitHub'dan nutrition index'i yükle
     */
    async loadNutritionIndex() {
        try {
            const response = await fetch(
                `https://raw.githubusercontent.com/${this.REPO_OWNER}/${this.REPO_NAME}/main/${this.BASE_PATH}/index.json`
            );
            
            if (!response.ok) {
                console.warn('⚠️ Nutrition index bulunamadı, yeni oluşturuluyor');
                return { version: '1.0', lastUpdated: new Date().toISOString(), patients: [] };
            }
            
            return await response.json();
        } catch (error) {
            console.error('❌ Nutrition index yüklenemedi:', error);
            return { version: '1.0', lastUpdated: new Date().toISOString(), patients: [] };
        }
    },

    /**
     * Hasta ayarlarını GitHub'dan yükle
     */
    async loadPatientSettings(patientId) {
        try {
            // Clean patient ID (remove 'patient_' prefix if exists)
            const cleanId = patientId.startsWith('patient_') ? patientId.substring(8) : patientId;
            
            const response = await fetch(
                `https://raw.githubusercontent.com/${this.REPO_OWNER}/${this.REPO_NAME}/main/${this.BASE_PATH}/settings/patient_${cleanId}_settings.json`
            );
            
            if (!response.ok) {
                console.log('ℹ️ Hasta ayarları bulunamadı, varsayılan ayarlar kullanılacak');
                return this.getDefaultSettings(patientId);
            }
            
            const data = await response.json();
            console.log('✅ Hasta ayarları yüklendi:', cleanId);
            return data;
        } catch (error) {
            console.error('❌ Hasta ayarları yüklenemedi:', error);
            return this.getDefaultSettings(patientId);
        }
    },

    /**
     * Hasta haftalık planlarını GitHub'dan yükle
     */
    async loadPatientWeeks(patientId) {
        try {
            // Clean patient ID (remove 'patient_' prefix if exists)
            const cleanId = patientId.startsWith('patient_') ? patientId.substring(8) : patientId;
            
            const response = await fetch(
                `https://raw.githubusercontent.com/${this.REPO_OWNER}/${this.REPO_NAME}/main/${this.BASE_PATH}/weeks/patient_${cleanId}_weeks.json`
            );
            
            if (!response.ok) {
                console.log('ℹ️ Haftalık planlar bulunamadı, yeni plan oluşturuluyor');
                return this.getDefaultWeeks(patientId);
            }
            
            const data = await response.json();
            console.log('✅ Haftalık planlar yüklendi:', cleanId, '- Toplam hafta:', data.weeks?.length || 0);
            return data;
        } catch (error) {
            console.error('❌ Haftalık planlar yüklenemedi:', error);
            return this.getDefaultWeeks(patientId);
        }
    },

    /**
     * Varsayılan ayarlar
     */
    getDefaultSettings(patientId) {
        return {
            patientId: patientId,
            patientName: "",
            version: "1.0",
            lastUpdated: new Date().toISOString(),
            settings: {
                dietType: "",
                minCalories: 0,
                maxCalories: 9999,
                dislikedFoods: [],
                allergies: [],
                preferences: {
                    vegetarian: false,
                    vegan: false,
                    glutenFree: false,
                    dairyFree: false
                },
                activityLevel: "moderate",
                targetWeight: 0,
                currentWeight: 0,
                height: 0,
                age: 0,
                gender: ""
            },
            goals: {
                weeklyWeightLossTarget: 0.5,
                targetCalorieDeficit: 500,
                proteinTarget: 0,
                carbTarget: 0,
                fatTarget: 0
            },
            notes: ""
        };
    },

    /**
     * Varsayılan haftalık plan
     */
    getDefaultWeeks(patientId) {
        const today = new Date();
        const startDate = today.toISOString().split('T')[0];
        const endDate = new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        return {
            patientId: patientId,
            patientName: "",
            version: "1.0",
            lastUpdated: new Date().toISOString(),
            weeks: [
                {
                    id: Date.now(),
                    name: "1. Hafta",
                    weekNumber: 1,
                    startDate: startDate,
                    endDate: endDate,
                    status: "active",
                    createdDate: new Date().toISOString(),
                    days: [],
                    weekStats: {
                        totalDays: 0,
                        completedDays: 0,
                        averageCalories: 0,
                        averageProtein: 0,
                        averageCarb: 0,
                        averageFat: 0
                    },
                    notes: ""
                }
            ],
            statistics: {
                totalWeeks: 1,
                activeWeeks: 1,
                completedWeeks: 0,
                totalDays: 0,
                averageCaloriesPerDay: 0
            }
        };
    },

    /**
     * Ayarları localStorage'a kaydet (geçici önbellek)
     */
    saveSettingsToCache(patientId, settings) {
        localStorage.setItem(`nutrition_settings_${patientId}`, JSON.stringify(settings));
        console.log('💾 Ayarlar önbelleğe kaydedildi:', patientId);
    },

    /**
     * Haftalık planları localStorage'a kaydet (geçici önbellek)
     */
    saveWeeksToCache(patientId, weeksData) {
        localStorage.setItem(`nutrition_weeks_${patientId}`, JSON.stringify(weeksData));
        console.log('💾 Haftalık planlar önbelleğe kaydedildi:', patientId);
    },

    /**
     * Önbellekten ayarları yükle
     */
    loadSettingsFromCache(patientId) {
        const cached = localStorage.getItem(`nutrition_settings_${patientId}`);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch (error) {
                console.error('❌ Önbellek okunamadı:', error);
                return null;
            }
        }
        return null;
    },

    /**
     * Önbellekten haftalık planları yükle
     */
    loadWeeksFromCache(patientId) {
        const cached = localStorage.getItem(`nutrition_weeks_${patientId}`);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch (error) {
                console.error('❌ Önbellek okunamadı:', error);
                return null;
            }
        }
        return null;
    },

    /**
     * GitHub'a kaydetmek için JSON oluştur (indirme)
     */
    generateSettingsJSON(patientId, patientName, settings) {
        return {
            patientId: patientId,
            patientName: patientName,
            version: "1.0",
            lastUpdated: new Date().toISOString(),
            settings: settings.settings || settings,
            goals: settings.goals || {
                weeklyWeightLossTarget: 0.5,
                targetCalorieDeficit: 500,
                proteinTarget: 0,
                carbTarget: 0,
                fatTarget: 0
            },
            notes: settings.notes || ""
        };
    },

    /**
     * GitHub'a kaydetmek için haftalık plan JSON oluştur
     */
    generateWeeksJSON(patientId, patientName, weeks) {
        // İstatistikleri hesapla
        const totalWeeks = weeks.length;
        const activeWeeks = weeks.filter(w => w.status === 'active').length;
        const completedWeeks = weeks.filter(w => w.status === 'completed').length;
        
        let totalDays = 0;
        let totalCalories = 0;
        
        weeks.forEach(week => {
            if (week.days) {
                totalDays += week.days.length;
                week.days.forEach(day => {
                    totalCalories += day.totalCalories || 0;
                });
            }
        });

        const averageCaloriesPerDay = totalDays > 0 ? Math.round(totalCalories / totalDays) : 0;

        return {
            patientId: patientId,
            patientName: patientName,
            version: "1.0",
            lastUpdated: new Date().toISOString(),
            weeks: weeks.map(week => ({
                ...week,
                weekStats: this.calculateWeekStats(week)
            })),
            statistics: {
                totalWeeks,
                activeWeeks,
                completedWeeks,
                totalDays,
                averageCaloriesPerDay
            }
        };
    },

    /**
     * Hafta istatistiklerini hesapla
     */
    calculateWeekStats(week) {
        const days = week.days || [];
        const totalDays = days.length;
        const completedDays = days.filter(d => d.completed).length;

        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarb = 0;
        let totalFat = 0;

        days.forEach(day => {
            const macros = day.totalMacros || {};
            totalCalories += macros.kalori || 0;
            totalProtein += macros.protein || 0;
            totalCarb += macros.karb || 0;
            totalFat += macros.yag || 0;
        });

        return {
            totalDays,
            completedDays,
            averageCalories: totalDays > 0 ? Math.round(totalCalories / totalDays) : 0,
            averageProtein: totalDays > 0 ? Math.round(totalProtein / totalDays) : 0,
            averageCarb: totalDays > 0 ? Math.round(totalCarb / totalDays) : 0,
            averageFat: totalDays > 0 ? Math.round(totalFat / totalDays) : 0
        };
    },

    /**
     * Ayarları JSON olarak indir
     */
    downloadSettingsJSON(patientId, patientName, settings) {
        // Clean patient ID (remove 'patient_' prefix if exists)
        const cleanId = patientId.startsWith('patient_') ? patientId.substring(8) : patientId;
        
        const json = this.generateSettingsJSON(patientId, patientName, settings);
        const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `patient_${cleanId}_settings.json`;
        a.click();
        URL.revokeObjectURL(url);
        console.log('📥 Ayarlar indirildi:', `patient_${cleanId}_settings.json`);
    },

    /**
     * Haftalık planları JSON olarak indir
     */
    downloadWeeksJSON(patientId, patientName, weeks) {
        // Clean patient ID (remove 'patient_' prefix if exists)
        const cleanId = patientId.startsWith('patient_') ? patientId.substring(8) : patientId;
        
        const json = this.generateWeeksJSON(patientId, patientName, weeks);
        const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `patient_${cleanId}_weeks.json`;
        a.click();
        URL.revokeObjectURL(url);
        console.log('📥 Haftalık planlar indirildi:', `patient_${cleanId}_weeks.json`);
    },

    /**
     * Her iki dosyayı da indir (ayarlar + haftalar)
     */
    downloadAllData(patientId, patientName, settings, weeks) {
        this.downloadSettingsJSON(patientId, patientName, settings);
        setTimeout(() => {
            this.downloadWeeksJSON(patientId, patientName, weeks);
        }, 500);
    }
};

// Global erişim için
window.NutritionDataManager = NutritionDataManager;
