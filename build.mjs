import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

fs.rmSync('dist', { recursive: true, force: true });
fs.mkdirSync('dist/icons', { recursive: true });

const common = { bundle: true, minify: true, target: ['chrome110'], loader: { '.tsv': 'text' }, logLevel: 'error' };

// popup + dashboard share the engine, so split it into one common chunk
await esbuild.build({
  ...common,
  entryPoints: ['src/ui/popup.js', 'src/ui/dashboard.js'],
  format: 'esm', splitting: true, chunkNames: 'engine-[hash]',
  outdir: 'dist'
});
await esbuild.build({ ...common, entryPoints: ['src/background.js'], format: 'esm', outfile: 'dist/background.js' });

// content script runs through executeScript, so it must be a classic script whose
// final expression is the return value
await esbuild.build({ ...common, entryPoints: ['src/content.js'], format: 'iife', globalName: '__reg', outfile: 'dist/content.js' });
fs.appendFileSync('dist/content.js', '\n__reg.extract();\n');

fs.copyFileSync('manifest.json', 'dist/manifest.json');
for (const f of ['popup.html', 'dashboard.html', 'style.css'])
  fs.copyFileSync(path.join('src/ui', f), path.join('dist', f));

const kb = f => (fs.statSync(path.join('dist', f)).size / 1024).toFixed(0).padStart(5) + ' KB  ' + f;
console.log(fs.readdirSync('dist').filter(f => fs.statSync(path.join('dist', f)).isFile()).map(kb).join('\n'));
console.log('  total  ' + (fs.readdirSync('dist').filter(f=>fs.statSync(path.join('dist',f)).isFile()).reduce((a,f)=>a+fs.statSync(path.join('dist',f)).size,0)/1024/1024).toFixed(2) + ' MB');
