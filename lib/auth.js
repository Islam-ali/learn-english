// Access control: two secret keys, set as Vercel environment variables.
//   STUDENT_KEY  opens the lessons and the homework screen (your link).
//   TEACHER_KEY  opens only the homework review page (your teacher's link).
// Opening /?key=… or /teacher?key=… once saves a cookie, so the key can leave the address bar.
import crypto from 'node:crypto';

const ROLES = { student: 'STUDENT_KEY', teacher: 'TEACHER_KEY' };
const YEAR = 60 * 60 * 24 * 365;

const envKey = (role) => {
  const k = process.env[ROLES[role]];
  return k && k.length >= 12 ? k : null; // refuse short or missing keys
};
const digest = (role, key) => crypto.createHash('sha256').update(`${role}:${key}`).digest('hex');

function safeEqual(a, b) {
  const A = Buffer.from(String(a || ''));
  const B = Buffer.from(String(b || ''));
  return A.length === B.length && crypto.timingSafeEqual(A, B);
}

export function readCookies(req) {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > 0) {
      try { out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); } catch { /* ignore bad cookie */ }
    }
  });
  return out;
}

export const keyConfigured = (role) => !!envKey(role);

export function keyMatches(key, role) {
  const k = envKey(role);
  return !!k && safeEqual(key, k);
}

export function hasRole(req, role) {
  const k = envKey(role);
  return !!k && safeEqual(readCookies(req)[`el_${role}`], digest(role, k));
}

export function grantRole(res, role) {
  const secure = process.env.VERCEL ? '; Secure' : '';
  res.setHeader('Set-Cookie', `el_${role}=${digest(role, envKey(role))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${YEAR}${secure}`);
}

export function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 400_000) throw Object.assign(new Error('Too large'), { code: 'TOO_LARGE' });
    chunks.push(c);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

// A small sign-in page shown when the cookie is missing or the key is wrong.
export function sendGate(res, role, wrong) {
  const who = role === 'teacher' ? 'Teacher review' : 'My English Lessons';
  const action = role === 'teacher' ? '/teacher' : '/';
  const setup = keyConfigured(role) ? '' : `<p class="warn">The ${ROLES[role]} setting is missing in Vercel (it needs at least 12 characters).</p>`;
  res.statusCode = wrong ? 403 : 401;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${who}</title>
<style>:root{--paper:#F1F4F7;--sheet:#fff;--ink:#13283E;--ink-2:#536579;--line:#D5DDE4;--rx:#2443C0;--bad:#B4470E}
@media (prefers-color-scheme:dark){:root{--paper:#0D1520;--sheet:#142131;--ink:#E5ECF3;--ink-2:#9FB1C3;--line:#28394B;--rx:#93A9FF;--bad:#F2A064}}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--paper);color:var(--ink);font:17px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;padding:16px;box-sizing:border-box}
form{background:var(--sheet);border:1px solid var(--line);border-radius:14px;padding:28px;max-width:380px;width:100%;display:flex;flex-direction:column;gap:12px}
h1{margin:0;font-size:26px}p{margin:0;color:var(--ink-2)}input{font:inherit;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--paper);color:var(--ink)}
button{font:inherit;font-weight:700;padding:10px 14px;border-radius:10px;border:0;background:var(--rx);color:#fff;cursor:pointer}.warn{color:var(--bad)}</style></head>
<body><form method="get" action="${action}"><h1>${who}</h1><p>This page is private. Open it with your personal link, or enter your key.</p>${wrong ? '<p class="warn">That key is not right.</p>' : ''}${setup}
<label for="k" style="font-size:14px;color:var(--ink-2)">Key</label><input id="k" name="key" type="password" autocomplete="current-password" required><button type="submit">Open</button></form></body></html>`);
}
