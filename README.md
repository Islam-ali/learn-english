# My English Lessons on Vercel

The lesson site, a **Homework** screen, and a private **teacher review** page.

| Link | Who | What it opens |
| --- | --- | --- |
| `https://YOUR-SITE.vercel.app/?key=STUDENT_KEY` | You | All lessons + My homework |
| `https://YOUR-SITE.vercel.app/teacher?key=TEACHER_KEY` | Your teacher | Only the homework review page |

Open each link once. The browser then remembers it, and the key leaves the address bar.
The teacher key can't open the lessons, and your key can't open the review page.

## 1. Put the code on GitHub

Create a new **private** repository on GitHub called `english-lessons` (leave it empty), then in this folder run:

```bash
git init
git add .
git commit -m "My English Lessons with homework review"
git branch -M main
git remote add origin https://github.com/YOUR-USER/english-lessons.git
git push -u origin main
```

## 2. Import it in Vercel

1. vercel.com → **Add New… → Project** → import `english-lessons`.
2. Framework Preset: **Other**. Leave the build settings empty, then **Deploy**.

## 3. Add the database (Upstash Redis)

1. In the project: **Storage → Create Database → Upstash (Redis)** from the Marketplace. The free plan is enough.
2. Connect it to this project. Vercel adds the `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_*`) settings for you.

## 4. Add the two keys

**Settings → Environment Variables**, for Production:

| Name | Value |
| --- | --- |
| `STUDENT_KEY` | a long random text, at least 12 characters |
| `TEACHER_KEY` | a different long random text, at least 12 characters |

Then **Deployments → … → Redeploy** so the new settings are used.

## How it works

- **Homework** = the workbook lessons (Workbook 1A–1C, 2A, 2B–2C) plus every lesson's *Assignment* task that has questions.
- On **My homework** you see how much you answered, press **Send to teacher**, and later read her comments. If you change answers after sending, the card tells you to send again.
- The teacher sees each answer with the automatic check (✓ / ✗ against the answer key) or the model answer for open questions. She adds a comment to any answer, writes overall feedback, and presses **Save & mark reviewed**.
- Your answers are still saved in your browser while you work. Only what you **send** goes to the database.
- Images and audio in `public/img` are public files. The lessons themselves (`private/index.html`) are only served with your key.
- "Check my English" (Claude's AI feedback) only works inside Claude. Here each question shows the model answer instead.

## Files

```
api/app.js       "/"         lessons page (student key)
api/teacher.js   "/teacher"  review page (teacher key)
api/hw.js        student API: read my homework, send homework
api/review.js    teacher API: list, read, comment, mark reviewed
lib/             keys/cookies, Upstash Redis, private page serving
private/         index.html (lessons) and teacher.html (review), never served directly
public/img/      images and audio
```

To change a key later, change it in Vercel and redeploy. Old links stop working at once.
