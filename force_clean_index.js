/**
 * index.json'ı ZORLA temiz hale getir
 * Direkt GitHub API ile PUT işlemi
 */

const GITHUB_TOKEN = 'YOUR_GITHUB_TOKEN_HERE'; // Token'ı buraya manuel yapıştırın (commit etmeyin!)
const OWNER = 'mustafasacar35';
const REPO = 'lipodem-takip-paneli';
const BRANCH = 'main';

async function forceCleanIndex() {
    console.log('🔧 index.json ZORLA TEMİZLENİYOR...\n');

    try {
        // 1. Mevcut index.json SHA'sını al
        console.log('📋 Mevcut index.json SHA alınıyor...');
        const checkUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/templates/index.json?ref=${BRANCH}`;
        const checkResponse = await fetch(checkUrl, {
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!checkResponse.ok) {
            throw new Error('index.json bulunamadı!');
        }

        const currentFile = await checkResponse.json();
        console.log(`✅ SHA: ${currentFile.sha}\n`);

        // 2. Temiz index.json içeriği
        const cleanIndex = {
            totalCount: 0,
            templates: [],
            lastUpdate: new Date().toISOString()
        };

        console.log('📝 Temiz index.json içeriği:');
        console.log(JSON.stringify(cleanIndex, null, 2));
        console.log('');

        // 3. GitHub'a kaydet
        console.log('💾 GitHub\'a kaydediliyor...');
        const content = JSON.stringify(cleanIndex, null, 2);
        const encodedContent = Buffer.from(content, 'utf8').toString('base64');

        const updateUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/templates/index.json`;
        const updateResponse = await fetch(updateUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: '🧹 FORCE CLEAN: index.json temizlendi (totalCount: 0)',
                content: encodedContent,
                sha: currentFile.sha,
                branch: BRANCH
            })
        });

        if (!updateResponse.ok) {
            const error = await updateResponse.json();
            throw new Error(`Kayıt başarısız: ${error.message}`);
        }

        const result = await updateResponse.json();
        console.log('✅ index.json başarıyla temizlendi!\n');
        console.log('📊 YENİ DURUM:');
        console.log('   - totalCount: 0');
        console.log('   - templates: []');
        console.log('   - Şablon dosyaları: Yok\n');
        console.log('✨ Templates dizini tamamen temiz!\n');

    } catch (error) {
        console.error('❌ HATA:', error.message);
        process.exit(1);
    }
}

forceCleanIndex();
