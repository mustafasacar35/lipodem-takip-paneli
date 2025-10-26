/**
 * Vercel Serverless Function
 * Beslenme ayarlarını GitHub'a güncelleyen API endpoint
 * 
 * Endpoint: https://lipodem-takip-paneli.vercel.app/api/update-settings
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
        const { patientId, settings } = req.body;

        // Validasyon
        if (!patientId || !settings) {
            return res.status(400).json({ 
                success: false, 
                error: 'patientId ve settings alanları zorunludur.' 
            });
        }

        if (typeof settings !== 'object') {
            return res.status(400).json({ 
                success: false, 
                error: 'settings bir object olmalıdır.' 
            });
        }

        // GitHub API için gerekli bilgiler
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const REPO_OWNER = 'mustafasacar35';
        const REPO_NAME = 'lipodem-takip-paneli';
        const FILE_PATH = `hastalar/${patientId}.json`;
        
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
                error: 'Hasta dosyası bulunamadı: ' + FILE_PATH 
            });
        }

        const fileData = await getResponse.json();
        const currentContent = JSON.parse(
            Buffer.from(fileData.content, 'base64').toString('utf-8')
        );

        // 2. Settings bilgisini güncelle
        const updatedData = {
            ...currentContent,
            settings: settings,
            lastModified: new Date().toISOString()
        };

        // 3. GitHub'a geri yükle
        const updateFileUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
        
        const updateResponse = await fetch(updateFileUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Update settings for patient ${patientId}`,
                content: Buffer.from(JSON.stringify(updatedData, null, 2)).toString('base64'),
                sha: fileData.sha
            })
        });

        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            return res.status(500).json({ 
                success: false, 
                error: 'GitHub güncelleme hatası: ' + JSON.stringify(errorData)
            });
        }

        // Başarılı
        return res.status(200).json({ 
            success: true, 
            message: 'Ayarlar başarıyla GitHub\'a kaydedildi',
            patientId: patientId
        });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message || 'Bilinmeyen hata oluştu'
        });
    }
}
