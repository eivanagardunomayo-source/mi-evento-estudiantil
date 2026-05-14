const { Client } = require('@notionhq/client');
const notion = new Client({ auth: process.env.NOTION_TOKEN });

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const key = req.query.key;
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  // Validar estado permitido
  const ESTADOS_VALIDOS = ['todos', 'Pendiente', 'Confirmado'];
  const estado = req.query.estado || 'todos';
  if (!ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }

  try {
    // Filtrar en Notion: solo registros (EsBoleto=false) — más eficiente que traer todo
    const baseFilter = { property: 'EsBoleto', checkbox: { equals: false } };
    const queryParams = {
      database_id: process.env.NOTION_DB_ID,
      sorts: [{ property: 'Fecha', direction: 'descending' }],
      page_size: 100,
      filter: baseFilter
    };

    if (estado !== 'todos') {
      queryParams.filter = {
        and: [baseFilter, { property: 'Estado', select: { equals: estado } }]
      };
    }

    // Paginar para traer todos los registros
    let allResults = [];
    let cursor;
    do {
      if (cursor) queryParams.start_cursor = cursor;
      else delete queryParams.start_cursor;
      const query = await notion.databases.query(queryParams);
      allResults.push(...query.results);
      cursor = query.has_more ? query.next_cursor : null;
    } while (cursor);

    const results = allResults.map(page => {
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

    return res.status(200).json({
      results,
      total: results.length,
      debug: { registros: results.length }
    });

  } catch (err) {
    console.error('Error en admin API:', err?.message);
    return res.status(500).json({ error: err?.message || 'Error interno' });
  }
};
