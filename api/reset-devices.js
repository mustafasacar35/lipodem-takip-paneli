/**
 * API Endpoint: Hasta cihazlarını sıfırla
 * POST /api/reset-devices
 * Body: { patientId }
 */

const { Octokit } = require('@octokit/rest');

module.exports = async (req, res) => {
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
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { patientId } = req.body;

        if (!patientId) {
            return res.status(400).json({ error: 'Missing patientId' });
        }

        // GitHub API setup
        const octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN
        });

        const owner = 'mustafasacar35';
        const repo = 'lipodem-takip-paneli';
        const path = `hastalar/${patientId}.json`;

        // 1. Mevcut dosyayı oku
        const { data: fileData } = await octokit.repos.getContent({
            owner,
            repo,
            path,
            ref: 'main'
        });

        // 2. İçeriği parse et
        const content = Buffer.from(fileData.content, 'base64').toString('utf8');
        const patientData = JSON.parse(content);

        // 3. Devices array'ini temizle
        const oldDeviceCount = patientData.devices ? patientData.devices.length : 0;
        patientData.devices = [];

        // 4. updatedAt güncelle
        patientData.updatedAt = new Date().toISOString();

        // 5. GitHub'a yaz
        await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path,
            message: `chore: Reset devices for ${patientId}`,
            content: Buffer.from(JSON.stringify(patientData, null, 2)).toString('base64'),
            sha: fileData.sha,
            branch: 'main'
        });

        console.log(`✅ Devices reset for ${patientId}: ${oldDeviceCount} devices removed`);

        res.status(200).json({ 
            success: true, 
            message: 'Devices reset successfully',
            oldDeviceCount: oldDeviceCount,
            newDeviceCount: 0
        });

    } catch (error) {
        console.error('❌ Reset devices error:', error);
        res.status(500).json({ 
            error: 'Failed to reset devices',
            message: error.message 
        });
    }
};
