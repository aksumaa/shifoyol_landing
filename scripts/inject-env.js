const fs = require('fs');
const path = require('path');

function readDotEnv(file) {
    if (!fs.existsSync(file)) return {};
    const values = {};
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        values[key] = value;
    }
    return values;
}

const root = path.join(__dirname, '..');
const fileEnv = readDotEnv(path.join(root, '.env'));
const apiUrl = process.env.API_URL || fileEnv.API_URL || 'https://api.shifoyol.uz';

if (!/^https?:\/\//i.test(apiUrl)) {
    console.error('API_URL must be an http(s) URL');
    process.exit(1);
}

const output = `window.API_URL = ${JSON.stringify(apiUrl)};\n`;
fs.writeFileSync(path.join(root, 'js', 'api-config.js'), output);
console.log(`Wrote js/api-config.js with API_URL=${apiUrl}`);
