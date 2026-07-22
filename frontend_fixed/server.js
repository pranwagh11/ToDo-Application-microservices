// Minimal static file server for the Keepr frontend — no npm install needed.
// Usage: node server.js  (defaults to http://localhost:8080)

const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;

// API_BASE_URL is read at container start, not baked into the image at build time.
// This means the exact same image works in Docker Compose, Kubernetes (NodePort,
// Ingress, etc.), or bare `node server.js` — just set the env var differently
// per environment. Empty string means "same origin" (useful behind an Ingress
// that routes both the frontend and /auth,/tasks,/notify to the same host).
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  // Strip query string, decode %20 etc., default "/" to index.html.
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  // Generated at request time from API_BASE_URL, instead of served from disk.
  if (urlPath === '/js/config.js') {
    res.writeHead(200, { 'Content-Type': MIME_TYPES['.js'] });
    res.end(`const CONFIG = { API_BASE_URL: ${JSON.stringify(API_BASE_URL)} };\n`);
    return;
  }

  const filePath = path.join(ROOT, urlPath);

  // Prevent path traversal outside the frontend folder.
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Fall back to index.html for unknown paths (simple SPA-style routing);
      // 404 only if even index.html is missing.
      if (urlPath !== '/index.html') {
        fs.readFile(path.join(ROOT, 'index.html'), (err2, indexData) => {
          if (err2) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': MIME_TYPES['.html'] });
            res.end(indexData);
          }
        });
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      }
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Keepr frontend running at http://localhost:${PORT}`);
  console.log('Make sure the API Gateway (js/config.js -> API_BASE_URL) is running too.');
});
