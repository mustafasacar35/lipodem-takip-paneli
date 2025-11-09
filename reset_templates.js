/**
 * Templates dizinini tamamen sıfırlar
 * 1. Tüm day_*.json dosyalarını siler
 * 2. Temiz bir index.json oluşturur
 */

const GITHUB_TOKEN = 'YOUR_GITHUB_TOKEN_HERE'; // Token'ı buraya manuel yapıştırın (commit etmeyin!)
const OWNER = 'mustafasacar35';
const REPO = 'lipodem-takip-paneli';
const BRANCH = 'main';

async function resetTemplatesDirectory() {
    console.log('🔄 Templates dizini sıfırlanıyor...\n');

    try {
        // 1. Mevcut dosyaları listele
        console.log('📋 Mevcut dosyalar kontrol ediliyor...');
        const listResponse = await fetch(
            `https://api.github.com/repos/${OWNER}/${REPO}/contents/templates?ref=${BRANCH}`,
            {
                headers: {
                    'Authorization': `Bearer ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );

        if (!listResponse.ok) {
            throw new Error(`Liste alınamadı: ${listResponse.status} ${listResponse.statusText}`);
        }

        const files = await listResponse.json();
        console.log(`✅ ${files.length} dosya bulundu\n`);

        // 2. day_*.json dosyalarını sil
        const dayFiles = files.filter(f => f.name.startsWith('day_') && f.name.endsWith('.json'));
        
        if (dayFiles.length > 0) {
            console.log(`🗑️  ${dayFiles.length} şablon dosyası siliniyor...`);
            
            for (const file of dayFiles) {
                console.log(`   Siliniyor: ${file.name}`);
                
                const deleteResponse = await fetch(
                    `https://api.github.com/repos/${OWNER}/${REPO}/contents/templates/${file.name}`,
                    {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${GITHUB_TOKEN}`,
                            'Accept': 'application/vnd.github.v3+json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            message: `🗑️ Reset: ${file.name} silindi`,
                            sha: file.sha,
                            branch: BRANCH
                        })
                    }
                );

                if (!deleteResponse.ok) {
                    const error = await deleteResponse.json();
                    console.log(`   ⚠️  Silinemedi (${deleteResponse.status}): ${error.message}`);
                } else {
                    console.log(`   ✅ Silindi`);
                }

                // Rate limit için bekle
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            console.log('');
        } else {
            console.log('ℹ️  Silinecek şablon dosyası bulunamadı\n');
        }

        // 3. index.json'ı güncelle (temiz başlangıç)
        console.log('📝 Temiz index.json oluşturuluyor...');
        
        const indexFile = files.find(f => f.name === 'index.json');
        if (!indexFile) {
            throw new Error('index.json bulunamadı!');
        }

        const cleanIndex = {
            totalCount: 0,
            templates: [],
            lastUpdate: new Date().toISOString()
        };

        const updateResponse = await fetch(
            `https://api.github.com/repos/${OWNER}/${REPO}/contents/templates/index.json`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: '🔄 Reset: Temiz index.json oluşturuldu',
                    content: Buffer.from(JSON.stringify(cleanIndex, null, 2)).toString('base64'),
                    sha: indexFile.sha,
                    branch: BRANCH
                })
            }
        );

        if (!updateResponse.ok) {
            const error = await updateResponse.json();
            throw new Error(`index.json güncellenemedi: ${error.message}`);
        }

        console.log('✅ index.json sıfırlandı');
        console.log('\n✨ Templates dizini tamamen temizlendi!');
        console.log('📊 Yeni durum:');
        console.log('   - Toplam şablon: 0');
        console.log('   - Şablon dosyaları: Yok');
        console.log('   - index.json: Temiz');
        
    } catch (error) {
        console.error('❌ HATA:', error.message);
        process.exit(1);
    }
}

resetTemplatesDirectory();
