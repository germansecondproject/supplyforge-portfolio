/**
 * Reads quick-order lines typed by hand or pasted from a spreadsheet.
 * Excel and Google Sheets copy cells as tab-separated rows, so a pasted range can have extra columns (description,
 * price...), a header row and quantities such as "2,00". Each line becomes a part number and a quantity; lines with
 * no part number are skipped when they look like a header and flagged otherwise.
 */
export interface PastedLine { raw: string; q: number; bad: boolean }

const PART = /^[A-Z]{1,4}-[A-Z0-9][A-Z0-9.\-×X/]*$/i;
const QTY = /^\d{1,5}(?:[.,]0+)?$/;
const HEADER = /\b(part|ref|reference|sku|item|code|qty|quantity|boxes|units|art[ií]culo|referencia|c[oó]digo|cantidad|cajas|uds?)\b/i;

export function parseQuickOrder(text: string): PastedLine[] {
  const out: PastedLine[] = [];
  for (const line of text.split(/\r?\n/)) {
    const l = line.trim();
    if (!l) continue;
    const cells = (l.includes('\t') ? l.split('\t') : l.split(/\s*[,;]\s*|\s+[x×]\s+|\s+/)).map((c) => c.trim().replace(/^"|"$/g, '')).filter(Boolean);
    const ref = cells.find((c) => PART.test(c));
    if (!ref) {
      if (!HEADER.test(l)) out.push({ raw: l, q: 0, bad: true });
      continue;
    }
    // the quantity is the first whole number after the part number, or before it when the sheet lists quantity first
    const at = cells.indexOf(ref);
    const qty = cells.slice(at + 1).find((c) => QTY.test(c)) ?? cells.slice(0, at).reverse().find((c) => QTY.test(c));
    const q = qty === undefined ? 1 : Math.floor(Number(qty.replace(',', '.')));
    out.push(q >= 1 ? { raw: ref, q: Math.min(9999, q), bad: false } : { raw: ref, q: 0, bad: true });
  }
  return out.slice(0, 60);
}
