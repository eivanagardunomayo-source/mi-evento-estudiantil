const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB_ID  = process.env.NOTION_ASISTENCIA_DB_ID;

// Mapa de sesiones válidas → nombre del campo en Notion
const SESIONES = {
  'ponencia-1': 'Ponencia 1',
  'ponencia-2': 'Ponencia 2',
  'ponencia-3': 'Ponencia 3',
  'bonus':      'Bonus',
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const { email, sesion } = req.body;

    if (!email || !sesion) {
      return res.status(400).json({ error: 'Email y sesión son requeridos' });
    }

    const campoDB = SESIONES[sesion];
    if (!campoDB) {
      return res.status(400).json({ error: 'Sesión inválida' });
    }

    const emailNorm = email.trim().toLowerCase();

    // Buscar al asistente por email
    const result = await notion.databases.query({
      database_id: DB_ID,
      filter: { property: 'Email', email: { equals: emailNorm } }
    });

    if (result.results.length === 0) {
      return res.status(404).json({ error: 'No registrado', code: 'NOT_REGISTERED' });
    }

    const page = result.results[0];
    const props = page.properties;

    // Verificar si ya hizo check-in en esta sesión
    const yaRegistrado = props[campoDB]?.date?.start != null;
    if (yaRegistrado) {
      return res.status(200).json({ success: true, yaRegistrado: true, mensaje: 'Ya registraste tu asistencia a esta sesión' });
    }

    // Marcar asistencia con fecha/hora exacta
    const ahora = new Date().toISOString();
    await notion.pages.update({
      page_id: page.id,
      properties: {
        [campoDB]: { date: { start: ahora } }
      }
    });

    return res.status(200).json({ success: true, yaRegistrado: false, mensaje: 'Asistencia registrada', hora: ahora });

  } catch (err) {
    console.error('Error en /api/marcar-asistencia:', err?.message);
    return res.status(500).json({ error: err?.message || 'Error interno' });
  }
};
