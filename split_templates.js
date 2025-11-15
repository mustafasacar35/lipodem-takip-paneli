/**
 * Template Migration Script
 * Splits gun-sablonlari-2025-10-25.json into:
 * - templates/index.json (metadata only, 15 KB)
 * - templates/day_XXX.json (individual templates, 25 KB each)
 * 
 * Usage: node split_templates.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    sourceFile: 'gun-sablonlari-2025-10-25.json',
    outputDir: 'templates',
    indexFile: 'templates/index.json'
};

console.log('=== Template Migration Script ===\n');

// Step 1: Read source file
console.log('[1/4] Reading source file:', CONFIG.sourceFile);
if (!fs.existsSync(CONFIG.sourceFile)) {
    console.error('ERROR: Source file not found:', CONFIG.sourceFile);
    process.exit(1);
}

const sourceData = JSON.parse(fs.readFileSync(CONFIG.sourceFile, 'utf8'));
console.log('✓ Loaded', sourceData.templates.length, 'templates from source file');
console.log('  Total file size:', (fs.statSync(CONFIG.sourceFile).size / 1024).toFixed(2), 'KB');

// Step 2: Create output directory
console.log('\n[2/4] Creating output directory:', CONFIG.outputDir);
if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    console.log('✓ Directory created');
} else {
    console.log('✓ Directory already exists');
}

// Step 3: Split templates into individual files
console.log('\n[3/4] Splitting templates into individual files...');
const index = {
    version: '1.0',
    totalCount: sourceData.templates.length,
    templates: []
};

sourceData.templates.forEach((template, i) => {
    // Generate filename: day_001.json, day_002.json, etc.
    const templateNumber = (i + 1).toString().padStart(3, '0');
    const filename = `day_${templateNumber}.json`;
    const filepath = path.join(CONFIG.outputDir, filename);

    // Add filename to template object
    template.filename = filename;

    // Save individual template file
    fs.writeFileSync(filepath, JSON.stringify(template, null, 2), 'utf8');

    // Create metadata for index
    const metadata = {
        id: template.id,
        name: template.name,
        dietType: template.dietType,
        totalMacros: template.totalMacros,
        filename: filename
    };

    index.templates.push(metadata);

    const fileSize = (fs.statSync(filepath).size / 1024).toFixed(2);
    console.log(`  ✓ ${filename} (${fileSize} KB) - ${template.name}`);
});

console.log('\n✓ Created', index.totalCount, 'template files');

// Step 4: Create index file
console.log('\n[4/4] Creating index file:', CONFIG.indexFile);
fs.writeFileSync(CONFIG.indexFile, JSON.stringify(index, null, 2), 'utf8');
const indexSize = (fs.statSync(CONFIG.indexFile).size / 1024).toFixed(2);
console.log('✓ Index file created:', indexSize, 'KB');

// Summary
console.log('\n=== Migration Complete ===');
console.log('Source file:', CONFIG.sourceFile, `(${(fs.statSync(CONFIG.sourceFile).size / 1024).toFixed(2)} KB)`);
console.log('Output directory:', CONFIG.outputDir);
console.log('Templates created:', index.totalCount);
console.log('Index file:', CONFIG.indexFile, `(${indexSize} KB)`);
console.log('\nAverage template size:', 
    (sourceData.templates.reduce((sum, _, i) => {
        const filename = `day_${(i + 1).toString().padStart(3, '0')}.json`;
        const filepath = path.join(CONFIG.outputDir, filename);
        return sum + fs.statSync(filepath).size;
    }, 0) / sourceData.templates.length / 1024).toFixed(2), 
    'KB');

console.log('\n✓ Migration successful!');
console.log('\nNext steps:');
console.log('1. Upload templates/ folder to GitHub');
console.log('2. Update patient_nutrition.html to use TemplateManager');
console.log('3. Update sabloncu.html to use TemplateManager');
console.log('4. Update admin_settings.html references');
console.log('5. Test all functionality');
