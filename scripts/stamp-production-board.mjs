import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const scriptPath = path.join(root, 'public', 'blue-christmas', 'production', 'production-board.js');
const htmlPath = path.join(root, 'public', 'blue-christmas', 'production', 'index.html');

if (!fs.existsSync(scriptPath) || !fs.existsSync(htmlPath)) {
  throw new Error('Production storyboard assets are missing.');
}

const version = createHash('sha256').update(fs.readFileSync(scriptPath)).digest('hex').slice(0, 12);
const html = fs.readFileSync(htmlPath, 'utf8');
const next = html.replace(/production-board\.js(?:\?v=[^"']+)?/, `production-board.js?v=${version}`);
if (next === html && !html.includes(`production-board.js?v=${version}`)) {
  throw new Error('Could not locate production-board.js in the production storyboard HTML.');
}
fs.writeFileSync(htmlPath, next, 'utf8');
console.log(`Stamped production-board.js?v=${version}`);
