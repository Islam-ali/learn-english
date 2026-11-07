// Teacher API: GET = all submitted homework (or one with ?unit=); POST = save comments and mark reviewed.
import { hasRole, sendJson, readBody } from '../lib/auth.js';
import { getAll, getOne, putOne, validId } from '../lib/db.js';

const clip = (v, n) => String(v == null ? '' : v).slice(0, n);
const summary = (s) => ({
  unit: s.unit, title: s.title, lesson: s.lesson, kind: s.kind, status: s.status, stats: s.stats || null,
  submittedAt: s.submittedAt, reviewedAt: s.reviewedAt || null, sends: s.sends || 1,
  comments: Object.values(s.comments || {}).filter((c) => String(c).trim()).length + (String(s.note || '').trim() ? 1 : 0),
});

export default async function handler(req, res) {
  if (!hasRole(req, 'teacher')) return sendJson(res, 401, { error: 'Open your teacher link again to sign in.' });
  try {
    if (req.method === 'GET') {
      const unit = new URL(req.url || '/', 'http://local').searchParams.get('unit');
      if (unit) {
        if (!validId(unit)) return sendJson(res, 400, { error: 'Unknown homework.' });
        const s = await getOne(unit);
        return s ? sendJson(res, 200, { sub: s }) : sendJson(res, 404, { error: 'Not found.' });
      }
      const list = Object.values(await getAll()).map(summary)
        .sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
      return sendJson(res, 200, { list });
    }
    if (req.method === 'POST') {
      const b = await readBody(req);
      if (!validId(b.unit)) return sendJson(res, 400, { error: 'Unknown homework.' });
      const s = await getOne(b.unit);
      if (!s) return sendJson(res, 404, { error: 'Not found.' });
      const comments = {};
      for (const [k, v] of Object.entries(b.comments && typeof b.comments === 'object' ? b.comments : {})) {
        if (/^\d{1,3}-\d{1,3}$/.test(k) && String(v).trim()) comments[k] = clip(v, 2000);
      }
      s.comments = comments;
      s.note = clip(b.note, 4000);
      if (b.reviewed) { s.status = 'reviewed'; s.reviewedAt = new Date().toISOString(); }
      await putOne(b.unit, s);
      return sendJson(res, 200, { sub: s });
    }
    res.setHeader('Allow', 'GET, POST');
    return sendJson(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    if (e.code === 'NO_DB') return sendJson(res, 503, { error: e.message });
    console.error(e);
    return sendJson(res, 500, { error: 'The server had a problem. Try again.' });
  }
}
