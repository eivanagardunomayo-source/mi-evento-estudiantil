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

    const from  = `"Welcome 2 The Future" <${process.env.GMAIL_USER}>`;

    await transporter.sendMail({
      from,
      to: email,
      subject: `Tu boleto oficial — W2TF 2026 · ${ref}`,
      html: buildTicketEmail({ nombre, boletos, monto, ref, tipo })
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

function buildTicketEmail({ nombre, boletos, monto, ref, tipo }) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#050714;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:40px 20px;">

  <!-- Header -->
  <div style="text-align:center;margin-bottom:32px;">
    <div style="display:inline-block;background:linear-gradient(135deg,#7A00FF,#00CFFF);border-radius:50%;width:64px;height:64px;line-height:64px;font-size:28px;color:#fff;font-weight:900;text-align:center;">W</div>
    <div style="color:#94A3B8;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;margin-top:10px;">Welcome 2 The Future 2026</div>
  </div>

  <!-- Boleto -->
  <div style="background:#0f1140;border:2px solid rgba(122,0,255,0.5);border-radius:20px;overflow:hidden;margin-bottom:20px;">

    <!-- Banda superior BOLETO OFICIAL -->
    <div style="background:linear-gradient(135deg,#7A00FF,#00CFFF);padding:14px 32px;text-align:center;">
      <div style="color:#fff;font-size:13px;font-weight:900;letter-spacing:0.3em;text-transform:uppercase;">✦ Boleto Oficial ✦</div>
    </div>

    <!-- Saludo -->
    <div style="padding:32px 32px 0;text-align:center;">
      <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;">¡Hola, ${nombre}!</h1>
      <p style="color:#94A3B8;margin:10px 0 0;font-size:14px;line-height:1.6;">Tu pago fue confirmado. Tu lugar en el evento está asegurado.</p>
    </div>

    <!-- Datos del boleto -->
    <div style="padding:24px 32px;">
      <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:20px;">
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          <tr style="border-bottom:1px solid rgba(255,255,255,0.08);">
            <td style="padding:10px 0;color:#64748B;">Nombre</td>
            <td style="padding:10px 0;color:#fff;text-align:right;font-weight:600;">${nombre}</td>
          </tr>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.08);">
            <td style="padding:10px 0;color:#64748B;">Referencia</td>
            <td style="padding:10px 0;color:#A78BFA;text-align:right;font-weight:700;letter-spacing:0.05em;">${ref}</td>
          </tr>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.08);">
            <td style="padding:10px 0;color:#64748B;">Tipo de acceso</td>
            <td style="padding:10px 0;color:#fff;text-align:right;font-weight:600;">${tipo}</td>
          </tr>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.08);">
            <td style="padding:10px 0;color:#64748B;"># Boletos</td>
            <td style="padding:10px 0;color:#fff;text-align:right;font-weight:600;">${boletos}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#64748B;">Total pagado</td>
            <td style="padding:10px 0;color:#10B981;text-align:right;font-weight:800;font-size:16px;">$${monto} MXN</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Línea punteada de corte -->
    <div style="margin:0 24px;border-top:2px dashed rgba(255,255,255,0.1);"></div>

    <!-- Info del evento -->
    <div style="padding:20px 32px;text-align:center;">
      <div style="color:#00CFFF;font-size:13px;font-weight:700;letter-spacing:0.08em;margin-bottom:4px;">15 DE MAYO DE 2026 · 2:30 PM</div>
      <div style="color:#94A3B8;font-size:12px;">Tec de Monterrey CDMX</div>
    </div>
  </div>

  <!-- Aviso importante -->
  <div style="background:rgba(122,0,255,0.1);border:1px solid rgba(122,0,255,0.3);border-radius:12px;padding:16px 20px;margin-bottom:20px;text-align:center;">
    <div style="color:#C4B5FD;font-size:13px;font-weight:700;margin-bottom:4px;">Guarda este correo</div>
    <div style="color:#94A3B8;font-size:12px;line-height:1.6;">Te pedirán este boleto para darte acceso al evento. Preséntalo en la entrada.</div>
  </div>

  <p style="text-align:center;color:#64748B;font-size:11px;margin:0;">
    ¿Dudas? Escríbenos a <a href="mailto:belaeccm.tec@gmail.com" style="color:#00CFFF;">belaeccm.tec@gmail.com</a><br/>
    © 2026 BeLAE · Welcome 2 The Future
  </p>
</div>
</body>
</html>`;
}
