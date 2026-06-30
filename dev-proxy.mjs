// Local dev server for testing index.html against your DEPLOYED backend.
//
// Serves your LOCAL files (so you see your index.html edits) and forwards every
// /api/* request to your live Vercel deployment (which already has the AWS/S3
// credentials). No local creds, no `vercel dev`, no Vercel login required.
//
// Usage:
//   UPSTREAM=https://YOUR-APP.vercel.app node dev-proxy.mjs
//   then open http://localhost:5173
//
// Find YOUR-APP url in your Vercel dashboard (the production domain).

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const PORT = process.env.PORT || 5173;
const UPSTREAM = process.env.UPSTREAM;
const ROOT = process.cwd();

if (!UPSTREAM) {
  console.error('\n  ERROR: set UPSTREAM to your deployed app, e.g.\n  UPSTREAM=https://your-app.vercel.app node dev-proxy.mjs\n');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Forward API calls to the deployed backend
  if (url.pathname.startsWith('/api/')) {
    const target = UPSTREAM.replace(/\/$/, '') + url.pathname + url.search;
    try {
      const upstream = await fetch(target, {
        method: req.method,
        headers: { 'user-agent': 'dev-proxy' },
      });
      res.writeHead(upstream.status, {
        'content-type': upstream.headers.get('content-type') || 'application/octet-stream',
      });
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.end(buf);
      console.log(`[api] ${upstream.status}  ${url.pathname}${url.search}`);
    } catch (e) {
      res.writeHead(502); res.end('proxy error: ' + e.message);
      console.log(`[api] 502  ${url.pathname}  (${e.message})`);
    }
    return;
  }

  // Serve local static files (default to index.html)
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/' || pathname === '') pathname = '/index.html';
  const filePath = normalize(join(ROOT, pathname));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
  try {
    const data = await readFile(filePath);
    res.writeHead(200, {
      'content-type': MIME[extname(filePath)] || 'application/octet-stream',
      'cache-control': 'no-store, no-cache, must-revalidate', // never serve stale local edits
    });
    res.end(data);
  } catch {
    // SPA-style fallback to index.html (matches vercel.json rewrites)
    try {
      const data = await readFile(join(ROOT, 'index.html'));
      res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-store, no-cache, must-revalidate' });
      res.end(data);
    } catch { res.writeHead(404); res.end('not found'); }
  }
});

server.listen(PORT, () => {
  console.log(`\n  Local dev server:  http://localhost:${PORT}`);
  console.log(`  Serving local files from:  ${ROOT}`);
  console.log(`  Proxying /api/*  ->  ${UPSTREAM}\n`);
});
