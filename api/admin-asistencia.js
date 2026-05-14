const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB_ID  = process.env.NOTION_ASISTENCIA_DB_ID;
// Contraseña para el panel admin — cámbiala antes del evento si quieres
const ADMIN_PASS = process.env.ADMIN_ASISTENCIA_PASS || 'w2tf2026admin';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  const pass = req.query.pass || '';
  if (pass !== ADMIN_PASS) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  try {
    const todos = [];
    let cursor = undefined;

    // Notion pagina de 100 en 100, así que hacemos un loop
    do {
      const response = await notion.databases.query({
        database_id: DB_ID,
        sorts: [{ timestamp: 'created_time', direction: 'ascending' }],
        start_cursor: cursor,
        page_size: 100,
      });

      for (const page of response.results) {
        const p = page.properties;
        const fmt = (campo) => p[campo]?.date?.start
          ? new Date(p[campo].date.start).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', hour12: true })
          : null;

        const p1    = fmt('Ponencia 1');
        const p2    = fmt('Ponencia 2');
        const p3    = fmt('Ponencia 3');
        const bonus = fmt('Bonus');

        todos.push({
          nombre:    p['Nombre']?.title?.[0]?.text?.content || '',
          email:     p['Email']?.email || '',
          telefono:  p['Teléfono']?.phone_number || '',
          p1,
          p2,
          p3,
          bonus,
          completoTodo: !!(p1 && p2 && p3),
          completoTodoMasBonus: !!(p1 && p2 && p3 && bonus),
          registradoEl: new Date(page.created_time).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', hour12: true }),
        });
      }

      cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor);

    return res.status(200).json({ total: todos.length, asistentes: todos });

  } catch (err) {
    console.error('Error en /api/admin-asistencia:', err?.message);
    return res.status(500).json({ error: err?.message || 'Error interno' });
  }
};
