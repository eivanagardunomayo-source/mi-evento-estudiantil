const { Client } = require('@notionhq/client');
const transporter = require('./_mailer');

const notion = new Client({ auth: process.env.NOTION_TOKEN });

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const key = req.query.key || req.body?.key;
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const ref = req.query.ref || req.body?.ref;
  if (!ref) return res.status(400).json({ error: 'Referencia requerida' });

  try {
    const query = await notion.databases.query({
      database_id: process.env.NOTION_DB_ID,
      filter: { property: 'Referencia', rich_text: { equals: ref } }
    });

    if (!query.results.length) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    const page = query.results[0];
    const props = page.properties;

    const nombre  = props.Nombre?.title?.[0]?.plain_text || '';
    const email   = props.Email?.email || '';
    const boletos = props['# Boletos']?.number || 1;
    const monto   = props.Monto?.number || 0;
    const tipo    = props.Tipo?.select?.name || '';
    const token   = props.Token?.rich_text?.[0]?.plain_text || ref;
    const estado  = props.Estado?.select?.name || '';

    if (estado === 'Confirmado') {
      return res.status(400).json({ error: 'Este registro ya fue confirmado' });
    }

    const base = process.env.BASE_URL || 'https://mi-evento-estudiantil.vercel.app';
    const validarUrl = `${base}/validar?t=${token}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(validarUrl)}`;
    const from  = `"Welcome 2 The Future" <${process.env.GMAIL_USER}>`;

    await transporter.sendMail({
      from,
      to: email,
      subject: `Tu boleto oficial — W2TF 2026 · ${ref}`,
      html: buildTicketEmail({ nombre, boletos, monto, ref, tipo, qrUrl })
    });

    await notion.pages.update({
      page_id: page.id,
      properties: { 'Estado': { select: { name: 'Confirmado' } } }
    });

    return res.status(200).json({ success: true, email, referencia: ref });

  } catch (err) {
    console.error('Error en confirmar:', err?.message);
    return res.status(500).json({ error: err?.message || 'Error interno' });
  }
};

function buildTicketEmail({ nombre, boletos, monto, ref, tipo, qrUrl }) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#050714;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:40px 20px;">

  <div style="text-align:center;margin-bottom:32px;">
    <div style="display:inline-block;background:linear-gradient(135deg,#7A00FF,#00CFFF);border-radius:50%;width:64px;height:64px;line-height:64px;font-size:28px;color:#fff;font-weight:900;text-align:center;">W</div>
    <div style="color:#94A3B8;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;margin-top:10px;">Welcome 2 The Future 2026</div>
  </div>

  <div style="background:#0f1140;border:1px solid rgba(122,0,255,0.3);border-radius:20px;padding:40px;margin-bottom:20px;">
    <div style="text-align:center;margin-bottom:28px;">
      <div style="color:#00CFFF;font-size:10px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;margin-bottom:10px;">Pago confirmado</div>
      <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;">¡Hola, ${nombre}!</h1>
      <p style="color:#94A3B8;margin:10px 0 0;font-size:14px;line-height:1.6;">Tu lugar está confirmado. Presenta este QR en la entrada del evento.</p>
    </div>

    <div style="text-align:center;background:rgba(255,255,255,0.04);border-radius:16px;padding:28px;margin-bottom:24px;">
      <img src="${qrUrl}" width="200" height="200" alt="QR Boleto" style="display:block;margin:0 auto;border-radius:8px;background:#fff;padding:6px;"/>
      <div style="color:#A78BFA;font-size:12px;font-weight:700;letter-spacing:0.1em;margin-top:14px;">${ref}</div>
      <div style="color:#64748B;font-size:11px;margin-top:4px;">Código único de acceso · No compartas</div>
    </div>

    <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:20px;margin-bottom:20px;">
      <table style="width:100%;font-size:13px;border-collapse:collapse;">
        <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
          <td style="padding:8px 0;color:#64748B;">Tipo de acceso</td>
          <td style="padding:8px 0;color:#fff;text-align:right;font-weight:600;">${tipo}</td>
        </tr>
        <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
          <td style="padding:8px 0;color:#64748B;"># Boletos</td>
          <td style="padding:8px 0;color:#fff;text-align:right;font-weight:600;">${boletos}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748B;">Total pagado</td>
          <td style="padding:8px 0;color:#10B981;text-align:right;font-weight:700;">$${monto} MXN</td>
        </tr>
      </table>
    </div>

    <div style="text-align:center;border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;">
      <div style="color:#64748B;font-size:12px;margin-bottom:4px;">15 de mayo de 2026 · 2:30 PM</div>
      <div style="color:#64748B;font-size:12px;">Tec de Monterrey CDMX</div>
    </div>
  </div>

  <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:14px 18px;margin-bottom:20px;text-align:center;">
    <span style="color:#FCA5A5;font-size:12px;">Este QR es de uso personal y único. Cada boleto solo permite un ingreso al evento.</span>
  </div>

  <p style="text-align:center;color:#64748B;font-size:11px;margin:0;">
    ¿Dudas? Escríbenos a <a href="mailto:belaeccm.tec@gmail.com" style="color:#00CFFF;">belaeccm.tec@gmail.com</a><br/>
    © 2026 BeLAE · Welcome 2 The Future
  </p>
</div>
</body>
</html>`;
}
