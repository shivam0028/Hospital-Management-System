const fs = require('fs');
const path = require('path');
const css = fs.readFileSync('src/App.css', 'utf8');
const jsxFiles = fs.readdirSync('src').filter((f) => f.endsWith('.jsx'));
const jsx = jsxFiles.map((f) => fs.readFileSync(path.join('src', f), 'utf8')).join('\n');

const classDefs = [...css.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)/g)].map((m) => m[1]);
const defSet = [...new Set(classDefs)];
const used = new Set();

for (const m of jsx.matchAll(/className\s*=\s*("([^"]*)"|'([^']*)'|`([^`]*)`)/g)) {
  const s = m[2] || m[3] || m[4] || '';
  for (const c of (s.match(/[A-Za-z_][A-Za-z0-9_-]*/g) || [])) used.add(c);
}

for (const m of jsx.matchAll(/\?\s*`([^`]*)`\s*:\s*`([^`]*)`/g)) {
  for (const s of [m[1], m[2]]) {
    for (const c of (s.match(/[A-Za-z_][A-Za-z0-9_-]*/g) || [])) used.add(c);
  }
}

const unused = defSet.filter((c) => !used.has(c)).sort();
console.log('TOTAL_DEFS', defSet.length);
console.log('TOTAL_USED_IN_JSX', used.size);
console.log('UNUSED', unused.length);
console.log(unused.join('\n'));
