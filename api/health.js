/**
 * Vercel Serverless Function: /api/health
 *
 * Simple health check endpoint.
 */
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.json({
    ok: true,
    keyConfigured: !!process.env.NEWS_API_KEY,
    runtime: 'vercel-serverless',
  })
}
