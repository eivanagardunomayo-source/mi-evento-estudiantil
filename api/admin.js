const { Client } = require('@notionhq/client');
const notion = new Client({ auth: process.env.NOTION_TOKEN });

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const key = req.query.key;
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const estado = req.query.estado;

  try {
    const queryParams = {
      database_id: process.env.NOTION_DB_ID,
      sorts: [{ property: 'Fecha', direction: 'descending' }],
      page_size: 100
    };
    if (estado && estado !== 'todos') {
      queryParams.filter = { property: 'Estado', select: { equals: estado } };
    }

    const query = await notion.databases.query(queryParams);

    const results = query.results.map(page => {
      const p = page.properties;
      return {
        id:           page.id,
        nombre:       p.Nombre?.title?.[0]?.plain_text || '',
        email:        p.Email?.email || '',
        institucion:  p['Institución']?.rich_text?.[0]?.plain_text || '',
        carrera:      p.Carrera?.rich_text?.[0]?.plain_text || '',
        tipo:         p.Tipo?.select?.name || '',
        boletos:      p['# Boletos']?.number || 0,
        monto:        p.Monto?.number || 0,
        referencia:   p.Referencia?.rich_text?.[0]?.plain_text || '',
        estado:       p.Estado?.select?.name || '',
        ingresado:    p.Ingresado?.checkbox || false,
        horaIngreso:  p['Hora Ingreso']?.date?.start || null,
        fecha:        p.Fecha?.date?.start || '',
        comprobante:  p.Comprobante?.url || null
      };
    });

    return res.status(200).json({ results, total: results.length });

  } catch (err) {
    console.error('Error en admin API:', err?.message);
    return res.status(500).json({ error: err?.message || 'Error interno' });
  }
};
