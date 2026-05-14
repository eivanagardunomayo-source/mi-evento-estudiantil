module.exports = async function handler(req, res) {
  const token = process.env.NOTION_TOKEN || '';
  res.status(200).json({
    tiene_token: !!token,
    longitud: token.length,
    primeros_10: token.substring(0, 10),
    db_asistencia: (process.env.NOTION_ASISTENCIA_DB_ID || '').substring(0, 10),
  });
};
