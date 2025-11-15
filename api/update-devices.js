/**
 * API Endpoint: Cihaz kaydını GitHub'a yaz
 * POST /api/update-devices
 * Body: { patientId, deviceId, fingerprint, deviceInfo }
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
        const { patientId, deviceId, fingerprint, deviceInfo, ipInfo } = req.body;

        if (!patientId || !deviceId || !fingerprint) {
            return res.status(400).json({ error: 'Missing required fields' });
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

        // 3. Devices array'ine ekle (duplicate kontrolü)
        if (!patientData.devices) {
            patientData.devices = [];
        }

        const existingIndex = patientData.devices.findIndex(d => d.deviceId === deviceId);
        
        const newDevice = {
            deviceId,
            fingerprint,
            deviceInfo,
            firstLogin: existingIndex === -1 ? new Date().toISOString() : patientData.devices[existingIndex].firstLogin,
            lastActive: new Date().toISOString()
        };

        if (existingIndex !== -1) {
            // Güncelle
            patientData.devices[existingIndex] = newDevice;
        } else {
            // Yeni ekle
            patientData.devices.push(newDevice);
        }

        // 4. updatedAt güncelle
        patientData.updatedAt = new Date().toISOString();

        // 5. GitHub'a yaz
        await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path,
            message: `chore: Update devices for ${patientId}`,
            content: Buffer.from(JSON.stringify(patientData, null, 2)).toString('base64'),
            sha: fileData.sha,
            branch: 'main'
        });

        console.log(`✅ Device registered to GitHub: ${deviceId} for ${patientId}`);

        res.status(200).json({ 
            success: true, 
            message: 'Device registered successfully',
            deviceCount: patientData.devices.length
        });

    } catch (error) {
        console.error('❌ Update devices error:', error);
        res.status(500).json({ 
            error: 'Failed to update devices',
            message: error.message 
        });
    }
};
