// find-missing-translations.js
const fs = require('fs');
const path = require('path');

// Read the translation file
const langFile = fs.readFileSync('./client/src/context/LanguageContext.js', 'utf8');

// Find all t('...') keys in the code
const allFiles = [];
function searchFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            searchFiles(fullPath);
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const matches = content.match(/t\(['"]([^'"]+)['"]\)/g);
            if (matches) {
                matches.forEach(m => {
                    const key = m.match(/['"]([^'"]+)['"]/)[1];
                    allFiles.push({ file: fullPath, key });
                });
            }
        }
    }
}

searchFiles('./client/src');

// Find missing translations
const existingKeys = [...new Set(allFiles.map(f => f.key))];
const missing = existingKeys.filter(key => !langFile.includes(`'${key}':`));

console.log('Missing translations:');
console.log(missing.join('\n'));