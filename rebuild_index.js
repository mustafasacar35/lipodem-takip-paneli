/**
 * Mevcut dosyalardan index.json'ı yeniden oluştur
 * Templates dizinindeki TÜM day_*.json dosyalarını okuyup
 * metadata'larını index.json'a ekle
 */

const GITHUB_TOKEN = 'YOUR_GITHUB_TOKEN_HERE'; // Manuel yapıştırın!
const OWNER = 'mustafasacar35';
const REPO = 'lipodem-takip-paneli';
const BRANCH = 'main';

async function rebuildIndex() {
    console.log('🔨 index.json yeniden oluşturuluyor...\n');

    try {
        // 1. Templates klasöründeki tüm dosyaları listele
        console.log('📂 Templates klasörü taranıyor...');
        const listUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/templates?ref=${BRANCH}`;
        
        const listResponse = await fetch(listUrl, {
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!listResponse.ok) {
            throw new Error(`Liste alınamadı: ${listResponse.status}`);
        }

        const files = await listResponse.json();
        const dayFiles = files.filter(f => f.name.startsWith('day_') && f.name.endsWith('.json'));
        
        console.log(`✅ ${dayFiles.length} şablon dosyası bulundu\n`);

        // 2. Her dosyayı oku ve metadata çıkar
        const templates = [];
        
        for (const file of dayFiles) {
            console.log(`📖 Okunuyor: ${file.name}`);
            
            const fileResponse = await fetch(file.download_url);
            const templateData = await fileResponse.json();
            
            // Metadata çıkar
            const metadata = {
                id: templateData.id,
                name: templateData.name,
                dietType: templateData.dietType || templateData.dietTypeName,
                totalMacros: templateData.totalMacros || {
                    kalori: templateData.totalCalories || 0,
                    protein: templateData.totalMacros?.protein || 0,
                    karb: templateData.totalMacros?.karb || templateData.totalMacros?.karbonhidrat || 0,
                    yag: templateData.totalMacros?.yag || 0
                },
                filename: file.name
            };
            
            templates.push(metadata);
            console.log(`   ✅ ${metadata.name} (${metadata.filename})`);
        }

        console.log(`\n📊 Toplam ${templates.length} metadata hazırlandı\n`);

        // 3. Yeni index.json oluştur
        const newIndex = {
            totalCount: templates.length,
            templates: templates,
            lastUpdate: new Date().toISOString()
        };

        console.log('📝 Yeni index.json:');
        console.log(JSON.stringify(newIndex, null, 2));
        console.log('');

        // 4. index.json'ın mevcut SHA'sını al
        console.log('🔍 Mevcut index.json SHA alınıyor...');
        const indexFile = files.find(f => f.name === 'index.json');
        
        if (!indexFile) {
            throw new Error('index.json bulunamadı!');
        }

        console.log(`✅ SHA: ${indexFile.sha}\n`);

        // 5. GitHub'a kaydet
        console.log('Saving to GitHub...');
        const content = JSON.stringify(newIndex, null, 2);
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
                message: `🔨 REBUILD: index.json yeniden oluşturuldu (${templates.length} şablon)`,
                content: encodedContent,
                sha: indexFile.sha,
                branch: BRANCH
            })
        });

        if (!updateResponse.ok) {
            const error = await updateResponse.json();
            throw new Error(`Kayıt başarısız: ${error.message}`);
        }

        console.log('✅ index.json başarıyla güncellendi!\n');
        console.log('📊 YENİ DURUM:');
        console.log(`   - Total Count: ${newIndex.totalCount}`);
        console.log(`   - Templates:`);
        templates.forEach((t, i) => {
            console.log(`     ${i + 1}. ${t.name} → ${t.filename}`);
        });
        console.log('\n✨ Tamamlandı!\n');

    } catch (error) {
        console.error('❌ HATA:', error.message);
        process.exit(1);
    }
}

rebuildIndex();
