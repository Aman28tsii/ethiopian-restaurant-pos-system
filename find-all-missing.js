// find-all-missing.js
const fs = require('fs');
const path = require('path');

// Load LanguageContext.js to get existing translations
const langFile = fs.readFileSync('./client/src/context/LanguageContext.js', 'utf8');

// Extract all existing keys from the file
const existingKeys = [];
const keyMatches = langFile.match(/['"]([^'"]+)['"]:\s*['"`]/g);
if (keyMatches) {
    keyMatches.forEach(m => {
        const key = m.match(/['"]([^'"]+)['"]:/);
        if (key) existingKeys.push(key[1]);
    });
}

// Scan all JS/JSX files for t('...') usage
const allFiles = [];
function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (!['node_modules', 'build', '.git', 'dist'].includes(file)) {
                scanDirectory(fullPath);
            }
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                const matches = content.match(/t\(['"]([^'"]+)['"]\)/g);
                if (matches) {
                    matches.forEach(m => {
                        const key = m.match(/['"]([^'"]+)['"]/);
                        if (key) {
                            allFiles.push({ file: fullPath.replace('./client/src/', ''), key: key[1] });
                        }
                    });
                }
            } catch (e) {}
        }
    }
}

scanDirectory('./client/src');

// Find duplicates and missing keys
const usedKeys = [...new Set(allFiles.map(f => f.key))];
const missingKeys = usedKeys.filter(key => !existingKeys.includes(key));

// Group by file
const byFile = {};
allFiles.forEach(f => {
    if (missingKeys.includes(f.key)) {
        if (!byFile[f.file]) byFile[f.file] = [];
        if (!byFile[f.file].includes(f.key)) byFile[f.file].push(f.key);
    }
});

// Display results
console.log('\n' + '='.repeat(60));
console.log('📊 MISSING TRANSLATIONS REPORT');
console.log('='.repeat(60));

console.log(`\n📝 Total missing keys: ${missingKeys.length}\n`);

// Group by file
const sortedFiles = Object.keys(byFile).sort();
sortedFiles.forEach(file => {
    console.log(`\n📁 ${file}:`);
    byFile[file].forEach(key => {
        console.log(`   ❌ ${key}`);
    });
});

// Full list of all missing keys
console.log('\n' + '='.repeat(60));
console.log('📋 FULL LIST OF MISSING KEYS (Copy this):');
console.log('='.repeat(60));
console.log(missingKeys.map(k => `'${k}': '',`).join('\n'));

console.log('\n' + '='.repeat(60));
console.log('✅ Done!');