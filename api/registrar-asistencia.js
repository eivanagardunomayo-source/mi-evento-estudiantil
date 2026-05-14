const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB_ID  = process.env.NOTION_ASISTENCIA_DB_ID;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const { nombre, email, telefono } = req.body;

    if (!nombre || !email) {
      return res.status(400).json({ error: 'Nombre y email son requeridos' });
    }

    const emailNorm = email.trim().toLowerCase();

    // Verificar si ya existe
    const existing = await notion.databases.query({
      database_id: DB_ID,
      filter: { property: 'Email', email: { equals: emailNorm } }
    });

    if (existing.results.length > 0) {
      return res.status(200).json({ success: true, nuevo: false, mensaje: 'Ya estás registrado' });
    }

    await notion.pages.create({
      parent: { database_id: DB_ID },
      properties: {
        'Nombre':    { title:        [{ text: { content: nombre.trim() } }] },
        'Email':     { email:        emailNorm },
        'Teléfono':  { phone_number: telefono ? telefono.trim() : '' },
      }
    });

    return res.status(200).json({ success: true, nuevo: true, mensaje: 'Registro exitoso' });

  } catch (err) {
    console.error('Error en /api/registrar-asistencia:', err?.message);
    return res.status(500).json({ error: err?.message || 'Error interno' });
  }
};
