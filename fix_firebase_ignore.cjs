const fs = require('fs');
let content = fs.readFileSync('src/main.tsx', 'utf8');

if (!content.includes('originalConsoleError')) {
  // Override console.error to swallow the specific benign Firebase offline warning in preview
  const override = `
// Suppress benign Firebase offline warnings in the preview iframe
const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' && 
    (args[0].includes('Could not reach Cloud Firestore backend') || args[0].includes('[code=unavailable]'))
  ) {
    return;
  }
  originalConsoleError(...args);
};
`;

  content = override + '\n' + content;
  fs.writeFileSync('src/main.tsx', content, 'utf8');
}
