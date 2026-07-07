// Local dev/test server: static files from repo root + /api/* proxied to the
// production Vercel deployment (serverless functions don't run locally).
// Usage: node test/serve.mjs [port]
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const PORT = Number(process.argv[2]) || 8123;
const ROOT = new URL('..', import.meta.url).pathname;
const UPSTREAM = 'https://asset-designer-dev.vercel.app';

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
};

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname.startsWith('/api/')) {
      const upstream = await fetch(UPSTREAM + req.url, {
        method: req.method,
        headers: { 'content-type': req.headers['content-type'] || '' },
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : req,
        duplex: 'half',
      });
      res.writeHead(upstream.status, {
        'content-type': upstream.headers.get('content-type') || 'application/octet-stream',
      });
      if (upstream.body) {
        for await (const chunk of upstream.body) res.write(chunk);
      }
      return res.end();
    }
    const path = normalize(join(ROOT, url.pathname === '/' ? 'index.html' : url.pathname));
    if (!path.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch (e) {
    res.writeHead(e.code === 'ENOENT' ? 404 : 500);
    res.end(String(e.message || e));
  }
}).listen(PORT, () => console.log(`serving ${ROOT} on :${PORT}, /api/* -> ${UPSTREAM}`));
