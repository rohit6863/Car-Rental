'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const projects = ['carrental-api', 'carrental-web', 'carrental-admin'];
const pkgs = new Map();

projects.forEach(p => {
  const pjPath = path.join(root, p, 'package.json');
  if (!fs.existsSync(pjPath)) return;
  const pj = JSON.parse(fs.readFileSync(pjPath, 'utf8'));
  const deps = Object.keys(pj.dependencies || {});
  deps.forEach(dep => {
    if (!pkgs.has(dep)) {
      const candidates = [
        path.join(root, p, 'node_modules', dep),
        path.join(root, 'node_modules', dep)
      ];
      for (const c of candidates) {
        const jsonFile = path.join(c, 'package.json');
        if (fs.existsSync(jsonFile)) {
          const info = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
          let licText = '';
          for (const lf of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'license.txt', 'LICENCE']) {
            const lp = path.join(c, lf);
            if (fs.existsSync(lp)) {
              licText = fs.readFileSync(lp, 'utf8');
              break;
            }
          }
          pkgs.set(dep, {
            name: dep,
            version: info.version,
            license: info.license || (info.licenses && info.licenses[0] && info.licenses[0].type) || 'Open Source',
            licenseText: licText
          });
          break;
        }
      }
    }
  });
});

let md = '# Third-Party Software Notices and Licenses\n\n' +
  'This project incorporates open-source software libraries and assets. The original licenses and copyright notices are reproduced below in compliance with their respective license terms.\n\n';

for (const [name, p] of pkgs.entries()) {
  md += `## ${name} (v${p.version})\n\n` +
    `- **Package:** \`${name}\`\n` +
    `- **License:** ${p.license}\n\n`;
  if (p.licenseText && p.licenseText.trim().length > 0) {
    md += '```text\n' + p.licenseText.trim() + '\n```\n\n---\n\n';
  } else {
    md += `*(License text specified in package metadata: \`${p.license}\`)*\n\n---\n\n`;
  }
}

fs.writeFileSync(path.join(root, 'THIRD_PARTY_NOTICES.md'), md);
console.log(`[DONE] Generated THIRD_PARTY_NOTICES.md (${md.length} bytes, ${pkgs.size} npm packages included).`);
