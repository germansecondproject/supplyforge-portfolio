import { FREE_FROM, IVA, SHIP_EXP, SHIP_STD, tierMult } from './standards';
import type { CartLine, Product } from './types';

const r2 = (n: number) => Math.round(n * 100) / 100;

export const eurFmt = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' });
export const n3 = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
export const eur = (n: number) => eurFmt.format(n);

/** Unit price (per box or per piece) after the product offer, before volume tiers. Mirrors place_order() in SQL. */
export const offerUnit = (list: number, off: number) => r2(list * (1 - off));

/** Unit price for a given quantity: offer first, then volume tier on box products. One rounding, like the database. */
export const unitFor = (list: number, off: number, tier: boolean, qty: number) =>
  r2(list * (1 - off) * (tier ? tierMult(qty) : 1));

export const lineUnit = (l: Pick<CartLine, 'list' | 'off' | 'tier' | 'qty'>) => unitFor(l.list, l.off, l.tier, l.qty);

export type ShipMethod = 'std' | 'exp' | 'pickup';

export function totals(lines: CartLine[], ship: ShipMethod) {
  let sub = 0, list = 0;
  for (const l of lines) {
    sub += lineUnit(l) * l.qty;
    list += l.list * l.qty;
  }
  sub = r2(sub);
  list = r2(list);
  const save = r2(list - sub);
  const shipping = ship === 'pickup' ? 0 : ship === 'exp' ? SHIP_EXP : sub >= FREE_FROM || !lines.length ? 0 : SHIP_STD;
  const vat = r2((sub + shipping) * IVA);
  return { sub, list, save, shipping, vat, total: r2(sub + shipping + vat) };
}

export function toLine(p: Product, qty = 1): CartLine {
  return { ref: p.ref, slug: p.slug, name: p.name, pack: p.pack, tier: p.tier, unit: p.unit, list: p.price, off: p.off, qty, art: p.art };
}

export const unitLabel = (p: { tier: boolean; unit: string }) => (p.tier ? 'per box' : `per ${p.unit === 'each' ? 'item' : p.unit}`);
export const unitWord = (p: { tier: boolean; unit: string }, q: number) => (p.tier ? (q === 1 ? 'box' : 'boxes') : p.unit === 'each' ? (q === 1 ? 'item' : 'items') : p.unit);
