/**
 * GitHub templates/ klasörünü kontrol et
 * Hangi dosyaların gerçekten var olduğunu göster
 */

// NOT: Bu scripti çalıştırmadan önce TOKEN'ı güncelleyin!
// GitHub → Settings → Developer settings → Personal access tokens → Generate new token

const GITHUB_TOKEN = 'YOUR_GITHUB_TOKEN_HERE'; // Token'ı buraya manuel yapıştırın (commit etmeyin!)
const OWNER = 'mustafasacar35';
const REPO = 'lipodem-takip-paneli';
const BRANCH = 'main';

async function checkTemplates() {
    console.log('🔍 GitHub templates/ klasörü kontrol ediliyor...\n');

    try {
        // 1. Templates klasöründeki dosyaları listele
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
            const error = await listResponse.json();
            throw new Error(`GitHub API hatası (${listResponse.status}): ${error.message}`);
        }

        const files = await listResponse.json();
        
        console.log('📂 TEMPLATES/ KLASÖRÜNDE BULUNAN DOSYALAR:');
        console.log('='.repeat(60));
        
        if (!files || files.length === 0) {
            console.log('❌ Hiç dosya bulunamadı!\n');
            return;
        }

        // Dosyaları kategorize et
        const indexFile = files.find(f => f.name === 'index.json');
        const dayFiles = files.filter(f => f.name.startsWith('day_') && f.name.endsWith('.json'));
        const otherFiles = files.filter(f => f.name !== 'index.json' && !f.name.startsWith('day_'));

        console.log(`\n📋 TOPLAM: ${files.length} dosya\n`);

        // index.json
        if (indexFile) {
            console.log('✅ index.json (MEVCUT)');
            console.log(`   SHA: ${indexFile.sha}`);
            console.log(`   Boyut: ${indexFile.size} bytes\n`);
            
            // index.json içeriğini oku
            const indexResponse = await fetch(indexFile.download_url);
            const indexContent = await indexResponse.json();
            
            console.log('📊 INDEX.JSON İÇERİĞİ:');
            console.log(`   Total Count: ${indexContent.totalCount}`);
            console.log(`   Templates Array: ${indexContent.templates?.length || 0} metadata\n`);
            
            if (indexContent.templates && indexContent.templates.length > 0) {
                console.log('   Metadata listesi:');
                indexContent.templates.forEach((t, i) => {
                    console.log(`   ${i + 1}. ${t.name} → ${t.filename}`);
                });
                console.log('');
            }
        } else {
            console.log('❌ index.json (YOK!)\n');
        }

        // day_*.json dosyaları
        if (dayFiles.length > 0) {
            console.log(`📄 ŞABLON DOSYALARI: ${dayFiles.length} adet\n`);
            dayFiles.forEach((f, i) => {
                console.log(`   ${i + 1}. ${f.name}`);
                console.log(`      SHA: ${f.sha}`);
                console.log(`      Boyut: ${f.size} bytes`);
            });
            console.log('');
        } else {
            console.log('❌ Hiç day_*.json dosyası YOK!\n');
        }

        // Diğer dosyalar
        if (otherFiles.length > 0) {
            console.log(`🗂️ DİĞER DOSYALAR: ${otherFiles.length} adet\n`);
            otherFiles.forEach((f, i) => {
                console.log(`   ${i + 1}. ${f.name}`);
            });
            console.log('');
        }

        // SENKRONİZASYON KONTROLÜ
        console.log('='.repeat(60));
        console.log('🔄 SENKRONİZASYON DURUMU:\n');

        if (indexFile) {
            const indexResponse = await fetch(indexFile.download_url);
            const indexContent = await indexResponse.json();
            const metadataCount = indexContent.templates?.length || 0;
            const fileCount = dayFiles.length;

            console.log(`📋 index.json metadata sayısı: ${metadataCount}`);
            console.log(`📄 Gerçek day_*.json dosya sayısı: ${fileCount}\n`);

            if (metadataCount === fileCount) {
                console.log('✅ SAYILAR UYUMLU!\n');
                
                // Dosya adlarını kontrol et
                console.log('🔍 Dosya adı kontrolü:\n');
                const fileNames = dayFiles.map(f => f.name);
                const metadataFileNames = indexContent.templates?.map(t => t.filename) || [];
                
                let allMatch = true;
                metadataFileNames.forEach(mf => {
                    const exists = fileNames.includes(mf);
                    const icon = exists ? '✅' : '❌';
                    console.log(`   ${icon} ${mf} ${exists ? '' : '(DOSYA YOK!)'}`);
                    if (!exists) allMatch = false;
                });

                if (allMatch) {
                    console.log('\n✅ TÜM DOSYALAR MEVCUT - SİSTEM SENKRON!\n');
                } else {
                    console.log('\n⚠️ BAZI DOSYALAR EKSİK - SENKRONİZASYON BOZUK!\n');
                    console.log('ÖNERİ: reset_templates.js çalıştırarak temizleyin.\n');
                }

            } else {
                console.log('⚠️ SAYILAR UYUMSUZ - SENKRONİZASYON BOZUK!\n');
                console.log('ÖNERİ: reset_templates.js çalıştırarak temizleyin.\n');
            }
        }

        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ HATA:', error.message);
        
        if (error.message.includes('401')) {
            console.log('\n⚠️ GitHub token geçersiz veya süresi dolmuş!');
            console.log('✅ ÇÖZÜM:');
            console.log('   1. GitHub → Settings → Developer settings');
            console.log('   2. Personal access tokens → Generate new token');
            console.log('   3. "repo" scope seç');
            console.log('   4. Token\'ı kopyala');
            console.log('   5. Bu dosyadaki GITHUB_TOKEN değişkenine yapıştır\n');
        }
        
        process.exit(1);
    }
}

console.log('⚠️ ÖNEMLI: Script çalıştırmadan önce GITHUB_TOKEN değişkenini güncelleyin!\n');
console.log('Devam etmek için: node check_github_templates.js\n');

// Token kontrolü
if (!GITHUB_TOKEN || GITHUB_TOKEN === 'BURAYA_YENİ_TOKEN_YAPIŞTIRIN') {
    console.error('❌ GitHub token ayarlanmamış!');
    console.log('✅ Lütfen dosyadaki GITHUB_TOKEN değişkenine yeni token yapıştırın.\n');
    process.exit(1);
}

checkTemplates();
