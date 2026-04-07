const { Client } = require('@notionhq/client');
const transporter = require('./_mailer');

const notion = new Client({ auth: process.env.NOTION_TOKEN });

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { nombre, email, celular, institucion, carrera, tipo, boletos, referencia, comprobante, monto: montoRaw } = req.body;
    const monto = parseInt(montoRaw) || (parseInt(boletos) * (tipo === 'externo' ? (parseInt(process.env.PRECIO_EXTERNO) || 300) : (parseInt(process.env.PRECIO_BOLETO) || 200)));
    const fecha = new Date().toISOString().split('T')[0];
    const token = require('crypto').randomUUID();
    const from = `"Welcome 2 The Future" <${process.env.GMAIL_USER}>`;

    let comprobanteUrl = null;
    if (comprobante && comprobante.startsWith('data:')) {
      comprobanteUrl = `Adjunto en email — ${referencia}`;
    }

    // 1. Crear entrada en Notion
    await notion.pages.create({
      parent: { database_id: process.env.NOTION_DB_ID },
      properties: {
        'Nombre':       { title:     [{ text: { content: nombre } }] },
        'Email':        { email:     email },
        'Celular':      { phone_number: celular || '' },
        'Institución':  { rich_text: [{ text: { content: institucion || '' } }] },
        'Carrera':      { rich_text: [{ text: { content: carrera  || '' } }] },
        'Tipo':         { select:    { name: tipo || 'Tec' } },
        '# Boletos':    { number:    parseInt(boletos) },
        'Monto':        { number:    monto },
        'Referencia':   { rich_text: [{ text: { content: referencia } }] },
        'Comprobante':  { url:       comprobanteUrl },
        'Token':        { rich_text: [{ text: { content: token } }] },
        'Ingresado':    { checkbox:  false },
        'Estado':       { select:    { name: 'Pendiente' } },
        'Fecha':        { date:      { start: fecha } }
      }
    });

    // 2. Email de confirmación al comprador (lugar apartado, en revisión)
    await transporter.sendMail({
      from,
      to: email,
      subject: `Tu lugar en W2TF 2026 está apartado — ${referencia}`,
      html: buildEmailComprador({ nombre, boletos, monto, referencia })
    });

    // 3. Email de notificación al admin con comprobante adjunto
    const adminAttachments = [];
    if (comprobante && comprobante.startsWith('data:')) {
      const matches = comprobante.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      if (matches) {
        const ext = matches[1].split('/')[1] || 'jpg';
        adminAttachments.push({
          filename: `comprobante-${referencia}.${ext}`,
          content:  Buffer.from(matches[2], 'base64'),
          contentType: matches[1]
        });
      }
    }

    await transporter.sendMail({
      from,
      to: process.env.ADMIN_EMAIL,
      subject: `Nuevo pago pendiente — ${referencia} — ${nombre}`,
      html: buildEmailAdmin({ nombre, email, celular, institucion, carrera, tipo, boletos, monto, referencia, tieneComprobante: adminAttachments.length > 0 }),
      attachments: adminAttachments
    });

    return res.status(200).json({ success: true, referencia });

  } catch (err) {
    console.error('Error en /api/registro:', err?.message);
    return res.status(500).json({ error: 'Error al procesar tu registro. Intenta de nuevo.' });
  }
};

function buildEmailComprador({ nombre, boletos, monto, referencia }) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#050714;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:40px 20px;">

  <div style="text-align:center;margin-bottom:36px;">
    <div style="display:inline-block;background:linear-gradient(135deg,#7A00FF,#00CFFF);border-radius:50%;width:64px;height:64px;line-height:64px;font-size:28px;color:#fff;font-weight:900;text-align:center;">W</div>
    <div style="color:#94A3B8;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;margin-top:10px;">Welcome 2 The Future 2026</div>
  </div>

  <div style="background:#0f1140;border:1px solid rgba(122,0,255,0.25);border-radius:20px;padding:40px;margin-bottom:20px;">
    <div style="text-align:center;margin-bottom:28px;">
      <div style="color:#00CFFF;font-size:10px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;margin-bottom:10px;">Lugar apartado</div>
      <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;">Hola, ${nombre}</h1>
      <p style="color:#94A3B8;margin:10px 0 0;font-size:14px;line-height:1.6;">Recibimos tu comprobante de pago. Tu lugar en el summit de innovación del Tec de Monterrey CDMX está apartado.</p>
    </div>

    <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:20px;margin-bottom:20px;">
      <table style="width:100%;font-size:13px;border-collapse:collapse;">
        <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
          <td style="padding:8px 0;color:#64748B;">Referencia</td>
          <td style="padding:8px 0;color:#A78BFA;text-align:right;font-weight:700;">${referencia}</td>
        </tr>
        <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
          <td style="padding:8px 0;color:#64748B;">Boletos</td>
          <td style="padding:8px 0;color:#fff;text-align:right;font-weight:600;">${boletos}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748B;">Monto pagado</td>
          <td style="padding:8px 0;color:#fff;text-align:right;font-weight:600;">$${monto} MXN</td>
        </tr>
      </table>
    </div>

    <div style="background:rgba(234,179,8,0.1);border:1px solid rgba(234,179,8,0.3);border-radius:10px;padding:16px;text-align:center;margin-bottom:20px;">
      <div style="color:#FCD34D;font-size:13px;font-weight:600;">En revisión</div>
      <p style="color:#94A3B8;font-size:12px;margin:6px 0 0;">En las próximas <strong style="color:#fff;">24 horas</strong> validaremos tu pago y recibirás tu boleto oficial con código QR.</p>
    </div>

    <div style="text-align:center;">
      <div style="color:#64748B;font-size:12px;margin-bottom:4px;">15 de mayo de 2026 · 2:30 PM</div>
      <div style="color:#64748B;font-size:12px;">Tec de Monterrey CDMX</div>
    </div>
  </div>

  <p style="text-align:center;color:#64748B;font-size:11px;margin:0;">
    ¿Dudas? Escríbenos a <a href="mailto:belaeccm.tec@gmail.com" style="color:#00CFFF;">belaeccm.tec@gmail.com</a><br/>
    © 2026 BeLAE · Welcome 2 The Future
  </p>
</div>
</body>
</html>`;
}

function buildEmailAdmin({ nombre, email, celular, institucion, carrera, tipo, boletos, monto, referencia, tieneComprobante }) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:32px 20px;">
  <div style="background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
    <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;">Nuevo pago pendiente</h2>
    <div style="background:#fef3c7;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
      <span style="color:#92400e;font-weight:700;font-size:13px;">PENDIENTE DE VALIDACIÓN</span>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:10px 0;color:#64748B;width:140px;">Referencia</td><td style="padding:10px 0;font-weight:700;color:#7A00FF;">${referencia}</td></tr>
      <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:10px 0;color:#64748B;">Nombre</td><td style="padding:10px 0;font-weight:600;color:#0f172a;">${nombre}</td></tr>
      <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:10px 0;color:#64748B;">Email</td><td style="padding:10px 0;color:#0f172a;">${email}</td></tr>
      <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:10px 0;color:#64748B;">Celular</td><td style="padding:10px 0;color:#0f172a;">${celular || '—'}</td></tr>
      <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:10px 0;color:#64748B;">Institución</td><td style="padding:10px 0;color:#0f172a;">${institucion || '—'}${carrera ? ' · ' + carrera : ''}</td></tr>
      <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:10px 0;color:#64748B;">Tipo</td><td style="padding:10px 0;color:#0f172a;">${tipo}</td></tr>
      <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:10px 0;color:#64748B;"># Boletos</td><td style="padding:10px 0;color:#0f172a;">${boletos}</td></tr>
      <tr><td style="padding:10px 0;color:#64748B;">Monto</td><td style="padding:10px 0;font-weight:700;color:#059669;font-size:16px;">$${monto} MXN</td></tr>
    </table>

    <div style="background:${tieneComprobante ? '#f0fdf4' : '#fff7ed'};border-radius:8px;padding:12px 16px;margin-top:20px;">
      <span style="color:${tieneComprobante ? '#166534' : '#9a3412'};font-size:13px;">${tieneComprobante ? 'Comprobante adjunto en este email' : 'Sin comprobante adjunto'}</span>
    </div>

    <p style="margin:20px 0 0;color:#64748B;font-size:12px;">
      Verifica la transferencia con referencia <strong>${referencia}</strong> por <strong>$${monto} MXN</strong> y confirma en el panel de admin.
    </p>
  </div>
</div>
</body>
</html>`;
}
