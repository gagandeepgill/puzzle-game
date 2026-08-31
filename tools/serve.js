#!/usr/bin/env node
/*
 * Minimal static server for local PWA testing. Zero dependencies.
 *
 * Service workers and the install prompt only work over http/https, never
 * file://, so `open demo/index.html` is not enough once you are testing the
 * installable app. Everything else about the games still works from a file.
 *
 *   node tools/serve.js [port]     → http://localhost:8000
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..', 'demo');
const PORT = Number(process.argv[2]) || 8000;

// A missing entry here is not cosmetic: a stylesheet served as
// application/octet-stream is silently refused by the browser in standards
// mode, and the page renders unstyled with no console error.
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';

  // Contain everything under demo/ — no traversal out of the web root.
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
      return;
    }
    res.writeHead(200, {
      'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      // Never cache during development: the service worker is confusing enough
      // without a stale copy of it being served underneath.
      'cache-control': 'no-store',
    }).end(buf);
  });
}).listen(PORT, () => {
  console.log(`Payload Arcade → http://localhost:${PORT}`);
});
