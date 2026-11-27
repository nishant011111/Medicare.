/**
 * Minimal deterministic PDF 1.4 generator for MediCore clinical invoices and verified receipts.
 * Produces valid binary PDF documents without heavy external headless browser dependencies.
 */

function escapePdfText(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, ' ');
}

export interface PdfLine {
  text: string;
  size?: number;
  bold?: boolean;
  spacingAfter?: number;
}

export function buildSimplePdfBuffer(title: string, lines: PdfLine[]): Buffer {
  const ops: string[] = [];
  let y = 760;

  ops.push('BT');
  ops.push('/F2 16 Tf');
  ops.push(`50 ${y} Td`);
  ops.push(`(${escapePdfText(title)}) Tj`);
  ops.push('ET');
  y -= 28;

  for (const line of lines) {
    if (y < 54) {
      break;
    }
    const font = line.bold ? '/F2' : '/F1';
    const size = line.size || 10;
    const text = line.text.slice(0, 110);
    ops.push('BT');
    ops.push(`${font} ${size} Tf`);
    ops.push(`50 ${y} Td`);
    ops.push(`(${escapePdfText(text)}) Tj`);
    ops.push('ET');
    y -= (line.spacingAfter ?? size + 6);
  }

  const streamContent = ops.join('\n');
  const objects: string[] = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
    `6 0 obj\n<< /Length ${Buffer.byteLength(streamContent, 'utf8')} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
}
