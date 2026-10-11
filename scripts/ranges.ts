/* The extended range: every size, finish and pack of the fastener lines, plus product lines from several brands for the
 * rest of the catalogue. Pure data, no randomness: scripts/generate-catalog.ts adds codes, stock, prices off and promos.
 * Items whose part number already exists in the original catalogue are skipped there. */
import { TYPES, MATNAME, MATGRADE, MATDESC, PITCH, GEO, packOf, tl, cap, refOf, priceBolt, priceNut, priceWasher, boltTitle, boltBoxWeight, pzFor } from '../src/lib/standards.ts';
import type { BoltType, MatKey } from '../src/lib/standards.ts';
import type { ArtSpec } from '../src/lib/types.ts';

export interface RangeItem {
  ref: string; name: string; category: string; sub: string; brand: string; family: string; famName: string; size: string | null;
  std: string | null; mat: MatKey | null; d: number | null; len: number | null;
  pack: number; unit: string; tier: boolean; price: number;
  specs: string[]; blurb: string[]; spec_table: [string, string][]; art: ArtSpec; kg?: number;
}

export const NEW_BRANDS = [
  { slug: 'brezo', name: 'Brezo', country: 'ES' }, { slug: 'fjordline', name: 'Fjordline', country: 'NO' }, { slug: 'mistral-pro', name: 'Mistral Pro', country: 'FR' },
  { slug: 'tatra-works', name: 'Tatra Works', country: 'SK' }, { slug: 'voltaria', name: 'Voltaria', country: 'ES' }, { slug: 'grano', name: 'Grano', country: 'IT' },
  { slug: 'vigil', name: 'Vigil Safety', country: 'NL' },
];
export const NEW_SUBCATEGORIES: [string, string, string][] = [
  ['fasteners', 'threaded-rod', 'Threaded rod'], ['hand-tools', 'screwdrivers', 'Screwdrivers'], ['hand-tools', 'drill-bits', 'Drill bits & hole saws'],
  ['power-tools', 'batteries', 'Batteries & chargers'], ['power-tools', 'saws', 'Saws'], ['power-tools', 'sanders', 'Sanders & multi-tools'],
  ['safety', 'hearing', 'Hearing protection'], ['locks', 'cylinders', 'Door cylinders'], ['abrasives', 'flap-discs', 'Flap discs & brushes'],
  ['electrical', 'cable', 'Cable & wire'], ['electrical', 'switches', 'Switches & power strips'],
];

const BRAND_CODE: Record<string, string> = {
  'forge-pro': 'FGP', alpenfix: 'ALP', nordgrip: 'NRD', 'ferrum-co': 'FER', 'torque-lab': 'TRQ', 'brava-pro': 'BRV', anclatec: 'ANC', vektor: 'VKT', kestrel: 'KST',
  brezo: 'BRZ', fjordline: 'FJD', 'mistral-pro': 'MST', 'tatra-works': 'TAT', voltaria: 'VLT', grano: 'GRN', vigil: 'VGL',
};
// price level of each brand against the line's reference price
const BRAND_LEVEL: Record<string, number> = {
  alpenfix: 1.12, 'torque-lab': 1.15, kestrel: 1.18, 'mistral-pro': 1.1, fjordline: 1.08, brezo: 0.82, 'tatra-works': 0.8,
};

/** Retail-style price: one decimal, ending in 9. */
export const money = (x: number) => Math.max(0.49, Math.round(x * 10) / 10 - 0.01);
const r2 = (x: number) => Math.round(x * 100) / 100;
const sold = (pack: number, unit: string, tier: boolean) => (tier ? `Box of ${pack}` : pack > 1 ? `Pack of ${pack}` : unit === 'each' ? 'Sold individually' : `Sold per ${unit}`);

export function buildRanges(brandName: Record<string, string>): RangeItem[] {
  const out: RangeItem[] = [];

  /* ---------- bolts and screws: all sizes, finishes and packs ---------- */
  const L_STD = [6, 8, 10, 12, 16, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 90, 100, 110, 120, 130, 140, 150, 160, 180, 200];
  const WOOD_L = [12, 16, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120];
  const DIAMS: Record<BoltType, number[]> = { hex: [4, 5, 6, 8, 10, 12, 14, 16, 20, 24], socket: [3, 4, 5, 6, 8, 10, 12, 16, 20], flat: [3, 4, 5, 6, 8, 10, 12, 16], wood: [3, 3.5, 4, 4.5, 5, 6] };
  const MATS: Record<BoltType, MatKey[]> = { hex: ['A2', 'A4', 'ZN', 'HG'], socket: ['BK', 'A2', 'A4', 'ZN'], flat: ['A2', 'BK', 'ZN', 'A4'], wood: ['ZY', 'A2'] };
  const BRAND: Record<BoltType, string> = { hex: 'forge-pro', socket: 'alpenfix', flat: 'torque-lab', wood: 'forge-pro' };
  const maxL = (t: BoltType | 'hex931', d: number) =>
    t === 'wood' ? Math.min(120, d * 20)
      : t === 'flat' ? (d <= 4 ? 40 : d === 5 ? 50 : d === 6 ? 80 : d === 8 ? 100 : 120)
        : d <= 3 ? 30 : d === 4 ? 40 : d === 5 ? 60 : d === 6 ? 120 : d === 8 ? 140 : d <= 12 ? 160 : 200;
  const minL = (t: BoltType | 'hex931', d: number) => (t === 'wood' ? Math.max(12, 3 * d) : t === 'hex931' ? Math.max(30, 4 * d) : t === 'hex' ? Math.max(10, 2 * d) : Math.max(6, 1.5 * d));
  const boxOf = (t: BoltType, d: number, L: number) =>
    t === 'wood' ? (d <= 4.5 && L <= 50 ? 200 : 100) : d <= 6 ? (L <= 30 ? 200 : 100) : d === 8 ? (L <= 80 ? 100 : 50) : d <= 12 ? (L <= 80 ? 50 : 25) : d <= 16 ? 25 : 10;

  const bolt = (t: BoltType, mat: MatKey, d: number, L: number, partial: boolean, brand: string) => {
    const pack = boxOf(t, d, L);
    const g = GEO[t](d);
    const ref = partial ? `SF-931-${mat}-${d}x${L}` : refOf(t, mat, d, L);
    const norm = partial ? 'DIN 931' : TYPES[t].norm;
    const iso = partial ? 'ISO 4014' : TYPES[t].iso;
    const name = partial ? `Hex bolt part thread DIN 931 M${d} × ${L} mm ${MATNAME[mat]}` : boltTitle(t, mat, d, L);
    const thread = t === 'wood' ? 'Full thread' : partial || t === 'socket' || (t === 'flat' && L > 40) ? 'Partial thread' : 'Full thread';
    const driveLabel = t === 'hex' ? 'Spanner AF' : t === 'wood' ? 'Drive' : 'Hex key';
    const driveVal = t === 'hex' ? g.key + ' mm' : t === 'wood' ? pzFor(d) : g.key + ' mm';
    const kg = boltBoxWeight(t, d, L, pack);
    const price = r2(Math.max(3.5, priceBolt(t, mat, d, L) * (partial ? 1.06 : 1) * (pack / packOf(t))));
    const lead = partial
      ? 'Hex head with a plain shank under the head and a coarse metric thread at the end, for shear joints.'
      : t === 'wood' ? 'Full thread with a self-drilling point for chipboard and softwood.' : t === 'socket' ? 'Cylindrical head with internal hex. Partial thread for high-load joints.' : t === 'flat' ? 'Countersunk head with internal hex, sits flush with the part.' : 'Full thread, coarse metric pitch. Hex head with sharp edges.';
    const fam = partial ? 'bolt-hex931' : 'bolt-' + t;
    const base: RangeItem = {
      ref, name, category: 'fasteners', sub: TYPES[t].slug, brand, family: fam, famName: partial ? 'Hex bolt DIN 931' : '', size: null,
      std: norm, mat, d, len: L, pack, unit: 'box', tier: true, price,
      specs: [`${thread} ${tl(t, d)}`, MATGRADE[mat], `Box of ${pack}`],
      blurb: [lead, MATDESC[mat], `Sold in boxes of ${pack} with batch traceability.`],
      spec_table: [
        ['Standard', norm + (iso ? ' / ' + iso : '')], ['Thread', tl(t, d) + (t === 'wood' ? ' mm' : '')], ['Pitch', t === 'wood' ? '—' : PITCH[d] + ' mm'],
        ['Length', L + ' mm'], ...(partial ? [['Thread length', Math.min(L, 2 * d + 6) + ' mm'] as [string, string]] : []),
        ['Head', (t === 'hex' ? 'Hexagonal' : t === 'socket' ? 'Cylindrical' : t === 'flat' ? 'Countersunk 90°' : 'Countersunk') + ', k = ' + g.k + ' mm'],
        [driveLabel, driveVal], ['Head diameter', g.hw + ' mm'], ['Material', cap(MATNAME[mat])], ['Strength', MATGRADE[mat]], ['Pieces per box', String(pack)],
      ],
      art: { kind: 'bolt', t, mat, d, L, ...(partial ? { pt: true } : {}), ...(pack !== packOf(t) ? { n: pack } : {}) },
      kg,
    };
    out.push(base);
    // trade bulk boxes of the fast movers
    if (!partial && d <= 10 && L <= 80 && (mat === 'ZN' || mat === 'A2' || mat === 'ZY')) {
      const n = t === 'wood' ? 1000 : 500;
      out.push({
        ...base, ref: ref + '-B' + n, name: name + `, bulk box of ${n}`, family: fam + '-bulk', famName: TYPES[t].name + (t === 'wood' ? '' : ' ' + norm) + ', bulk boxes',
        pack: n, price: r2(price / pack * n * 0.86), specs: [`${thread} ${tl(t, d)}`, MATGRADE[mat], `Bulk box of ${n}`],
        blurb: [lead, MATDESC[mat], `Bulk box of ${n} for production and site use, about 14 % less per piece than standard boxes.`],
        spec_table: base.spec_table.map(([k, v]) => (k === 'Pieces per box' ? [k, String(n)] : [k, v])), art: { ...base.art, n }, kg: Math.round((kg / pack) * n * 1000) / 1000,
      });
    }
    // small packs for home use: common finishes and sizes only
    if (d <= 12 && L <= 120 && mat !== 'HG' && !(mat === 'A4' && d < 5)) {
      const n = t === 'wood' ? 25 : d <= 5 ? 20 : 10;
      const unitPrice = price / pack;
      out.push({
        ...base,
        ref: ref + '-P' + n,
        name: name + `, pack of ${n}`,
        family: fam + '-diy', famName: (partial ? 'Hex bolt DIN 931' : TYPES[t].name + (t === 'wood' ? '' : ' ' + norm)) + ', small packs',
        pack: n, unit: 'pack', tier: false,
        price: money(unitPrice * n * 1.9 + 0.6),
        specs: [`${thread} ${tl(t, d)}`, MATGRADE[mat], `Pack of ${n}`],
        blurb: [lead, MATDESC[mat], `Resealable pack of ${n} with the size printed on the front.`],
        spec_table: base.spec_table.map(([k, v]) => (k === 'Pieces per box' ? ['Pieces per pack', String(n)] : [k, v])),
        art: { ...base.art, n },
        kg: Math.round((kg / pack) * n * 1000) / 1000,
      });
    }
  };

  for (const t of Object.keys(TYPES) as BoltType[]) {
    for (const mat of MATS[t]) for (const d of DIAMS[t]) {
      if (mat === 'HG' && d < 8) continue;
      for (const L of t === 'wood' ? WOOD_L : L_STD) if (L >= minL(t, d) && L <= maxL(t, d)) bolt(t, mat, d, L, false, BRAND[t]);
    }
  }
  for (const mat of ['ZN', 'A2', 'A4', 'HG'] as MatKey[]) for (const d of [6, 8, 10, 12, 16, 20, 24]) {
    if (mat === 'HG' && d < 8) continue;
    for (const L of L_STD) if (L >= minL('hex931', d) && L <= maxL('hex931', d) && L % 10 === 0) bolt('hex', mat, d, L, true, 'forge-pro');
  }
  // structural timber screws, Torx drive
  for (const mat of ['ZY', 'A2'] as MatKey[]) for (const d of [6, 8, 10]) for (const L of [80, 100, 120, 140, 160, 180, 200, 240, 280, 300, 360, 400]) {
    if (L > d * 45 || (mat === 'A2' && L > 200)) continue;
    const pack = d === 6 ? 100 : 50;
    const tx = d === 6 ? 'TX30' : d === 8 ? 'TX40' : 'TX50';
    const ref = `SF-TCS-${mat}-${d}x${L}`;
    const kg = boltBoxWeight('wood', d, L, pack);
    out.push({
      ref, name: `Timber construction screw ${tx} Ø${d} × ${L} mm ${MATNAME[mat]}`, category: 'fasteners', sub: 'wood-screws', brand: 'alpenfix', family: 'screw-timber', famName: 'Timber construction screw, Torx',
      size: null, std: 'ETA-11/0190', mat, d, len: L, pack, unit: 'box', tier: true,
      price: r2(Math.max(6, 0.0042 * d * d * L * (mat === 'A2' ? 2.4 : 1) * pack / 10)),
      specs: [`Partial thread Ø${d}`, tx + ' drive', `Box of ${pack}`],
      blurb: ['Wafer head and partial thread pull timber joints tight without pre-drilling.', MATDESC[mat], `Sold in boxes of ${pack} with a matching ${tx} bit.`],
      spec_table: [['Approval', 'ETA-11/0190'], ['Thread', 'Ø' + d + ' mm'], ['Length', L + ' mm'], ['Thread length', Math.round(L * 0.6) + ' mm'], ['Head', 'Wafer, Ø' + Math.round(d * 2.5) + ' mm'], ['Drive', tx], ['Material', cap(MATNAME[mat])], ['Pieces per box', String(pack)]],
      art: { kind: 'bolt', t: 'wood', mat, d, L, pt: true, n: pack }, kg,
    });
  }

  /* ---------- nuts and washers ---------- */
  const ND = [3, 4, 5, 6, 8, 10, 12, 14, 16, 20, 24];
  const AF: Record<number, number> = { 3: 5.5, 4: 7, 5: 8, 6: 10, 8: 13, 10: 16, 12: 18, 14: 22, 16: 24, 20: 30, 24: 36 };
  const NH: Record<number, number> = { 3: 2.4, 4: 3.2, 5: 4, 6: 5, 8: 6.5, 10: 8, 12: 10, 14: 11, 16: 13, 20: 16, 24: 19 };
  const nutPack = (d: number) => (d <= 5 ? 200 : d <= 8 ? 100 : d <= 12 ? 50 : d <= 16 ? 25 : 10);
  const NUTS: { code: string; label: string; iso: string; mats: MatKey[]; ds: number[]; f: number; lead: string; h: (d: number) => number }[] = [
    { code: '934', label: 'Hex nut', iso: 'ISO 4032', mats: ['A2', 'A4', 'ZN', 'HG'], ds: ND, f: 1, lead: 'Standard hexagon nut for metric bolts and threaded rod.', h: (d) => NH[d] },
    { code: '985', label: 'Nylon-insert lock nut', iso: 'ISO 10511', mats: ['A2', 'A4', 'ZN'], ds: ND, f: 1.2, lead: 'Nylon insert locks the nut against vibration. Reusable a few times.', h: (d) => NH[d] + 4 },
    { code: '1587', label: 'Dome nut', iso: '', mats: ['A2', 'ZN'], ds: [4, 5, 6, 8, 10, 12, 16], f: 1.9, lead: 'Closed dome covers the bolt end for a neat, safe finish.', h: (d) => Math.round(NH[d] * 1.9) },
    { code: '6923', label: 'Serrated flange nut', iso: 'ISO 4161', mats: ['A2', 'ZN'], ds: [5, 6, 8, 10, 12, 16], f: 1.5, lead: 'Integrated serrated flange spreads the load and resists loosening, no washer needed.', h: (d) => NH[d] },
    { code: '439', label: 'Thin hex nut', iso: 'ISO 4035', mats: ['A2', 'ZN'], ds: ND, f: 0.8, lead: 'Half-height nut for lock-nutting and tight spaces.', h: (d) => Math.round(NH[d] * 0.55 * 10) / 10 },
    { code: '315', label: 'Wing nut', iso: '', mats: ['A2', 'ZN'], ds: [4, 5, 6, 8, 10, 12], f: 2.4, lead: 'Wings for tightening by hand, for joints that are opened often.', h: (d) => Math.round(d * 2.2) },
  ];
  const famNameOf = (code: string, label: string) => `${label} DIN ${code}`;
  for (const n of NUTS) for (const mat of n.mats) for (const d of n.ds) {
    if (mat === 'HG' && d < 8) continue;
    const pack = nutPack(d);
    const ref = `SF-${n.code}-${mat}-${d}`;
    const price = r2(Math.max(3.2, priceNut(n.code === '985' ? 'lock' : 'nut', mat, d) * (n.code === '985' ? 1 : n.f) * (pack / 100)));
    const base: RangeItem = {
      ref, name: `${n.label} DIN ${n.code} M${d} ${MATNAME[mat]}`, category: 'fasteners', sub: 'nuts', brand: 'forge-pro', family: 'nut-' + n.code, famName: famNameOf(n.code, n.label), size: null,
      std: 'DIN ' + n.code, mat, d, len: null, pack, unit: 'box', tier: true, price,
      specs: [n.code === '985' ? 'Nylon insert' : n.code === '6923' ? 'Serrated flange' : 'Metric coarse thread', MATGRADE[mat], `Box of ${pack}`],
      blurb: [n.lead, MATDESC[mat], `Sold in boxes of ${pack} with batch traceability.`],
      spec_table: [['Standard', 'DIN ' + n.code + (n.iso ? ' / ' + n.iso : '')], ['Thread', 'M' + d], ['Pitch', PITCH[d] + ' mm'], ['Spanner size (AF)', AF[d] + ' mm'], ['Height', n.h(d) + ' mm'], ['Material', cap(MATNAME[mat])], ['Strength', MATGRADE[mat]], ['Pieces per box', String(pack)]],
      art: { kind: 'nut', mat, d },
    };
    out.push(base);
    if (d >= 4 && d <= 12 && (mat === 'A2' || mat === 'ZN')) {
      const k = d <= 6 ? 20 : 10;
      out.push({ ...base, ref: ref + '-P' + k, name: base.name + `, pack of ${k}`, family: 'nut-' + n.code + '-diy', famName: famNameOf(n.code, n.label) + ', small packs', pack: k, unit: 'pack', tier: false,
        price: money((price / pack) * k * 2.2 + 0.5), specs: [base.specs[0], base.specs[1], `Pack of ${k}`], blurb: [n.lead, MATDESC[mat], `Resealable pack of ${k} with the size printed on the front.`],
        spec_table: base.spec_table.map(([a, b]) => (a === 'Pieces per box' ? ['Pieces per pack', String(k)] : [a, b])) });
    }
  }
  const WID: Record<number, number> = { 3: 3.2, 4: 4.3, 5: 5.3, 6: 6.4, 8: 8.4, 10: 10.5, 12: 13, 14: 15, 16: 17, 20: 21, 24: 25 };
  const WOD: Record<number, number> = { 3: 7, 4: 9, 5: 10, 6: 12, 8: 16, 10: 20, 12: 24, 14: 28, 16: 30, 20: 37, 24: 44 };
  const WTH: Record<number, number> = { 3: 0.5, 4: 0.8, 5: 1, 6: 1.6, 8: 1.6, 10: 2, 12: 2.5, 14: 2.5, 16: 3, 20: 3, 24: 4 };
  const washPack = (d: number) => (d <= 6 ? 500 : d <= 8 ? 200 : d <= 12 ? 100 : d <= 16 ? 50 : 25);
  const WASHERS: { code: string; label: string; iso: string; mats: MatKey[]; ds: number[]; f: number; lead: string; od: (d: number) => number; th: (d: number) => number }[] = [
    { code: '125', label: 'Flat washer', iso: 'ISO 7089', mats: ['A2', 'A4', 'ZN', 'HG'], ds: ND, f: 1, lead: 'Spreads the load of a nut or bolt head over a larger area.', od: (d) => WOD[d], th: (d) => WTH[d] },
    { code: '9021', label: 'Large flat washer', iso: 'ISO 7093', mats: ['A2', 'A4', 'ZN'], ds: [4, 5, 6, 8, 10, 12, 16, 20], f: 1.5, lead: 'Outer diameter of three times the thread, for soft materials and oversized holes.', od: (d) => d * 3, th: (d) => Math.max(1, Math.round(d * 0.2 * 10) / 10) },
    { code: '127', label: 'Spring washer', iso: '', mats: ['A2', 'ZN'], ds: [4, 5, 6, 8, 10, 12, 16, 20], f: 1.2, lead: 'Split spring ring keeps tension on the joint under vibration.', od: (d) => Math.round(d * 1.8), th: (d) => Math.round(d * 0.25 * 10) / 10 },
    { code: '6798', label: 'Toothed lock washer', iso: '', mats: ['A2', 'ZN'], ds: [3, 4, 5, 6, 8, 10, 12], f: 1.4, lead: 'External teeth bite into the part and the nut to stop rotation.', od: (d) => Math.round(d * 1.9), th: (d) => Math.round(d * 0.12 * 10) / 10 + 0.3 },
    { code: '440', label: 'Timber washer, square hole', iso: 'ISO 7094', mats: ['ZN', 'HG'], ds: [10, 12, 16, 20, 24], f: 2.6, lead: 'Thick wide washer for carriage bolts in timber construction.', od: (d) => d * 3.5, th: (d) => Math.round(d * 0.4) },
  ];
  for (const w of WASHERS) for (const mat of w.mats) for (const d of w.ds) {
    if (mat === 'HG' && d < 8) continue;
    const pack = washPack(d) / (w.code === '440' ? 4 : 1);
    const ref = `SF-${w.code}-${mat}-${d}`;
    const price = r2(Math.max(3.2, priceWasher(mat, d) * w.f * (pack / 200)));
    const base: RangeItem = {
      ref, name: `${w.label} DIN ${w.code} M${d} ${MATNAME[mat]}`, category: 'fasteners', sub: 'washers', brand: 'forge-pro', family: 'washer-' + w.code, famName: `${w.label} DIN ${w.code}`, size: null,
      std: 'DIN ' + w.code, mat, d, len: null, pack, unit: 'box', tier: true, price,
      specs: [`Ø ${WID[d]} × ${w.od(d)} × ${w.th(d)} mm`, MATGRADE[mat].replace('class', 'HV'), `Box of ${pack}`],
      blurb: [w.lead, MATDESC[mat], `Sold in boxes of ${pack} with batch traceability.`],
      spec_table: [['Standard', 'DIN ' + w.code + (w.iso ? ' / ' + w.iso : '')], ['For thread', 'M' + d], ['Inner diameter', WID[d] + ' mm'], ['Outer diameter', w.od(d) + ' mm'], ['Thickness', w.th(d) + ' mm'], ['Material', cap(MATNAME[mat])], ['Pieces per box', String(pack)]],
      art: { kind: 'washer', mat, d },
    };
    out.push(base);
    if (d >= 4 && d <= 12 && (mat === 'A2' || mat === 'ZN') && w.code !== '440') {
      const k = d <= 6 ? 30 : 20;
      out.push({ ...base, ref: ref + '-P' + k, name: base.name + `, pack of ${k}`, family: 'washer-' + w.code + '-diy', famName: `${w.label} DIN ${w.code}, small packs`, pack: k, unit: 'pack', tier: false,
        price: money((price / pack) * k * 2.4 + 0.5), specs: [base.specs[0], base.specs[1], `Pack of ${k}`], blurb: [w.lead, MATDESC[mat], `Resealable pack of ${k} with the size printed on the front.`],
        spec_table: base.spec_table.map(([a, b]) => (a === 'Pieces per box' ? ['Pieces per pack', String(k)] : [a, b])) });
    }
  }

  /* ---------- threaded rod ---------- */
  const ROD_M: Partial<Record<MatKey, number>> = { ZN: 0.35, A2: 1, A4: 1.45, HG: 0.55 };
  for (const mat of ['ZN', 'A2', 'A4', 'HG'] as MatKey[]) for (const d of [4, 5, 6, 8, 10, 12, 14, 16, 20, 24]) for (const L of [300, 500, 1000, 2000]) {
    if ((mat === 'HG' && d < 8) || (L < 1000 && d > 12) || (L === 2000 && d < 6)) continue;
    const ref = `SF-976-${mat}-${d}x${L}`;
    const kg = Math.round(Math.PI * Math.pow(d * 0.92 / 20, 2) * (L / 10) * 7.9) / 1000;
    out.push({
      ref, name: `Threaded rod DIN 976 M${d} × ${L} mm ${MATNAME[mat]}`, category: 'fasteners', sub: 'threaded-rod', brand: 'forge-pro', family: 'rod-976', famName: 'Threaded rod DIN 976', size: null,
      std: 'DIN 976', mat, d, len: L, pack: 1, unit: 'each', tier: false,
      price: money(Math.max(0.9, 6.5 * (ROD_M[mat] ?? 1) * Math.pow(d / 8, 1.8) * (L / 1000) + 0.3)),
      specs: [`M${d} × ${PITCH[d]}`, `${L} mm long`, MATGRADE[mat]],
      blurb: ['Threaded along its full length. Cut to size for anchors, hangers and through-fixings.', MATDESC[mat], L >= 1000 ? 'Sold individually, shipped in protective tubes.' : 'Sold individually, cut and deburred.'],
      spec_table: [['Standard', 'DIN 976-1'], ['Thread', 'M' + d], ['Pitch', PITCH[d] + ' mm'], ['Length', L + ' mm'], ['Material', cap(MATNAME[mat])], ['Strength', MATGRADE[mat]]],
      art: { kind: 'rod', mat, d }, kg,
    });
  }

  /* ---------- product lines from several brands ---------- */
  interface V { k: string; size: string; name: string; price: number; pack?: number; unit?: string; tier?: boolean; sp: [string, string, string]; f: Record<string, string>; color?: string; lead?: string }
  function line(o: { fam: string; famName: string; c: string; s: string; kind: string; code: string; brands: string[]; variants: V[]; color?: string }) {
    for (const b of o.brands) {
      for (const v of o.variants) {
        const pack = v.pack ?? 1, unit = v.unit ?? 'each', tier = v.tier ?? false;
        const ref = `SF-${o.code}-${BRAND_CODE[b]}-${v.k}`.toUpperCase().replace(/(\d)X(\d)/g, '$1x$2');
        out.push({
          ref, name: `${brandName[b]} ${v.name}`, category: o.c, sub: o.s, brand: b, family: `${o.fam}-${b}`, famName: `${brandName[b]} ${o.famName}`, size: v.size,
          std: null, mat: null, d: null, len: null, pack, unit, tier,
          price: money(v.price * (BRAND_LEVEL[b] ?? 1)),
          specs: v.sp,
          blurb: [v.lead ?? v.sp[0] + '.', v.sp[1] + '.', tier ? `Sold in boxes of ${pack}. Volume price breaks apply.` : `${sold(pack, unit, tier)}. Genuine ${brandName[b]} product.`],
          spec_table: [...Object.entries(v.f), ['Brand', brandName[b]], ['Sold as', sold(pack, unit, tier)]],
          art: { kind: o.kind, ...(v.color ?? o.color ? { color: v.color ?? o.color } : {}) },
        });
      }
    }
  }
  const grid = <A, B>(as: A[], bs: B[]) => as.flatMap((a) => bs.map((b) => [a, b] as [A, B]));
  const COLORS: Record<string, string> = {
    black: '#2A3036', white: '#F4F1EA', grey: '#9AA3AA', red: '#C9300C', blue: '#1F5FBF', yellow: '#F2B705', orange: '#E8761B', green: '#0B7A6E',
    brown: '#7A4E2D', natural: '#E9E2CF', anthracite: '#3B4348', 'green-yellow': '#9BBF2A', brass: '#C9A23A', nickel: '#BCC5CC', chrome: '#C7CDD2', satin: '#B9C0C6', zinc: '#C7CDD2', stainless: '#D3D8DC',
  };
  const CC: Record<string, string> = { black: 'BK', white: 'WH', grey: 'GY', red: 'RD', blue: 'BL', yellow: 'YE', green: 'GN', brown: 'BN', 'green-yellow': 'GNYE', natural: 'NT', orange: 'OR' };

  /* anchors */
  const plugSizes = (list: string[], base: number, perBox: (d: number) => number) => list.flatMap((sz) => {
    const [d, l] = sz.split('x').map(Number);
    const box = perBox(d);
    const p = base * Math.pow(d / 8, 1.6) * (l / (d * 5));
    return [
      { k: sz, size: `${d} × ${l} mm, box of ${box}`, name: '', price: p * (box / 100), pack: box, unit: 'box', tier: true, d, l, box },
      { k: sz + '-P20', size: `${d} × ${l} mm, pack of 20`, name: '', price: (p / 100) * 20 * 2.3 + 0.6, pack: 20, unit: 'pack', tier: false, d, l, box: 20 },
    ];
  });
  for (const [fam, famName, code, sizes, base, sub, color, brands] of [
    ['plug-nylon', 'Nylon wall plug with collar', 'NYP', ['5x25', '6x30', '6x40', '8x40', '8x50', '10x50', '10x60', '12x60', '12x70', '14x70', '14x75', '16x80'], 6.2, 'For concrete and brick', undefined, ['anclatec', 'alpenfix', 'brezo', 'tatra-works']],
    ['plug-universal', 'Universal plug for all substrates', 'UNP', ['5x25', '6x30', '6x50', '8x40', '8x50', '8x65', '10x50', '10x60', '10x80', '12x70'], 7.4, 'For solid and hollow walls', '#C9C4B3', ['anclatec', 'alpenfix', 'brezo', 'tatra-works']],
    ['plug-hollow', 'Hollow-wall expansion plug', 'HWP', ['5x37', '6x45', '6x52', '8x55', '8x60', '10x65'], 9.5, 'For hollow brick and plasterboard', '#E8761B', ['anclatec', 'tatra-works']],
    ['plug-frame', 'Long frame plug', 'FRP', ['8x80', '8x100', '8x120', '10x100', '10x115', '10x135', '10x160', '10x200'], 14, 'For window and door frames', '#9AA3AA', ['alpenfix', 'anclatec']],
  ] as [string, string, string, string[], number, string, string | undefined, string[]][]) {
    line({ fam, famName, c: 'anchors', s: 'wall-plugs', kind: 'anchor', code, brands, color, variants: plugSizes(sizes, base, (d) => (d <= 6 ? 100 : d <= 10 ? 50 : 25)).map((v) => ({
      ...v, name: `${famName.toLowerCase()} ${v.d} × ${v.l} mm, ${v.tier ? 'box' : 'pack'} of ${v.pack}`,
      sp: [sub, `Ø ${v.d} × ${v.l} mm`, v.tier ? `Box of ${v.pack}` : `Pack of ${v.pack}`],
      f: { 'Diameter': v.d + ' mm', 'Length': v.l + ' mm', 'Screw size': `${Math.max(3, v.d - 2)}–${v.d - 1} mm`, 'Drill bit': 'Ø' + v.d + ' mm', 'Substrate': sub.replace('For ', '') },
    })) });
  }
  line({ fam: 'plug-plasterboard', famName: 'Self-drill plasterboard anchor', c: 'anchors', s: 'wall-plugs', kind: 'anchor', code: 'PBA', brands: ['anclatec', 'alpenfix'],
    variants: grid(['nylon', 'zinc'], [['S', 12, 32], ['M', 15, 37], ['L', 15, 45]] as [string, number, number][]).flatMap(([m, [sz, d, l]]) => [25, 100].map((n) => ({
      k: `${m[0]}${sz}-${n}`, size: `${cap(m)} ${sz}, ${n} pcs`, name: `self-drill plasterboard anchor ${m} ${d} × ${l} mm, ${n === 100 ? 'box' : 'pack'} of ${n}`,
      price: (m === 'zinc' ? 0.24 : 0.14) * n * (n === 25 ? 1.5 : 1) * (l / 37), pack: n, unit: n === 100 ? 'box' : 'pack', tier: n === 100, color: m === 'zinc' ? '#C7CDD2' : '#F4F1EA',
      sp: ['For 9.5–12.5 mm plasterboard', `${cap(m)}, Ø ${d} × ${l} mm`, n === 100 ? 'Box of 100' : 'Pack of 25'] as [string, string, string],
      f: { 'Material': cap(m), 'Size': `${d} × ${l} mm`, 'Board thickness': '9.5–12.5 mm', 'Screw size': '4–4.5 mm', 'Max load': m === 'zinc' ? '25 kg' : '15 kg' },
    }))) });
  const anchorVariants = (code: string, label: string, sizes: [number, number[]][], fin: string[], base: number, extra: Record<string, string>) =>
    sizes.flatMap(([d, lens]) => lens.flatMap((l) => fin.map((f) => {
      const box = d <= 8 ? 50 : d <= 12 ? 25 : 10;
      return {
        k: `${f === 'A4' ? 'A4' : 'ZN'}-${d}x${l}`, size: `M${d} × ${l} mm, ${f === 'A4' ? 'A4 stainless' : 'zinc plated'}`, name: `${label} M${d} × ${l} mm, ${f === 'A4' ? 'A4 stainless' : 'zinc plated'}`,
        price: base * Math.pow(d / 10, 1.7) * (l / (d * 9)) * (f === 'A4' ? 2.6 : 1) * (box / 20), pack: box, unit: 'box', tier: true, color: f === 'A4' ? '#D3D8DC' : '#C7CDD2',
        sp: [code, `M${d} × ${l} mm`, `Box of ${box}`] as [string, string, string],
        f: { 'Thread': 'M' + d, 'Length': l + ' mm', 'Drill bit': 'Ø' + (d + (code === 'Sleeve anchor' ? 2 : 0)) + ' mm', 'Finish': f === 'A4' ? 'A4 stainless steel' : 'Zinc plated', ...extra },
      };
    })));
  line({ fam: 'anchor-wedge', famName: 'Wedge anchor (through bolt)', c: 'anchors', s: 'frame-anchors', kind: 'anchor', code: 'WDG', brands: ['alpenfix', 'anclatec', 'tatra-works', 'brezo'],
    variants: anchorVariants('Through-fixing in concrete', 'wedge anchor', [[6, [55, 85]], [8, [75, 95, 115]], [10, [90, 120, 140]], [12, [100, 120, 160]], [16, [125, 145, 180]]], ['ZN', 'A4'], 21, { 'Substrate': 'Uncracked concrete', 'Approval': 'ETA option 7' }) });
  line({ fam: 'anchor-sleeve', famName: 'Sleeve anchor with hex nut', c: 'anchors', s: 'frame-anchors', kind: 'anchor', code: 'SLV', brands: ['alpenfix', 'brezo'], color: '#C7CDD2',
    variants: anchorVariants('Sleeve anchor', 'sleeve anchor', [[6, [40, 60]], [8, [60, 80, 100]], [10, [80, 100, 120]], [12, [100, 120]]], ['ZN'], 17, { 'Substrate': 'Concrete, solid brick, stone' }) });
  line({ fam: 'anchor-dropin', famName: 'Drop-in anchor', c: 'anchors', s: 'frame-anchors', kind: 'anchor', code: 'DRP', brands: ['alpenfix', 'anclatec'],
    variants: anchorVariants('Flush anchor for threaded rod', 'drop-in anchor', [[6, [25]], [8, [30]], [10, [40]], [12, [50]], [16, [65]]], ['ZN', 'A4'], 19, { 'Substrate': 'Concrete', 'Setting tool': 'Required' }) });
  line({ fam: 'anchor-screw', famName: 'Concrete screw anchor', c: 'anchors', s: 'frame-anchors', kind: 'anchor', code: 'CSA', brands: ['alpenfix', 'anclatec', 'tatra-works'], color: '#BCC5CC',
    variants: [6, 8, 10, 12].flatMap((d) => [d * 6, d * 8, d * 10].flatMap((l) => ['hex', 'countersunk'].map((h) => ({
      k: `${h[0].toUpperCase()}-${d}x${l}`, size: `Ø${d} × ${l} mm, ${h} head`, name: `concrete screw anchor Ø${d} × ${l} mm, ${h} head`,
      price: 16 * Math.pow(d / 8, 1.7) * (l / 64) * (d <= 8 ? 2.5 : 1), pack: d <= 8 ? 50 : 20, unit: 'box', tier: true,
      sp: ['Screw directly into concrete', `Ø${d} × ${l} mm`, `Box of ${d <= 8 ? 50 : 20}`] as [string, string, string],
      f: { 'Diameter': d + ' mm', 'Length': l + ' mm', 'Head': h === 'hex' ? `Hex with flange, AF ${d + 5}` : 'Countersunk, TX40', 'Drill bit': 'Ø' + (d - 2) + ' mm', 'Substrate': 'Concrete, masonry' },
    })))) });
  line({ fam: 'resin', famName: 'Injection resin cartridge', c: 'anchors', s: 'chemical-fixings', kind: 'cartridge', code: 'RSN', brands: ['alpenfix', 'anclatec', 'brezo', 'tatra-works'],
    variants: grid([['PES', 'polyester, styrene-free', '#7A8A99', 1], ['VE', 'vinylester', '#1F5FBF', 1.35], ['EA', 'epoxy acrylate', '#0B7A6E', 1.6], ['EP', 'pure epoxy', '#C9300C', 2.4]] as [string, string, string, number][], [150, 300, 410]).map(([[c, label, col, f], ml]) => ({
      k: `${c}-${ml}`, size: `${cap(label)}, ${ml} ml`, name: `injection resin ${label} ${ml} ml`, price: 9.5 * f * Math.pow(ml / 300, 0.9), color: col,
      sp: [c === 'EP' ? 'For heavy loads and rebar' : 'For anchors in concrete and masonry', `${ml} ml cartridge`, c === 'EP' ? 'Cracked concrete approved' : 'Fast curing'] as [string, string, string],
      f: { 'Resin': cap(label), 'Volume': ml + ' ml', 'Gun': ml === 410 ? 'Coaxial, 410 ml' : 'Standard silicone gun', 'Curing time at 20 °C': c === 'EP' ? '10 h' : c === 'PES' ? '45 min' : '60 min', 'Shelf life': '18 months' },
    })) });
  line({ fam: 'mesh-sleeve', famName: 'Mesh sleeve for hollow masonry', c: 'anchors', s: 'chemical-fixings', kind: 'anchor', code: 'MSH', brands: ['alpenfix', 'anclatec'], color: '#9AA3AA',
    variants: grid([12, 16, 20], [50, 85, 130]).map(([d, l]) => ({ k: `${d}x${l}`, size: `Ø${d} × ${l} mm`, name: `mesh sleeve Ø${d} × ${l} mm, pack of 10`, price: 0.6 * d * (l / 85), pack: 10, unit: 'pack',
      sp: ['Holds resin in hollow brick', `Ø${d} × ${l} mm`, 'Pack of 10'] as [string, string, string], f: { 'Diameter': d + ' mm', 'Length': l + ' mm', 'Drill bit': 'Ø' + (d + 2) + ' mm', 'Material': 'Plastic mesh' } })) });
  line({ fam: 'anchor-rod', famName: 'Anchor rod with nut and washer', c: 'anchors', s: 'chemical-fixings', kind: 'rod', code: 'ARD', brands: ['alpenfix', 'anclatec'],
    variants: grid([8, 10, 12, 16, 20], ['ZN', 'A4']).flatMap(([d, f]) => [d * 14, d * 20].map((l) => ({ k: `${f}-${d}x${l}`, size: `M${d} × ${l} mm, ${f === 'A4' ? 'A4' : 'zinc'}`, name: `anchor rod M${d} × ${l} mm, ${f === 'A4' ? 'A4 stainless' : 'zinc plated'}, pack of 10`,
      price: 1.1 * Math.pow(d / 8, 1.8) * (l / 110) * 10 * (f === 'A4' ? 3 : 1), pack: 10, unit: 'pack', color: f === 'A4' ? '#D3D8DC' : '#BCC5CC',
      sp: ['For injection resin', `M${d} × ${l} mm`, 'Pack of 10 with nuts and washers'] as [string, string, string], f: { 'Thread': 'M' + d, 'Length': l + ' mm', 'Finish': f === 'A4' ? 'A4 stainless steel' : 'Zinc plated, class 5.8', 'Embedment depth': Math.round(l * 0.7) + ' mm' } }))) });
  line({ fam: 'nozzle', famName: 'Static mixer nozzles', c: 'anchors', s: 'chemical-fixings', kind: 'cartridge', code: 'NZL', brands: ['alpenfix', 'anclatec', 'brezo'], color: '#E7ECF4',
    variants: [['STD', 'standard', 10], ['EXT', 'with extension tube', 5]].map(([k, l, n]) => ({ k: String(k), size: cap(String(l)), name: `static mixer nozzles ${l}, pack of ${n}`, price: 6.5, pack: Number(n), unit: 'pack', sp: ['Fits all resin cartridges', cap(String(l)), `Pack of ${n}`] as [string, string, string], f: { 'Type': cap(String(l)), 'Length': k === 'EXT' ? '380 mm' : '160 mm' } })) });

  /* hand tools */
  const hammerVar: V[] = [
    ...grid([300, 450, 570, 680], ['wood', 'fibreglass', 'steel']).map(([g, h]) => ({ k: `CLW-${g}-${h[0].toUpperCase()}`, size: `Claw ${g} g, ${h}`, name: `claw hammer ${g} g, ${h} handle`, price: 12 + g / 40 + (h === 'steel' ? 6 : h === 'fibreglass' ? 3 : 0), color: h === 'wood' ? '#C69A62' : '#C9300C', sp: [`${g} g head`, `${cap(h)} handle`, 'Magnetic nail starter'] as [string, string, string], f: { 'Head weight': g + ' g', 'Handle': cap(h), 'Length': Math.round(300 + g / 10) + ' mm' } })),
    ...[1000, 1250, 1500, 2000].map((g) => ({ k: `CLB-${g}`, size: `Club ${g / 1000} kg`, name: `club hammer ${g / 1000} kg`, price: 14 + g / 120, sp: [`${g / 1000} kg head`, 'Fibreglass handle', 'Anti-vibration grip'] as [string, string, string], f: { 'Head weight': g + ' g', 'Handle': 'Fibreglass', 'Length': '270 mm' } })),
    ...grid([225, 450, 680, 900], ['black', 'white']).map(([g, c]) => ({ k: `MLT-${g}-${c[0].toUpperCase()}`, size: `Mallet ${g} g, ${c}`, name: `rubber mallet ${g} g, ${c}`, price: 8 + g / 90, color: COLORS[c], sp: [`${g} g rubber head`, c === 'white' ? 'Non-marking' : 'Hard rubber', 'Wooden handle'] as [string, string, string], f: { 'Head weight': g + ' g', 'Head': cap(c) + ' rubber', 'Handle': 'Ash wood' } })),
    ...[200, 300, 450, 680, 900].map((g) => ({ k: `BPN-${g}`, size: `Ball-pein ${g} g`, name: `ball-pein hammer ${g} g`, price: 11 + g / 45, sp: [`${g} g head`, 'Hickory handle', 'Forged, heat treated'] as [string, string, string], f: { 'Head weight': g + ' g', 'Handle': 'Hickory', 'Standard': 'DIN 1041' } })),
    ...[3, 4, 5, 6].map((kg) => ({ k: `SLG-${kg}`, size: `Sledge ${kg} kg`, name: `sledge hammer ${kg} kg`, price: 26 + kg * 5, sp: [`${kg} kg head`, '900 mm fibreglass handle', 'Overstrike guard'] as [string, string, string], f: { 'Head weight': kg + ' kg', 'Handle': 'Fibreglass, 900 mm' } })),
    ...[500, 800, 1000].map((g) => ({ k: `DBL-${g}`, size: `Dead-blow ${g} g`, name: `dead-blow hammer ${g} g`, price: 19 + g / 50, color: '#F2B705', sp: [`${g} g, shot-filled`, 'No rebound', 'Non-marking faces'] as [string, string, string], f: { 'Head weight': g + ' g', 'Faces': 'Polyurethane' } })),
  ];
  line({ fam: 'hammers', famName: 'hammers', c: 'hand-tools', s: 'hammers', kind: 'hammer', code: 'HAM', brands: ['nordgrip', 'ferrum-co', 'tatra-works', 'kestrel'], variants: hammerVar });

  const SPAN = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 30, 32];
  line({ fam: 'spanner-comb', famName: 'combination spanners', c: 'hand-tools', s: 'pliers-spanners', kind: 'wrench', code: 'CSP', brands: ['ferrum-co', 'torque-lab', 'nordgrip', 'tatra-works'],
    variants: grid(SPAN, ['chrome', 'satin']).map(([mm, f]) => ({ k: `${mm}-${f[0].toUpperCase()}`, size: `${mm} mm, ${f}`, name: `combination spanner ${mm} mm, ${f} finish`, price: 4 + mm * 0.55 + (f === 'satin' ? 1.5 : 0), color: COLORS[f],
      sp: [`${mm} mm open and ring end`, '15° offset ring', `Chrome vanadium, ${f}`] as [string, string, string], f: { 'Size': mm + ' mm', 'Length': Math.round(90 + mm * 9.5) + ' mm', 'Material': 'Chrome vanadium steel', 'Finish': cap(f), 'Standard': 'DIN 3113' } })) });
  line({ fam: 'spanner-ratchet', famName: 'ratchet combination spanners', c: 'hand-tools', s: 'pliers-spanners', kind: 'wrench', code: 'RSP', brands: ['torque-lab', 'ferrum-co'],
    variants: [8, 10, 11, 12, 13, 14, 15, 16, 17, 19].map((mm) => ({ k: String(mm), size: `${mm} mm`, name: `ratchet combination spanner ${mm} mm`, price: 9 + mm * 0.7, sp: [`${mm} mm`, '72-tooth ratchet, 5° swing', 'Chrome vanadium'] as [string, string, string], f: { 'Size': mm + ' mm', 'Teeth': '72', 'Material': 'Chrome vanadium steel' } })) });
  line({ fam: 'spanner-set', famName: 'spanner sets', c: 'hand-tools', s: 'pliers-spanners', kind: 'wrench', code: 'SPS', brands: ['ferrum-co', 'torque-lab', 'nordgrip'],
    variants: [6, 8, 12, 22].map((n) => ({ k: String(n), size: `${n} pieces`, name: `combination spanner set, ${n} pieces`, price: 14 + n * 3.4, sp: [`${n} spanners`, n >= 12 ? '6–32 mm' : '8–19 mm', 'Roll-up pouch'] as [string, string, string], f: { 'Pieces': String(n), 'Sizes': n >= 12 ? '6–32 mm' : '8–19 mm', 'Storage': 'Roll-up pouch' } })) });
  const PLIERS: [string, string, number[], number][] = [['CMB', 'combination pliers', [160, 180, 200], 11], ['LNS', 'long-nose pliers', [160, 200], 10], ['DIA', 'diagonal cutters', [140, 160, 180], 10.5], ['WPP', 'water pump pliers', [180, 250, 300], 13], ['LCK', 'locking pliers', [175, 250], 12], ['STR', 'wire stripper', [160], 14]];
  line({ fam: 'pliers', famName: 'pliers', c: 'hand-tools', s: 'pliers-spanners', kind: 'pliers', code: 'PLR', brands: ['nordgrip', 'ferrum-co', 'kestrel', 'tatra-works'],
    variants: PLIERS.flatMap(([k, label, lens, base]) => lens.flatMap((mm) => ['standard', 'VDE 1000 V'].map((ins) => ({ k: `${k}-${mm}${ins === 'standard' ? '' : '-V'}`, size: `${cap(label)} ${mm} mm${ins === 'standard' ? '' : ', VDE'}`, name: `${label} ${mm} mm${ins === 'standard' ? '' : ', VDE insulated'}`,
      price: base + mm / 25 + (ins === 'standard' ? 0 : 8), color: ins === 'standard' ? '#C9300C' : '#F2B705', sp: [`${mm} mm`, ins === 'standard' ? 'Two-component grips' : 'Insulated to 1000 V', 'Induction-hardened edges'] as [string, string, string],
      f: { 'Length': mm + ' mm', 'Insulation': ins === 'standard' ? 'None' : 'VDE, IEC 60900', 'Material': 'Chrome vanadium steel' } })))) });
  line({ fam: 'adj-wrench', famName: 'adjustable wrenches', c: 'hand-tools', s: 'pliers-spanners', kind: 'wrench', code: 'ADJ', brands: ['nordgrip', 'ferrum-co', 'tatra-works'],
    variants: [150, 200, 250, 300].map((mm) => ({ k: String(mm), size: `${mm} mm`, name: `adjustable wrench ${mm} mm`, price: 9 + mm / 15, sp: [`${mm} mm long`, `Opens to ${Math.round(mm / 7.5)} mm`, 'Laser-etched scale'] as [string, string, string], f: { 'Length': mm + ' mm', 'Max opening': Math.round(mm / 7.5) + ' mm' } })) });
  line({ fam: 'hex-keys', famName: 'hex key sets', c: 'hand-tools', s: 'pliers-spanners', kind: 'bits', code: 'HXK', brands: ['torque-lab', 'ferrum-co', 'nordgrip'],
    variants: [['MET9', 'metric hex keys, 9 pieces', 12], ['BALL9', 'ball-end hex keys, 9 pieces', 16], ['TX9', 'Torx keys, 9 pieces', 15], ['TH8', 'T-handle hex keys, 8 pieces', 29]].map(([k, l, p]) => ({ k: String(k), size: cap(String(l)), name: String(l), price: Number(p), sp: [cap(String(l)), '1.5–10 mm', 'Holder included'] as [string, string, string], f: { 'Contents': cap(String(l)), 'Material': 'S2 tool steel' } })) });

  line({ fam: 'tape', famName: 'measuring tapes', c: 'hand-tools', s: 'measuring', kind: 'tape', code: 'TPM', brands: ['nordgrip', 'ferrum-co', 'kestrel', 'tatra-works', 'fjordline'],
    variants: grid([3, 5, 8, 10], ['yellow', 'black', 'orange']).map(([m, c]) => ({ k: `${m}-${c[0].toUpperCase()}`, size: `${m} m, ${c}`, name: `measuring tape ${m} m × ${m <= 3 ? 16 : m <= 5 ? 19 : 25} mm, ${c}`, price: 4 + m * 1.3, color: COLORS[c],
      sp: [`${m} m × ${m <= 3 ? 16 : m <= 5 ? 19 : 25} mm blade`, 'EC class II', 'Belt clip and blade lock'] as [string, string, string], f: { 'Length': m + ' m', 'Blade width': (m <= 3 ? 16 : m <= 5 ? 19 : 25) + ' mm', 'Accuracy': 'EC class II', 'Casing': cap(c) } })) });
  line({ fam: 'tape-long', famName: 'long fibreglass tapes', c: 'hand-tools', s: 'measuring', kind: 'tape', code: 'TPL', brands: ['nordgrip', 'kestrel'], color: '#0B7A6E',
    variants: [20, 30, 50].map((m) => ({ k: String(m), size: `${m} m`, name: `fibreglass long tape ${m} m`, price: 12 + m * 0.4, sp: [`${m} m fibreglass blade`, 'Open frame, fast rewind', 'EC class III'] as [string, string, string], f: { 'Length': m + ' m', 'Blade': 'Fibreglass, 13 mm' } })) });
  line({ fam: 'level', famName: 'spirit levels', c: 'hand-tools', s: 'measuring', kind: 'level', code: 'LVL', brands: ['nordgrip', 'ferrum-co', 'kestrel', 'tatra-works'],
    variants: grid([40, 60, 80, 100, 120, 150, 180, 200], ['standard', 'magnetic']).map(([cm, t]) => ({ k: `${cm}${t === 'magnetic' ? '-M' : ''}`, size: `${cm} cm${t === 'magnetic' ? ', magnetic' : ''}`, name: `spirit level ${cm} cm${t === 'magnetic' ? ', magnetic' : ''}`, price: 9 + cm * 0.21 + (t === 'magnetic' ? 6 : 0),
      sp: [`${cm} cm aluminium profile`, '3 vials, 0.5 mm/m', t === 'magnetic' ? 'Magnetic base' : 'Shock-absorbing end caps'] as [string, string, string], f: { 'Length': cm + ' cm', 'Accuracy': '0.5 mm/m', 'Vials': '3', 'Magnetic': t === 'magnetic' ? 'Yes' : 'No' } })) });
  line({ fam: 'square', famName: 'squares and rules', c: 'hand-tools', s: 'measuring', kind: 'level', code: 'SQR', brands: ['nordgrip', 'ferrum-co'], color: '#C7CDD2',
    variants: [['TRY200', 'try square 200 mm', 9], ['TRY300', 'try square 300 mm', 12], ['CMB300', 'combination square 300 mm', 16], ['CRP600', 'carpenter square 600 mm', 14], ['FLD2W', 'folding rule 2 m, wood', 7], ['FLD2F', 'folding rule 2 m, fibreglass', 11], ['TRP', 'torpedo level 230 mm', 8]].map(([k, l, p]) => ({ k: String(k), size: cap(String(l)), name: String(l), price: Number(p), sp: [cap(String(l)), 'Etched metric scale', 'Workshop grade'] as [string, string, string], f: { 'Type': cap(String(l)) } })) });
  line({ fam: 'laser-dist', famName: 'laser distance meters', c: 'hand-tools', s: 'measuring', kind: 'level', code: 'LDM', brands: ['kestrel', 'mistral-pro'], color: '#1F5FBF',
    variants: [30, 50, 80].map((m) => ({ k: String(m), size: `${m} m range`, name: `laser distance meter ${m} m`, price: 29 + m * 0.9, sp: [`Up to ${m} m`, '±2 mm accuracy', 'Area and volume'] as [string, string, string], f: { 'Range': m + ' m', 'Accuracy': '±2 mm', 'Laser class': '2' } })) });
  line({ fam: 'marker', famName: 'markers and pencils', c: 'hand-tools', s: 'measuring', kind: 'bits', code: 'MRK', brands: ['nordgrip', 'tatra-works', 'kestrel'],
    variants: [...grid(['black', 'red', 'blue', 'green'], ['fine', 'broad']).map(([c, t]) => ({ k: `${CC[c]}-${t[0].toUpperCase()}`, size: `${cap(c)}, ${t}`, name: `construction marker ${c}, ${t} tip, pack of 10`, price: 8 + (t === 'broad' ? 2 : 0), pack: 10, unit: 'pack', color: COLORS[c],
      sp: ['Writes on wet and dusty surfaces', `${cap(t)} tip`, 'Pack of 10'] as [string, string, string], f: { 'Colour': cap(c), 'Tip': cap(t) } })),
      { k: 'PNC12', size: 'Carpenter pencils', name: 'carpenter pencils, pack of 12', price: 6, pack: 12, unit: 'pack', sp: ['Flat lead, will not roll', 'Medium hardness', 'Pack of 12'], f: { 'Lead': 'HB' } }] });

  const BITS: [string, string][] = [['PH1', 'Phillips'], ['PH2', 'Phillips'], ['PH3', 'Phillips'], ['PZ1', 'Pozidriv'], ['PZ2', 'Pozidriv'], ['PZ3', 'Pozidriv'], ['T10', 'Torx'], ['T15', 'Torx'], ['T20', 'Torx'], ['T25', 'Torx'], ['T27', 'Torx'], ['T30', 'Torx'], ['T40', 'Torx'], ['H3', 'Hex'], ['H4', 'Hex'], ['H5', 'Hex'], ['H6', 'Hex'], ['SL5.5', 'Slotted'], ['SL6.5', 'Slotted']];
  line({ fam: 'bit', famName: 'screwdriver bits', c: 'hand-tools', s: 'bits', kind: 'bits', code: 'BIT', brands: ['nordgrip', 'torque-lab', 'ferrum-co', 'kestrel', 'tatra-works'],
    variants: grid(BITS, [[25, 10], [50, 5], [90, 3]] as [number, number][]).map(([[tip, kind], [mm, n]]) => ({ k: `${tip}-${mm}`, size: `${tip} × ${mm} mm, ${n} pcs`, name: `${kind} bit ${tip} × ${mm} mm, pack of ${n}`, price: 3.5 + n * 0.45 + mm / 30, pack: n, unit: 'pack',
      sp: [`${tip}, ${mm} mm`, mm === 25 ? 'Torsion zone for impact drivers' : '1/4" hex shank', `Pack of ${n}`] as [string, string, string], f: { 'Tip': tip, 'Drive type': kind, 'Length': mm + ' mm', 'Shank': '1/4" hex (E 6.3)', 'Material': 'S2 steel' } })) });
  line({ fam: 'bit-set', famName: 'bit sets', c: 'hand-tools', s: 'bits', kind: 'bits', code: 'BTS', brands: ['nordgrip', 'torque-lab', 'ferrum-co', 'kestrel'],
    variants: [10, 32, 46, 72].map((n) => ({ k: String(n), size: `${n} pieces`, name: `screwdriver bit set, ${n} pieces`, price: 7 + n * 0.45, sp: [`${n} pieces`, 'PH, PZ, TX, hex and slotted', 'Magnetic holder'] as [string, string, string], f: { 'Pieces': String(n), 'Case': 'Hard case with belt clip' } })) });
  line({ fam: 'drill-hss', famName: 'HSS metal drill bits', c: 'hand-tools', s: 'drill-bits', kind: 'bits', code: 'HSS', brands: ['torque-lab', 'ferrum-co', 'kestrel', 'tatra-works'], color: '#E3B73B',
    variants: grid(Array.from({ length: 25 }, (_, i) => 1 + i * 0.5), ['HSS-G', 'HSS-Co']).map(([d, g]) => ({ k: `${g === 'HSS-Co' ? 'CO' : 'G'}-${d}`, size: `Ø${d} mm, ${g}`, name: `${g} metal drill bit Ø${d} mm${d < 4 ? ', pack of 5' : ''}`, price: (1.2 + d * d * 0.09) * (g === 'HSS-Co' ? 2.1 : 1) * (d < 4 ? 3 : 1), pack: d < 4 ? 5 : 1, unit: d < 4 ? 'pack' : 'each',
      sp: [`Ø${d} mm`, g === 'HSS-Co' ? '5 % cobalt, for stainless' : 'Ground, for steel', 'DIN 338, 135° split point'] as [string, string, string], f: { 'Diameter': d + ' mm', 'Grade': g, 'Standard': 'DIN 338', 'Point': '135° split' } })) });
  line({ fam: 'drill-masonry', famName: 'masonry drill bits', c: 'hand-tools', s: 'drill-bits', kind: 'bits', code: 'MAS', brands: ['torque-lab', 'alpenfix', 'kestrel', 'tatra-works'], color: '#9AA3AA',
    variants: grid([4, 5, 6, 7, 8, 10, 12, 14, 16], ['short', 'long']).map(([d, l]) => ({ k: `${d}-${l[0].toUpperCase()}`, size: `Ø${d} × ${l === 'long' ? d * 25 + 50 : d * 12 + 40} mm`, name: `masonry drill bit Ø${d} × ${l === 'long' ? d * 25 + 50 : d * 12 + 40} mm`, price: 2 + d * 0.5 + (l === 'long' ? 3 : 0),
      sp: [`Ø${d} mm carbide tip`, 'For brick, concrete block, stone', 'Cylindrical shank'] as [string, string, string], f: { 'Diameter': d + ' mm', 'Total length': (l === 'long' ? d * 25 + 50 : d * 12 + 40) + ' mm', 'Tip': 'Carbide' } })) });
  line({ fam: 'drill-sds', famName: 'SDS-plus hammer drill bits', c: 'hand-tools', s: 'drill-bits', kind: 'bits', code: 'SDS', brands: ['torque-lab', 'kestrel', 'alpenfix', 'tatra-works'], color: '#1F5FBF',
    variants: [5, 6, 8, 10, 12, 14, 16, 18, 20].flatMap((d) => [110, 160, 210, 310, 460].filter((l) => l >= d * 9 && l <= d * 40).map((l) => ({ k: `${d}x${l}`, size: `Ø${d} × ${l} mm`, name: `SDS-plus hammer drill bit Ø${d} × ${l} mm`, price: 2.8 + d * 0.45 + l / 60,
      sp: [`Ø${d} × ${l} mm`, '4-cutter carbide head', 'For reinforced concrete'] as [string, string, string], f: { 'Diameter': d + ' mm', 'Total length': l + ' mm', 'Shank': 'SDS-plus', 'Cutters': '4' } }))) });
  line({ fam: 'drill-wood', famName: 'wood drill bits', c: 'hand-tools', s: 'drill-bits', kind: 'bits', code: 'WDB', brands: ['torque-lab', 'ferrum-co', 'kestrel'], color: '#C69A62',
    variants: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((d) => ({ k: String(d), size: `Ø${d} mm`, name: `brad-point wood drill bit Ø${d} mm`, price: 1.8 + d * 0.35, sp: [`Ø${d} mm`, 'Brad point for clean entry', 'Chrome vanadium'] as [string, string, string], f: { 'Diameter': d + ' mm', 'Point': 'Brad point' } })) });
  line({ fam: 'holesaw', famName: 'bi-metal hole saws', c: 'hand-tools', s: 'drill-bits', kind: 'disc', code: 'HSW', brands: ['torque-lab', 'kestrel', 'tatra-works'], color: '#E3B73B',
    variants: [20, 22, 25, 29, 32, 35, 38, 44, 51, 57, 64, 68, 76, 83, 102, 114].map((d) => ({ k: String(d), size: `Ø${d} mm`, name: `bi-metal hole saw Ø${d} mm`, price: 6 + d * 0.14, sp: [`Ø${d} mm`, '38 mm cutting depth', 'For metal, wood and plastic'] as [string, string, string], f: { 'Diameter': d + ' mm', 'Cutting depth': '38 mm', 'Teeth': 'Bi-metal M42' } })) });
  line({ fam: 'drill-set', famName: 'drill bit sets', c: 'hand-tools', s: 'drill-bits', kind: 'bits', code: 'DST', brands: ['torque-lab', 'ferrum-co', 'kestrel'],
    variants: [['HSS19', 'HSS drill set, 19 pieces 1–10 mm', 24], ['MAS5', 'masonry drill set, 5 pieces', 11], ['SDS7', 'SDS-plus drill set, 7 pieces', 29], ['MIX40', 'mixed drill and bit set, 40 pieces', 34]].map(([k, l, p]) => ({ k: String(k), size: cap(String(l)), name: String(l), price: Number(p), sp: [cap(String(l)), 'Sizes marked on the case', 'Hard case'] as [string, string, string], f: { 'Contents': cap(String(l)) } })) });
  const TIPS = ['PH0', 'PH1', 'PH2', 'PH3', 'PZ0', 'PZ1', 'PZ2', 'PZ3', 'SL2.5', 'SL3.5', 'SL4', 'SL5.5', 'SL6.5', 'SL8', 'T10', 'T15', 'T20', 'T25', 'T30'];
  line({ fam: 'screwdriver', famName: 'screwdrivers', c: 'hand-tools', s: 'screwdrivers', kind: 'bits', code: 'SCD', brands: ['nordgrip', 'ferrum-co', 'kestrel', 'tatra-works'],
    variants: grid(TIPS, ['standard', 'VDE']).map(([tip, v]) => ({ k: `${tip}${v === 'VDE' ? '-V' : ''}`, size: `${tip}${v === 'VDE' ? ', VDE' : ''}`, name: `screwdriver ${tip}${v === 'VDE' ? ', VDE insulated 1000 V' : ''}`, price: 4.5 + (v === 'VDE' ? 4 : 0) + (tip.endsWith('3') || tip.endsWith('8') ? 1 : 0), color: v === 'VDE' ? '#F2B705' : '#C9300C',
      sp: [tip + ' tip', v === 'VDE' ? 'Insulated to 1000 V' : 'Two-component handle', 'Chrome vanadium blade'] as [string, string, string], f: { 'Tip': tip, 'Insulation': v === 'VDE' ? 'VDE, IEC 60900' : 'None', 'Blade': 'Chrome vanadium' } })) });
  line({ fam: 'screwdriver-set', famName: 'screwdriver sets', c: 'hand-tools', s: 'screwdrivers', kind: 'bits', code: 'SDS', brands: ['nordgrip', 'ferrum-co', 'tatra-works'],
    variants: [['6', 'screwdriver set, 6 pieces', 15], ['VDE7', 'VDE screwdriver set, 7 pieces', 34], ['PREC8', 'precision screwdriver set, 8 pieces', 13], ['RAT', 'ratchet screwdriver with 12 bits', 18]].map(([k, l, p]) => ({ k: String(k), size: cap(String(l)), name: String(l), price: Number(p), sp: [cap(String(l)), 'PH, PZ and slotted', 'Wall rack included'] as [string, string, string], f: { 'Contents': cap(String(l)) } })) });

  /* power tools */
  const PT: [string, string, string, number, boolean][] = [['DD12', 'drill driver 12 V', 'drill', 69, true], ['DD18', 'drill driver 18 V', 'drill', 89, true], ['CD18', 'combi drill 18 V', 'drill', 109, true], ['ID18', 'impact driver 18 V', 'drill', 99, true], ['SDS18', 'SDS-plus rotary hammer 18 V', 'drill', 149, true], ['IW18', 'impact wrench 18 V', 'drill', 139, true], ['SDS800', 'SDS-plus rotary hammer 800 W', 'drill', 119, false], ['DR750', 'hammer drill 750 W', 'drill', 59, false]];
  const KITS: [string, string, number][] = [['B', 'body only', 0], ['K2', 'with 2 × 2.0 Ah and charger', 70], ['K4', 'with 2 × 4.0 Ah and charger', 120], ['K5', 'brushless, with 2 × 5.0 Ah and charger', 170]];
  const PT_BRANDS = ['kestrel', 'brava-pro', 'voltaria', 'mistral-pro', 'fjordline'];
  line({ fam: 'drills', famName: 'drills and drivers', c: 'power-tools', s: 'drills', kind: 'drill', code: 'PTD', brands: PT_BRANDS,
    variants: PT.flatMap(([k, l, , p, cordless]) => (cordless ? KITS : [['C', 'corded', 0] as [string, string, number]]).map(([kk, kl, kp]) => ({ k: `${k}-${kk}`, size: cap(kl), name: `${l}, ${kl}`, price: p + kp,
      sp: [cap(l), cordless ? (kk === 'B' ? 'Battery and charger not included' : kl.replace('with ', '')) : '3 m cable', k.startsWith('SDS') ? '2.4 J impact energy' : k.startsWith('IW') ? '400 Nm' : k.startsWith('ID') ? '180 Nm' : '60 Nm torque'] as [string, string, string],
      f: { 'Type': cap(l), 'Power': cordless ? (k.includes('12') ? '12 V' : '18 V') : k.replace(/\D/g, '') + ' W', 'Kit': cap(kl), 'Chuck': k.startsWith('SDS') ? 'SDS-plus' : k.startsWith('I') ? '1/4" hex' : '13 mm keyless' } }))) });
  line({ fam: 'battery', famName: 'batteries and chargers', c: 'power-tools', s: 'batteries', kind: 'connector', code: 'BAT', brands: PT_BRANDS, color: '#2A3036',
    variants: [['18-2', '18 V 2.0 Ah battery', 39], ['18-4', '18 V 4.0 Ah battery', 59], ['18-5', '18 V 5.0 Ah battery', 69], ['18-8', '18 V 8.0 Ah battery', 109], ['12-2', '12 V 2.0 Ah battery', 32], ['12-4', '12 V 4.0 Ah battery', 49], ['CHG', 'standard charger', 29], ['CHGF', 'fast charger', 49], ['STK', 'starter kit: 2 × 4.0 Ah and fast charger', 139]].map(([k, l, p]) => ({ k: String(k), size: cap(String(l)), name: String(l), price: Number(p),
      sp: [cap(String(l)), String(k).startsWith('CHG') ? 'For all batteries in the range' : 'Li-ion with charge indicator', 'Fits the whole tool range'] as [string, string, string], f: { 'Type': cap(String(l)) } })) });
  line({ fam: 'grinders', famName: 'angle grinders', c: 'power-tools', s: 'grinders', kind: 'grinder', code: 'GRD', brands: PT_BRANDS,
    variants: [['115', '115 mm angle grinder 750 W', 49], ['125', '125 mm angle grinder 900 W', 59], ['125P', '125 mm angle grinder 1200 W, variable speed', 89], ['125B', '125 mm angle grinder 18 V brushless, body only', 99], ['125K', '125 mm angle grinder 18 V brushless, 2 × 4.0 Ah kit', 219], ['230', '230 mm angle grinder 2200 W', 119], ['DIE', 'die grinder 400 W', 69], ['STR', 'straight grinder 500 W', 89]].map(([k, l, p]) => ({ k: String(k), size: cap(String(l)), name: String(l), price: Number(p),
      sp: [cap(String(l)), 'Restart protection', 'Side handle and guard included'] as [string, string, string], f: { 'Type': cap(String(l)), 'Spindle': 'M14' } })) });
  line({ fam: 'saws', famName: 'saws', c: 'power-tools', s: 'saws', kind: 'disc', code: 'SAW', brands: PT_BRANDS, color: '#C7CDD2',
    variants: [['CS165', 'circular saw 165 mm 1200 W', 89], ['CS190', 'circular saw 190 mm 1400 W', 109], ['CS18', 'circular saw 18 V, body only', 119], ['JS', 'jigsaw 650 W', 59], ['JS18', 'jigsaw 18 V, body only', 99], ['RS', 'reciprocating saw 900 W', 89], ['RS18', 'reciprocating saw 18 V, body only', 109], ['MS216', 'mitre saw 216 mm', 179], ['MS254', 'sliding mitre saw 254 mm', 299], ['PS', 'plunge saw 160 mm with rail', 259]].map(([k, l, p]) => ({ k: String(k), size: cap(String(l)), name: String(l), price: Number(p),
      sp: [cap(String(l)), 'Blade included', 'Dust extraction port'] as [string, string, string], f: { 'Type': cap(String(l)) } })) });
  line({ fam: 'sanders', famName: 'sanders and multi-tools', c: 'power-tools', s: 'sanders', kind: 'sheet', code: 'SND', brands: PT_BRANDS, color: '#1F5FBF',
    variants: [['RO125', 'random orbit sander 125 mm', 69], ['RO150', 'random orbit sander 150 mm', 99], ['SH', 'sheet sander 1/3', 49], ['BLT', 'belt sander 75 mm', 109], ['MT', 'oscillating multi-tool 300 W', 79], ['MT18', 'oscillating multi-tool 18 V, body only', 89]].map(([k, l, p]) => ({ k: String(k), size: cap(String(l)), name: String(l), price: Number(p),
      sp: [cap(String(l)), 'Variable speed', 'Dust bag included'] as [string, string, string], f: { 'Type': cap(String(l)) } })) });

  /* safety */
  line({ fam: 'helmet', famName: 'safety helmets', c: 'safety', s: 'head', kind: 'helmet', code: 'HLM', brands: ['vigil', 'kestrel', 'nordgrip'],
    variants: grid([['STD', 'safety helmet EN 397', 9], ['VNT', 'vented safety helmet EN 397', 13], ['CLB', 'climbing helmet EN 12492', 39], ['BMP', 'bump cap EN 812', 12]] as [string, string, number][], ['white', 'yellow', 'red', 'blue', 'orange', 'green']).map(([[k, l, p], c]) => ({ k: `${k}-${c.slice(0, 2).toUpperCase()}`, size: `${cap(l.split(' EN')[0])}, ${c}`, name: `${l}, ${c}`, price: p, color: COLORS[c],
      sp: [l.split(' ').slice(-2).join(' '), cap(c), k === 'BMP' ? 'Not for falling objects' : '6-point harness, ratchet'] as [string, string, string], f: { 'Standard': l.split(' ').slice(-2).join(' '), 'Colour': cap(c), 'Size': '53–63 cm' } })) });
  line({ fam: 'glasses', famName: 'safety glasses', c: 'safety', s: 'eyes', kind: 'glasses', code: 'GLS', brands: ['vigil', 'kestrel', 'nordgrip', 'fjordline'],
    variants: [...grid([['CLS', 'classic safety glasses', 5], ['WRP', 'wraparound safety glasses', 8], ['OVR', 'over-spectacles', 7]] as [string, string, number][], [['clear', '#BBD7FA'], ['smoked', '#5B6670'], ['yellow', '#F2D16B'], ['mirror', '#9CC4FF']] as [string, string][]).map(([[k, l, p], [lens, col]]) => ({ k: `${k}-${lens.slice(0, 2).toUpperCase()}`, size: `${cap(l)}, ${lens} lens`, name: `${l}, ${lens} lens`, price: p + (lens === 'mirror' ? 3 : 0), color: col,
      sp: ['EN 166 F', `${cap(lens)} lens`, 'Anti-scratch, anti-fog'] as [string, string, string], f: { 'Standard': 'EN 166 / EN 170', 'Lens': cap(lens), 'Coating': 'Anti-scratch, anti-fog' } })),
      ...[['GOG-CL', 'indirect-vent goggles, clear', 9], ['GOG-SM', 'indirect-vent goggles, smoked', 10], ['FSH', 'face shield with brow guard', 16]].map(([k, l, p]) => ({ k: String(k), size: cap(String(l)), name: String(l), price: Number(p), sp: ['EN 166 3 4 B', cap(String(l)), 'Fits over glasses'] as [string, string, string], f: { 'Standard': 'EN 166' } }))] });
  const GLOVES: [string, string, number, string, string][] = [['NF', 'nitrile foam work gloves', 2.9, 'EN 388 4121X', '#2A3036'], ['PU', 'PU palm-coated gloves', 2.4, 'EN 388 4131X', '#F4F1EA'], ['LX', 'latex crinkle grip gloves', 2.8, 'EN 388 2142X', '#E8761B'], ['CB', 'cut-resistant gloves level B', 5.5, 'EN 388 4X42B', '#9AA3AA'], ['CC', 'cut-resistant gloves level C', 6.9, 'EN 388 4X42C', '#7A8A99'], ['CD', 'cut-resistant gloves level D', 8.9, 'EN 388 4X43D', '#5B6670'], ['CF', 'cut-resistant gloves level F', 12.9, 'EN 388 4X44F', '#2A3036'], ['LR', 'leather rigger gloves', 5.9, 'EN 388 2122X', '#C69A62'], ['WT', 'thermal winter gloves', 6.5, 'EN 511 X2X', '#1F5FBF'], ['CH', 'chemical-resistant nitrile gloves', 4.9, 'EN 374 JKLOPT', '#0B7A6E']];
  line({ fam: 'gloves', famName: 'work gloves', c: 'safety', s: 'hands', kind: 'gloves', code: 'GLV', brands: ['nordgrip', 'vigil', 'kestrel', 'tatra-works', 'fjordline'],
    variants: GLOVES.flatMap(([k, l, p, std, col]) => [7, 8, 9, 10, 11].flatMap((sz) => [1, 12].map((n) => ({ k: `${k}-${sz}${n > 1 ? '-12' : ''}`, size: `Size ${sz}${n > 1 ? ', 12 pairs' : ''}`, name: `${l}, size ${sz}${n > 1 ? ', pack of 12 pairs' : ''}`, price: p * n * (n > 1 ? 0.82 : 1), pack: n, unit: n > 1 ? 'pack' : 'pair', color: col,
      sp: [std, `Size ${sz} (${['S', 'M', 'L', 'XL', 'XXL'][sz - 7]})`, n > 1 ? 'Pack of 12 pairs' : 'Touchscreen compatible'] as [string, string, string], f: { 'Standard': std, 'Size': `${sz} (${['S', 'M', 'L', 'XL', 'XXL'][sz - 7]})`, 'Category': 'II' } })))) });
  line({ fam: 'gloves-disposable', famName: 'disposable nitrile gloves', c: 'safety', s: 'hands', kind: 'gloves', code: 'DNG', brands: ['nordgrip', 'vigil', 'kestrel', 'tatra-works'], color: '#1F5FBF',
    variants: grid(['S', 'M', 'L', 'XL'], [100, 50]).map(([sz, n]) => ({ k: `${sz}-${n}`, size: `${sz}, box of ${n}`, name: `disposable nitrile gloves, size ${sz}, box of ${n}`, price: n === 100 ? 9.5 : 5.9, pack: n, unit: 'box', sp: ['Powder-free, 0.1 mm', `Size ${sz}`, `Box of ${n}`] as [string, string, string], f: { 'Size': sz, 'Thickness': '0.1 mm', 'Standard': 'EN 374-5' } })) });
  line({ fam: 'mask', famName: 'disposable respirators', c: 'safety', s: 'respiratory', kind: 'mask', code: 'FFP', brands: ['vigil', 'nordgrip', 'kestrel'],
    variants: grid(['1', '2', '3'], grid(['valve', 'no valve'], [3, 10, 20])).map(([c, [v, n]]) => ({ k: `${c}${v === 'valve' ? 'V' : ''}-${n}`, size: `FFP${c}${v === 'valve' ? ' with valve' : ''}, ${n} pcs`, name: `FFP${c} respirator${v === 'valve' ? ' with valve' : ''}, pack of ${n}`, price: (0.8 + Number(c) * 0.6 + (v === 'valve' ? 0.6 : 0)) * n, pack: n, unit: 'pack',
      sp: [`EN 149 FFP${c}`, v === 'valve' ? 'Exhalation valve' : 'Without valve', `Pack of ${n}`] as [string, string, string], f: { 'Standard': 'EN 149:2001+A1:2009', 'Class': 'FFP' + c, 'Valve': v === 'valve' ? 'Yes' : 'No' } })) });
  line({ fam: 'half-mask', famName: 'half masks and filters', c: 'safety', s: 'respiratory', kind: 'mask', code: 'HMK', brands: ['vigil', 'nordgrip', 'kestrel'], color: '#5B6670',
    variants: [...['S', 'M', 'L'].map((sz) => ({ k: 'HM-' + sz, size: `Half mask, ${sz}`, name: `reusable half mask, size ${sz}`, price: 19, sp: ['EN 140', `Size ${sz}`, 'Twin bayonet filters'] as [string, string, string], f: { 'Standard': 'EN 140', 'Size': sz } })),
      ...['A1', 'A2', 'P3', 'ABEK1', 'A2P3'].map((fl) => ({ k: 'F-' + fl, size: `Filter ${fl}`, name: `${fl} filters, pair`, price: fl.includes('P3') && fl.length > 2 ? 24 : 12, pack: 2, unit: 'pack', sp: ['EN 14387', `Class ${fl}`, 'Pair'] as [string, string, string], f: { 'Standard': fl === 'P3' ? 'EN 143' : 'EN 14387', 'Class': fl } }))] });
  line({ fam: 'hearing', famName: 'hearing protection', c: 'safety', s: 'hearing', kind: 'mask', code: 'EAR', brands: ['vigil', 'nordgrip', 'kestrel'], color: '#F2B705',
    variants: [...grid([25, 30, 33], ['headband', 'helmet-mounted']).map(([snr, t]) => ({ k: `${snr}-${t === 'headband' ? 'HB' : 'HM'}`, size: `SNR ${snr} dB, ${t}`, name: `earmuffs SNR ${snr} dB, ${t}`, price: 9 + (snr - 25) * 1.4 + (t === 'headband' ? 0 : 4), sp: ['EN 352-1', `SNR ${snr} dB`, cap(t)] as [string, string, string], f: { 'Standard': t === 'headband' ? 'EN 352-1' : 'EN 352-3', 'SNR': snr + ' dB' } })),
      ...[['PL200', 'foam earplugs, box of 200 pairs', 24], ['PLC50', 'corded earplugs, 50 pairs', 19], ['PLR', 'reusable earplugs with case', 4]].map(([k, l, p]) => ({ k: String(k), size: cap(String(l)), name: String(l), price: Number(p), sp: ['EN 352-2', 'SNR 37 dB', cap(String(l))] as [string, string, string], f: { 'Standard': 'EN 352-2', 'SNR': '37 dB' } }))] });

  /* locks */
  const PAD: [string, string, number[], number, string][] = [['BR', 'brass padlock', [20, 30, 40, 50, 60], 0.18, '#C9A23A'], ['HS', 'hardened steel padlock', [40, 50, 60, 70], 0.3, '#9AA3AA'], ['LM', 'laminated steel padlock', [40, 50, 60], 0.26, '#7A8A99'], ['CB', 'combination padlock', [30, 40, 50], 0.22, '#1F5FBF'], ['LS', 'long-shackle brass padlock', [40, 50], 0.22, '#C9A23A'], ['WP', 'weatherproof padlock', [45, 55], 0.34, '#C9300C']];
  line({ fam: 'padlock', famName: 'padlocks', c: 'locks', s: 'padlocks', kind: 'padlock', code: 'PDL', brands: ['ferrum-co', 'kestrel', 'tatra-works', 'fjordline'],
    variants: PAD.flatMap(([k, l, sizes, f, col]) => sizes.flatMap((mm) => (k === 'CB' ? [1] : [1, 2]).map((n) => ({ k: `${k}-${mm}${n > 1 ? '-KA2' : ''}`, size: `${mm} mm${n > 1 ? ', keyed alike ×2' : ''}`, name: `${l} ${mm} mm${n > 1 ? ', keyed alike, pack of 2' : ''}`, price: (4 + mm * f * mm / 10) * n * (n > 1 ? 0.9 : 1), pack: n, unit: n > 1 ? 'pack' : 'each', color: col,
      sp: [`${mm} mm body`, k === 'CB' ? '4-dial resettable code' : `${n > 1 ? 'Keyed alike, ' : ''}${mm >= 50 ? 3 : 2} keys${n > 1 ? ' each' : ''}`, mm >= 50 ? 'Security grade 3' : 'Security grade 2'] as [string, string, string],
      f: { 'Body width': mm + ' mm', 'Shackle diameter': Math.round(mm / 7) + ' mm', 'Security grade': mm >= 50 ? '3' : '2', 'Keys': k === 'CB' ? 'None (combination)' : String(mm >= 50 ? 3 : 2) } })))) });
  line({ fam: 'hasp', famName: 'hasps and staples', c: 'locks', s: 'padlocks', kind: 'hinge', code: 'HSP', brands: ['ferrum-co', 'brezo'],
    variants: grid([80, 115, 150], ['zinc', 'stainless']).map(([mm, f]) => ({ k: `${mm}-${f[0].toUpperCase()}`, size: `${mm} mm, ${f}`, name: `hasp and staple ${mm} mm, ${f}`, price: 3.5 + mm / 25 + (f === 'stainless' ? 4 : 0), color: COLORS[f], sp: [`${mm} mm`, cap(f), 'Screws included'] as [string, string, string], f: { 'Length': mm + ' mm', 'Finish': cap(f) } })) });
  line({ fam: 'butt-hinge', famName: 'butt hinges', c: 'locks', s: 'hinges', kind: 'hinge', code: 'BHG', brands: ['ferrum-co', 'brezo', 'tatra-works', 'fjordline'],
    variants: grid([60, 75, 100, 125, 150], grid(['zinc', 'stainless', 'brass', 'black', 'nickel'], [2, 10])).map(([mm, [f, n]]) => ({ k: `${mm}-${f.slice(0, 2).toUpperCase()}-${n}`, size: `${mm} mm, ${f}, ${n} pcs`, name: `butt hinge ${mm} mm, ${f}${n === 2 ? ', pair' : ', box of 10'}`, price: (1.2 + mm / 40) * (f === 'stainless' ? 2.2 : f === 'brass' ? 2.6 : f === 'zinc' ? 1 : 1.4) * n * (n === 10 ? 0.85 : 1), pack: n, unit: n === 2 ? 'pair' : 'box', tier: n === 10, color: COLORS[f],
      sp: [`${mm} × ${Math.round(mm * 0.7)} mm`, f === 'stainless' ? 'A2 stainless steel' : cap(f) + ' finish', n === 2 ? 'Pair, with screws' : 'Box of 10'] as [string, string, string], f: { 'Size': `${mm} × ${Math.round(mm * 0.7)} mm`, 'Thickness': (mm >= 100 ? 2.5 : 2) + ' mm', 'Finish': cap(f) } })) });
  line({ fam: 'hinge-other', famName: 'piano, cabinet and gate hinges', c: 'locks', s: 'hinges', kind: 'hinge', code: 'OHG', brands: ['ferrum-co', 'brezo'],
    variants: [...grid([1000, 1800, 2000], ['zinc', 'stainless', 'brass']).map(([mm, f]) => ({ k: `PN-${mm}-${f[0].toUpperCase()}`, size: `Piano ${mm} mm, ${f}`, name: `piano hinge ${mm} mm, ${f}`, price: 6 + mm / 200 * (f === 'zinc' ? 1 : 2), color: COLORS[f], sp: [`${mm} × 32 mm`, cap(f), 'Cut to length'] as [string, string, string], f: { 'Length': mm + ' mm', 'Finish': cap(f) } })),
      ...grid(['full overlay', 'half overlay', 'inset'], ['soft close', 'standard']).map(([o, s]) => ({ k: `CB-${o[0].toUpperCase()}${s === 'soft close' ? 'SC' : 'ST'}`, size: `35 mm cup, ${o}, ${s}`, name: `concealed cabinet hinge 35 mm, ${o}, ${s}, pair`, price: s === 'soft close' ? 7.5 : 3.9, pack: 2, unit: 'pair', color: '#C7CDD2', sp: ['35 mm cup', cap(o), cap(s)] as [string, string, string], f: { 'Cup': '35 mm', 'Overlay': cap(o), 'Closing': cap(s) } })),
      ...grid([200, 300, 400], ['zinc', 'black', 'galvanised']).map(([mm, f]) => ({ k: `TG-${mm}-${f[0].toUpperCase()}`, size: `T-hinge ${mm} mm, ${f}`, name: `T-hinge ${mm} mm, ${f}, pair`, price: 5 + mm / 40, pack: 2, unit: 'pair', color: f === 'black' ? '#2A3036' : '#BCC5CC', sp: [`${mm} mm strap`, cap(f), 'For gates and sheds'] as [string, string, string], f: { 'Strap length': mm + ' mm', 'Finish': cap(f) } }))] });
  const CYL = ['30/30', '30/35', '35/35', '30/40', '35/40', '40/40', '30/45', '40/45', '45/45', '30/50', '40/50', '50/50'];
  line({ fam: 'cylinder', famName: 'euro profile cylinders', c: 'locks', s: 'cylinders', kind: 'padlock', code: 'CYL', brands: ['tatra-works', 'ferrum-co', 'kestrel'],
    variants: grid(CYL, grid([['STD', 'standard', 12], ['HSC', 'high security', 34], ['THT', 'thumb turn', 22]] as [string, string, number][], ['brass', 'nickel'])).map(([s, [[k, l, p], f]]) => {
      const [a, b] = s.split('/').map(Number);
      return { k: `${k}-${a}${b}-${f[0].toUpperCase()}`, size: `${s} mm, ${l}, ${f}`, name: `euro cylinder ${s} mm, ${l}, ${f}`, price: p + (a + b - 60) * 0.25, color: COLORS[f],
        sp: [`${a + b} mm total length`, cap(l) + (k === 'HSC' ? ', anti-snap' : ''), '5 keys'] as [string, string, string], f: { 'Length': s + ' mm', 'Type': cap(l), 'Finish': cap(f), 'Keys': '5', 'Standard': k === 'HSC' ? 'EN 1303 grade 6' : 'EN 1303 grade 4' } };
    }) });

  /* abrasives */
  line({ fam: 'cut-disc', famName: 'cutting discs', c: 'abrasives', s: 'discs', kind: 'disc', code: 'CUT', brands: ['grano', 'brava-pro', 'tatra-works', 'kestrel', 'fjordline'],
    variants: grid([115, 125, 230], grid([['MET', 'metal', '#1F5FBF'], ['INX', 'stainless', '#0B7A6E'], ['STN', 'stone', '#7A8A99']] as [string, string, string][], [10, 25])).flatMap(([d, [[k, m, col], n]]) => (d === 230 ? [1.9, 3] : [1, 1.6]).map((th) => ({ k: `${k}-${d}-${String(th).replace('.', '')}-${n}`, size: `Ø${d} × ${th} mm, ${n} pcs`, name: `${m} cutting disc ${d} × ${th} mm, pack of ${n}`, price: (0.55 + d / 140 + th * 0.2) * n * (n === 25 ? 0.9 : 1), pack: n, unit: 'pack', color: col,
      sp: [`Ø${d} × ${th} mm`, `For ${m}`, `Pack of ${n}`] as [string, string, string], f: { 'Diameter': d + ' mm', 'Thickness': th + ' mm', 'Bore': '22.23 mm', 'Material': cap(m), 'Max speed': (d === 230 ? 6650 : d === 125 ? 12250 : 13300) + ' rpm' } }))) });
  line({ fam: 'grind-disc', famName: 'grinding discs', c: 'abrasives', s: 'discs', kind: 'disc', code: 'GRN', brands: ['grano', 'brava-pro'], color: '#5B6670',
    variants: grid([115, 125, 230], ['metal', 'stone']).map(([d, m]) => ({ k: `${m[0].toUpperCase()}-${d}`, size: `Ø${d} × 6 mm, ${m}`, name: `${m} grinding disc ${d} × 6 mm, pack of 10`, price: (2 + d / 60) * 10, pack: 10, unit: 'pack', sp: [`Ø${d} × 6 mm`, `For ${m}`, 'Pack of 10'] as [string, string, string], f: { 'Diameter': d + ' mm', 'Thickness': '6 mm', 'Material': cap(m) } })) });
  line({ fam: 'diamond', famName: 'diamond blades', c: 'abrasives', s: 'discs', kind: 'disc', code: 'DIA', brands: ['grano', 'brava-pro', 'kestrel'], color: '#9AA3AA',
    variants: grid([115, 125, 230], ['segmented', 'turbo', 'continuous rim']).map(([d, t]) => ({ k: `${t[0].toUpperCase()}-${d}`, size: `Ø${d} mm, ${t}`, name: `diamond blade ${d} mm, ${t}`, price: 9 + d / 9 + (t === 'turbo' ? 4 : 0), sp: [`Ø${d} mm`, cap(t), t === 'continuous rim' ? 'For tiles, wet cut' : 'For concrete and brick'] as [string, string, string], f: { 'Diameter': d + ' mm', 'Rim': cap(t), 'Bore': '22.23 mm' } })) });
  line({ fam: 'flap', famName: 'flap discs', c: 'abrasives', s: 'flap-discs', kind: 'disc', code: 'FLP', brands: ['grano', 'brava-pro', 'tatra-works'],
    variants: grid([115, 125], grid([40, 60, 80, 120], grid([['ZR', 'zirconia', '#1F5FBF'], ['CR', 'ceramic', '#C9300C'], ['AO', 'aluminium oxide', '#7A4E2D']] as [string, string, string][], ['conical', 'flat']))).map(([d, [g, [[k, m, col], sh]]]) => ({ k: `${k}-${d}-P${g}-${sh[0].toUpperCase()}`, size: `Ø${d}, P${g}, ${m}, ${sh}`, name: `flap disc ${d} mm P${g}, ${m}, ${sh}, pack of 10`, price: (1.6 + d / 120 + (k === 'CR' ? 1.5 : k === 'ZR' ? 0.8 : 0)) * 10, pack: 10, unit: 'pack', color: col,
      sp: [`Ø${d} mm, grit P${g}`, cap(m), 'Pack of 10'] as [string, string, string], f: { 'Diameter': d + ' mm', 'Grit': 'P' + g, 'Grain': cap(m), 'Shape': cap(sh) } })) });
  line({ fam: 'brush', famName: 'wire brushes', c: 'abrasives', s: 'flap-discs', kind: 'disc', code: 'WBR', brands: ['grano', 'brava-pro'], color: '#B9C0C6',
    variants: grid(['cup', 'wheel'], grid([75, 100], ['crimped', 'knotted'])).map(([t, [d, w]]) => ({ k: `${t[0].toUpperCase()}${w[0].toUpperCase()}-${d}`, size: `${cap(t)} Ø${d}, ${w}`, name: `${w} wire ${t} brush Ø${d} mm, M14`, price: 7 + d / 15 + (w === 'knotted' ? 3 : 0), sp: [`Ø${d} mm ${t}`, cap(w) + ' steel wire', 'M14 thread'] as [string, string, string], f: { 'Diameter': d + ' mm', 'Wire': cap(w), 'Thread': 'M14' } })) });
  const SHEETS: [string, string, number][] = [['13', '1/3 sheet 93 × 230 mm', 0.32], ['12', '1/2 sheet 115 × 280 mm', 0.42], ['D125', 'disc Ø125 mm, 8 holes', 0.38], ['D150', 'disc Ø150 mm, 6+1 holes', 0.5], ['PLM', 'palm sheet 115 × 115 mm', 0.26], ['DLT', 'delta 93 mm, 6 holes', 0.3]];
  line({ fam: 'sanding', famName: 'sanding sheets and discs', c: 'abrasives', s: 'sanding', kind: 'sheet', code: 'SNS', brands: ['grano', 'brava-pro', 'tatra-works', 'fjordline'],
    variants: SHEETS.flatMap(([k, l, p]) => [40, 60, 80, 120, 180, 240, 320, 400].flatMap((g) => [10, 50].map((n) => ({ k: `${k}-P${g}-${n}`, size: `${cap(l)}, P${g}, ${n} pcs`, name: `sanding ${l} P${g}, ${n === 50 ? 'box' : 'pack'} of ${n}`, price: p * n * (n === 50 ? 0.8 : 1) + 0.5, pack: n, unit: n === 50 ? 'box' : 'pack', tier: n === 50, color: g <= 60 ? '#C69A62' : g <= 180 ? '#D8B27A' : '#E9E2CF',
      sp: [cap(l), `Grit P${g}`, k.startsWith('D') || k === 'DLT' ? 'Hook and loop' : 'Clamp fit'] as [string, string, string], f: { 'Format': cap(l), 'Grit': 'P' + g, 'Grain': 'Aluminium oxide', 'Fixing': k.startsWith('D') || k === 'DLT' ? 'Hook and loop' : 'Clamp' } })))) });
  line({ fam: 'sanding-roll', famName: 'sanding rolls and sponges', c: 'abrasives', s: 'sanding', kind: 'sheet', code: 'SNR', brands: ['grano', 'brava-pro'], color: '#D8B27A',
    variants: [...[40, 60, 80, 120, 180, 240].map((g) => ({ k: `R-P${g}`, size: `Roll 115 mm × 50 m, P${g}`, name: `sanding roll 115 mm × 50 m, P${g}`, price: 24, unit: 'roll', sp: ['115 mm × 50 m', `Grit P${g}`, 'Cloth backing'] as [string, string, string], f: { 'Size': '115 mm × 50 m', 'Grit': 'P' + g } })),
      ...['coarse', 'medium', 'fine', 'super fine'].map((g) => ({ k: `SP-${g[0].toUpperCase()}${g.length}`, size: `Sponge, ${g}`, name: `sanding sponge, ${g}, pack of 5`, price: 6.5, pack: 5, unit: 'pack', sp: ['Washable sanding sponge', cap(g), 'Pack of 5'] as [string, string, string], f: { 'Grit': cap(g) } }))] });

  /* electrical */
  const TIES: [number, number][] = [[100, 2.5], [140, 3.6], [200, 3.6], [200, 4.8], [300, 4.8], [370, 4.8], [430, 4.8], [540, 7.6], [750, 9]];
  line({ fam: 'tie', famName: 'cable ties', c: 'electrical', s: 'cable-management', kind: 'cable', code: 'TIE', brands: ['vektor', 'voltaria', 'brezo', 'tatra-works', 'fjordline'],
    variants: grid(TIES, grid(['black', 'natural'], [100, 500])).map(([[l, w], [c, n]]) => ({ k: `${l}x${String(w).replace('.', '')}-${c[0].toUpperCase()}-${n}`, size: `${l} × ${w} mm, ${c}, ${n} pcs`, name: `cable ties ${l} × ${w} mm, ${c}${c === 'black' ? ' UV-resistant' : ''}, ${n === 500 ? 'box' : 'pack'} of ${n}`, price: (l * w / 18000) * n * (n === 500 ? 0.8 : 1) + 1, pack: n, unit: n === 500 ? 'box' : 'pack', tier: n === 500, color: COLORS[c],
      sp: [`${l} × ${w} mm`, c === 'black' ? 'UV-resistant nylon 6.6' : 'Natural nylon 6.6', `${n === 500 ? 'Box' : 'Pack'} of ${n}`] as [string, string, string], f: { 'Length': l + ' mm', 'Width': w + ' mm', 'Tensile strength': Math.round(w * 50) + ' N', 'Colour': cap(c) } })) });
  line({ fam: 'trunking', famName: 'cable trunking', c: 'electrical', s: 'cable-management', kind: 'cable', code: 'TRK', brands: ['vektor', 'voltaria', 'brezo'],
    variants: grid(['16x16', '25x16', '25x25', '40x25', '40x40', '60x40'], ['white', 'grey']).map(([s, c]) => ({ k: `${s}-${c[0].toUpperCase()}`, size: `${s.replace('x', ' × ')} mm, ${c}`, name: `cable trunking ${s.replace('x', ' × ')} mm × 2 m, ${c}`, price: 2 + Number(s.split('x')[0]) * Number(s.split('x')[1]) / 300, color: COLORS[c], unit: 'length', sp: [`${s.replace('x', ' × ')} mm × 2 m`, 'Self-adhesive back', cap(c) + ' PVC'] as [string, string, string], f: { 'Section': s.replace('x', ' × ') + ' mm', 'Length': '2 m', 'Colour': cap(c) } })) });
  line({ fam: 'clips', famName: 'cable clips and conduit', c: 'electrical', s: 'cable-management', kind: 'cable', code: 'CLP', brands: ['vektor', 'voltaria', 'brezo'], color: '#F4F1EA',
    variants: [...[5, 7, 10, 12, 14].map((d) => ({ k: `RC-${d}`, size: `Round clips ${d} mm`, name: `round cable clips ${d} mm, pack of 100`, price: 3 + d * 0.2, pack: 100, unit: 'pack', sp: [`For ${d} mm cable`, 'Hardened steel nail', 'Pack of 100'] as [string, string, string], f: { 'Cable diameter': d + ' mm' } })),
      ...[16, 20, 25, 32].map((d) => ({ k: `CND-${d}`, size: `Conduit Ø${d} mm`, name: `corrugated conduit Ø${d} mm × 25 m`, price: 9 + d * 0.5, unit: 'roll', sp: [`Ø${d} mm`, '25 m roll', 'Self-extinguishing'] as [string, string, string], f: { 'Diameter': d + ' mm', 'Length': '25 m' } }))] });
  line({ fam: 'ins-tape', famName: 'insulating tape', c: 'electrical', s: 'connectors', kind: 'tape', code: 'INT', brands: ['vektor', 'voltaria', 'brezo', 'tatra-works', 'fjordline'],
    variants: grid([[15, 10], [19, 20], [25, 25]] as [number, number][], ['black', 'white', 'red', 'blue', 'yellow', 'green', 'grey', 'brown', 'green-yellow']).map(([[w, m], c]) => ({ k: `${w}x${m}-${CC[c]}`, size: `${w} mm × ${m} m, ${c}`, name: `PVC insulating tape ${w} mm × ${m} m, ${c}`, price: 0.6 + w * m / 300, unit: 'roll', color: COLORS[c],
      sp: [`${w} mm × ${m} m`, 'VDE 600 V', 'Flame retardant'] as [string, string, string], f: { 'Size': `${w} mm × ${m} m`, 'Voltage': '600 V', 'Colour': cap(c) } })) });
  line({ fam: 'connector', famName: 'wire connectors and terminals', c: 'electrical', s: 'connectors', kind: 'connector', code: 'CON', brands: ['vektor', 'voltaria', 'brezo'],
    variants: [...grid([2, 3, 5], [10, 50]).map(([w, n]) => ({ k: `LV${w}-${n}`, size: `Lever ${w}-way, ${n} pcs`, name: `lever wire connectors ${w}-way, pack of ${n}`, price: (0.18 + w * 0.06) * n + 0.5, pack: n, unit: 'pack', sp: [`${w} conductors`, '0.2–4 mm²', `Pack of ${n}`] as [string, string, string], f: { 'Conductors': String(w), 'Cross-section': '0.2–4 mm²' } })),
      ...[2, 3, 4, 5, 8].map((w) => ({ k: `PI${w}`, size: `Push-in ${w}-way`, name: `push-in wire connectors ${w}-way, pack of 100`, price: 6 + w * 2, pack: 100, unit: 'pack', tier: true, sp: [`${w} conductors`, '0.5–2.5 mm² solid', 'Pack of 100'] as [string, string, string], f: { 'Conductors': String(w), 'Cross-section': '0.5–2.5 mm²' } })),
      ...[6, 10, 16].map((s) => ({ k: `TS${s}`, size: `Terminal strip ${s} mm²`, name: `terminal strip 12-way ${s} mm²`, price: 2 + s * 0.15, sp: ['12-way', `Up to ${s} mm²`, 'Cut to length'] as [string, string, string], f: { 'Ways': '12', 'Cross-section': s + ' mm²' } })),
      ...grid(['ring', 'spade', 'butt'], [['R', 'red', '0.5–1.5'], ['B', 'blue', '1.5–2.5'], ['Y', 'yellow', '4–6']] as [string, string, string][]).map(([t, [k, c, s]]) => ({ k: `CR-${t[0].toUpperCase()}${k}`, size: `${cap(t)}, ${c}`, name: `${t} crimp terminals ${c} ${s} mm², pack of 100`, price: 5.5, pack: 100, unit: 'pack', color: COLORS[c], sp: [cap(t) + ' terminal', `${s} mm²`, 'Pack of 100'] as [string, string, string], f: { 'Type': cap(t), 'Cross-section': s + ' mm²' } })),
      ...[['HS1', 'heat shrink kit, 127 pieces', 9], ['HS2', 'heat shrink kit, 328 pieces', 16], ['HSB', 'heat shrink tubing 1 m assortment', 7]].map(([k, l, p]) => ({ k: String(k), size: cap(String(l)), name: String(l), price: Number(p), sp: [cap(String(l)), '2:1 shrink ratio', 'Assorted colours'] as [string, string, string], f: { 'Ratio': '2:1' } }))] });
  line({ fam: 'outlet', famName: 'socket outlets', c: 'electrical', s: 'outlets', kind: 'outlet', code: 'OUT', brands: ['vektor', 'voltaria', 'brezo'],
    variants: [...grid(['single', 'double', 'triple'], grid(['surface', 'flush'], ['white', 'black', 'grey'])).map(([n, [m, c]]) => ({ k: `${n[0].toUpperCase()}${m[0].toUpperCase()}-${c[0].toUpperCase()}`, size: `${cap(n)}, ${m}, ${c}`, name: `${n} socket outlet 16 A, ${m} mount, ${c}`, price: (n === 'single' ? 5.5 : n === 'double' ? 9.5 : 13.5) + (m === 'flush' ? 1.5 : 0) + (c === 'white' ? 0 : 1.2), color: COLORS[c],
      sp: ['16 A 250 V', 'Type F (Schuko)', cap(m) + ' mount'] as [string, string, string], f: { 'Rating': '16 A / 250 V', 'Type': 'F (Schuko)', 'Mounting': cap(m), 'Gangs': n === 'single' ? '1' : n === 'double' ? '2' : '3', 'Colour': cap(c) } })),
      ...grid(['single', 'double'], ['grey', 'white']).map(([n, c]) => ({ k: `IP-${n[0].toUpperCase()}-${c[0].toUpperCase()}`, size: `IP44 ${n}, ${c}`, name: `IP44 ${n} socket outlet with lid, ${c}`, price: n === 'single' ? 9.9 : 15.9, color: COLORS[c], sp: ['16 A 250 V', 'IP44 splash-proof', 'Hinged lid'] as [string, string, string], f: { 'Rating': '16 A / 250 V', 'Protection': 'IP44' } })),
      ...grid(['USB-A + USB-C', 'dual USB-C'], ['white', 'black']).map(([u, c]) => ({ k: `USB-${u.length}-${c[0].toUpperCase()}`, size: `With ${u}, ${c}`, name: `socket outlet with ${u} charger, ${c}`, price: 24.9, color: COLORS[c], sp: ['16 A 250 V', u + ', 3.1 A', 'Flush mount'] as [string, string, string], f: { 'Rating': '16 A / 250 V', 'USB': u } }))] });
  line({ fam: 'switch', famName: 'switches and power strips', c: 'electrical', s: 'switches', kind: 'outlet', code: 'SWT', brands: ['vektor', 'voltaria', 'brezo'],
    variants: [...grid([['1W', 'one-way switch'], ['2W', 'two-way switch'], ['IM', 'intermediate switch'], ['DB', 'double switch'], ['DM', 'LED dimmer']] as [string, string][], ['white', 'black', 'grey']).map(([[k, l], c]) => ({ k: `${k}-${c[0].toUpperCase()}`, size: `${cap(l)}, ${c}`, name: `${l} 10 A, ${c}`, price: k === 'DM' ? 19.9 : k === 'DB' ? 8.9 : 4.9, color: COLORS[c], sp: ['10 A 250 V', cap(l), 'Flush mount'] as [string, string, string], f: { 'Rating': '10 A / 250 V', 'Type': cap(l), 'Colour': cap(c) } })),
      ...grid([3, 4, 5, 6], grid(['with switch', 'without switch'], [1.5, 3])).map(([n, [s, m]]) => ({ k: `PS${n}-${s === 'with switch' ? 'SW' : 'NS'}-${m * 10}`, size: `${n} outlets, ${s}, ${m} m`, name: `power strip ${n} outlets ${s}, ${m} m cable`, price: 6 + n * 1.6 + (s === 'with switch' ? 2.5 : 0) + m, color: '#F4F1EA', sp: [`${n} Schuko outlets`, cap(s), `${m} m H05VV-F cable`] as [string, string, string], f: { 'Outlets': String(n), 'Cable': m + ' m', 'Switch': s === 'with switch' ? 'Yes' : 'No' } })),
      ...[25, 40, 50].map((m) => ({ k: `REEL-${m}`, size: `Reel ${m} m`, name: `cable reel ${m} m, 4 outlets`, price: 29 + m * 0.9, sp: [`${m} m H05VV-F 3G1.5`, '4 outlets', 'Thermal cut-out'] as [string, string, string], f: { 'Length': m + ' m', 'Cable': 'H05VV-F 3G1.5' } }))] });
  line({ fam: 'cable', famName: 'cable and wire', c: 'electrical', s: 'cable', kind: 'cable', code: 'CBL', brands: ['vektor', 'voltaria', 'brezo'],
    variants: [...grid(['3G1.5', '3G2.5', '5G2.5', '5G4'], [10, 25, 50]).map(([s, m]) => ({ k: `H07-${s.replace('.', '')}-${m}`, size: `H07RN-F ${s}, ${m} m`, name: `rubber cable H07RN-F ${s} mm², ${m} m roll`, price: m * (s === '3G1.5' ? 1.1 : s === '3G2.5' ? 1.6 : s === '5G2.5' ? 2.5 : 3.6), unit: 'roll', color: '#2A3036', sp: [`H07RN-F ${s} mm²`, `${m} m roll`, 'Outdoor and site use'] as [string, string, string], f: { 'Type': 'H07RN-F', 'Conductors': s + ' mm²', 'Length': m + ' m' } })),
      ...grid([1.5, 2.5, 4, 6], ['blue', 'brown', 'black', 'grey', 'green-yellow']).map(([s, c]) => ({ k: `H07V-${String(s).replace('.', '')}-${CC[c]}`, size: `${s} mm², ${c}`, name: `installation wire H07V-K ${s} mm², ${c}, 100 m`, price: 100 * s * 0.11 + 4, unit: 'roll', color: COLORS[c], sp: [`H07V-K ${s} mm²`, cap(c), '100 m roll'] as [string, string, string], f: { 'Type': 'H07V-K', 'Cross-section': s + ' mm²', 'Colour': cap(c), 'Length': '100 m' } }))] });

  return out;
}
