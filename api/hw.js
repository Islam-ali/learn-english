// Student API: GET = my homework and the teacher's comments; POST = send one homework to the teacher.
import { hasRole, sendJson, readBody } from '../lib/auth.js';
import { getAll, getOne, putOne, validId } from '../lib/db.js';

const clip = (v, n) => String(v == null ? '' : v).slice(0, n);
const forStudent = (s) => ({
  unit: s.unit, title: s.title, status: s.status, submittedAt: s.submittedAt,
  reviewedAt: s.reviewedAt || null, note: s.note || '', comments: s.comments || {}, sig: s.sig || '', report: s.report || [],
});

function cleanReport(report) {
  if (!Array.isArray(report)) return null;
  return report.slice(0, 40).map((sec) => ({
    id: clip(sec && sec.id, 60),
    title: clip(sec && sec.title, 200),
    items: (Array.isArray(sec && sec.items) ? sec.items : []).slice(0, 80).map((it) => ({
      n: clip(it.n, 12), p: clip(it.p, 600), a: clip(it.a, 3000),
      ok: it.ok === true ? true : it.ok === false ? false : null,
      x: clip(it.x, 1500), open: !!it.open,
    })),
  }));
}

export default async function handler(req, res) {
  if (!hasRole(req, 'student')) return sendJson(res, 401, { error: 'Open your private link again to sign in.' });
  try {
    if (req.method === 'GET') {
      const all = await getAll();
      const subs = {};
      for (const [id, s] of Object.entries(all)) subs[id] = forStudent(s);
      return sendJson(res, 200, { subs });
    }
    if (req.method === 'POST') {
      const b = await readBody(req);
      const report = cleanReport(b.report);
      if (!validId(b.unit) || !report) return sendJson(res, 400, { error: 'This homework could not be read.' });
      const prev = (await getOne(b.unit)) || {};
      const now = new Date().toISOString();
      const sub = {
        ...prev,
        unit: b.unit,
        title: clip(b.title, 200),
        lesson: clip(b.lesson, 200),
        kind: clip(b.kind, 40),
        report,
        stats: b.stats && typeof b.stats === 'object' ? { n: +b.stats.n || 0, a: +b.stats.a || 0, ok: +b.stats.ok || 0, sc: +b.stats.sc || 0 } : null,
        sig: clip(b.sig, 40),
        status: 'submitted',
        submittedAt: now,
        firstSubmittedAt: prev.firstSubmittedAt || now,
        sends: (prev.sends || 0) + 1,
      };
      await putOne(b.unit, sub);
      return sendJson(res, 200, { sub: forStudent(sub) });
    }
    res.setHeader('Allow', 'GET, POST');
    return sendJson(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    if (e.code === 'NO_DB') return sendJson(res, 503, { error: e.message });
    if (e.code === 'TOO_LARGE') return sendJson(res, 413, { error: 'This homework is too big to send.' });
    console.error(e);
    return sendJson(res, 500, { error: 'The server had a problem. Try again.' });
  }
}
