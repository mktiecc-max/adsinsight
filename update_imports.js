const fs = require('fs');
const path = require('path');

const walk = (dir, fileList = []) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      walk(path.join(dir, file), fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
};

const allFiles = [...walk('./app'), ...walk('./lib')];

const replacements = {
  '@/lib/api-response': '@/lib/shared/api-response',
  '@/lib/format': '@/lib/shared/format',
  '@/lib/utils': '@/lib/shared/utils',
  '@/lib/data/report-repository': '@/lib/infrastructure/repositories/report-repository',
  '@/lib/google-sheets': '@/lib/infrastructure/google-sheets',
  '@/lib/supabase/client': '@/lib/infrastructure/supabase/client',
  '@/lib/supabase/server': '@/lib/infrastructure/supabase/server'
};

let updatedCount = 0;

for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  for (const [oldPath, newPath] of Object.entries(replacements)) {
    if (content.includes(oldPath)) {
      content = content.replaceAll(oldPath, newPath);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
    updatedCount++;
  }
}

console.log(`Done updating imports in ${updatedCount} files.`);
