const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, 'frontend', 'app.js');
const jsDir = path.join(__dirname, 'frontend', 'js');

let content = fs.readFileSync(appJsPath, 'utf8');

// The Auth chunk is between:
const authStartStr = '// --- AUTH MODE TOGGLE FUNCTION ---';
const authEndStr = '// --- TOAST HELPER ---';

const authStart = content.indexOf(authStartStr);
const authEnd = content.indexOf(authEndStr);

if (authStart !== -1 && authEnd !== -1) {
    const authContent = content.substring(authStart, authEnd).trim();
    fs.writeFileSync(path.join(jsDir, 'auth.js'), authContent);

    // Remove from app.js
    const remainingContent = content.substring(0, authStart) + content.substring(authEnd);
    fs.writeFileSync(appJsPath, remainingContent);

    console.log("Successfully extracted auth.js!");
} else {
    console.log("Could not find auth markers block!");
}
