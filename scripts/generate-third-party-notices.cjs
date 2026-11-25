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

// Public vendor CSS and webfonts (carrental-admin)
md += '## Font Awesome (v4.7.0)\n\n' +
  '- **Asset Path:** `carrental-admin/public/fonts/fontawesome-webfont*`\n' +
  '- **Author:** Dave Gandy (http://fontawesome.io)\n' +
  '- **License:** SIL OFL 1.1 (Fonts) / MIT License (CSS)\n\n' +
  '```text\n' +
  'Font Awesome 4.7.0 by @davegandy - http://fontawesome.io - @fontawesome\n' +
  'License - http://fontawesome.io/license (Font: SIL OFL 1.1, CSS: MIT License)\n' +
  '```\n\n---\n\n';

md += '## Bootstrap (v3.3.7 / Bootswatch)\n\n' +
  '- **Asset Path:** `carrental-admin/public/css/bootstrap.min.css`, Glyphicons\n' +
  '- **Authors:** Twitter, Inc. / Thomas Park\n' +
  '- **License:** MIT License\n\n' +
  '```text\n' +
  'Copyright 2011-2016 Twitter, Inc.\n' +
  'Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)\n' +
  '```\n\n---\n\n';

md += '## Bootstrap-select (v1.7.2)\n\n' +
  '- **Asset Path:** `carrental-admin/public/css/bootstrap-select.css`\n' +
  '- **License:** MIT License\n\n' +
  '```text\n' +
  'Bootstrap-select v1.7.2 (http://silviomoreto.github.io/bootstrap-select)\n' +
  'Copyright 2013-2015 bootstrap-select\n' +
  'Licensed under MIT (https://github.com/silviomoreto/bootstrap-select/blob/master/LICENSE)\n' +
  '```\n\n---\n\n';

md += '## Social Buttons for Bootstrap\n\n' +
  '- **Asset Path:** `carrental-admin/public/css/bootstrap-social.css`\n' +
  '- **License:** MIT License\n\n' +
  '```text\n' +
  'Copyright 2013-2015 Panayiotis Lipiridis\n' +
  'Licensed under the MIT License (https://github.com/lipis/bootstrap-social)\n' +
  '```\n';

fs.writeFileSync(path.join(root, 'THIRD_PARTY_NOTICES.md'), md);
console.log(`[DONE] Generated THIRD_PARTY_NOTICES.md (${md.length} bytes, ${pkgs.size} npm packages included).`);
