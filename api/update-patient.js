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
        const { name, surname, age, gender, weight, height, username, password, passwordHash, patientId } = req.body;

        // Validasyon
        if (!name || !surname || !age || !gender || !weight || !height || !username) {
            return res.status(400).json({ 
                success: false, 
                error: 'Eksik bilgi. Tüm alanları doldurun.' 
            });
        }

        // GitHub API için gerekli bilgiler
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Vercel environment variable
        const REPO_OWNER = 'mustafasacar35';
        const REPO_NAME = 'lipodem-takip-paneli';
        // patientId varsa onu kullan, yoksa username'den oluştur
        const FILE_PATH = patientId 
            ? `hastalar/${patientId}.json`
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
        const updatedData = {
            ...currentContent,
            updatedAt: new Date().toISOString(),
            personalInfo: {
                ...(currentContent.personalInfo || {}),
                name,
                surname,
                age: parseInt(age),
                gender,
                weight: parseFloat(weight),
                height: parseFloat(height),
                bmi: parseFloat((parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2)).toFixed(1))
            }
        };

        // Şifre güncellemesi varsa
        if (passwordHash) {
            updatedData.passwordHash = passwordHash;
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

        // 4. Şifre değiştiyse index.json'u da güncelle
        if (passwordHash) {
            try {
                const indexPath = 'hastalar/index.json';
                const indexUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${indexPath}`;
                
                const indexGetResponse = await fetch(indexUrl, {
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                if (indexGetResponse.ok) {
                    const indexData = await indexGetResponse.json();
                    const indexContent = JSON.parse(
                        Buffer.from(indexData.content, 'base64').toString('utf-8')
                    );

                    // Kullanıcıyı bul ve güncelle
                    const userIndex = indexContent.findIndex(u => u.username === username);
                    if (userIndex !== -1) {
                        indexContent[userIndex].passwordHash = passwordHash;
                        indexContent[userIndex].name = name;
                        indexContent[userIndex].surname = surname;

                        // index.json'u güncelle
                        await fetch(indexUrl, {
                            method: 'PUT',
                            headers: {
                                'Authorization': `token ${GITHUB_TOKEN}`,
                                'Accept': 'application/vnd.github.v3+json',
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                message: `Şifre güncellendi: ${username}`,
                                content: Buffer.from(JSON.stringify(indexContent, null, 2)).toString('base64'),
                                sha: indexData.sha
                            })
                        });
                    }
                }
            } catch (indexError) {
                console.error('index.json güncelleme hatası:', indexError);
                // index.json hatası kritik değil, devam et
            }
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
