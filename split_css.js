const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'app', 'globals.css');
const content = fs.readFileSync(cssPath, 'utf8');

const lines = content.split('\n');

const files = {
  'reset.css': [],
  'layout.css': [],
  'components.css': [],
  'modules/overview.css': [],
  'modules/performance.css': [],
  'modules/funnel.css': [],
  'modules/alerts.css': [],
  'modules/leads.css': [],
  'modules/settings.css': [],
  'modules/sync.css': [],
  'modules/others.css': []
};

let currentFile = 'reset.css';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.startsWith('.app-shell') || line.startsWith('.app-header')) currentFile = 'layout.css';
  else if (line.startsWith('.page ') || line.startsWith('.page {') || line.startsWith('.button {') || line.startsWith('.card {')) currentFile = 'components.css';
  else if (line.startsWith('.overview-page')) currentFile = 'modules/overview.css';
  else if (line.startsWith('.perf-layout') || line.startsWith('.perf-page')) currentFile = 'modules/performance.css';
  else if (line.startsWith('.funnel-page')) currentFile = 'modules/funnel.css';
  else if (line.startsWith('.alerts-page') || line.startsWith('.alerts-heading')) currentFile = 'modules/alerts.css';
  else if (line.startsWith('.leads-page')) currentFile = 'modules/leads.css';
  else if (line.startsWith('.settings-page')) currentFile = 'modules/settings.css';
  else if (line.startsWith('.sync-page')) currentFile = 'modules/sync.css';
  
  files[currentFile].push(line);
}

for (const [name, lines] of Object.entries(files)) {
  if (lines.length === 0) continue;
  const outPath = path.join(__dirname, 'app', 'styles', name);
  fs.writeFileSync(outPath, lines.join('\n'));
}

// Generate new globals.css
const newGlobals = `@tailwind base;
@tailwind components;
@tailwind utilities;

@import "./styles/reset.css";
@import "./styles/layout.css";
@import "./styles/components.css";

/* Modules */
@import "./styles/modules/overview.css";
@import "./styles/modules/performance.css";
@import "./styles/modules/funnel.css";
@import "./styles/modules/alerts.css";
@import "./styles/modules/leads.css";
@import "./styles/modules/settings.css";
@import "./styles/modules/sync.css";
@import "./styles/modules/others.css";
`;

fs.writeFileSync(cssPath, newGlobals);
console.log('Done splitting CSS!');
