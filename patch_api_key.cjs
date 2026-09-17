const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/views/**/*.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  if (content.includes("fetch('/api/ai/") || content.includes("fetch('/api/ai-")) {
    if (!content.includes('localStorage.getItem(\'moi_settings\')')) {
      console.log('Needs manual patch:', file);
    }
  }
});
