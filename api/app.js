// "/" → the lessons and the homework screen. Student key only.
import { servePage } from '../lib/page.js';

export default function handler(req, res) {
  return servePage(req, res, {
    role: 'student',
    file: 'index.html',
    home: '/',
    inject: '<script>window.HW_API="/api/hw";</script>',
  });
}
