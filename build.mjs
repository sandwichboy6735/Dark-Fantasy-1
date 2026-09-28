// Bundles the game into single self-contained HTML files:
//   docs/index.html      full document (GitHub Pages, or just double-click it)
//   dist/moonfall.html  body-only variant for hosts that supply their own <head>
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const watch = process.argv.includes('--watch');

async function build() {
  const result = await esbuild.build({
    entryPoints: ['src/main.js'], bundle: true, format: 'iife', minify: true,
    target: 'es2020', write: false, legalComments: 'none',
  });
  const js = result.outputFiles[0].text.replaceAll('</script', '<\\/script');
  const css = readFileSync('src/style.css', 'utf8');
  const body = readFileSync('src/index.template.html', 'utf8')
    .split('/*STYLE*/').join(css)
    .split('/*SCRIPT*/').join(js);
  mkdirSync('docs', { recursive: true });
  mkdirSync('dist', { recursive: true });
  writeFileSync('dist/moonfall.html', body);
  writeFileSync('docs/index.html', `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n${body}\n</body>\n</html>\n`);
  console.log(`built docs/index.html (${(body.length / 1024).toFixed(0)} KB)`);
}

await build();
if (watch) {
  const { watch: fsWatch } = await import('node:fs');
  let t = null;
  fsWatch('src', () => { clearTimeout(t); t = setTimeout(() => build().catch((e) => console.error(e.message)), 100); });
  console.log('watching src/ ...');
}
