const { execSync } = require('child_process');
try {
  const output = execSync('npx tsc --noEmit', { encoding: 'utf-8' });
  console.log(output);
} catch (e) {
  console.log(e.stdout);
}
