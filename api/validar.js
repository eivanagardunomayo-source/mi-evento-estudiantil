const { Client } = require('@notionhq/client');
const notion = new Client({ auth: process.env.NOTION_TOKEN });

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = req.query.t;
  if (!token) return res.status(400).json({ ok: false, reason: 'no_token' });

  try {
    const query = await notion.databases.query({
      database_id: process.env.NOTION_DB_ID,
      filter: { property: 'Token', rich_text: { equals: token } }
    });

    if (!query.results.length) {
      return res.status(200).json({ ok: false, reason: 'not_found' });
    }

    const page = query.results[0];
    const props = page.properties;

    const estado     = props.Estado?.select?.name || '';
    const ingresado  = props.Ingresado?.checkbox || false;
    const nombre     = props.Nombre?.title?.[0]?.plain_text || '';
    const boletos    = props['# Boletos']?.number || 1;
    const ref        = props.Referencia?.rich_text?.[0]?.plain_text || '';
    const tipo       = props.Tipo?.select?.name || '';
    const horaIngreso = props['Hora Ingreso']?.date?.start || null;

    if (estado !== 'Confirmado') {
      return res.status(200).json({ ok: false, reason: 'not_confirmed', nombre });
    }

    if (ingresado) {
      return res.status(200).json({ ok: false, reason: 'already_used', nombre, boletos, ref, tipo, horaIngreso });
    }

    // Marcar como ingresado
    const ahora = new Date().toISOString();
    await notion.pages.update({
      page_id: page.id,
      properties: {
        'Ingresado':    { checkbox: true },
        'Hora Ingreso': { date: { start: ahora } }
      }
    });

    return res.status(200).json({ ok: true, nombre, boletos, ref, tipo });

  } catch (err) {
    console.error('Error en validar:', err?.message);
    return res.status(500).json({ ok: false, reason: 'error' });
  }
};
