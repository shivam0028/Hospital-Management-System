const fs = require('fs');
const path = require('path');

const cssPath = path.join('src', 'App.css');
const srcDir = 'src';

const css = fs.readFileSync(cssPath, 'utf8');
const jsxFiles = fs.readdirSync(srcDir).filter((f) => f.endsWith('.jsx'));

const defined = new Set();
const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
for (const m of cssNoComments.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)/g)) {
  defined.add(m[1]);
}

const used = new Set();

function addClassTokens(text) {
  if (!text) return;
  const stripped = text.replace(/\$\{[\s\S]*?\}/g, ' ');
  const tokens = stripped.match(/[A-Za-z_][A-Za-z0-9_-]*/g) || [];
  for (const t of tokens) {
    if (defined.has(t)) used.add(t);
  }
}

for (const file of jsxFiles) {
  const code = fs.readFileSync(path.join(srcDir, file), 'utf8');

  // className="..." | className='...'
  for (const m of code.matchAll(/className\s*=\s*"([^"]*)"/g)) addClassTokens(m[1]);
  for (const m of code.matchAll(/className\s*=\s*'([^']*)'/g)) addClassTokens(m[1]);

  // className={`...`} and className={"..."} / {'...'}
  for (const m of code.matchAll(/className\s*=\s*\{\s*`([\s\S]*?)`\s*\}/g)) addClassTokens(m[1]);
  for (const m of code.matchAll(/className\s*=\s*\{\s*"([^"]*)"\s*\}/g)) addClassTokens(m[1]);
  for (const m of code.matchAll(/className\s*=\s*\{\s*'([^']*)'\s*\}/g)) addClassTokens(m[1]);

  // className={cond ? 'a' : 'b'} or similar expression: gather quoted strings inside className expression
  for (const m of code.matchAll(/className\s*=\s*\{([\s\S]*?)\}/g)) {
    const expr = m[1];
    for (const s of expr.matchAll(/"([^"]*)"|'([^']*)'|`([\s\S]*?)`/g)) {
      addClassTokens(s[1] || s[2] || s[3] || '');
    }
  }
}

const unused = [...defined].filter((c) => !used.has(c)).sort();
console.log(unused.join('\n'));
