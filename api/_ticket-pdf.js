const PDFDocument = require('pdfkit');
const QRCode      = require('qrcode');
const path        = require('path');
const fs          = require('fs');

const ROOT = process.cwd();

module.exports = async function generateTicketPDF({
  nombre, ref, tipo, numBoleto, totalBoletos, token, base
}) {
  const validarUrl = `${base}/validar?t=${token}`;
  const shortCode  = token.replace(/-/g, '').substring(0, 12).toUpperCase();

  const qrBuffer = await QRCode.toBuffer(validarUrl, {
    width: 300, margin: 2,
    color: { dark: '#000000', light: '#ffffff' }
  });

  // Cargar logos desde el filesystem
  const logoBelae   = fs.readFileSync(path.join(ROOT, 'logo-belae.png'));
  const logoOficial = fs.readFileSync(path.join(ROOT, 'logo-oficial.png'));

  return new Promise((resolve, reject) => {
    const W = 306, H = 580;
    const doc = new PDFDocument({ size: [W, H], margin: 0, compress: true });

    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Fondo oscuro ────────────────────────────────────────────
    doc.rect(0, 0, W, H).fill('#06061a');

    // ── Header degradado ────────────────────────────────────────
    const HEADER_H = 130;
    const hGrad = doc.linearGradient(0, 0, W, HEADER_H);
    hGrad.stop(0, '#7A00FF').stop(1, '#00CFFF');
    doc.rect(0, 0, W, HEADER_H).fill(hGrad);

    // Logo BeLAE (pequeño, arriba al centro)
    doc.image(logoBelae, 0, 8, {
      fit: [W, 28],
      align: 'center',
      valign: 'center'
    });

    // Logo W2TF oficial (grande, centro)
    doc.image(logoOficial, 0, 42, {
      fit: [W, 64],
      align: 'center',
      valign: 'center'
    });

    // "✦ BOLETO OFICIAL ✦"
    doc.fontSize(7).fillColor('#ffffffcc').font('Helvetica')
       .text('BOLETO OFICIAL', 0, 113,
             { align: 'center', width: W, characterSpacing: 1.5 });

    // ── Strip número de boleto ───────────────────────────────────
    const STRIP_Y = HEADER_H;
    doc.rect(0, STRIP_Y, W, 0.8).fill('#00CFFF');
    doc.save().fillOpacity(0.06).rect(0, STRIP_Y, W, 22).fill('#00CFFF').restore();
    doc.rect(0, STRIP_Y + 22, W, 0.8).fill('#00CFFF');
    doc.fontSize(7.5).fillColor('#00CFFF').font('Helvetica-Bold')
       .text(`BOLETO ${numBoleto} DE ${totalBoletos}`, 0, STRIP_Y + 8,
             { align: 'center', width: W, characterSpacing: 3 });

    // ── Cuerpo ───────────────────────────────────────────────────
    let y = STRIP_Y + 36;

    doc.fontSize(6.5).fillColor('#475569').font('Helvetica')
       .text('TITULAR DEL BOLETO', 22, y, { characterSpacing: 1.5 });
    y += 12;

    const nameSize = nombre.length > 24 ? 15 : nombre.length > 18 ? 17 : 19;
    doc.fontSize(nameSize).fillColor('#ffffff').font('Helvetica-Bold')
       .text(nombre, 22, y, { width: 262 });

    const nameH = doc.currentLineHeight(true) *
      Math.ceil(doc.widthOfString(nombre) / 262) + 2;
    y += Math.max(nameH, nameSize) + 12;

    // ── Tabla de info ────────────────────────────────────────────
    const rows = [
      { key: 'Tipo de acceso', val: tipo || 'Asistente',       color: '#00CFFF' },
      { key: 'Referencia',     val: ref,                        color: '#A78BFA' },
      { key: 'Fecha',          val: '15 de mayo, 2026',         color: '#ffffff' },
      { key: 'Hora',           val: '2:30 PM',                  color: '#ffffff' },
      { key: 'Lugar',          val: 'Tec de Monterrey CCM',     color: '#ffffff' },
    ];

    rows.forEach(({ key, val, color }, i) => {
      doc.fontSize(8.5).fillColor('#475569').font('Helvetica').text(key, 22, y);
      doc.fontSize(8.5).fillColor(color).font('Helvetica-Bold')
         .text(val, 22, y, { align: 'right', width: 262 });
      y += 19;
      if (i < rows.length - 1) {
        doc.moveTo(22, y - 4).lineTo(284, y - 4)
           .strokeColor('#1c1c3a').lineWidth(0.5).stroke();
      }
    });

    // ── Separador punteado ───────────────────────────────────────
    y += 10;
    doc.save().dash(3, { space: 3 })
       .moveTo(22, y).lineTo(284, y)
       .strokeColor('#2a2a4a').lineWidth(0.8).stroke().restore();

    // Muescas laterales
    doc.circle(-8, y, 8).fill('#06061a');
    doc.circle(W + 8, y, 8).fill('#06061a');

    // ── QR Code ──────────────────────────────────────────────────
    y += 14;
    const qrSize = 110;
    const qrX    = (W - qrSize) / 2;

    doc.rect(qrX - 7, y - 7, qrSize + 14, qrSize + 14).fill('#ffffff');
    doc.image(qrBuffer, qrX, y, { width: qrSize, height: qrSize });

    doc.fontSize(7.5).fillColor('#475569').font('Helvetica')
       .text('Escanea este código al ingresar al evento', 0, y + qrSize + 10,
             { align: 'center', width: W });

    // ── Footer ───────────────────────────────────────────────────
    doc.save().fillOpacity(0.06).rect(0, H - 28, W, 28).fill('#7A00FF').restore();
    doc.rect(0, H - 28, W, 0.8).fill('#1a0a3a');

    doc.fontSize(8.5).fillColor('#A78BFA').font('Helvetica-Bold')
       .text(shortCode, 22, H - 17);
    doc.fontSize(7.5).fillColor('#334155').font('Helvetica')
       .text('Uso personal · No transferible', 22, H - 17,
             { align: 'right', width: 262 });

    doc.end();
  });
};
