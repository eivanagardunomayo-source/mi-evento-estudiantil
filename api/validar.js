const { Client } = require('@notionhq/client');
const notion = new Client({ auth: process.env.NOTION_TOKEN });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Rate limiting: máx 30 validaciones por IP en 1 minuto
const rateLimitMap = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 30;
  const entry = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > windowMs) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  rateLimitMap.set(ip, entry);
  return true;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ ok: false, reason: 'rate_limited' });
  }

  const token = req.query.t;
  if (!token || !UUID_RE.test(token)) return res.status(400).json({ ok: false, reason: 'no_token' });

  const staffpin  = req.query.staffpin;
  const isStaff   = staffpin && staffpin === process.env.STAFF_PIN;

  try {
    const query = await notion.databases.query({
      database_id: process.env.NOTION_DB_ID,
      filter: {
        and: [
          { property: 'Token',    rich_text: { equals: token } },
          { property: 'EsBoleto', checkbox:   { equals: true } }
        ]
      }
    });

    if (!query.results.length) {
      return res.status(200).json({ ok: false, reason: 'not_found' });
    }

    const page  = query.results[0];
    const props = page.properties;

    const estado       = props.Estado?.select?.name || '';
    const ingresado    = props.Ingresado?.checkbox  || false;
    const nombre       = props.Nombre?.title?.[0]?.plain_text || '';
    const ref          = props.Referencia?.rich_text?.[0]?.plain_text || '';
    const tipo         = props.Tipo?.select?.name || '';
    const numBoleto    = props.NumBoleto?.number    || 1;
    const totalBoletos = props.TotalBoletos?.number || 1;
    const horaIngreso  = props['Hora Ingreso']?.date?.start || null;

    if (estado === 'Transferido') {
      return res.status(200).json({ ok: false, reason: 'transferred', transferredTo: nombre });
    }

    if (estado !== 'Confirmado') {
      return res.status(200).json({ ok: false, reason: 'not_confirmed', nombre });
    }

    // Sin PIN de staff → solo lectura (no marca ingresado)
    if (!isStaff) {
      return res.status(200).json({
        ok: true, viewOnly: true,
        ingresado, nombre, ref, tipo, numBoleto, totalBoletos
      });
    }

    // Con PIN de staff → validar entrada
    if (ingresado) {
      return res.status(200).json({
        ok: false, reason: 'already_used',
        nombre, ref, tipo, numBoleto, totalBoletos, horaIngreso
      });
    }

    const ahora = new Date().toISOString();
    await notion.pages.update({
      page_id: page.id,
      properties: {
        'Ingresado':    { checkbox: true },
        'Hora Ingreso': { date: { start: ahora } }
      }
    });

    return res.status(200).json({ ok: true, nombre, ref, tipo, numBoleto, totalBoletos });

  } catch (err) {
    console.error('Error en validar:', err?.message);
    return res.status(500).json({ ok: false, reason: 'error' });
  }
};
