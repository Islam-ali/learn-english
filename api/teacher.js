// "/teacher" → the homework review page. Teacher key only; it contains no lesson content.
import { servePage } from '../lib/page.js';

export default function handler(req, res) {
  return servePage(req, res, { role: 'teacher', file: 'teacher.html', home: '/teacher' });
}
