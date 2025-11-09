/**
 * GitHub index.json'ı DIREKT API'den oku (cache bypass)
 */

const GITHUB_TOKEN = 'YOUR_GITHUB_TOKEN_HERE'; // Token'ı buraya manuel yapıştırın (commit etmeyin!)
const OWNER = 'mustafasacar35';
const REPO = 'lipodem-takip-paneli';
const BRANCH = 'main';

async function directReadIndex() {
    console.log('🔍 index.json DİREKT API\'den okunuyor (CACHE BYPASS)...\n');

    try {
        const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/templates/index.json?ref=${BRANCH}&_=${Date.now()}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Cache-Control': 'no-cache'
            }
        });

        if (!response.ok) {
            throw new Error(`API hatası: ${response.status}`);
        }

        const fileData = await response.json();
        
        // Base64 decode
        const content = Buffer.from(fileData.content, 'base64').toString('utf8');
        const indexData = JSON.parse(content);

        console.log('📊 GERÇEK index.json İÇERİĞİ (API\'den):');
        console.log('='.repeat(60));
        console.log(JSON.stringify(indexData, null, 2));
        console.log('='.repeat(60));
        console.log('');
        console.log(`📋 Total Count: ${indexData.totalCount}`);
        console.log(`📄 Templates Array: ${indexData.templates?.length || 0} metadata`);
        console.log('');

        if (indexData.totalCount === 0 && (!indexData.templates || indexData.templates.length === 0)) {
            console.log('✅ index.json TAMAMEN TEMİZ!');
            console.log('✨ Sistem sıfırlandı, yeni şablonlar ekleyebilirsiniz.\n');
        } else {
            console.log('⚠️ index.json hala eski verileri içeriyor!');
            console.log('Bu GitHub cache sorunu olabilir, 1-2 dakika bekleyin.\n');
        }

    } catch (error) {
        console.error('❌ HATA:', error.message);
        process.exit(1);
    }
}

directReadIndex();
