const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');
const middleware = `
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
`;
const updated = content.replace("app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));", "app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));" + middleware);
fs.writeFileSync('server.ts', updated);
