/**
 * Script de envío masivo — Pre-registro Welcome 2 The Future 2026
 * Usa la API de Resend para enviar correos con branding W2TF.
 *
 * USO:
 *   node enviar-preregistro.js           → modo PRUEBA (solo a TEST_EMAIL)
 *   node enviar-preregistro.js --enviar  → modo PRODUCCIÓN (todos los destinatarios)
 *
 * CONFIGURACIÓN:
 *   Asegúrate de tener en .env:
 *     RESEND_API_KEY=re_...
 *
 * NOTA RESEND:
 *   El campo FROM debe ser de un dominio verificado en resend.com/domains.
 *   Para pruebas usa: onboarding@resend.dev
 *   Para producción verifica tu dominio (ej. hola@belae.mx) en resend.com/domains
 *   y cambia la variable FROM_EMAIL abajo.
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

// ─── CONFIGURACIÓN ────────────────────────────────────────────────────────────
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;
const TEST_EMAIL = 'eivana.gardunomayo@gmail.com';
const FROM_NAME  = 'Welcome 2 The Future';
const REPLY_TO   = 'belaeccm.tec@gmail.com';
const LANDING_URL    = 'https://welcome2thefuture2026.vercel.app';
const CODIGO_50      = '50W2TF';
const CODIGO_2X1     = '2X1Y50W2TF';

// ─── DESTINATARIOS ────────────────────────────────────────────────────────────
// Agrega aquí los 10 correos. Puedes poner nombre opcional.
// { email: 'ejemplo@correo.com', nombre: 'Nombre' }  ← con nombre
// { email: 'ejemplo@correo.com' }                    ← sin nombre
const DESTINATARIOS = [
  { email: 'a01660089@tec.mx',          nombre: 'Daniela'      },
  { email: 'a01663835@tec.mx',          nombre: 'Luis Eduardo' },
  { email: 'A01664138@tec.mx',          nombre: 'Ricardo'      },
  { email: 'A01665011@tec.mx',          nombre: 'Irvin'        },
  { email: 'a01825182@tec.mx',          nombre: 'Armando'      },
  { email: 'A01664576@tec.mx',          nombre: 'Erin'         },
  { email: 'A01667518@tec.mx',          nombre: 'Renata'       },
  { email: 'A01654749@exatec.tec.mx',   nombre: 'Christian'    },
];

// ─── MODO ─────────────────────────────────────────────────────────────────────
const MODO_PRODUCCION = process.argv.includes('--enviar');
const TEST_DEST       = process.argv.find(a => a.startsWith('--test='));
const testEmail       = TEST_DEST ? TEST_DEST.split('=')[1] : TEST_EMAIL;
const destinatarios   = MODO_PRODUCCION ? DESTINATARIOS : [{ email: testEmail, nombre: 'Prueba' }];

// ─── TEMPLATE HTML ────────────────────────────────────────────────────────────
function generarHTML(nombre) {
  const saludo = nombre ? `Hola, ${nombre.split(' ')[0]}` : 'Hola';
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Welcome 2 The Future — Tu descuento de pre-registro</title>
</head>
<body style="margin:0;padding:0;background:#0A0A0F;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0F;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- HEADER -->
  <tr>
    <td style="background:linear-gradient(135deg,#1A3FC4 0%,#7B2FBE 40%,#D63AF9 75%,#06B6D4 100%);border-radius:18px 18px 0 0;padding:40px 32px 32px;text-align:center;">
      <img src="${LANDING_URL}/logo-w2tf.png" alt="Welcome 2 The Future" width="160" style="display:block;margin:0 auto 20px;border-radius:16px;" onerror="this.style.display='none'"/>
      <div style="color:#ffffff;font-size:22px;font-weight:900;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:4px;">Welcome 2 The Future</div>
      <div style="color:rgba(255,255,255,0.8);font-size:13px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;">2da Edición · 2026</div>
    </td>
  </tr>

  <!-- BODY -->
  <tr>
    <td style="background:#0F0F1A;padding:36px 32px;">

      <!-- Saludo -->
      <div style="color:#ffffff;font-size:20px;font-weight:800;margin-bottom:8px;">${saludo},</div>
      <p style="color:#94A3B8;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Te registraste en el <strong style="color:#06B6D4;">pre-registro</strong> de <strong style="color:#fff;">Welcome 2 The Future 2026</strong> — el summit de innovación y tecnología del Tec de Monterrey CDMX. Como agradecimiento te queremos regalar <strong style="color:#fff;">dos beneficios exclusivos</strong> para que puedas venir:
      </p>

      <!-- Beneficio 1: 50% off -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
        <tr>
          <td style="background:linear-gradient(135deg,rgba(26,63,196,0.15),rgba(123,47,190,0.12));border:1px solid rgba(123,47,190,0.4);border-radius:14px;padding:24px;">
            <div style="color:#D63AF9;font-size:10px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;margin-bottom:10px;font-family:Arial,sans-serif;">Beneficio 1</div>
            <div style="color:#ffffff;font-size:19px;font-weight:900;margin-bottom:6px;">50% de descuento</div>
            <p style="color:#94A3B8;font-size:13px;margin:0 0 16px;line-height:1.6;">Tu boleto pasa de <span style="text-decoration:line-through;color:#64748B;">$150 MXN</span> a solo <strong style="color:#fff;font-size:16px;">$75 MXN</strong>.</p>
            <div style="background:rgba(0,0,0,0.35);border:1px solid rgba(214,58,249,0.35);border-radius:10px;padding:14px;text-align:center;">
              <div style="color:#94A3B8;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:6px;font-family:Arial,sans-serif;">Tu código</div>
              <div style="color:#D63AF9;font-size:22px;font-weight:900;letter-spacing:0.1em;font-family:'Courier New',monospace;">${CODIGO_50}</div>
            </div>
          </td>
        </tr>
      </table>

      <!-- Beneficio 2: 2x1 preferencial -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
        <tr>
          <td style="background:linear-gradient(135deg,rgba(6,182,212,0.12),rgba(26,63,196,0.10));border:1px solid rgba(6,182,212,0.35);border-radius:14px;padding:24px;">
            <div style="color:#06B6D4;font-size:10px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;margin-bottom:10px;font-family:Arial,sans-serif;">Beneficio 2</div>
            <div style="color:#ffffff;font-size:19px;font-weight:900;margin-bottom:6px;">50% de descuento + 2×1</div>
            <p style="color:#94A3B8;font-size:13px;margin:0 0 16px;line-height:1.6;">¿Quieres ir acompañado? Con este código tienes <strong style="color:#fff;">50% de descuento</strong> y además es <strong style="color:#fff;">2×1</strong> — pagas solo <strong style="color:#fff;">$75 MXN</strong> y <strong style="color:#fff;">entran dos personas</strong>. Los buenos momentos son mejores en compañía.</p>
            <div style="background:rgba(0,0,0,0.35);border:1px solid rgba(6,182,212,0.35);border-radius:10px;padding:14px;text-align:center;">
              <div style="color:#94A3B8;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:6px;font-family:Arial,sans-serif;">Tu código</div>
              <div style="color:#06B6D4;font-size:22px;font-weight:900;letter-spacing:0.1em;font-family:'Courier New',monospace;">${CODIGO_2X1}</div>
            </div>
          </td>
        </tr>
      </table>

      <!-- Nota aclaratoria -->
      <p style="color:#64748B;font-size:12px;margin:0 0 28px;line-height:1.6;text-align:center;">
        Usa <strong style="color:#94A3B8;">${CODIGO_50}</strong> si vas solo con 50% de descuento, o <strong style="color:#94A3B8;">${CODIGO_2X1}</strong> si quieres ir acompañado al precio preferencial. Solo puedes usar uno.
      </p>

      <!-- CTA -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td align="center" bgcolor="#7B2FBE" style="border-radius:12px;background:#7B2FBE;">
                  <a href="${LANDING_URL}" style="display:inline-block;background:#7B2FBE;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;padding:16px 40px;border-radius:12px;letter-spacing:0.04em;font-family:Arial,sans-serif;">Comprar mi boleto</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Certificado -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
        <tr>
          <td style="background:linear-gradient(135deg,rgba(6,182,212,0.08),rgba(26,63,196,0.08));border:1px solid rgba(6,182,212,0.2);border-radius:12px;padding:18px 20px;text-align:center;">
            <div style="color:#ffffff;font-size:13px;line-height:1.6;">Todos los asistentes recibirán un <strong style="color:#06B6D4;">certificado con valor curricular</strong> por su participación en el evento.</div>
          </td>
        </tr>
      </table>

      <!-- Cómo usar el código -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
        <tr>
          <td style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px 24px;">
            <div style="color:#94A3B8;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:10px;">¿Cómo usar tu código?</div>
            <div style="color:#ffffff;font-size:13px;line-height:1.7;">Al entrar a comprar tu boleto, verás un recuadro que dice <strong style="color:#06B6D4;">"Código de descuento"</strong> — ahí escribes tu código y el precio se ajusta automáticamente antes de pagar.</div>
          </td>
        </tr>
      </table>

      <!-- Info del evento -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px;text-align:center;">
            <div style="color:#06B6D4;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:10px;">El evento</div>
            <div style="color:#ffffff;font-size:15px;font-weight:800;margin-bottom:4px;">15 de mayo, 2026 · 4:00 PM</div>
            <div style="color:#94A3B8;font-size:13px;">Tec de Monterrey CDMX</div>
          </td>
        </tr>
      </table>

    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style="background:#08080F;border-radius:0 0 18px 18px;padding:24px 32px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
      <div style="color:#334155;font-size:12px;">
        © 2026 BeLAE · Welcome 2 The Future<br/>
        <a href="mailto:${REPLY_TO}" style="color:#475569;text-decoration:none;">${REPLY_TO}</a>
      </div>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ─── TRANSPORTER NODEMAILER ───────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: GMAIL_USER, pass: GMAIL_PASS },
});

// ─── ENVÍO ────────────────────────────────────────────────────────────────────
async function enviarCorreo({ email, nombre }) {
  const info = await transporter.sendMail({
    from:    `${FROM_NAME} <${GMAIL_USER}>`,
    replyTo: REPLY_TO,
    to:      email,
    subject: 'Tu beneficio de pre-registro — Welcome 2 The Future 2026',
    html:    generarHTML(nombre),
  });
  return { email, id: info.messageId };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!GMAIL_USER || !GMAIL_PASS) {
    console.error('ERROR: GMAIL_USER o GMAIL_PASS no están en .env');
    process.exit(1);
  }

  if (!MODO_PRODUCCION) {
    console.log('━━━ MODO PRUEBA ━━━ (solo se envía a ' + TEST_EMAIL + ')');
    console.log('Para enviar a todos: node enviar-preregistro.js --enviar\n');
  } else {
    if (DESTINATARIOS.length === 0) {
      console.error('ERROR: No hay destinatarios en la lista DESTINATARIOS.');
      process.exit(1);
    }
    console.log(`━━━ MODO PRODUCCIÓN ━━━ Enviando a ${DESTINATARIOS.length} destinatarios...\n`);
  }

  let ok = 0, fail = 0;
  for (const dest of destinatarios) {
    try {
      const result = await enviarCorreo(dest);
      console.log(`✓ Enviado a ${result.email} (id: ${result.id})`);
      ok++;
    } catch (err) {
      console.error(`✗ Error enviando a ${err.email}:`, JSON.stringify(err.error));
      fail++;
    }
    // pausa entre envíos para no saturar el API
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\nResumen: ${ok} enviados, ${fail} fallidos.`);
}

main();
