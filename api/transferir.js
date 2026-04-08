const { Client } = require('@notionhq/client');
const transporter = require('./_mailer');
const crypto = require('crypto');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const base = process.env.BASE_URL || 'https://welcome2thefuture2026.vercel.app';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = req.query.t || req.body?.token;
  if (!token) return res.status(400).json({ error: 'Token requerido' });

  async function getBoleto(token) {
    const query = await notion.databases.query({
      database_id: process.env.NOTION_DB_ID,
      filter: {
        and: [
          { property: 'Token',    rich_text: { equals: token } },
          { property: 'EsBoleto', checkbox:   { equals: true } }
        ]
      }
    });
    if (!query.results.length) return null;
    const page  = query.results[0];
    const props = page.properties;
    return {
      pageId:       page.id,
      nombre:       props.Nombre?.title?.[0]?.plain_text || '',
      email:        props.Email?.email || '',
      ref:          props.Referencia?.rich_text?.[0]?.plain_text || '',
      tipo:         props.Tipo?.select?.name || '',
      numBoleto:    props.NumBoleto?.number    || 1,
      totalBoletos: props.TotalBoletos?.number || 1,
      monto:        props.Monto?.number        || 0,
      estado:       props.Estado?.select?.name || '',
      ingresado:    props.Ingresado?.checkbox  || false,
    };
  }

  // GET — info del boleto para preview
  if (req.method === 'GET') {
    try {
      const b = await getBoleto(token);
      if (!b) return res.status(404).json({ error: 'Boleto no encontrado' });
      if (b.estado !== 'Confirmado') return res.status(400).json({ error: 'El boleto aún no ha sido confirmado' });
      if (b.ingresado) return res.status(400).json({ error: 'Este boleto ya fue utilizado para ingresar al evento y no puede transferirse' });
      return res.status(200).json({ nombre: b.nombre, ref: b.ref, tipo: b.tipo, numBoleto: b.numBoleto, totalBoletos: b.totalBoletos, monto: b.monto });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST — ejecutar transferencia
  if (req.method === 'POST') {
    const { nuevoNombre, nuevoEmail } = req.body || {};
    if (!nuevoNombre?.trim() || !nuevoEmail?.trim()) {
      return res.status(400).json({ error: 'Nombre y email son requeridos' });
    }

    try {
      const b = await getBoleto(token);
      if (!b) return res.status(404).json({ error: 'Boleto no encontrado' });
      if (b.estado !== 'Confirmado') return res.status(400).json({ error: 'El boleto aún no ha sido confirmado' });
      if (b.ingresado) return res.status(400).json({ error: 'Este boleto ya fue utilizado y no puede transferirse' });

      // Actualizar titular en Notion
      await notion.pages.update({
        page_id: b.pageId,
        properties: {
          'Nombre': { title: [{ text: { content: nuevoNombre.trim() } }] },
          'Email':  { email: nuevoEmail.trim() }
        }
      });

      // Enviar boleto al nuevo titular
      const validarUrl = `${base}/validar?t=${token}`;
      const boletoUrl  = `${base}/boleto?t=${token}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(validarUrl)}`;
      const shortCode = token.replace(/-/g, '').substring(0, 12).toUpperCase();

      await transporter.sendMail({
        from: `"Welcome 2 The Future" <${process.env.GMAIL_USER}>`,
        to:   nuevoEmail.trim(),
        subject: `Te transfirieron un boleto — W2TF 2026 · ${b.ref}`,
        html: buildTransferEmail({ nuevoNombre: nuevoNombre.trim(), ref: b.ref, tipo: b.tipo, numBoleto: b.numBoleto, totalBoletos: b.totalBoletos, monto: b.monto, qrUrl, token, shortCode, boletoUrl })
      });

      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).end();
};

function buildTransferEmail({ nuevoNombre, ref, tipo, numBoleto, totalBoletos, monto, qrUrl, token, shortCode, boletoUrl }) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#050714;font-family:Arial,sans-serif;">
<div style="max-width:580px;margin:0 auto;padding:40px 20px;">

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
    <tr><td style="text-align:center;">
      <img src="${base}/logo-belae.png" width="120" alt="BeLAE" style="display:inline-block;max-width:120px;"/>
    </td></tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
    <tr><td style="text-align:center;">
      <img src="${base}/logo-oficial.png" width="200" alt="W2TF 2026" style="display:inline-block;max-width:200px;"/>
    </td></tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
    <tr><td style="text-align:center;">
      <div style="color:#00CFFF;font-size:10px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;margin-bottom:10px;">🎟️ Boleto transferido</div>
      <h1 style="margin:0 0 10px;font-size:24px;font-weight:800;color:#ffffff;">¡Hola, ${nuevoNombre}!</h1>
      <p style="color:#94A3B8;margin:0;font-size:14px;line-height:1.6;">Te acaban de transferir un boleto para <strong style="color:#fff;">Welcome 2 The Future 2026</strong>.<br/>Aquí está tu acceso oficial al evento.</p>
    </td></tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
  <tr><td>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0120;border-radius:16px;overflow:hidden;border:1px solid rgba(122,0,255,0.5);box-shadow:0 8px 40px rgba(0,207,255,0.15);">
    <tr>
      <td style="background:linear-gradient(135deg,#7A00FF 0%,#00CFFF 100%);padding:22px 24px;text-align:center;">
        <img src="${base}/logo-oficial.png" width="160" alt="W2TF 2026" style="display:inline-block;max-width:160px;margin-bottom:12px;"/>
        <div style="color:#ffffff;font-size:18px;font-weight:900;letter-spacing:0.08em;font-family:Arial,sans-serif;">✦ BOLETO OFICIAL ✦</div>
      </td>
    </tr>
    <tr>
      <td style="background:rgba(0,207,255,0.07);border-bottom:1px solid rgba(0,207,255,0.12);padding:9px 24px;text-align:center;">
        <span style="color:#00CFFF;font-size:11px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;font-family:Arial,sans-serif;">BOLETO ${numBoleto} DE ${totalBoletos}</span>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align:top;padding-right:20px;">
              <div style="color:#64748B;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;font-family:Arial,sans-serif;margin-bottom:3px;">Titular del boleto</div>
              <div style="color:#ffffff;font-size:19px;font-weight:800;font-family:Arial,sans-serif;margin-bottom:18px;line-height:1.2;">${nuevoNombre}</div>
              <table cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;font-size:12px;width:100%;">
                <tr><td style="color:#64748B;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.06);">Tipo de acceso</td><td style="color:#00CFFF;font-weight:700;text-align:right;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.06);">${tipo}</td></tr>
                <tr><td style="color:#64748B;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.06);">Referencia</td><td style="color:#A78BFA;font-weight:700;text-align:right;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.06);">${ref}</td></tr>
                <tr><td style="color:#64748B;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.06);">Fecha</td><td style="color:#ffffff;text-align:right;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.06);">15 de mayo, 2026</td></tr>
                <tr><td style="color:#64748B;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.06);">Hora</td><td style="color:#ffffff;text-align:right;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.06);">2:30 PM</td></tr>
                <tr><td style="color:#64748B;padding:5px 0;">Lugar</td><td style="color:#ffffff;text-align:right;padding:5px 0;">Tec de Monterrey CCM</td></tr>
              </table>
            </td>
            <td style="vertical-align:top;text-align:center;width:140px;">
              <div style="background:#ffffff;padding:7px;border-radius:10px;display:inline-block;margin-bottom:8px;">
                <img src="${qrUrl}" width="126" height="126" alt="QR Boleto" style="display:block;"/>
              </div>
              <div style="color:#64748B;font-size:9px;font-family:Arial,sans-serif;line-height:1.5;">Escanear en<br/>la entrada</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr><td style="padding:0 16px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:2px dashed rgba(255,255,255,0.12);padding:0;"></td></tr></table></td></tr>
    <tr>
      <td style="padding:12px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td><span style="color:#A78BFA;font-size:11px;font-weight:700;letter-spacing:0.1em;font-family:'Courier New',monospace;">${shortCode}</span></td>
            <td style="text-align:right;"><a href="${boletoUrl}" style="color:#00CFFF;font-size:10px;font-family:Arial,sans-serif;text-decoration:none;">Ver y guardar boleto →</a></td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  </td></tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
    <tr><td style="background:rgba(122,0,255,0.08);border:1px solid rgba(122,0,255,0.25);border-radius:10px;padding:14px 18px;text-align:center;">
      <div style="color:#C4B5FD;font-size:12px;font-weight:700;margin-bottom:4px;">Boleto de uso único y personal</div>
      <div style="color:#94A3B8;font-size:12px;line-height:1.6;">Este código QR solo puede escanearse una vez para ingresar al evento.</div>
    </td></tr>
  </table>

  <p style="text-align:center;color:#64748B;font-size:11px;margin:0;">
    ¿Dudas? <a href="mailto:belaeccm.tec@gmail.com" style="color:#00CFFF;">belaeccm.tec@gmail.com</a><br/>
    © 2026 BeLAE · Welcome 2 The Future
  </p>
</div>
</body>
</html>`;
}
