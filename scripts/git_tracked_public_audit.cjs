'use strict';
/**
 * Strict Public Asset Audit Script
 * Grounded directly in `git ls-files`.
 * Includes self-check asserting:
 *   1. Every path in the table exists in git ls-files.
 *   2. Every tracked file under public/ appears in the table exactly once.
 *   3. No invented/phantom files.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// 1. Fetch tracked files via git ls-files
const rawLs = execSync('git ls-files carrental-web/public carrental-admin/public', {
  cwd: ROOT,
  encoding: 'utf8'
}).trim().split(/\r?\n/).filter(Boolean);

const trackedFiles = new Set(rawLs.map(f => f.replace(/\\/g, '/')));
console.log(`[INFO] Found ${trackedFiles.size} tracked files under public/ folders.`);

// 2. Load search corpora
function walkFiles(dir, exts) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  function r(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, ent.name);
      if (ent.isDirectory()) r(full);
      else if (exts.some(e => ent.name.endsWith(e))) results.push(full);
    }
  }
  r(dir);
  return results;
}

const webSrcFiles = walkFiles(path.join(ROOT, 'carrental-web', 'src'), ['.js', '.jsx', '.ts', '.tsx', '.css'])
  .map(f => ({ file: f, content: fs.readFileSync(f, 'utf8') }));

const adminSrcFiles = walkFiles(path.join(ROOT, 'carrental-admin', 'src'), ['.js', '.jsx', '.ts', '.tsx', '.css'])
  .map(f => ({ file: f, content: fs.readFileSync(f, 'utf8') }));

const allSrcFiles = [...webSrcFiles, ...adminSrcFiles];

const webIndexHtml = fs.readFileSync(path.join(ROOT, 'carrental-web', 'index.html'), 'utf8');
const adminIndexHtml = fs.readFileSync(path.join(ROOT, 'carrental-admin', 'index.html'), 'utf8');

const allCssFiles = [
  ...walkFiles(path.join(ROOT, 'carrental-web', 'public'), ['.css']),
  ...walkFiles(path.join(ROOT, 'carrental-admin', 'public'), ['.css']),
  ...walkFiles(path.join(ROOT, 'carrental-web', 'src'), ['.css']),
  ...walkFiles(path.join(ROOT, 'carrental-admin', 'src'), ['.css'])
].map(f => ({ file: f, content: fs.readFileSync(f, 'utf8') }));

const seedContent = fs.existsSync(path.join(ROOT, 'carrental-api', 'src', 'db', 'seed.js'))
  ? fs.readFileSync(path.join(ROOT, 'carrental-api', 'src', 'db', 'seed.js'), 'utf8')
  : '';

// Load runtime requests if available
let runtimeWeb = new Set();
let runtimeAdmin = new Set();
const runtimePath = path.join(__dirname, 'runtime_requests.json');
if (fs.existsSync(runtimePath)) {
  const rt = JSON.parse(fs.readFileSync(runtimePath, 'utf8'));
  runtimeWeb = new Set(rt.web || []);
  runtimeAdmin = new Set(rt.admin || []);
}

// 3. Audit each tracked file
const tableRows = [];
const seenPaths = new Set();

for (const relPath of trackedFiles) {
  if (seenPaths.has(relPath)) {
    throw new Error(`[SELF-CHECK FAILED] Duplicate file encountered: ${relPath}`);
  }
  seenPaths.add(relPath);

  const basename = path.basename(relPath);
  const ext = path.extname(relPath).toLowerCase();
  const isWeb = relPath.startsWith('carrental-web/public/');
  const publicRel = isWeb
    ? relPath.replace('carrental-web/public/', '')
    : relPath.replace('carrental-admin/public/', '');

  // Exact reference regexes
  const escapeReg = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Basename regex bounded by quotes, slashes, or whitespace
  const bnRe = new RegExp(`['"/]${escapeReg(basename)}['"?]`, 'i');
  // Public relative path regex
  const pubPathRe = new RegExp(escapeReg(publicRel), 'i');

  // Search src
  const srcFilesToSearch = isWeb ? webSrcFiles : adminSrcFiles;
  let srcRefs = 0;
  for (const sf of srcFilesToSearch) {
    if (pubPathRe.test(sf.content) || bnRe.test(sf.content)) {
      srcRefs++;
    }
  }

  // Search index.html
  const targetIndexHtml = isWeb ? webIndexHtml : adminIndexHtml;
  let indexRefs = (pubPathRe.test(targetIndexHtml) || bnRe.test(targetIndexHtml)) ? 1 : 0;

  // Search CSS url()
  let cssRefs = 0;
  const urlRe = new RegExp(`url\\s*\\(\\s*['"]?[^'"\\)]*${escapeReg(basename)}[^'"\\)]*['"]?\\s*\\)`, 'i');
  for (const cf of allCssFiles) {
    if (urlRe.test(cf.content)) {
      cssRefs++;
    }
  }

  // Search seed
  let seedRefs = (pubPathRe.test(seedContent) || bnRe.test(seedContent)) ? 1 : 0;

  // Runtime traffic
  const runtimeRequested = isWeb ? runtimeWeb.has(publicRel) : runtimeAdmin.has(publicRel);

  // Category
  let cat = 'other';
  if (['.css'].includes(ext)) cat = 'css';
  else if (['.js'].includes(ext)) cat = 'js';
  else if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.ico'].includes(ext)) cat = 'image';
  else if (['.eot', '.ttf', '.woff', '.woff2', '.otf', '.svg'].includes(ext)) cat = 'font';

  const totalRefs = srcRefs + indexRefs + cssRefs + seedRefs;
  const unreferenced = totalRefs === 0 && !runtimeRequested;

  tableRows.push({
    relPath,
    publicRel,
    cat,
    srcRefs,
    indexRefs,
    cssRefs,
    seedRefs,
    runtime: runtimeRequested ? 'Yes' : 'No',
    status: unreferenced ? 'UNREFERENCED' : 'REFERENCED'
  });
}

// 4. Strict Self-Checks
console.log('[SELF-CHECK] Verifying audit completeness against git ls-files...');
if (tableRows.length !== trackedFiles.size) {
  throw new Error(`[SELF-CHECK FAILED] Table row count (${tableRows.length}) does not match git ls-files count (${trackedFiles.size})!`);
}

for (const row of tableRows) {
  if (!trackedFiles.has(row.relPath)) {
    throw new Error(`[SELF-CHECK FAILED] Table contains non-tracked file: ${row.relPath}`);
  }
}

for (const tf of trackedFiles) {
  if (!seenPaths.has(tf)) {
    throw new Error(`[SELF-CHECK FAILED] Tracked file missing from table: ${tf}`);
  }
}

console.log(`[SELF-CHECK PASSED] All ${tableRows.length} tracked public files accounted for exactly once. Zero phantom files.\n`);

// 5. Output Markdown Table
console.log('| Path | Category | src/ | index.html | CSS url() | seed.js | Runtime | Status |');
console.log('| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |');
for (const r of tableRows) {
  console.log(`| \`${r.relPath}\` | ${r.cat} | ${r.srcRefs} | ${r.indexRefs} | ${r.cssRefs} | ${r.seedRefs} | ${r.runtime} | ${r.status} |`);
}

const unrefList = tableRows.filter(r => r.status === 'UNREFERENCED');
console.log(`\n[SUMMARY] Total Tracked: ${tableRows.length} | Referenced/Runtime: ${tableRows.length - unrefList.length} | Unreferenced: ${unrefList.length}`);
