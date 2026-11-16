import { createHash } from 'node:crypto';
type Bucket = { count: number; reset: number };
export function createLimiter() {
  const buckets = new Map<string, Bucket>();
  let global: Bucket = {count:0,reset:0};
  return (key: string, now = Date.now()) => {
    for (const [id,bucket] of buckets) if (bucket.reset <= now) buckets.delete(id);
    if (global.reset <= now) global = {count:0,reset:now + 60_000};
    const bucket = buckets.get(key) ?? {count:0,reset:now + 60_000};
    const retryAfter = Math.max(1, Math.ceil(((bucket.count >= 10 ? bucket.reset : global.reset) - now)/1000));
    if (bucket.count >= 10 || global.count >= 60 || (!buckets.has(key) && buckets.size >= 2000)) return {allowed:false,retryAfter};
    bucket.count++; global.count++; buckets.set(key,bucket);
    return {allowed:true,retryAfter:0};
  };
}
export const limitRequest = createLimiter();
export function requestKey(request: Request) {
  // Vercel overwrites this header at its edge. Ignore arbitrary proxy headers locally.
  const ip = process.env.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() : 'local';
  return createHash('sha256').update(ip || 'unknown').digest('hex');
}
