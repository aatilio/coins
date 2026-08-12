import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const publicDir = join(root, 'public');

function loadEnvFile(path) {
    if (!existsSync(path)) return {};
    const vars = {};
    for (const line of readFileSync(path, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const pos = trimmed.indexOf('=');
        if (pos === -1) continue;
        vars[trimmed.slice(0, pos).trim()] = trimmed.slice(pos + 1).trim().replace(/^["']|["']$/g, '');
    }
    return vars;
}

const apiKey = process.env.COINGECKO_API_KEY
    || loadEnvFile(join(root, '.env')).COINGECKO_API_KEY
    || '';

console.log('Building...');

mkdirSync(dist, { recursive: true });
cpSync(publicDir, dist, { recursive: true, force: true });

const configPath = join(dist, 'js', 'config.js');
const config = readFileSync(configPath, 'utf8').replace(
    "API_KEY: ''",
    `API_KEY: '${apiKey.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
);
writeFileSync(configPath, config);

writeFileSync(join(dist, '.htaccess'), `RewriteEngine On

RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
`);

console.log(`Build listo -> dist/ (${apiKey ? 'con API key' : 'sin API key'})`);
