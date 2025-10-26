export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    
    // Handle preflight request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { patientId, weeks } = req.body;

        if (!patientId || !weeks) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: patientId and weeks' 
            });
        }

        if (!Array.isArray(weeks)) {
            return res.status(400).json({ 
                success: false, 
                error: 'weeks must be an array' 
            });
        }

        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const REPO_OWNER = 'mustafasacar35';
        const REPO_NAME = 'lipodem-takip-paneli';
        const BRANCH = 'main';
        
        // hastalar/ klasörünü kullan (yeni uygulama)
        const FILE_PATH = `hastalar/${patientId}.json`;

        if (!GITHUB_TOKEN) {
            return res.status(500).json({ 
                success: false, 
                error: 'GitHub token not configured' 
            });
        }

        // 1. Mevcut dosyayı al
        const getFileUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${BRANCH}`;
        const getResponse = await fetch(getFileUrl, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!getResponse.ok) {
            const errorText = await getResponse.text();
            return res.status(404).json({ 
                success: false, 
                error: `Patient file not found: ${errorText}` 
            });
        }

        const fileData = await getResponse.json();
        const currentContent = JSON.parse(
            Buffer.from(fileData.content, 'base64').toString('utf-8')
        );

        // 2. weeks array'ini güncelle
        currentContent.weeks = weeks;

        // 3. GitHub'a geri yaz
        const updateFileUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
        const updateResponse = await fetch(updateFileUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Update weeks for patient ${patientId}`,
                content: Buffer.from(JSON.stringify(currentContent, null, 2)).toString('base64'),
                sha: fileData.sha,
                branch: BRANCH
            })
        });

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            return res.status(500).json({ 
                success: false, 
                error: `Failed to update file: ${errorText}` 
            });
        }

        const updateResult = await updateResponse.json();

        return res.status(200).json({ 
            success: true, 
            message: 'Weeks updated successfully',
            commit: updateResult.commit.sha
        });

    } catch (error) {
        console.error('Update weeks error:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}
