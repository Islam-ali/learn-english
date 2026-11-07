// Homework storage in Upstash Redis (added from Vercel → Storage → Marketplace).
// Every submission lives in one Redis hash, "hw:subs", keyed by the homework id.
import { Redis } from '@upstash/redis';

const HASH = 'hw:subs';
let client = null;
const memory = new Map(); // only used for local testing (EL_MEMORY_DB=1)

function redis() {
  if (client) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw Object.assign(new Error('The database is not connected yet.'), { code: 'NO_DB' });
  client = new Redis({ url, token });
  return client;
}
const useMemory = () => process.env.EL_MEMORY_DB === '1' && !process.env.VERCEL;
const parse = (v) => {
  if (typeof v !== 'string') return v || null;
  try { return JSON.parse(v); } catch { return null; }
};

export async function getAll() {
  if (useMemory()) return Object.fromEntries([...memory].map(([k, v]) => [k, JSON.parse(v)]));
  const raw = (await redis().hgetall(HASH)) || {};
  const out = {};
  for (const [k, v] of Object.entries(raw)) { const p = parse(v); if (p) out[k] = p; }
  return out;
}

export async function getOne(id) {
  if (useMemory()) return memory.has(id) ? JSON.parse(memory.get(id)) : null;
  return parse(await redis().hget(HASH, id));
}

export async function putOne(id, value) {
  if (useMemory()) { memory.set(id, JSON.stringify(value)); return; }
  await redis().hset(HASH, { [id]: JSON.stringify(value) });
}

export const validId = (id) => typeof id === 'string' && /^[a-z0-9-]{1,60}$/.test(id);
