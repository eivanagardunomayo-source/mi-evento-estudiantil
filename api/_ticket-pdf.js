const PDFDocument = require('pdfkit');
const QRCode      = require('qrcode');

/**
 * Genera el buffer PDF de un boleto individual.
 * @param {object} opts
 * @returns {Promise<Buffer>}
 */
module.exports = async function generateTicketPDF({
  nombre, ref, tipo, numBoleto, totalBoletos, token, base
}) {
  const validarUrl = `${base}/validar?t=${token}`;
  const shortCode  = token.replace(/-/g, '').substring(0, 12).toUpperCase();

  // QR como buffer PNG (sin CORS, server-side)
  const qrBuffer = await QRCode.toBuffer(validarUrl, {
    width: 300, margin: 2,
    color: { dark: '#000000', light: '#ffffff' }
  });

  return new Promise((resolve, reject) => {
    const W = 306, H = 530; // 108mm × 187mm en puntos (72pt = 1in)
    const doc = new PDFDocument({ size: [W, H], margin: 0, compress: true });

    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Fondo oscuro ────────────────────────────────────────────
    doc.rect(0, 0, W, H).fill('#06061a');

    // ── Header degradado ────────────────────────────────────────
    const hGrad = doc.linearGradient(0, 0, W, 82);
    hGrad.stop(0, '#7A00FF').stop(1, '#00CFFF');
    doc.rect(0, 0, W, 82).fill(hGrad);

    // Texto header
    doc.fontSize(6.5).fillColor('#ffffffcc').font('Helvetica')
       .text('B E L A E  ·  T E C  D E  M O N T E R R E Y', 0, 14,
             { align: 'center', width: W });
    doc.fontSize(14.5).fillColor('#ffffff').font('Helvetica-Bold')
       .text('WELCOME 2 THE FUTURE', 0, 26, { align: 'center', width: W });
    doc.fontSize(13).fillColor('#ffffff').font('Helvetica')
       .text('2  0  2  6', 0, 46, { align: 'center', width: W });
    doc.fontSize(7).fillColor('#ffffffcc').font('Helvetica')
       .text('✦  BOLETO OFICIAL  ✦', 0, 66, { align: 'center', width: W, characterSpacing: 1.5 });

    // ── Strip número de boleto ───────────────────────────────────
    doc.rect(0, 82, W, 0.8).fill('#00CFFF');
    doc.save().fillOpacity(0.06).rect(0, 82, W, 22).fill('#00CFFF').restore();
    doc.rect(0, 103, W, 0.8).fill('#00CFFF');
    doc.fontSize(7.5).fillColor('#00CFFF').font('Helvetica-Bold')
       .text(`BOLETO ${numBoleto} DE ${totalBoletos}`, 0, 90,
             { align: 'center', width: W, characterSpacing: 3 });

    // ── Cuerpo ───────────────────────────────────────────────────
    let y = 116;

    doc.fontSize(6.5).fillColor('#475569').font('Helvetica')
       .text('TITULAR DEL BOLETO', 22, y, { characterSpacing: 1.5 });
    y += 12;

    const nameSize = nombre.length > 24 ? 15 : nombre.length > 18 ? 17 : 19;
    doc.fontSize(nameSize).fillColor('#ffffff').font('Helvetica-Bold')
       .text(nombre, 22, y, { width: 262 });

    // Calcular altura del nombre (puede ocupar 1 o 2 líneas)
    const nameH = doc.currentLineHeight(true) *
      Math.ceil(doc.widthOfString(nombre) / 262) + 2;
    y += Math.max(nameH, nameSize) + 12;

    // ── Tabla de info ────────────────────────────────────────────
    const rows = [
      { key: 'Tipo de acceso', val: tipo || 'Asistente', color: '#00CFFF' },
      { key: 'Referencia',     val: ref,                 color: '#A78BFA' },
      { key: 'Fecha',          val: '15 de mayo, 2026',  color: '#ffffff' },
      { key: 'Hora',           val: '2:30 PM',           color: '#ffffff' },
      { key: 'Lugar',          val: 'Tec de Monterrey CCM', color: '#ffffff' },
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

    // Fondo blanco con padding
    doc.rect(qrX - 7, y - 7, qrSize + 14, qrSize + 14)
       .fill('#ffffff');
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
