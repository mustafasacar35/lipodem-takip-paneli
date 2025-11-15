/**
 * Vercel Serverless Function
 * Hasta bilgilerini GitHub'a güncelleyen API endpoint
 * 
 * Endpoint: https://lipodem-takip-paneli.vercel.app/api/update-patient
 * Method: POST
 */

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // OPTIONS request için
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Sadece POST isteği kabul et
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed. Use POST.' 
        });
    }

    try {
    // Gelen veriyi parse et - iki format destekle:
    // 1. Eski format: { name, surname, age, gender, weight, height, username, passwordHash, patientId, settings, weeks }
    // 2. Yeni format (FULL): { id, username, passwordHash, sessionDays, alternativeCount, status, isAdmin, personalInfo: {...}, settings: {...}, notes, progressLog, createdAt, updatedAt, weeks }
    
    let patientData = req.body;
    
    // Yeni format kontrolü (personalInfo objesi varsa)
    const isFullFormat = patientData.personalInfo !== undefined;
    
    let name, surname, age, gender, weight, height, username, passwordHash, patientId, settings, weeks;
    
    if (isFullFormat) {
        // Yeni format - personalInfo içinden çek
        console.log('📦 FULL format hasta verisi alındı');
        patientId = patientData.id;
        username = patientData.username;
        passwordHash = patientData.passwordHash;
        settings = patientData.settings;
        weeks = patientData.weeks;
        
        // personalInfo'dan bilgileri çek
        name = patientData.personalInfo?.name;
        surname = patientData.personalInfo?.surname;
        age = patientData.personalInfo?.age;
        gender = patientData.personalInfo?.gender;
        weight = patientData.personalInfo?.weight;
        height = patientData.personalInfo?.height;
    } else {
        // Eski format - düz alanlardan çek
        console.log('📋 Eski format hasta verisi alındı');
        ({ name, surname, age, gender, weight, height, username, passwordHash, patientId, settings, weeks } = patientData);
    }

        // Validasyon - En az patientId veya username olmalı
        if (!patientId && !username) {
            return res.status(400).json({ 
                success: false, 
                error: 'patientId veya username gerekli.' 
            });
        }
        
        // Eğer tam hasta kaydı güncellenmiyorsa (sadece weeks veya settings), validasyon atla
        const isPartialUpdate = (weeks !== undefined || settings !== undefined) && !name;
        
        if (!isPartialUpdate && (!name || !surname || !age || !gender || !weight || !height || !username)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Tam güncelleme için tüm hasta bilgileri gerekli.' 
            });
        }

        // GitHub API için gerekli bilgiler
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Vercel environment variable
        const REPO_OWNER = 'mustafasacar35';
        const REPO_NAME = 'lipodem-takip-paneli';
        
        // patientId formatını düzelt (patient_ öneki yoksa ekle)
        let finalPatientId = patientId;
        if (patientId && !String(patientId).startsWith('patient_')) {
            finalPatientId = `patient_${patientId}`;
        }
        
        // patientId varsa onu kullan, yoksa username'den oluştur
        const FILE_PATH = finalPatientId 
            ? `hastalar/${finalPatientId}.json`
            : `hastalar/patient_${username}.json`;
        
        if (!GITHUB_TOKEN) {
            return res.status(500).json({ 
                success: false, 
                error: 'GitHub token yapılandırılmamış' 
            });
        }

        // 1. Mevcut dosyayı çek
        const getFileUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
        
        const getResponse = await fetch(getFileUrl, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!getResponse.ok) {
            return res.status(404).json({ 
                success: false, 
                error: 'Hasta dosyası bulunamadı' 
            });
        }

        const fileData = await getResponse.json();
        const currentContent = JSON.parse(
            Buffer.from(fileData.content, 'base64').toString('utf-8')
        );

        // 2. Bilgileri güncelle
        let updatedData;
        
        if (isFullFormat) {
            // FULL format - tüm veriyi doğrudan kullan
            updatedData = {
                ...patientData,
                updatedAt: new Date().toISOString()
            };
            console.log('✅ FULL format veri doğrudan kaydediliyor');
        } else {
            // Eski format - mevcut veriyi güncelle
            updatedData = {
                ...currentContent,
                updatedAt: new Date().toISOString()
            };
            
            // Tam hasta bilgisi güncellemesi (name varsa)
            if (name) {
                updatedData.personalInfo = {
                    ...(currentContent.personalInfo || {}),
                    name,
                    surname,
                    age: parseInt(age),
                    gender,
                    weight: parseFloat(weight),
                    height: parseFloat(height),
                    bmi: parseFloat((parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2)).toFixed(1))
                };
            }

            // Eğer settings gönderildiyse patient dosyasına ekle / güncelle
            if (settings) {
                updatedData.settings = {
                    ...(currentContent.settings || {}),
                    ...settings
                };
            }
            
            // Eğer weeks gönderildiyse patient dosyasına ekle / güncelle
            if (weeks) {
                updatedData.weeks = weeks;
            }

            // Şifre güncellemesi varsa
            if (passwordHash) {
                updatedData.passwordHash = passwordHash;
            }
        }

        // 3. GitHub'a geri yaz
        const updateResponse = await fetch(getFileUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Hasta bilgileri güncellendi: ${name} ${surname}`,
                content: Buffer.from(JSON.stringify(updatedData, null, 2)).toString('base64'),
                sha: fileData.sha
            })
        });

        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            throw new Error(errorData.message || 'GitHub güncelleme hatası');
        }

        // 4. index.json'u da güncelle (HER ZAMAN - ad, soyad, şifre senkron olsun)
        try {
            console.log('� index.json güncelleme başlatıldı:', username);
            const indexPath = 'hastalar/index.json';
            const indexUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${indexPath}`;
            
            const indexGetResponse = await fetch(indexUrl, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            console.log('📥 index.json GET status:', indexGetResponse.status);

            if (indexGetResponse.ok) {
                const indexData = await indexGetResponse.json();
                const indexContent = JSON.parse(
                    Buffer.from(indexData.content, 'base64').toString('utf-8')
                );

                console.log('👥 Toplam hasta sayısı:', indexContent.patients.length);

                // Kullanıcıyı bul ve güncelle
                const userIndex = indexContent.patients.findIndex(u => u.username === username);
                console.log('🔍 Kullanıcı index:', userIndex);
                
                if (userIndex !== -1) {
                    // Ad ve soyad her zaman güncelle
                    indexContent.patients[userIndex].name = name;
                    indexContent.patients[userIndex].surname = surname;
                    
                    // Şifre hash varsa onu da güncelle
                    if (passwordHash) {
                        indexContent.patients[userIndex].passwordHash = passwordHash;
                        console.log('🔐 Şifre hash\'i index.json\'da güncellendi');
                    }

                    console.log('💾 index.json PUT gönderiliyor...');

                    // index.json'u güncelle
                    const putResponse = await fetch(indexUrl, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `token ${GITHUB_TOKEN}`,
                            'Accept': 'application/vnd.github.v3+json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            message: `Hasta bilgileri güncellendi: ${name} ${surname}`,
                            content: Buffer.from(JSON.stringify(indexContent, null, 2)).toString('base64'),
                            sha: indexData.sha
                        })
                    });

                    console.log('📤 index.json PUT status:', putResponse.status);
                    
                    if (!putResponse.ok) {
                        const errorData = await putResponse.json();
                        console.error('❌ index.json PUT hatası:', errorData);
                    } else {
                        console.log('✅ index.json başarıyla güncellendi');
                    }
                } else {
                    console.log('⚠️ Kullanıcı index.json\'da bulunamadı:', username);
                }
            } else {
                console.error('❌ index.json GET hatası:', indexGetResponse.status);
            }
        } catch (indexError) {
            console.error('❌ index.json güncelleme hatası:', indexError);
            // index.json hatası kritik değil, devam et
        }

        // Başarılı sonuç
        return res.status(200).json({ 
            success: true, 
            message: 'Hasta bilgileri başarıyla güncellendi',
            data: {
                name,
                surname,
                age,
                gender,
                weight,
                height,
                bmi: updatedData.bmi
            }
        });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message || 'Sunucu hatası' 
        });
    }
}
