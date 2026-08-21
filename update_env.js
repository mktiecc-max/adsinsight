const fs = require('fs');
const path = require('path');
const walk = (dir) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      walk(path.join(dir, file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      let c = fs.readFileSync(path.join(dir, file), 'utf8');
      if (c.includes('process.env.') && !file.includes('env.ts')) {
        console.log('Replacing in', path.join(dir, file));
        c = c.replace(/process\.env\.NEXT_PUBLIC_SUPABASE_URL/g, 'env.SUPABASE_URL');
        c = c.replace(/process\.env\.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/g, 'env.SUPABASE_ANON_KEY');
        c = c.replace(/process\.env\.SUPABASE_SECRET_KEY/g, 'env.SUPABASE_SERVICE_KEY');
        c = c.replace(/process\.env\.ADSINSIGHT_DATA_MODE === ['"]live['"]/g, 'env.IS_LIVE');
        c = c.replace(/process\.env\.ADSINSIGHT_DATA_MODE !== ['"]demo['"]/g, 'env.IS_LIVE');
        c = c.replace(/process\.env\.ADSINSIGHT_DATA_MODE === ['"]demo['"]/g, '!env.IS_LIVE');
        c = c.replace(/process\.env\.NODE_ENV === ['"]development['"]/g, 'env.IS_DEV');
        c = c.replace(/process\.env\.GOOGLE_SERVICE_ACCOUNT_B64/g, 'env.GOOGLE_SERVICE_ACCOUNT_B64');
        c = c.replace(/process\.env\.ANTHROPIC_API_KEY/g, 'env.ANTHROPIC_API_KEY');
        c = 'import { env } from "@/lib/config/env";\n' + c;
        fs.writeFileSync(path.join(dir, file), c);
      }
    }
  }
};
walk('src');
