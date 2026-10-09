// Run: node tools/fetch-fonts.mjs  (after this, re-download each fonts/<name>/OFL.txt too)
// Downloads the app's Google Fonts (all unicode-range slices, woff2) into todo-app/fonts/
// and writes fonts/fonts.css pointing at the local files.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(APP, 'fonts');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const FAMILIES = [
  ['Jua', 'jua', 'Jua'],
  ['Do Hyeon', 'do-hyeon', 'Do+Hyeon'],
  ['Gaegu', 'gaegu', 'Gaegu:wght@400;700'],
  ['Hi Melody', 'hi-melody', 'Hi+Melody'],
  ['Gowun Dodum', 'gowun-dodum', 'Gowun+Dodum']
];
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
let css = '/* Self-hosted copies of Google Fonts (SIL Open Font License). Made by tools/fetch-fonts.mjs; do not edit by hand. */\n';
let files = 0, bytes = 0;
for (const [name, slug, q] of FAMILIES) {
  const res = await fetch('https://fonts.googleapis.com/css2?family=' + q + '&display=swap', { headers: { 'User-Agent': UA } });
  let text = await res.text();
  fs.mkdirSync(path.join(OUT, slug), { recursive: true });
  const blocks = text.split('@font-face').slice(1);
  let i = 0;
  for (const b of blocks) {
    const url = (b.match(/url\((https:[^)]+)\)/) || [])[1];
    const weight = (b.match(/font-weight:\s*(\d+)/) || [])[1] || '400';
    if (!url) continue;
    const file = slug + '/' + weight + '-' + String(i++).padStart(3, '0') + '.woff2';
    const buf = Buffer.from(await (await fetch(url, { headers: { 'User-Agent': UA } })).arrayBuffer());
    fs.writeFileSync(path.join(OUT, file), buf);
    files++; bytes += buf.length;
    text = text.replace(url, file);
  }
  css += '\n/* ' + name + ' */\n' + text.replace(/^\/\*[^*]*\*\/\n?/gm, '').trim() + '\n';
  console.log(name, i, 'files');
}
fs.writeFileSync(path.join(OUT, 'fonts.css'), css);
console.log('total', files, 'files,', (bytes / 1048576).toFixed(1), 'MB');
