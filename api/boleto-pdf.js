const { Client } = require('@notionhq/client');
const generateTicketPDF = require('./_ticket-pdf');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const base = process.env.BASE_URL || 'https://welcome2thefuture2026.vercel.app';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = req.query.t;
  if (!token) return res.status(400).send('Token requerido');

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

    if (!query.results.length) return res.status(404).send('Boleto no encontrado');

    const page  = query.results[0];
    const props = page.properties;
    const nombre       = props.Nombre?.title?.[0]?.plain_text || '';
    const ref          = props.Referencia?.rich_text?.[0]?.plain_text || '';
    const tipo         = props.Tipo?.select?.name || '';
    const numBoleto    = props.NumBoleto?.number    || 1;
    const totalBoletos = props.TotalBoletos?.number || 1;

    const pdfBuf = await generateTicketPDF({ nombre, ref, tipo, numBoleto, totalBoletos, token, base });

    const filename = totalBoletos === 1
      ? 'boleto-w2tf2026.pdf'
      : `boleto-${numBoleto}-de-${totalBoletos}-w2tf2026.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuf.length);
    return res.status(200).send(pdfBuf);

  } catch (err) {
    return res.status(500).send(err.message);
  }
};
