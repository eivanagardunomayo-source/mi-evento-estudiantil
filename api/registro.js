const { Client } = require('@notionhq/client');
const { Resend } = require('resend');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { nombre, email, institucion, carrera, tipo, boletos, referencia, comprobante } = req.body;
    const precio = parseInt(process.env.PRECIO_BOLETO) || 200;
    const monto = parseInt(boletos) * precio;
    const fecha = new Date().toISOString().split('T')[0];

    // Comprobante: guardar como URL de data o texto descriptivo
    let comprobanteUrl = null;
    if (comprobante && comprobante.startsWith('data:')) {
      // Lo usamos directamente como data URL en el email; para Notion sólo indicamos que existe
      comprobanteUrl = `Adjunto en email — ${referencia}`;
    }

    // 1. Crear entrada en Notion
    await notion.pages.create({
      parent: { database_id: process.env.NOTION_DB_ID },
      properties: {
        'Nombre':     { title:     [{ text: { content: nombre } }] },
        'Email':      { email:     email },
        'Institución':{ rich_text: [{ text: { content: institucion || '' } }] },
        'Carrera':    { rich_text: [{ text: { content: carrera  || '' } }] },
        'Tipo':       { select:    { name: tipo || 'Tec' } },
        '# Boletos':  { number:    parseInt(boletos) },
        'Monto':      { number:    monto },
        'Referencia': { rich_text: [{ text: { content: referencia } }] },
        'Comprobante':{ url:       comprobanteUrl },
        'Estado':     { select:    { name: 'Pendiente' } },
        'Fecha':      { date:      { start: fecha } }
      }
    });

    // 2. Email al comprador
    const emailComprador = buildEmailComprador({ nombre, email, boletos, monto, referencia });
    await resend.emails.send(emailComprador);

    // 3. Email a Liliana con comprobante adjunto
    const emailAdmin = buildEmailAdmin({ nombre, email, institucion, carrera, tipo, boletos, monto, referencia, comprobante });
    await resend.emails.send(emailAdmin);

    return res.status(200).json({ success: true, referencia });

  } catch (err) {
    console.error('Error en /api/registro:', err?.message, err?.body, err?.stack);
    return res.status(500).json({ error: 'Error al procesar tu registro. Intenta de nuevo.', detail: err?.message });
  }
};

// ── Templates de email ──────────────────────────────────────────────────────

function buildEmailComprador({ nombre, email, boletos, monto, referencia }) {
  return {
    from: 'Welcome 2 The Future <onboarding@resend.dev>',
    to:   email,
    subject: `¡Tu lugar en W2TF 2026 está apartado! — ${referencia}`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#050714;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:40px;">
      <div style="display:inline-block;background:linear-gradient(135deg,#7C3AED,#22D3EE);border-radius:50%;width:64px;height:64px;line-height:64px;font-size:28px;color:#fff;font-weight:800;">W</div>
      <div style="color:#94A3B8;font-size:12px;letter-spacing:0.15em;text-transform:uppercase;margin-top:12px;">Welcome 2 The Future 2026</div>
    </div>

    <!-- Card principal -->
    <div style="background:#0f1140;border:1px solid rgba(167,139,250,0.2);border-radius:20px;padding:40px;margin-bottom:20px;">
      <div style="text-align:center;margin-bottom:32px;">
        <div style="color:#22D3EE;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:12px;">¡Lugar apartado!</div>
        <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;line-height:1.2;">Hola, ${nombre} 👋</h1>
        <p style="color:#94A3B8;margin:12px 0 0;font-size:15px;line-height:1.6;">
          Recibimos tu comprobante de pago. Tu lugar en el summit de innovación del Tec de Monterrey CDMX está apartado.
        </p>
      </div>

      <!-- Info del registro -->
      <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:24px;margin-bottom:24px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <span style="color:#64748B;font-size:13px;">Referencia</span>
          <span style="color:#A78BFA;font-size:13px;font-weight:700;">${referencia}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <span style="color:#64748B;font-size:13px;">Boletos</span>
          <span style="color:#ffffff;font-size:13px;font-weight:600;">${boletos}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#64748B;font-size:13px;">Monto pagado</span>
          <span style="color:#ffffff;font-size:13px;font-weight:600;">$${monto} MXN</span>
        </div>
      </div>

      <!-- Status badge -->
      <div style="background:rgba(234,179,8,0.1);border:1px solid rgba(234,179,8,0.3);border-radius:10px;padding:16px;text-align:center;margin-bottom:24px;">
        <div style="color:#FCD34D;font-size:13px;font-weight:600;">⏳ En revisión</div>
        <p style="color:#94A3B8;font-size:12px;margin:6px 0 0;">
          En las próximas <strong style="color:#fff;">24 horas</strong> validaremos tu pago y recibirás tu boleto oficial con código QR.
        </p>
      </div>

      <!-- Evento info -->
      <div style="text-align:center;">
        <div style="color:#64748B;font-size:12px;margin-bottom:4px;">📅 15 de mayo de 2026 · 2:30 PM</div>
        <div style="color:#64748B;font-size:12px;">📍 Tec de Monterrey CDMX</div>
      </div>
    </div>

    <!-- Footer -->
    <p style="text-align:center;color:#64748B;font-size:12px;margin:0;">
      ¿Dudas? Escríbenos a <a href="mailto:contacto@belae.mx" style="color:#22D3EE;">contacto@belae.mx</a><br/>
      © 2026 BeLAE — Welcome 2 The Future
    </p>
  </div>
</body>
</html>`
  };
}

function buildEmailAdmin({ nombre, email, institucion, carrera, tipo, boletos, monto, referencia, comprobante }) {
  const attachments = [];
  if (comprobante && comprobante.startsWith('data:')) {
    const matches = comprobante.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (matches) {
      const mimeType = matches[1];
      const ext = mimeType.split('/')[1] || 'jpg';
      attachments.push({
        filename: `comprobante-${referencia}.${ext}`,
        content:  matches[2]
      });
    }
  }

  return {
    from:        'W2TF Sistema <onboarding@resend.dev>',
    to:          process.env.ADMIN_EMAIL,
    subject:     `💰 Nuevo pago — ${referencia} — ${nombre}`,
    attachments,
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <div style="background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;">💰 Nuevo pago pendiente</h2>
      <div style="background:#fef3c7;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
        <span style="color:#92400e;font-weight:700;font-size:13px;">Estado: PENDIENTE DE VALIDACIÓN</span>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:10px 0;color:#64748B;width:140px;">Referencia</td>
          <td style="padding:10px 0;font-weight:700;color:#7C3AED;">${referencia}</td>
        </tr>
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:10px 0;color:#64748B;">Nombre</td>
          <td style="padding:10px 0;font-weight:600;color:#0f172a;">${nombre}</td>
        </tr>
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:10px 0;color:#64748B;">Email</td>
          <td style="padding:10px 0;color:#0f172a;">${email}</td>
        </tr>
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:10px 0;color:#64748B;">Institución</td>
          <td style="padding:10px 0;color:#0f172a;">${institucion || '—'} ${carrera ? '· ' + carrera : ''}</td>
        </tr>
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:10px 0;color:#64748B;">Tipo</td>
          <td style="padding:10px 0;color:#0f172a;">${tipo}</td>
        </tr>
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:10px 0;color:#64748B;"># Boletos</td>
          <td style="padding:10px 0;color:#0f172a;">${boletos}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748B;">Monto</td>
          <td style="padding:10px 0;font-weight:700;color:#059669;font-size:16px;">$${monto} MXN</td>
        </tr>
      </table>

      ${attachments.length > 0 ? `
      <div style="background:#f0fdf4;border-radius:8px;padding:12px 16px;margin-top:20px;">
        <span style="color:#166534;font-size:13px;">📎 Comprobante adjunto en este email</span>
      </div>` : `
      <div style="background:#fff7ed;border-radius:8px;padding:12px 16px;margin-top:20px;">
        <span style="color:#9a3412;font-size:13px;">⚠️ Sin comprobante adjunto</span>
      </div>`}

      <p style="margin:20px 0 0;color:#64748B;font-size:12px;">
        Verifica en tu banco la transferencia con referencia <strong>${referencia}</strong> por <strong>$${monto} MXN</strong>
        y actualiza el estado en Notion a <strong>Pagado</strong>.
      </p>
    </div>
  </div>
</body>
</html>`
  };
}
