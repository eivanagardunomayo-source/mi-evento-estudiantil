const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB_ID  = process.env.NOTION_ASISTENCIA_DB_ID;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const email = (req.query.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email requerido' });

    const result = await notion.databases.query({
      database_id: DB_ID,
      filter: { property: 'Email', email: { equals: email } }
    });

    if (result.results.length === 0) {
      return res.status(404).json({ error: 'No registrado', code: 'NOT_REGISTERED' });
    }

    const props = result.results[0].properties;

    const fmt = (campo) => {
      const d = props[campo]?.date?.start;
      if (!d) return null;
      return new Date(d).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', hour12: true, hour: '2-digit', minute: '2-digit' });
    };

    return res.status(200).json({
      nombre:    props['Nombre']?.title?.[0]?.text?.content || '',
      email,
      p1:        fmt('Ponencia 1'),
      p2:        fmt('Ponencia 2'),
      p3:        fmt('Ponencia 3'),
      bonus:     fmt('Bonus'),
    });

  } catch (err) {
    console.error('Error en /api/estado-asistencia:', err?.message);
    return res.status(500).json({ error: err?.message || 'Error interno' });
  }
};
