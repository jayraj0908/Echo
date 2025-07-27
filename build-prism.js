const fs = require('fs');
const path = require('path');

// This build script concatenates the Prism.js core library with a
// curated set of language definitions into a single bundle.  By
// packaging them in one file we avoid multiple network requests and
// simplify inclusion in the client.  To adjust the languages
// supported, add or remove names from the `languages` array below.  See
// node_modules/prismjs/components for available definitions.

const languages = [
  'markup',
  'css',
  'clike',
  'javascript',
  'typescript',
  'python',
  'bash',
  'json',
  'markdown',
  'go',
  'java',
  'c',
  'cpp',
  'csharp',
  'ruby',
  'yaml',
];

function buildPrismBundle() {
  const corePath = require.resolve('prismjs/prism.js');
  let bundle = fs.readFileSync(corePath, 'utf8');
  languages.forEach((lang) => {
    try {
      const langPath = require.resolve(`prismjs/components/prism-${lang}.js`);
      const code = fs.readFileSync(langPath, 'utf8');
      bundle += '\n' + code;
    } catch (e) {
      console.warn(`Warning: could not include Prism language '${lang}':`, e.message);
    }
  });
  const outDir = path.join(__dirname, 'public', 'libs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'prism-all.js'), bundle, 'utf8');
  console.log('Prism bundle generated.');
}

if (require.main === module) {
  buildPrismBundle();
}

module.exports = { buildPrismBundle };