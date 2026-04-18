import { Redis } from '@upstash/redis';

// Initialize Redis if credentials exist in Vercel environment
const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// In-memory mock DB fallback for local testing if DB is not configured yet
const subscribersMemory = [];

export default async function handler(req, res) {
  // CORS setup
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch(e) {}
  }

  const { name, email } = body || {};

  if (!name || !email) {
    return res.status(400).json({ success: false, error: 'Name and email are required' });
  }

  const subscriber = { id: Date.now(), name, email, date: new Date().toISOString() };

  if (redis) {
    // Store in Vercel Upstash Redis database (Production Ready)
    try {
      await redis.lpush('newsthread_subscribers', subscriber);
      console.log('Subscriber saved to production Upstash Redis DB');
    } catch (e) {
      console.error('Redis DB error:', e);
      return res.status(500).json({ success: false, error: 'Database saving failed' });
    }
  } else {
    // Store in local "DB" fallback
    subscribersMemory.push(subscriber);
    console.warn('Notice: Saved to memory DB. For production on Vercel, connect Upstash Redis.');
    console.log('Local subscriber saved:', subscriber);
  }

  // Return success response to trigger the "We are coming soon" message on UI
  return res.status(200).json({ success: true, message: 'Subscription details recorded.' });
}
