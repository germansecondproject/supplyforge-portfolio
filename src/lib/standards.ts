/* Fastener standards data: shared by the catalogue generator, product pages and technical drawings. No imports on purpose. */

export type BoltType = 'hex' | 'socket' | 'flat' | 'wood';
export type MatKey = 'A2' | 'A4' | 'ZN' | 'BK' | 'ZY';

export const TYPES: Record<BoltType, { name: string; norm: string; code: string; iso: string; slug: string }> = {
  hex: { name: 'Hex bolt', norm: 'DIN 933', code: '933', iso: 'ISO 4017', slug: 'hex-bolts' },
  socket: { name: 'Socket cap screw', norm: 'DIN 912', code: '912', iso: 'ISO 4762', slug: 'socket-screws' },
  flat: { name: 'Countersunk socket screw', norm: 'DIN 7991', code: '7991', iso: 'ISO 10642', slug: 'countersunk-screws' },
  wood: { name: 'Chipboard screw, Pozidriv', norm: 'Wood thread', code: 'AGL', iso: '', slug: 'wood-screws' },
};

export const MATNAME: Record<MatKey, string> = {
  A2: 'A2 stainless',
  A4: 'A4 stainless',
  ZN: 'zinc plated',
  BK: 'black 12.9',
  ZY: 'yellow zinc',
};
export const MATFILL: Record<MatKey, string> = { A2: '#D3D8DC', A4: '#C7CDD2', ZN: '#BCC5CC', BK: '#3B4348', ZY: '#E3B73B' };
export const MATGRADE: Record<MatKey, string> = { A2: 'A2-70', A4: 'A4-80', ZN: 'class 8.8', BK: 'class 12.9', ZY: 'class 4.8' };
export const MATDESC: Record<MatKey, string> = {
  A2: 'A2 stainless steel (AISI 304), resists corrosion indoors and outdoors.',
  A4: 'A4 stainless steel (AISI 316), suited to coastal air and light chemicals.',
  BK: 'Class 12.9 steel with a black oxide finish, for maximum-strength joints.',
  ZY: 'Steel with yellow zinc passivation, for indoor use.',
  ZN: 'Blue zinc-plated steel, standard protection for indoor and covered outdoor use.',
};

export const PITCH: Record<number, number> = { 4: 0.7, 5: 0.8, 6: 1, 8: 1.25, 10: 1.5, 12: 1.75 };

export interface Geo {
  k: number; // head height
  hw: number; // head width (AF for hex, Ø otherwise)
  key: number; // drive size
}
export const GEO: Record<BoltType, (d: number) => Geo> = {
  hex: (d) => ({ k: ({ 6: 4, 8: 5.3, 10: 6.4, 12: 7.5 } as Record<number, number>)[d], hw: ({ 6: 10, 8: 13, 10: 16, 12: 18 } as Record<number, number>)[d], key: ({ 6: 10, 8: 13, 10: 16, 12: 18 } as Record<number, number>)[d] }),
  socket: (d) => ({ k: d, hw: ({ 6: 10, 8: 13, 10: 16, 12: 18 } as Record<number, number>)[d], key: ({ 6: 5, 8: 6, 10: 8, 12: 10 } as Record<number, number>)[d] }),
  flat: (d) => ({ k: ({ 5: 2.8, 6: 3.3, 8: 4.4, 10: 5.5 } as Record<number, number>)[d], hw: ({ 5: 10, 6: 12, 8: 16, 10: 20 } as Record<number, number>)[d], key: ({ 5: 3, 6: 4, 8: 5, 10: 6 } as Record<number, number>)[d] }),
  wood: (d) => ({ k: ({ 4: 2.4, 5: 3, 6: 3.6 } as Record<number, number>)[d], hw: ({ 4: 8, 5: 10, 6: 12 } as Record<number, number>)[d], key: ({ 4: 2, 5: 2, 6: 3 } as Record<number, number>)[d] }),
};

export const packOf = (t: BoltType) => (t === 'wood' ? 200 : 100);
export const tl = (t: BoltType, d: number) => (t === 'wood' ? 'Ø' + d : 'M' + d);
export const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export const refOf = (t: BoltType, mat: MatKey, d: number, L: number) => `SF-${TYPES[t].code}-${mat}-${d}x${L}`;

const TM: Record<BoltType, number> = { hex: 1, socket: 0.82, flat: 0.9, wood: 0.45 };
const MM: Record<MatKey, number> = { A2: 1, A4: 1.38, ZN: 0.42, BK: 0.55, ZY: 0.4 };
export const priceBolt = (t: BoltType, mat: MatKey, d: number, L: number) =>
  Math.max(3.5, Math.round(38.9 * TM[t] * MM[mat] * Math.pow(d / 8, 1.5) * (0.3 + (0.7 * L) / 40) * 10) / 10);
export const priceNut = (kind: 'nut' | 'lock', mat: MatKey, d: number) =>
  Math.max(3.2, Math.round((kind === 'lock' ? 12.3 : 10.2) * MM[mat] * Math.pow(d / 8, 1.6) * 10) / 10);
export const priceWasher = (mat: MatKey, d: number) => Math.max(3.2, Math.round(9.8 * MM[mat] * Math.pow(d / 8, 1.3) * 10) / 10);

export function boltTitle(t: BoltType, mat: MatKey, d: number, L: number) {
  const norm = TYPES[t].norm === 'Wood thread' ? '' : TYPES[t].norm + ' ';
  return `${TYPES[t].name} ${norm}${tl(t, d)} × ${L} mm ${MATNAME[mat]}`.replace(/\s+/g, ' ');
}

/* weight of a box in kg, steel 7.9 g/cm3 */
export function boltBoxWeight(t: BoltType, d: number, L: number) {
  const gg = GEO[t](d);
  const pack = packOf(t);
  return ((Math.PI * Math.pow(d / 20, 2) * (L / 10) * 7.9 + Math.PI * Math.pow(gg.hw / 20, 2) * (gg.k / 10) * 7.9 * 0.8) * pack) / 1000;
}

/* price tiers by number of boxes */
export const tierMult = (q: number) => (q >= 50 ? 0.82 : q >= 10 ? 0.905 : 1);
export const tierIdx = (q: number) => (q >= 50 ? 2 : q >= 10 ? 1 : 0);
export const TIERS = [
  { from: 1, label: '1–9', mult: 1 },
  { from: 10, label: '10–49', mult: 0.905 },
  { from: 50, label: '50+', mult: 0.82 },
];
export const pct = (m: number) => String(Math.round((1 - m) * 1000) / 10) + ' %';

export const IVA = 0.21;
export const FREE_FROM = 150;
export const SHIP_STD = 9.9;
export const SHIP_EXP = 24.9;
