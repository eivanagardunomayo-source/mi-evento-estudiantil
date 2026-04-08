const { Client } = require('@notionhq/client');
const transporter = require('./_mailer');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB_ID  = (process.env.NOTION_CHALLENGE_DB_ID || '').trim();

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const d = req.body;
  if (!d || !d.nombreProyecto || !d.email) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  // Formatear integrantes
  const integrantesText = Array.isArray(d.members)
    ? d.members.map(m => `${m.nombre} — ${m.rol}`).join('\n')
    : '';

  const fecha = new Date().toISOString().split('T')[0];

  // ── Guardar en Notion (crítico — si falla, devuelve error) ──
  try {
    await notion.pages.create({
      parent: { database_id: DB_ID },
      properties: {
        'Nombre del proyecto':    { title:        [{ text: { content: d.nombreProyecto || '' } }] },
        'Integrantes y roles':    { rich_text:    [{ text: { content: integrantesText } }] },
        'Correo de contacto':     { email:        d.email || '' },
        'Teléfono':               { phone_number: d.telefono || '' },
        'Carrera / Universidad':  { rich_text:    [{ text: { content: d.carrera || '' } }] },
        'LinkedIn fundador':      { url:          d.linkedin || null },
        'Ciudad':                 { rich_text:    [{ text: { content: d.ciudad || '' } }] },
        'P1 - Problema':          { rich_text:    [{ text: { content: d.p1 || '' } }] },
        'P2 - Solución':          { rich_text:    [{ text: { content: d.p2 || '' } }] },
        'P3 - Diferenciación':    { rich_text:    [{ text: { content: d.p3 || '' } }] },
        'P4 - Validación':        { rich_text:    [{ text: { content: d.p4 || '' } }] },
        'P5 - Modelo de negocio': { rich_text:    [{ text: { content: d.p5 || '' } }] },
        'P6 - Logros / Tracción': { rich_text:    [{ text: { content: d.p6 || '' } }] },
        'P7 - Tecnología':        { rich_text:    [{ text: { content: d.p7 || '' } }] },
        'P8 - Riesgo principal':  { rich_text:    [{ text: { content: d.p8 || '' } }] },
        'P9 - Motivación':        { rich_text:    [{ text: { content: d.p9 || '' } }] },
        'Etapa':                  { select:       { name: d.etapa || 'Idea' } },
        'Industria':              { select:       { name: d.industria || 'Otro' } },
        'Pitch Deck URL':         { url:          d.deckUrl || null },
        'Fecha de aplicación':    { date:         { start: fecha } },
        'Status':                 { select:       { name: 'Nueva' } },
      }
    });
  } catch (err) {
    console.error('Error Notion challenge-apply:', err?.message, err?.body);
    // Fallback: enviar datos al admin para no perderlos
    try {
      await transporter.sendMail({
        from: `"W2TF Error" <${process.env.GMAIL_USER}>`,
        to: process.env.GMAIL_USER,
        subject: `[FALLBACK] Aplicación Challenge — ${d.nombreProyecto}`,
        text: JSON.stringify(d, null, 2)
      });
    } catch (_) {}
    return res.status(500).json({ error: err?.message || 'Error al guardar la aplicación' });
  }

  // ── Email de confirmación (no crítico — si falla, igual devuelve éxito) ──
  try {
    await transporter.sendMail({
      from: `"Welcome 2 The Future" <${process.env.GMAIL_USER}>`,
      to: d.email,
      subject: `Aplicación recibida — The Challenge · W2TF 2026`,
      html: buildConfirmEmail(d)
    });
  } catch (emailErr) {
    console.error('Error email challenge-apply:', emailErr?.message);
    // No bloqueamos el éxito por el email
  }

  return res.status(200).json({ success: true });
};

function buildConfirmEmail(d) {
  const base = process.env.BASE_URL || 'https://welcome2thefuture2026.vercel.app';
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#04040f;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:40px 20px;">

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
    <tr><td style="text-align:center;">
      <img src="${base}/logo-oficial.png" width="200" alt="Welcome 2 The Future 2026" style="opacity:0.95;display:block;margin:0 auto 12px;"/>
      <img src="${base}/logo-belae.png" width="72" alt="BeLAE" style="filter:brightness(0) invert(1);opacity:0.75;display:block;margin:0 auto;"/>
    </td></tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
    <tr><td style="text-align:center;">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#00CFFF;margin-bottom:12px;">The Challenge · W2TF 2026</div>
      <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#fff;">¡Aplicación recibida! 🎉</h1>
      <p style="color:rgba(255,255,255,0.6);margin:0;font-size:14px;line-height:1.6;">Tu proyecto <strong style="color:#fff;">${d.nombreProyecto}</strong> ya está en el radar.<br/>Revisa este correo y mantente atento — cualquier actualización llegará aquí.</p>
    </td></tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;margin-bottom:24px;">
    <tr><td style="padding:22px 24px;">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#00CFFF;margin-bottom:14px;">Fechas clave</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
        <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);">📅 Cierre de aplicaciones</td><td style="color:#fff;font-weight:700;text-align:right;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">5 de mayo</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);">📅 Anuncio de finalistas</td><td style="color:#fff;font-weight:700;text-align:right;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">8 de mayo</td></tr>
        <tr><td style="padding:8px 0;color:rgba(255,255,255,0.6);">📅 Final presencial</td><td style="color:#00CFFF;font-weight:700;text-align:right;padding:8px 0;">15 de mayo · Tec CCM</td></tr>
      </table>
    </td></tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
    <tr><td style="background:rgba(255,153,0,0.07);border:1px solid rgba(255,153,0,0.2);border-radius:12px;padding:14px 18px;">
      <div style="color:#fff;font-size:13px;font-weight:700;margin-bottom:4px;">Importante</div>
      <div style="color:rgba(255,255,255,0.6);font-size:13px;line-height:1.6;">Estén atentos a los medios de contacto que registraron. Podríamos buscarlos para entrevistas o aclaraciones previas a la final.</div>
    </td></tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
    <tr><td style="background:rgba(0,207,255,0.06);border:1px solid rgba(0,207,255,0.2);border-radius:12px;padding:14px 18px;">
      <div style="color:#00CFFF;font-size:13px;font-weight:700;margin-bottom:4px;">Asistencia obligatoria para finalistas</div>
      <div style="color:rgba(255,255,255,0.6);font-size:13px;line-height:1.6;">En caso de ser seleccionados como finalistas, <strong style="color:#fff;">la presentación es presencial y obligatoria</strong> el <strong style="color:#fff;">15 de mayo en el Tec de Monterrey Campus Ciudad de México</strong>. Asegúrense de tener disponibilidad esa fecha.</div>
    </td></tr>
  </table>

  <p style="text-align:center;color:rgba(255,255,255,0.3);font-size:11px;margin:0;">
    ¿Dudas? <a href="mailto:belaeccm.tec@gmail.com" style="color:#00CFFF;">belaeccm.tec@gmail.com</a><br/>
    © 2026 BeLAE · Welcome 2 The Future · Tec de Monterrey CDMX
  </p>

</div>
</body>
</html>`;
}
