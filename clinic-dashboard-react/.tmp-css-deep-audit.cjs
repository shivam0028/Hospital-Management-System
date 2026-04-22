const fs = require('fs');
const path = require('path');

const cssPath = path.join('src','App.css');
const srcDir = 'src';
const css = fs.readFileSync(cssPath,'utf8');
const jsxFiles = fs.readdirSync(srcDir).filter(f=>f.endsWith('.jsx'));
const jsx = jsxFiles.map(f=>fs.readFileSync(path.join(srcDir,f),'utf8')).join('\n');

const noComments = css.replace(/\/\*[\s\S]*?\*\//g,'');

// keyframes defined
const keyframes = [...noComments.matchAll(/@keyframes\s+([A-Za-z_][A-Za-z0-9_-]*)/g)].map(m=>m[1]);
const uniqueKeyframes = [...new Set(keyframes)];
const usedKeyframes = uniqueKeyframes.filter(k=>new RegExp(`animation(?:-name)?\\s*:[^;]*\\b${k}\\b`).test(noComments));
const unusedKeyframes = uniqueKeyframes.filter(k=>!usedKeyframes.includes(k));

// duplicate selector blocks (simple heuristic)
const selectorMatches = [...noComments.matchAll(/^\s*([^@][^{]+)\{/gm)].map(m=>m[1].trim());
const count = new Map();
for (const s of selectorMatches) count.set(s,(count.get(s)||0)+1);
const duplicates = [...count.entries()].filter(([,n])=>n>1).sort((a,b)=>b[1]-a[1]);

// classes used in JSX
const classUsed = new Set();
for (const m of jsx.matchAll(/className\s*=\s*("([^"]*)"|'([^']*)'|\{\s*`([\s\S]*?)`\s*\})/g)){
  const s = m[2]||m[3]||m[4]||'';
  const stripped = s.replace(/\$\{[\s\S]*?\}/g,' ');
  for (const c of (stripped.match(/[A-Za-z_][A-Za-z0-9_-]*/g)||[])) classUsed.add(c);
}

const classDefs = [...noComments.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)/g)].map(m=>m[1]);
const classSet = [...new Set(classDefs)];
const unusedClasses = classSet.filter(c=>!classUsed.has(c)).sort();

console.log('UNUSED_KEYFRAMES');
console.log(unusedKeyframes.join('\n'));
console.log('\nDUPLICATE_SELECTORS_TOP20');
for (const [s,n] of duplicates.slice(0,20)) console.log(`${n}x ${s}`);
console.log('\nUNUSED_CLASSES');
console.log(unusedClasses.join('\n'));
