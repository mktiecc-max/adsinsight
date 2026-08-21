const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./app');
files.forEach((file) => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('@/lib/mock-data')) {
    console.log('Cleaning', file);
    
    // Remove import
    content = content.replace(/import\s+{.*}\s+from\s+['"]@\/lib\/mock-data['"];?\n?/g, '');
    
    // Common replacements
    content = content.replace(/const sourceRows = liveRows \|\| [a-zA-Z0-9_]+;/g, 'if (!liveRows) throw new Error("Chưa kết nối Supabase");\n    const sourceRows = liveRows;');
    content = content.replace(/const summary = liveSummary \|\| [a-zA-Z0-9_]+;/g, 'if (!liveSummary) throw new Error("Chưa kết nối Supabase");\n    const summary = liveSummary;');
    content = content.replace(/const funnels = liveFunnel \|\| [a-zA-Z0-9_]+;/g, 'if (!liveFunnel) throw new Error("Chưa kết nối Supabase");\n    const funnels = liveFunnel;');
    content = content.replace(/const sourceAlerts = liveAlerts \|\| [a-zA-Z0-9_]+;/g, 'if (!liveAlerts) throw new Error("Chưa kết nối Supabase");\n    const sourceAlerts = liveAlerts;');
    content = content.replace(/const sourceRuns = liveRuns \|\| [a-zA-Z0-9_]+;/g, 'if (!liveRuns) throw new Error("Chưa kết nối Supabase");\n    const sourceRuns = liveRuns;');
    content = content.replace(/const detail = liveDetail \|\| [a-zA-Z0-9_]+;/g, 'if (!liveDetail) throw new Error("Chưa kết nối Supabase");\n    const detail = liveDetail;');
    content = content.replace(/const data = liveValues \|\| [a-zA-Z0-9_]+;/g, 'if (!liveValues) throw new Error("Chưa kết nối Supabase");\n    const data = liveValues;');
    content = content.replace(/const sourceLeads = liveLeads \|\| [a-zA-Z0-9_]+;/g, 'if (!liveLeads) throw new Error("Chưa kết nối Supabase");\n    const sourceLeads = liveLeads;');
    content = content.replace(/const data = liveQuality \|\| [a-zA-Z0-9_]+;/g, 'if (!liveQuality) throw new Error("Chưa kết nối Supabase");\n    const data = liveQuality;');
    content = content.replace(/const data = liveSources \|\| [a-zA-Z0-9_]+;/g, 'if (!liveSources) throw new Error("Chưa kết nối Supabase");\n    const data = liveSources;');
    content = content.replace(/const data = liveTimeseries \|\| [a-zA-Z0-9_]+;/g, 'if (!liveTimeseries) throw new Error("Chưa kết nối Supabase");\n    const data = liveTimeseries;');

    // Change mode
    content = content.replace(/mode: (liveRows|liveSummary|liveFunnel|liveAlerts|liveRuns|liveDetail|liveValues|liveLeads|liveQuality|liveSources|liveTimeseries) \? "live" : "demo",/g, 'mode: "live",');
    
    // Page components: They might be importing it directly to render Server Components if fetch is not used.
    // Wait, if a Server Component imports it, I need to see what it does. Let's just remove the mock-data import and see if typecheck fails.
    
    fs.writeFileSync(file, content, 'utf8');
  }
});
