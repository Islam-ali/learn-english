// Serves a private HTML page only to someone with the right key.
import fs from 'node:fs';
import path from 'node:path';
import { hasRole, keyMatches, grantRole, sendGate } from './auth.js';

const cache = {};
function load(file, inject) {
  if (!cache[file]) {
    let html = fs.readFileSync(path.join(process.cwd(), 'private', file), 'utf8');
    if (inject) html = html.replace('</head>', `${inject}</head>`);
    cache[file] = html;
  }
  return cache[file];
}

export function servePage(req, res, { role, file, home, inject }) {
  const url = new URL(req.url || '/', 'http://local');
  const key = url.searchParams.get('key');
  if (key !== null) {
    if (keyMatches(key, role)) {
      grantRole(res, role);
      res.statusCode = 302;
      res.setHeader('Location', home);
      res.setHeader('Cache-Control', 'no-store');
      return res.end();
    }
    return sendGate(res, role, true);
  }
  if (!hasRole(req, role)) return sendGate(res, role, false);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.end(load(file, inject));
}
