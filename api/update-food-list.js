/**
 * Vercel API Endpoint - Food List Güncelleme
 * 
 * Bu endpoint GitHub'a food_list.json'u kaydeder
 * Token gereksinimi: Vercel Environment Variables'da GITHUB_TOKEN olmalı
 */

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
    }

    try {
        const { foodDatabase, commitMessage } = req.body;

        if (!foodDatabase || !Array.isArray(foodDatabase)) {
            return res.status(400).json({ 
                success: false, 
                error: 'foodDatabase array gerekli' 
            });
        }

        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const GITHUB_OWNER = 'mustafasacar35';
        const GITHUB_REPO = 'lipodem-takip-paneli';
        const GITHUB_BRANCH = 'main';
        const FILE_PATH = 'food_list.json';

        if (!GITHUB_TOKEN) {
            return res.status(500).json({ 
                success: false, 
                error: 'GitHub token tanımlı değil' 
            });
        }

        // Kategorilere göre grupla
        const categories = {};
        
        foodDatabase.forEach(food => {
            const categoryName = food.category || 'Diğer';
            if (!categories[categoryName]) {
                categories[categoryName] = {
                    name: categoryName,
                    items: []
                };
            }
            categories[categoryName].items.push(food);
        });

        const jsonData = {
            version: "3.0",
            lastUpdated: new Date().toISOString(),
            categories: Object.values(categories)
        };

        // 1. Mevcut dosyanın SHA'sını al
        const getUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${GITHUB_BRANCH}`;
        
        let sha = null;
        const getResponse = await fetch(getUrl, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Lipodem-Takip-Paneli'
            }
        });

        if (getResponse.ok) {
            const data = await getResponse.json();
            sha = data.sha;
        }

        // 2. Dosyayı güncelle
        const putUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
        
        const jsonContent = JSON.stringify(jsonData, null, 2);
        const base64Content = Buffer.from(jsonContent).toString('base64');

        const putPayload = {
            message: commitMessage || `Yemek listesi güncellendi - ${new Date().toISOString()}`,
            content: base64Content,
            branch: GITHUB_BRANCH
        };

        if (sha) {
            putPayload.sha = sha;
        }

        const putResponse = await fetch(putUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'Lipodem-Takip-Paneli'
            },
            body: JSON.stringify(putPayload)
        });

        if (!putResponse.ok) {
            const errorData = await putResponse.json();
            throw new Error(`GitHub API hatası: ${errorData.message || putResponse.statusText}`);
        }

        const result = await putResponse.json();

        return res.status(200).json({ 
            success: true, 
            message: 'Yemek listesi başarıyla güncellendi',
            commit: result.commit?.sha,
            url: result.content?.html_url
        });

    } catch (error) {
        console.error('❌ Food list kaydetme hatası:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}
