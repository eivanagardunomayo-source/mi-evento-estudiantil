// Rate limiting: máx 5 intentos por IP en 15 minutos
const rateLimitMap = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 5;
  const entry = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > windowMs) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return true;
  }
  if (entry.count >= maxAttempts) return false;
  entry.count++;
  rateLimitMap.set(ip, entry);
  return true;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ ok: false, error: 'Demasiados intentos. Intenta en 15 minutos.' });
  }

  const { pin } = req.body || {};
  if (!pin || typeof pin !== 'string' || pin.length > 20) {
    return res.status(400).json({ ok: false });
  }

  if (pin === process.env.STAFF_PIN) {
    return res.status(200).json({ ok: true });
  }
  return res.status(401).json({ ok: false, error: 'PIN incorrecto' });
};
