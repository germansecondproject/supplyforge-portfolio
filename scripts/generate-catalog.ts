/* Generates the synthetic catalogue: the 188 original products first (ids 1–188, unchanged), then the extended range from
 * scripts/ranges.ts up to TARGET products.
 *   node scripts/generate-catalog.ts
 * Outputs: data/catalog.json (the original 188 products, used when Supabase is not configured) and supabase/seed/*.sql. */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import {
  TYPES, MATNAME, MATGRADE, MATDESC, PITCH, GEO, packOf, tl, cap, refOf, priceBolt, priceNut, priceWasher,
  boltTitle, boltBoxWeight,
} from '../src/lib/standards.ts';
import type { BoltType, MatKey } from '../src/lib/standards.ts';
import type { Brand, Catalog, Category, Family, Product, Recommendation, StockLine, Subcategory } from '../src/lib/types.ts';
import { NEW_BRANDS, NEW_SUBCATEGORIES, buildRanges } from './ranges.ts';

/* ---------- deterministic randomness ---------- */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed: string) {
  let a = hash(seed);
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- taxonomy ---------- */
// Product images live in the public Supabase Storage bucket `product-images` (uploaded by supabase/functions/upload-product-images).
const IMAGE_BASE = process.env.IMAGE_BASE_URL ?? 'https://synglipskpbnlknlrqsu.supabase.co/storage/v1/object/public/product-images';

const categories: Category[] = [
  { slug: 'fasteners', name: 'Fasteners', tone: 'yellow', icon: 'c-screw', blurb: 'Bolts, screws, nuts and washers to DIN and ISO standards.', position: 1 },
  { slug: 'anchors', name: 'Anchors & plugs', tone: 'navy', icon: 'c-anchor', blurb: 'Wall plugs, frame anchors and chemical fixings for every substrate.', position: 2 },
  { slug: 'hand-tools', name: 'Hand tools', tone: 'red', icon: 'c-wrench', blurb: 'Hammers, pliers, spanners, bits and measuring tools.', position: 3 },
  { slug: 'power-tools', name: 'Power tools', tone: 'blue', icon: 'c-drill', blurb: 'Cordless drills, drivers and grinders for site and workshop.', position: 4 },
  { slug: 'safety', name: 'Safety & PPE', tone: 'teal', icon: 'c-helmet', blurb: 'Head, eye, hand and respiratory protection.', position: 5 },
  { slug: 'locks', name: 'Locks & hardware', tone: 'graphite', icon: 'c-lock', blurb: 'Padlocks, hinges and door hardware.', position: 6 },
  { slug: 'abrasives', name: 'Abrasives & cutting', tone: 'plum', icon: 'c-disc', blurb: 'Cutting, grinding and flap discs, sanding sheets.', position: 7 },
  { slug: 'electrical', name: 'Electrical', tone: 'orange', icon: 'c-plug', blurb: 'Cable management, tape, connectors and outlets.', position: 8 },
];

const subcategories: Subcategory[] = [
  ['fasteners', 'hex-bolts', 'Hex bolts'], ['fasteners', 'socket-screws', 'Socket cap screws'], ['fasteners', 'countersunk-screws', 'Countersunk screws'],
  ['fasteners', 'wood-screws', 'Chipboard screws'], ['fasteners', 'nuts', 'Nuts'], ['fasteners', 'washers', 'Washers'],
  ['anchors', 'wall-plugs', 'Wall plugs'], ['anchors', 'frame-anchors', 'Frame anchors'], ['anchors', 'chemical-fixings', 'Chemical fixings'],
  ['hand-tools', 'hammers', 'Hammers'], ['hand-tools', 'pliers-spanners', 'Pliers & spanners'], ['hand-tools', 'measuring', 'Measuring & marking'], ['hand-tools', 'bits', 'Bits & drivers'],
  ['power-tools', 'drills', 'Drills & drivers'], ['power-tools', 'grinders', 'Grinders'],
  ['safety', 'head', 'Head protection'], ['safety', 'eyes', 'Eye protection'], ['safety', 'hands', 'Hand protection'], ['safety', 'respiratory', 'Respiratory'],
  ['locks', 'padlocks', 'Padlocks'], ['locks', 'hinges', 'Hinges'],
  ['abrasives', 'discs', 'Cutting & grinding discs'], ['abrasives', 'sanding', 'Sanding'],
  ['electrical', 'cable-management', 'Cable management'], ['electrical', 'connectors', 'Connectors & tape'], ['electrical', 'outlets', 'Outlets'],
  ...NEW_SUBCATEGORIES,
].map(([category, slug, name], i) => ({ category, slug, name, position: i + 1 }));

const brands: Brand[] = [
  { slug: 'forge-pro', name: 'Forge Pro', country: 'ES' }, { slug: 'alpenfix', name: 'Alpenfix', country: 'AT' }, { slug: 'nordgrip', name: 'Nordgrip', country: 'SE' },
  { slug: 'ferrum-co', name: 'Ferrum & Co', country: 'DE' }, { slug: 'torque-lab', name: 'Torque Lab', country: 'DE' }, { slug: 'brava-pro', name: 'Brava Pro', country: 'IT' },
  { slug: 'anclatec', name: 'Anclatec', country: 'ES' }, { slug: 'vektor', name: 'Vektor', country: 'PL' }, { slug: 'kestrel', name: 'Kestrel', country: 'GB' },
  ...NEW_BRANDS,
];
const brandName = Object.fromEntries(brands.map((b) => [b.slug, b.name]));

/** What each section below defines; enrich() adds codes, logistics, media and stock. */
type Base = Pick<Product, 'id' | 'slug' | 'ref' | 'name' | 'category' | 'sub' | 'brand' | 'std' | 'mat' | 'd' | 'len' | 'pack' | 'unit' | 'tier' | 'price' | 'off' | 'stock' | 'rating' | 'reviews' | 'specs' | 'blurb' | 'spec_table' | 'art'>
  & { family: string | null; size: string | null; kg?: number };

const bases: Base[] = [];
let nextId = 1;

function finish(p: Omit<Base, 'id' | 'slug' | 'rating' | 'reviews' | 'off' | 'stock' | 'size'> & { stock?: number; off?: number; size?: string | null; reviews?: number }): Base {
  const r = rng(p.ref);
  const full: Base = {
    ...p,
    size: p.size ?? null,
    id: nextId++,
    slug: p.ref.toLowerCase(),
    off: p.off ?? (r() < 0.13 ? [0.1, 0.12, 0.15, 0.2][Math.floor(r() * 4)] : 0),
    stock: p.stock ?? (() => { const x = r(); return x < 0.06 ? 0 : x < 0.14 ? Math.floor(4 + r() * 22) : Math.floor(60 + r() * 2200); })(),
    rating: Math.round((4.3 + r() * 0.6) * 10) / 10,
    reviews: Math.floor(8 + r() * 290),
  };
  if (p.reviews !== undefined) full.reviews = p.reviews;
  bases.push(full);
  return full;
}

function sold(p: { pack: number; unit: string; tier: boolean }) {
  return p.tier ? `Box of ${p.pack}` : p.pack > 1 ? `Pack of ${p.pack}` : p.unit === 'each' ? 'Sold individually' : `Sold per ${p.unit}`;
}

/* ---------- fasteners: bolts and screws ---------- */
const DIAMS: Record<BoltType, number[]> = { hex: [6, 8, 10, 12], socket: [6, 8, 10], flat: [5, 6, 8], wood: [4, 5, 6] };
const MATS: Record<BoltType, MatKey[]> = { hex: ['A2', 'A4', 'ZN'], socket: ['BK', 'A2', 'ZN'], flat: ['A2', 'BK', 'ZN'], wood: ['ZY'] };
const LENS: Record<BoltType, number[]> = { hex: [25, 40, 60], socket: [20, 30, 40, 60], flat: [20, 30, 40], wood: [30, 40, 50, 60, 80] };
const BOLT_BRAND: Record<BoltType, string> = { hex: 'forge-pro', socket: 'alpenfix', flat: 'torque-lab', wood: 'forge-pro' };

function boltStock(t: BoltType, mat: MatKey, d: number, L: number) {
  if (t === 'hex' && mat === 'A2' && d === 8 && L === 40) return 842;
  const s = (d * 13 + L * 7 + t.length * 5 + mat.charCodeAt(0)) % 11;
  return s === 0 ? 0 : s < 3 ? 4 + s * 4 : 120 + ((s * 97) % 700);
}

(Object.keys(TYPES) as BoltType[]).forEach((t) => {
  for (const mat of MATS[t]) for (const d of DIAMS[t]) for (const L of LENS[t]) {
    const g = GEO[t](d);
    const pack = packOf(t);
    const thread = t === 'wood' ? 'Full thread' : t === 'socket' || (t === 'flat' && L > 40) ? 'Partial thread' : 'Full thread';
    const driveLabel = t === 'hex' ? 'Spanner AF' : t === 'wood' ? 'Drive' : 'Hex key';
    const driveVal = t === 'hex' ? g.key + ' mm' : t === 'wood' ? (d >= 6 ? 'PZ3' : 'PZ2') : g.key + ' mm';
    const unit = { tier: true, pack, unit: 'box' };
    const thr = t === 'wood' ? 'Full thread with a self-drilling point for chipboard and softwood.' : t === 'socket' ? 'Cylindrical head with internal hex. Partial thread for high-load joints.' : t === 'flat' ? 'Countersunk head with internal hex, sits flush with the part.' : 'Full thread, coarse metric pitch. Hex head with sharp edges.';
    finish({
      ref: refOf(t, mat, d, L),
      name: boltTitle(t, mat, d, L),
      category: 'fasteners', sub: TYPES[t].slug, brand: BOLT_BRAND[t], family: 'bolt-' + t,
      std: TYPES[t].norm, mat, d, len: L,
      ...unit,
      price: priceBolt(t, mat, d, L),
      stock: boltStock(t, mat, d, L),
      specs: [`${thread} ${tl(t, d)}`, MATGRADE[mat], `Box of ${pack}`],
      blurb: [thr, MATDESC[mat], `Sold in boxes of ${pack} with batch traceability.`],
      spec_table: [
        ['Standard', TYPES[t].norm + (TYPES[t].iso ? ' / ' + TYPES[t].iso : '')],
        ['Thread', tl(t, d) + (t === 'wood' ? ' mm' : '')],
        ['Pitch', t === 'wood' ? '—' : PITCH[d] + ' mm'],
        ['Length', L + ' mm'],
        ['Head', (t === 'hex' ? 'Hexagonal' : t === 'socket' ? 'Cylindrical' : t === 'flat' ? 'Countersunk 90°' : 'Countersunk') + ', k = ' + g.k + ' mm'],
        [driveLabel, driveVal],
        ['Head diameter', g.hw + ' mm'],
        ['Material', cap(MATNAME[mat])],
        ['Strength', MATGRADE[mat]],
        ['Pieces per box', String(pack)],
        ['Weight per box', boltBoxWeight(t, d, L).toFixed(2) + ' kg'],
        ['Part number', refOf(t, mat, d, L)],
      ],
      art: { kind: 'bolt', t, mat, d, L },
      kg: boltBoxWeight(t, d, L),
    });
  }
});

/* ---------- fasteners: nuts and washers ---------- */
const NUT_D = [6, 8, 10, 12];
const NUT_MATS: MatKey[] = ['A2', 'ZN'];
const nutAF: Record<number, number> = { 6: 10, 8: 13, 10: 16, 12: 18 };
const nutH: Record<number, number> = { 6: 5, 8: 6.5, 10: 8, 12: 10 };
for (const [code, kind, label] of [['934', 'nut', 'Hex nut'], ['985', 'lock', 'Nylon-insert lock nut']] as const) {
  for (const mat of NUT_MATS) for (const d of NUT_D) {
    const ref = `SF-${code}-${mat}-${d}`;
    const pack = 100;
    finish({
      ref, name: `${label} DIN ${code} M${d} ${MATNAME[mat]}`,
      category: 'fasteners', sub: 'nuts', brand: 'forge-pro', family: 'nut-' + code,
      std: 'DIN ' + code, mat, d, len: null, tier: true, pack, unit: 'box',
      price: priceNut(kind, mat, d),
      specs: [kind === 'lock' ? 'Nylon insert' : 'Metric coarse thread', MATGRADE[mat], `Box of ${pack}`],
      blurb: [kind === 'lock' ? 'Nylon insert locks the nut against vibration. Reusable a few times.' : 'Standard hexagon nut for metric bolts and threaded rod.', MATDESC[mat], `Sold in boxes of ${pack} with batch traceability.`],
      spec_table: [
        ['Standard', 'DIN ' + code + (kind === 'lock' ? ' / ISO 10511' : ' / ISO 4032')], ['Thread', 'M' + d], ['Pitch', PITCH[d] + ' mm'],
        ['Spanner size (AF)', nutAF[d] + ' mm'], ['Height', nutH[d] + (kind === 'lock' ? 4 : 0) + ' mm'], ['Material', cap(MATNAME[mat])], ['Strength', MATGRADE[mat]],
        ['Pieces per box', String(pack)], ['Part number', ref],
      ],
      art: { kind: 'nut', mat, d },
    });
  }
}
for (const mat of NUT_MATS) for (const d of NUT_D) {
  const ref = `SF-125-${mat}-${d}`;
  const od: Record<number, number> = { 6: 12, 8: 16, 10: 20, 12: 24 }, id: Record<number, number> = { 6: 6.4, 8: 8.4, 10: 10.5, 12: 13 }, th: Record<number, number> = { 6: 1.6, 8: 1.6, 10: 2, 12: 2.5 };
  finish({
    ref, name: `Flat washer DIN 125 M${d} ${MATNAME[mat]}`,
    category: 'fasteners', sub: 'washers', brand: 'forge-pro', family: 'washer-125',
    std: 'DIN 125', mat, d, len: null, tier: true, pack: 200, unit: 'box',
    price: priceWasher(mat, d),
    specs: [`Ø ${id[d]} × ${od[d]} × ${th[d]} mm`, MATGRADE[mat].replace('class', 'HV'), 'Box of 200'],
    blurb: ['Spreads the load of a nut or bolt head over a larger area.', MATDESC[mat], 'Sold in boxes of 200 with batch traceability.'],
    spec_table: [['Standard', 'DIN 125 / ISO 7089'], ['For thread', 'M' + d], ['Inner diameter', id[d] + ' mm'], ['Outer diameter', od[d] + ' mm'], ['Thickness', th[d] + ' mm'], ['Material', cap(MATNAME[mat])], ['Pieces per box', '200'], ['Part number', ref]],
    art: { kind: 'washer', mat, d },
  });
}

/* ---------- everything else: compact definitions ---------- */
interface Other {
  ref: string; name: string; c: string; s: string; brand: string; kind: string; price: number;
  pack?: number; unit?: string; tier?: boolean; sp: [string, string, string]; f: Record<string, string>; color?: string; off?: number; stock?: number; family?: string;
}
/* families for the non-fastener range: ref -> [family slug, size label]. Products not listed form a family of one. */
const OTHER_FAMILY: Record<string, [string, string]> = {
  'SF-NYL-6x30': ['plug-nylon', '6 × 30 mm'], 'SF-NYL-8x40': ['plug-nylon', '8 × 40 mm'], 'SF-NYL-10x50': ['plug-nylon', '10 × 50 mm'],
  'SF-FRA-10x100': ['anchor-frame', 'M10 × 100 mm'], 'SF-FRA-12x120': ['anchor-frame', 'M12 × 120 mm'],
  'SF-RES-VE300': ['resin-300', 'Vinylester'], 'SF-RES-PE300': ['resin-300', 'Polyester'],
  'SF-LOC-50': ['threadlocker', 'Medium strength'], 'SF-LOC-HS50': ['threadlocker', 'High strength'],
  'SF-TAPE-5': ['tape-measure', '5 m'], 'SF-TAPE-8': ['tape-measure', '8 m'],
  'SF-BIT-PZ2': ['bit-set', 'Pozidriv PZ2'], 'SF-BIT-T20': ['bit-set', 'Torx T20–T30'],
  'SF-DRL-18A': ['drill-18v', '2 × 2.0 Ah'], 'SF-DRL-18B': ['drill-18v', 'Brushless, 2 × 4.0 Ah'],
  'SF-HLM-WH': ['helmet-en397', 'White'], 'SF-HLM-YL': ['helmet-en397', 'Yellow'],
  'SF-GLS-CLR': ['glasses-en166', 'Clear lens'], 'SF-GLS-SMK': ['glasses-en166', 'Smoked lens'],
  'SF-GLV-9': ['gloves-nitrile', 'Size 9 (L)'], 'SF-GLV-10': ['gloves-nitrile', 'Size 10 (XL)'],
  'SF-PAD-40': ['padlock', '40 mm brass'], 'SF-PAD-50H': ['padlock', '50 mm hardened'],
  'SF-HNG-100': ['butt-hinge-100', 'Zinc plated'], 'SF-HNG-100S': ['butt-hinge-100', 'A2 stainless'],
  'SF-TIE-200': ['cable-tie', '200 × 3.6 mm'], 'SF-TIE-300': ['cable-tie', '300 × 4.8 mm'],
};
const FAMILY_NAME: Record<string, string> = {
  'nut-934': 'Hex nut DIN 934', 'nut-985': 'Nylon-insert lock nut DIN 985', 'washer-125': 'Flat washer DIN 125',
  'plug-nylon': 'Nylon wall plug with collar', 'anchor-frame': 'Frame anchor with hex nut', 'resin-300': 'Injection resin 300 ml',
  'threadlocker': 'Threadlocker 50 ml', 'tape-measure': 'Measuring tape, nylon-coated blade', 'bit-set': 'Screwdriver bit set',
  'drill-18v': 'Cordless drill driver 18 V', 'helmet-en397': 'Safety helmet EN 397', 'glasses-en166': 'Safety glasses EN 166',
  'gloves-nitrile': 'Nitrile-coated work gloves', 'padlock': 'Padlock', 'butt-hinge-100': 'Butt hinge 100 mm', 'cable-tie': 'Cable ties, black',
};

const others: Other[] = [
  /* anchors */
  { ref: 'SF-NYL-6x30', name: 'Nylon wall plug with collar 6 × 30 mm', c: 'anchors', s: 'wall-plugs', brand: 'anclatec', kind: 'anchor', price: 5.2, pack: 100, tier: true, unit: 'box', sp: ['For concrete and brick', 'Ø 6 × 30 mm', 'Box of 100'], f: { 'Diameter': '6 mm', 'Length': '30 mm', 'Screw size': '4–5 mm', 'Substrate': 'Concrete, solid brick' } },
  { ref: 'SF-NYL-8x40', name: 'Nylon wall plug with collar 8 × 40 mm', c: 'anchors', s: 'wall-plugs', brand: 'anclatec', kind: 'anchor', price: 6.9, pack: 100, tier: true, unit: 'box', off: 0.15, stock: 2200, sp: ['For concrete and brick', 'Ø 8 × 40 mm', 'Box of 100'], f: { 'Diameter': '8 mm', 'Length': '40 mm', 'Screw size': '5–6 mm', 'Substrate': 'Concrete, solid brick' } },
  { ref: 'SF-NYL-10x50', name: 'Nylon wall plug with collar 10 × 50 mm', c: 'anchors', s: 'wall-plugs', brand: 'anclatec', kind: 'anchor', price: 9.4, pack: 50, tier: true, unit: 'box', sp: ['For concrete and brick', 'Ø 10 × 50 mm', 'Box of 50'], f: { 'Diameter': '10 mm', 'Length': '50 mm', 'Screw size': '6–8 mm', 'Substrate': 'Concrete, solid brick' } },
  { ref: 'SF-HOL-8x60', name: 'Hollow-wall expansion plug 8 × 60 mm', c: 'anchors', s: 'wall-plugs', brand: 'anclatec', kind: 'anchor', price: 8.2, pack: 50, tier: true, unit: 'box', color: '#E8761B', sp: ['For hollow brick and plasterboard', 'Ø 8 × 60 mm', 'Box of 50'], f: { 'Diameter': '8 mm', 'Length': '60 mm', 'Screw size': '5–6 mm', 'Substrate': 'Hollow brick, plasterboard' } },
  { ref: 'SF-FRA-10x100', name: 'Frame anchor with hex nut M10 × 100 mm, zinc plated', c: 'anchors', s: 'frame-anchors', brand: 'alpenfix', kind: 'anchor', price: 24.5, pack: 20, tier: true, unit: 'box', color: '#C7CDD2', sp: ['Through-fixing', 'M10 × 100 mm', 'Box of 20'], f: { 'Thread': 'M10', 'Length': '100 mm', 'Max fixture thickness': '30 mm', 'Substrate': 'Cracked and uncracked concrete' } },
  { ref: 'SF-FRA-12x120', name: 'Frame anchor with hex nut M12 × 120 mm, zinc plated', c: 'anchors', s: 'frame-anchors', brand: 'alpenfix', kind: 'anchor', price: 31.9, pack: 20, tier: true, unit: 'box', color: '#C7CDD2', sp: ['Through-fixing', 'M12 × 120 mm', 'Box of 20'], f: { 'Thread': 'M12', 'Length': '120 mm', 'Max fixture thickness': '40 mm', 'Substrate': 'Cracked and uncracked concrete' } },
  { ref: 'SF-RES-VE300', name: 'Vinylester injection resin, 300 ml cartridge', c: 'anchors', s: 'chemical-fixings', brand: 'alpenfix', kind: 'cartridge', price: 18.9, unit: 'cartridge', sp: ['Styrene-free', '300 ml cartridge', 'Works down to −5 °C'], f: { 'Volume': '300 ml', 'Base': 'Vinylester', 'Temperature range': '−5 to +40 °C', 'Cure time': '45 min at 20 °C' } },
  { ref: 'SF-RES-PE300', name: 'Polyester injection resin, 300 ml cartridge', c: 'anchors', s: 'chemical-fixings', brand: 'alpenfix', kind: 'cartridge', price: 12.4, unit: 'cartridge', color: '#0B7A6E', sp: ['For solid masonry', '300 ml cartridge', 'Economy grade'], f: { 'Volume': '300 ml', 'Base': 'Polyester', 'Temperature range': '+5 to +35 °C', 'Cure time': '60 min at 20 °C' } },
  { ref: 'SF-NOZ-10', name: 'Static mixing nozzles for resin cartridges, pack of 10', c: 'anchors', s: 'chemical-fixings', brand: 'alpenfix', kind: 'cartridge', price: 11.5, pack: 10, unit: 'pack', color: '#C9300C', sp: ['Fits 300 ml cartridges', 'Pack of 10', 'Includes extension tube'], f: { 'Pack': '10 nozzles', 'Fits': '300 ml cartridges' } },
  { ref: 'SF-LOC-50', name: 'Threadlocker, medium strength, 50 ml', c: 'anchors', s: 'chemical-fixings', brand: 'torque-lab', kind: 'locker', price: 8.4, unit: 'bottle', stock: 420, sp: ['Blue, removable', 'M4 to M20 threads', '50 ml bottle'], f: { 'Strength': 'Medium, removable', 'Volume': '50 ml', 'Thread range': 'M4–M20', 'Cure time': '24 h full strength' } },
  { ref: 'SF-LOC-HS50', name: 'Threadlocker, high strength, 50 ml', c: 'anchors', s: 'chemical-fixings', brand: 'torque-lab', kind: 'locker', price: 9.9, unit: 'bottle', color: '#C9300C', sp: ['Red, permanent', 'M4 to M20 threads', '50 ml bottle'], f: { 'Strength': 'High, permanent', 'Volume': '50 ml', 'Thread range': 'M4–M20', 'Cure time': '24 h full strength' } },
  /* hand tools */
  { ref: 'SF-HAM-450', name: 'Claw hammer 450 g, fibreglass handle', c: 'hand-tools', s: 'hammers', brand: 'ferrum-co', kind: 'hammer', price: 16.9, unit: 'each', sp: ['450 g head', 'Fibreglass handle', 'Rubber grip'], f: { 'Head weight': '450 g', 'Handle': 'Fibreglass', 'Length': '320 mm' } },
  { ref: 'SF-HAM-800', name: 'Club hammer 1.25 kg, drop-forged head', c: 'hand-tools', s: 'hammers', brand: 'ferrum-co', kind: 'hammer', price: 21.5, unit: 'each', color: '#C9300C', sp: ['1.25 kg head', 'Drop-forged', 'Hickory handle'], f: { 'Head weight': '1.25 kg', 'Handle': 'Hickory', 'Length': '270 mm' } },
  { ref: 'SF-PLI-180', name: 'Combination pliers 180 mm, insulated', c: 'hand-tools', s: 'pliers-spanners', brand: 'ferrum-co', kind: 'pliers', price: 14.2, unit: 'each', off: 0.12, sp: ['180 mm', 'VDE 1000 V insulated', 'Chrome-vanadium'], f: { 'Length': '180 mm', 'Insulation': 'VDE 1000 V', 'Steel': 'Chrome-vanadium' } },
  { ref: 'SF-PLI-LOCK', name: 'Locking pliers 250 mm, curved jaw', c: 'hand-tools', s: 'pliers-spanners', brand: 'ferrum-co', kind: 'pliers', price: 12.8, unit: 'each', color: '#1F5FBF', sp: ['250 mm', 'Curved jaw', 'Quick release'], f: { 'Length': '250 mm', 'Jaw': 'Curved', 'Capacity': '0–40 mm' } },
  { ref: 'SF-SPA-ADJ250', name: 'Adjustable spanner 250 mm', c: 'hand-tools', s: 'pliers-spanners', brand: 'ferrum-co', kind: 'wrench', price: 15.9, unit: 'each', sp: ['250 mm', 'Opens to 30 mm', 'Chrome plated'], f: { 'Length': '250 mm', 'Jaw capacity': '30 mm', 'Finish': 'Chrome plated' } },
  { ref: 'SF-SPA-SET8', name: 'Combination spanner set 8–19 mm, 8 pieces', c: 'hand-tools', s: 'pliers-spanners', brand: 'ferrum-co', kind: 'wrench', price: 34.9, unit: 'set', color: '#F2B705', sp: ['8–19 mm', '8 pieces', 'Roll-up pouch'], f: { 'Sizes': '8, 10, 11, 13, 14, 17, 19 mm', 'Pieces': '8', 'Steel': 'Chrome-vanadium' } },
  { ref: 'SF-TAPE-5', name: 'Measuring tape 5 m, nylon-coated blade', c: 'hand-tools', s: 'measuring', brand: 'ferrum-co', kind: 'tape', price: 9.5, unit: 'each', stock: 180, sp: ['5 m × 25 mm', 'Magnetic hook', 'Shock-proof case'], f: { 'Length': '5 m', 'Blade width': '25 mm', 'Accuracy': 'Class II' } },
  { ref: 'SF-TAPE-8', name: 'Measuring tape 8 m, nylon-coated blade', c: 'hand-tools', s: 'measuring', brand: 'ferrum-co', kind: 'tape', price: 13.9, unit: 'each', color: '#1F5FBF', sp: ['8 m × 27 mm', 'Magnetic hook', 'Belt clip'], f: { 'Length': '8 m', 'Blade width': '27 mm', 'Accuracy': 'Class II' } },
  { ref: 'SF-LVL-600', name: 'Aluminium spirit level 600 mm, 3 vials', c: 'hand-tools', s: 'measuring', brand: 'ferrum-co', kind: 'level', price: 19.9, unit: 'each', sp: ['600 mm', '3 vials', 'Magnetic edge'], f: { 'Length': '600 mm', 'Vials': '3', 'Accuracy': '0.5 mm/m' } },
  { ref: 'SF-BIT-PZ2', name: 'Pozidriv PZ2 bit set, 4 colour-coded bits', c: 'hand-tools', s: 'bits', brand: 'torque-lab', kind: 'bits', price: 7.9, unit: 'set', stock: 300, sp: ['50 mm, S2 steel', 'Magnetic holder fits', 'Set of 4'], f: { 'Drive': 'Pozidriv PZ2', 'Length': '50 mm', 'Steel': 'S2', 'Pieces': '4' } },
  { ref: 'SF-BIT-T20', name: 'Torx bit set T20–T30, 6 pieces', c: 'hand-tools', s: 'bits', brand: 'torque-lab', kind: 'bits', price: 9.2, unit: 'set', color: '#5B3FA0', sp: ['T20, T25, T27, T30', '50 mm, S2 steel', 'Set of 6'], f: { 'Drive': 'Torx T20–T30', 'Length': '50 mm', 'Steel': 'S2', 'Pieces': '6' } },
  /* power tools */
  { ref: 'SF-DRL-18A', name: 'Cordless drill driver 18 V, 2 × 2.0 Ah', c: 'power-tools', s: 'drills', brand: 'kestrel', kind: 'drill', price: 89, unit: 'each', sp: ['18 V, 2 speeds', '2 × 2.0 Ah batteries', '45 Nm torque'], f: { 'Voltage': '18 V', 'Batteries': '2 × 2.0 Ah Li-ion', 'Max torque': '45 Nm', 'Chuck': '13 mm keyless' } },
  { ref: 'SF-DRL-18B', name: 'Cordless drill driver 18 V brushless, 2 × 4.0 Ah', c: 'power-tools', s: 'drills', brand: 'kestrel', kind: 'drill', price: 149, unit: 'each', color: '#C9300C', off: 0.1, sp: ['18 V brushless', '2 × 4.0 Ah batteries', '65 Nm torque'], f: { 'Voltage': '18 V', 'Motor': 'Brushless', 'Batteries': '2 × 4.0 Ah Li-ion', 'Max torque': '65 Nm', 'Chuck': '13 mm keyless' } },
  { ref: 'SF-IMP-18', name: 'Cordless impact driver 18 V, 1/4" hex', c: 'power-tools', s: 'drills', brand: 'kestrel', kind: 'drill', price: 109, unit: 'each', color: '#F2B705', sp: ['18 V brushless', '180 Nm', 'Bare tool'], f: { 'Voltage': '18 V', 'Motor': 'Brushless', 'Max torque': '180 Nm', 'Chuck': '1/4" hex' } },
  { ref: 'SF-SDS-800', name: 'SDS-plus rotary hammer 800 W, 2.6 J', c: 'power-tools', s: 'drills', brand: 'kestrel', kind: 'drill', price: 159, unit: 'each', color: '#1F5FBF', sp: ['800 W, 2.6 J', 'SDS-plus', '3 modes'], f: { 'Power': '800 W', 'Impact energy': '2.6 J', 'Chuck': 'SDS-plus', 'Modes': 'Drill, hammer drill, chisel' } },
  { ref: 'SF-GRD-125', name: 'Angle grinder 125 mm, 850 W', c: 'power-tools', s: 'grinders', brand: 'kestrel', kind: 'grinder', price: 59, unit: 'each', sp: ['125 mm discs', '850 W', 'Soft start'], f: { 'Disc size': '125 mm', 'Power': '850 W', 'No-load speed': '11,000 rpm', 'Spindle': 'M14' } },
  /* safety */
  { ref: 'SF-HLM-WH', name: 'Safety helmet EN 397, white, ratchet adjust', c: 'safety', s: 'head', brand: 'nordgrip', kind: 'helmet', price: 11.9, unit: 'each', color: '#FFFFFF', sp: ['EN 397', 'Ratchet adjust', 'Ventilated'], f: { 'Standard': 'EN 397', 'Colour': 'White', 'Size': '53–63 cm' } },
  { ref: 'SF-HLM-YL', name: 'Safety helmet EN 397, yellow, ratchet adjust', c: 'safety', s: 'head', brand: 'nordgrip', kind: 'helmet', price: 11.9, unit: 'each', color: '#F2B705', sp: ['EN 397', 'Ratchet adjust', 'Ventilated'], f: { 'Standard': 'EN 397', 'Colour': 'Yellow', 'Size': '53–63 cm' } },
  { ref: 'SF-GLS-CLR', name: 'Safety glasses, clear anti-scratch lens', c: 'safety', s: 'eyes', brand: 'nordgrip', kind: 'glasses', price: 4.9, unit: 'each', sp: ['EN 166', 'Anti-scratch', 'UV 400'], f: { 'Standard': 'EN 166', 'Lens': 'Clear polycarbonate', 'UV protection': '400' } },
  { ref: 'SF-GLS-SMK', name: 'Safety glasses, smoked lens', c: 'safety', s: 'eyes', brand: 'nordgrip', kind: 'glasses', price: 5.4, unit: 'each', color: '#2A3036', sp: ['EN 166', 'Smoked lens', 'UV 400'], f: { 'Standard': 'EN 166', 'Lens': 'Smoked polycarbonate', 'UV protection': '400' } },
  { ref: 'SF-GLV-9', name: 'Nitrile-coated work gloves, size 9, pair', c: 'safety', s: 'hands', brand: 'nordgrip', kind: 'gloves', price: 3.9, unit: 'pair', pack: 1, sp: ['EN 388', 'Size 9 (L)', 'Nitrile palm'], f: { 'Standard': 'EN 388', 'Size': '9 (L)', 'Coating': 'Nitrile' } },
  { ref: 'SF-GLV-10', name: 'Nitrile-coated work gloves, size 10, pair', c: 'safety', s: 'hands', brand: 'nordgrip', kind: 'gloves', price: 3.9, unit: 'pair', pack: 1, sp: ['EN 388', 'Size 10 (XL)', 'Nitrile palm'], f: { 'Standard': 'EN 388', 'Size': '10 (XL)', 'Coating': 'Nitrile' } },
  { ref: 'SF-MSK-FFP2', name: 'FFP2 dust mask with valve, box of 20', c: 'safety', s: 'respiratory', brand: 'nordgrip', kind: 'mask', price: 24.9, pack: 20, unit: 'box', tier: true, sp: ['EN 149 FFP2', 'Exhalation valve', 'Box of 20'], f: { 'Standard': 'EN 149:2001 FFP2', 'Valve': 'Yes', 'Pieces': '20' } },
  /* locks */
  { ref: 'SF-PAD-40', name: 'Brass padlock 40 mm, 3 keys', c: 'locks', s: 'padlocks', brand: 'ferrum-co', kind: 'padlock', price: 8.9, unit: 'each', sp: ['40 mm body', 'Hardened shackle', '3 keys'], f: { 'Body width': '40 mm', 'Shackle': '8 mm hardened steel', 'Keys': '3' } },
  { ref: 'SF-PAD-50H', name: 'Hardened steel padlock 50 mm, weatherproof', c: 'locks', s: 'padlocks', brand: 'ferrum-co', kind: 'padlock', price: 19.5, unit: 'each', color: '#C9300C', sp: ['50 mm body', 'Boron shackle', 'Weatherproof'], f: { 'Body width': '50 mm', 'Shackle': '10 mm boron steel', 'Rating': 'IP54' } },
  { ref: 'SF-HNG-100', name: 'Butt hinge 100 mm, zinc plated, pack of 2', c: 'locks', s: 'hinges', brand: 'ferrum-co', kind: 'hinge', price: 4.5, pack: 2, unit: 'pack', sp: ['100 × 75 mm', 'Zinc plated', 'Pack of 2'], f: { 'Size': '100 × 75 mm', 'Finish': 'Zinc plated', 'Pieces': '2' } },
  { ref: 'SF-HNG-100S', name: 'Butt hinge 100 mm, A2 stainless, pack of 2', c: 'locks', s: 'hinges', brand: 'ferrum-co', kind: 'hinge', price: 11.9, pack: 2, unit: 'pack', color: '#D3D8DC', sp: ['100 × 75 mm', 'A2 stainless', 'Pack of 2'], f: { 'Size': '100 × 75 mm', 'Finish': 'A2 stainless', 'Pieces': '2' } },
  { ref: 'SF-HNG-GATE', name: 'Heavy gate hinge 300 mm, galvanised', c: 'locks', s: 'hinges', brand: 'ferrum-co', kind: 'hinge', price: 14.9, pack: 2, unit: 'pack', color: '#8E979D', sp: ['300 mm strap', 'Hot-dip galvanised', 'Pack of 2'], f: { 'Strap length': '300 mm', 'Finish': 'Hot-dip galvanised', 'Pieces': '2' } },
  /* abrasives */
  { ref: 'SF-CUT-125I', name: 'Inox cutting disc 125 × 1.0 mm, box of 25', c: 'abrasives', s: 'discs', brand: 'brava-pro', kind: 'disc', price: 21.9, pack: 25, unit: 'box', tier: true, sp: ['125 × 1.0 × 22 mm', 'For stainless steel', 'Box of 25'], f: { 'Size': '125 × 1.0 × 22.2 mm', 'Use': 'Stainless steel and steel', 'Pieces': '25' } },
  { ref: 'SF-GRD-125S', name: 'Grinding disc 125 × 6.0 mm, box of 10', c: 'abrasives', s: 'discs', brand: 'brava-pro', kind: 'disc', price: 16.5, pack: 10, unit: 'box', tier: true, color: '#5B3FA0', sp: ['125 × 6.0 × 22 mm', 'For steel', 'Box of 10'], f: { 'Size': '125 × 6.0 × 22.2 mm', 'Use': 'Steel', 'Pieces': '10' } },
  { ref: 'SF-FLP-125', name: 'Flap disc 125 mm, P60, zirconia', c: 'abrasives', s: 'discs', brand: 'brava-pro', kind: 'disc', price: 4.2, unit: 'each', color: '#C9300C', sp: ['125 mm, P60', 'Zirconia grain', 'Angled'], f: { 'Size': '125 mm', 'Grit': 'P60', 'Grain': 'Zirconia' } },
  { ref: 'SF-DIA-125', name: 'Diamond cutting blade 125 mm, turbo, for masonry', c: 'abrasives', s: 'discs', brand: 'brava-pro', kind: 'disc', price: 12.9, unit: 'each', color: '#1F5FBF', sp: ['125 mm, turbo rim', 'Dry cutting', 'Concrete and tile'], f: { 'Size': '125 × 22.2 mm', 'Rim': 'Turbo', 'Use': 'Concrete, brick, tile' } },
  { ref: 'SF-SND-P120', name: 'Sanding sheets P120, pack of 25', c: 'abrasives', s: 'sanding', brand: 'brava-pro', kind: 'sheet', price: 9.9, pack: 25, unit: 'pack', sp: ['230 × 280 mm', 'P120', 'Pack of 25'], f: { 'Size': '230 × 280 mm', 'Grit': 'P120', 'Pieces': '25' } },
  /* electrical */
  { ref: 'SF-TIE-200', name: 'Cable ties 200 × 3.6 mm, black, pack of 100', c: 'electrical', s: 'cable-management', brand: 'vektor', kind: 'cable', price: 3.5, pack: 100, unit: 'pack', tier: true, sp: ['200 × 3.6 mm', 'UV resistant', 'Pack of 100'], f: { 'Length': '200 mm', 'Width': '3.6 mm', 'Material': 'UV-resistant nylon 6.6' } },
  { ref: 'SF-TIE-300', name: 'Cable ties 300 × 4.8 mm, black, pack of 100', c: 'electrical', s: 'cable-management', brand: 'vektor', kind: 'cable', price: 5.9, pack: 100, unit: 'pack', tier: true, color: '#C9300C', sp: ['300 × 4.8 mm', 'UV resistant', 'Pack of 100'], f: { 'Length': '300 mm', 'Width': '4.8 mm', 'Material': 'UV-resistant nylon 6.6' } },
  { ref: 'SF-CLP-6', name: 'Cable clips 6 mm with nail, pack of 100', c: 'electrical', s: 'cable-management', brand: 'vektor', kind: 'cable', price: 4.8, pack: 100, unit: 'pack', color: '#0B7A6E', sp: ['6 mm round cable', 'White', 'Pack of 100'], f: { 'Cable size': '6 mm', 'Colour': 'White', 'Pieces': '100' } },
  { ref: 'SF-INS-19', name: 'PVC insulating tape 19 mm × 20 m, black', c: 'electrical', s: 'connectors', brand: 'vektor', kind: 'tape', price: 1.9, unit: 'roll', color: '#2A3036', sp: ['19 mm × 20 m', 'VDE 600 V', 'Flame retardant'], f: { 'Size': '19 mm × 20 m', 'Voltage': '600 V', 'Colour': 'Black' } },
  { ref: 'SF-WGO-3', name: 'Lever wire connectors 3-way, 0.2–4 mm², pack of 50', c: 'electrical', s: 'connectors', brand: 'vektor', kind: 'connector', price: 14.5, pack: 50, unit: 'pack', tier: true, sp: ['3 conductors', '0.2–4 mm²', 'Pack of 50'], f: { 'Conductors': '3', 'Cross-section': '0.2–4 mm²', 'Rating': '32 A / 450 V' } },
  { ref: 'SF-OUT-1G', name: 'Single socket outlet 16 A, white, surface mount', c: 'electrical', s: 'outlets', brand: 'vektor', kind: 'outlet', price: 6.9, unit: 'each', sp: ['16 A 250 V', 'Type F (Schuko)', 'Surface mount'], f: { 'Rating': '16 A / 250 V', 'Type': 'F (Schuko)', 'Mounting': 'Surface', 'Protection': 'IP20' } },
];

for (const o of others) {
  const pack = o.pack ?? 1;
  const tier = o.tier ?? false;
  const unit = o.unit ?? 'each';
  finish({
    ref: o.ref, name: o.name, category: o.c, sub: o.s, brand: o.brand, family: OTHER_FAMILY[o.ref]?.[0] ?? null, size: OTHER_FAMILY[o.ref]?.[1] ?? null,
    std: null, mat: null, d: null, len: null, tier, pack, unit, price: o.price,
    stock: o.stock, off: o.off,
    specs: o.sp,
    blurb: [o.sp[0] + '.', o.sp[1] + '.', tier ? `Sold in boxes of ${pack}. Volume price breaks apply.` : `${sold({ pack, unit, tier })}. Genuine ${brandName[o.brand]} product.`],
    spec_table: [...Object.entries(o.f), ['Brand', brandName[o.brand]], ['Sold as', sold({ pack, unit, tier })], ['Part number', o.ref]] as [string, string][],
    art: { kind: o.kind, color: o.color },
  });
}


/* ---------- extended range ---------- */
const LEGACY = bases.length; // the original catalogue keeps ids 1–188 and all of its generated values
const TARGET = 10000;
{
  const have = new Set(bases.map((b) => b.ref));
  let items = buildRanges(brandName).filter((i) => !have.has(i.ref));
  // trim to the target by dropping a deterministic sample, never a whole family
  const extra = items.length - (TARGET - LEGACY);
  if (extra > 0) {
    const famSize = new Map<string, number>();
    for (const i of items) famSize.set(i.family, (famSize.get(i.family) || 0) + 1);
    const drop = new Set(items.filter((i) => famSize.get(i.family)! > 6).map((i) => i.ref).sort((a, b) => hash('trim' + a) - hash('trim' + b)).slice(0, extra));
    items = items.filter((i) => !drop.has(i.ref));
  }
  for (const { famName, ...i } of items) {
    if (famName && !FAMILY_NAME[i.family]) FAMILY_NAME[i.family] = famName;
    // newer lines have fewer reviews: most of the range is long tail
    finish({ ...i, reviews: Math.max(1, Math.floor(Math.pow(rng('rv' + i.ref)(), 2.2) * 240)) });
  }
}

/* ---------- enrichment: codes, family, logistics, media, promo, stock ---------- */
const BOLT_NAMES: Record<string, string> = Object.fromEntries((Object.keys(TYPES) as BoltType[]).map((t) => ['bolt-' + t, `${TYPES[t].name}${TYPES[t].norm === 'Wood thread' ? '' : ' ' + TYPES[t].norm}`]));

// one sale unit as shipped: length, width, height (mm) and weight (kg) by drawing kind
const LOGISTICS: Record<string, [number, number, number, number]> = {
  anchor: [160, 110, 60, 0.35], cartridge: [290, 60, 60, 0.48], locker: [40, 40, 110, 0.07], hammer: [330, 120, 35, 0.75],
  pliers: [200, 60, 22, 0.3], wrench: [260, 75, 20, 0.45], tape: [80, 75, 45, 0.3], level: [600, 55, 25, 0.55], bits: [110, 60, 20, 0.08],
  drill: [380, 320, 110, 2.6], grinder: [320, 130, 115, 2.1], helmet: [280, 220, 150, 0.38], glasses: [170, 70, 50, 0.05],
  gloves: [250, 120, 15, 0.06], mask: [220, 150, 120, 0.3], padlock: [70, 45, 25, 0.25], hinge: [110, 80, 15, 0.18], disc: [130, 130, 30, 1.1],
  sheet: [290, 240, 10, 0.4], cable: [210, 60, 20, 0.12], connector: [120, 80, 40, 0.25], outlet: [90, 90, 45, 0.12],
};
const r3 = (n: number) => Math.round(n * 1000) / 1000;
// customs codes for the extended range outside fasteners (the original products leave them empty)
const HS: Record<string, string> = { anchors: '3926.90', 'hand-tools': '8205.59', 'power-tools': '8467.29', safety: '6116.10', locks: '8301.10', abrasives: '6804.22', electrical: '8536.69' };
function logistics(b: Base): { dims: [number, number, number]; kg: number } {
  const k = b.art.kind;
  if (k === 'rod') return { dims: [(b.len ?? 1000) + 20, 40, 40], kg: r3(Math.max(0.02, b.kg ?? 0.3)) };
  if (b.id > LEGACY && b.kg === undefined && b.pack > 1 && !['anchor', 'sheet', 'cable', 'connector', 'bits', 'tape', 'disc'].includes(k)) {
    const [l, w, h, kg] = LOGISTICS[k] ?? [150, 100, 50, 0.2];
    return { dims: [l, w, Math.round(h * Math.min(4, Math.sqrt(b.pack)))], kg: r3(kg * Math.pow(b.pack, 0.8)) };
  }
  if (k === 'bolt' || k === 'nut' || k === 'washer') {
    const kg = b.kg ?? (k === 'nut' ? 0.6 * Math.pow((b.d || 8) / 8, 2.6) : 0.45 * Math.pow((b.d || 8) / 8, 2.2));
    const dims: [number, number, number] = kg < 1.5 ? [180, 110, 60] : kg < 4 ? [230, 150, 80] : [280, 180, 100];
    return { dims, kg: r3(Math.max(0.05, kg + 0.04)) };
  }
  const [l, w, h, kg] = LOGISTICS[k] ?? [150, 100, 50, 0.2];
  const f = /1\.25 kg/.test(b.name) ? 1.8 : /12 × 120|M12/.test(b.name) ? 1.3 : /brushless|SDS/i.test(b.name) ? 1.2 : 1;
  return { dims: [l, w, h], kg: r3(kg * f) };
}

const ean13 = (twelve: string) => {
  const sum = [...twelve].reduce((a, c, i) => a + Number(c) * (i % 2 ? 3 : 1), 0);
  return twelve + ((10 - (sum % 10)) % 10);
};

// featured on the home page, in the basket and in the related-product rules: never flagged unavailable
const KEEP_AVAILABLE = new Set(['SF-933-A2-8x40', 'SF-985-A2-8', 'SF-125-A2-8', 'SF-934-A2-8', 'SF-LOC-50', 'SF-NYL-8x40', 'SF-BIT-PZ2', 'SF-TAPE-5', 'SF-GLV-9', 'SF-GLS-CLR', 'SF-INS-19', 'SF-TIE-200', 'SF-HAM-450', 'SF-SND-P120']);
const PROMOS: Record<string, string[]> = {
  fasteners: ['Buy 3 boxes, get the 4th at half price', 'Free delivery on orders of 5 boxes or more', 'Trade favourite: now 10 % more pieces per box'],
  anchors: ['Free mixing nozzle with every 2 cartridges', 'New formula: cures 20 % faster'],
  'hand-tools': ['Lifetime guarantee against manufacturing faults', 'Free engraving for workshop orders'],
  'power-tools': ['Extended 3-year warranty when you register online', 'Spare battery at half price with this tool'],
  safety: ['Bulk pack price for teams of 10 or more', 'Meets the 2026 EN revision'],
  locks: ['Keyed-alike option on request'],
  abrasives: ['Pro pack: 25 % more discs, same price'],
  electrical: ['Installer pick of the month'],
};
const WAREHOUSES = [
  { id: 1, code: 'MAD', name: 'Madrid central', city: 'Getafe', days: 1 },
  { id: 2, code: 'BCN', name: 'Barcelona hub', city: "L'Hospitalet de Llobregat", days: 2 },
  { id: 3, code: 'SVQ', name: 'Seville south', city: 'Dos Hermanas', days: 3 },
  { id: 4, code: 'VLC', name: 'Valencia east', city: 'Riba-roja de Túria', days: 2 },
  { id: 5, code: 'BIO', name: 'Bilbao north', city: 'Basauri', days: 2 },
];
const TODAY = new Date('2026-10-11T00:00:00Z');
const dayPlus = (n: number) => new Date(TODAY.getTime() + n * 864e5).toISOString().slice(0, 10);

interface StockRow { product_id: number; warehouse_id: number; location: string; quantity: number; reserved: number; reorder_point: number; shipping_days: number; restock_date: string | null }
const stockRows: StockRow[] = [];
const catIndex = Object.fromEntries(categories.map((c, i) => [c.slug, i]));

const famCount = new Map<string, number>();
for (const b of bases) { const f = b.family ?? 'f-' + b.slug; famCount.set(f, (famCount.get(f) || 0) + 1); }

const products: Product[] = bases.map((b) => {
  const r = rng('x' + b.ref);
  const family = b.family ?? 'f-' + b.slug;
  const { dims, kg } = logistics(b);
  const bulky = b.category === 'power-tools';

  // stock: split the generated total over 1–3 warehouses; Madrid is sometimes empty so delivery time varies
  // the original products keep their split over the first three warehouses; the extended range uses all five
  const legacy = b.id <= LEGACY;
  const n = 1 + Math.floor(r() * (legacy ? 3 : 4));
  const start = legacy ? 0 : Math.floor(r() * WAREHOUSES.length);
  const whs = legacy ? WAREHOUSES.slice(0, n) : Array.from({ length: n }, (_, i) => WAREHOUSES[(start + i) % WAREHOUSES.length]);
  if (r() < 0.18 && n > 1) whs.reverse();
  let left = b.stock;
  const lines: StockLine[] = [];
  whs.forEach((w, i) => {
    const qty = i === whs.length - 1 ? left : Math.floor(left * (0.5 + r() * 0.3));
    left -= qty;
    const reserved = qty > 20 ? Math.floor(qty * r() * 0.04) : 0;
    const reorder = Math.max(5, Math.round((b.stock / n) * 0.12));
    const days = w.days + (bulky ? 1 : 0);
    const restock = qty - reserved < reorder ? dayPlus(3 + Math.floor(r() * 12)) : null;
    const loc = `${'ABCDEFGH'[catIndex[b.category]]}-${String(1 + Math.floor(r() * 24)).padStart(2, '0')}-${String(1 + Math.floor(r() * 5)).padStart(2, '0')}-${'ABCD'[Math.floor(r() * 4)]}`;
    stockRows.push({ product_id: b.id, warehouse_id: w.id, location: loc, quantity: qty, reserved, reorder_point: reorder, shipping_days: days, restock_date: restock });
    lines.push({ warehouse: w.name, city: w.city, available: qty - reserved, shipping_days: days, restock_date: restock });
  });
  lines.sort((a, z) => a.shipping_days - z.shipping_days);
  const avail = lines.reduce((a, l) => a + l.available, 0);
  const fastest = lines.find((l) => l.available > 0) ?? null;
  const restock = lines.map((l) => l.restock_date).filter(Boolean).sort()[0] ?? null;

  const promoRoll = r();
  const promo = promoRoll < (legacy ? 0.12 : 0.05) ? PROMOS[b.category][Math.floor(r() * PROMOS[b.category].length)] : null;
  const unavailable = !KEEP_AVAILABLE.has(b.ref) && r() < 0.04;
  const brand = brandName[b.brand];
  const siblings = famCount.get(family)! - 1;
  const description = [
    b.blurb.join(' '),
    `${b.name} by ${brand}.`,
    siblings > 0 ? `Part of the ${FAMILY_NAME[family] || BOLT_NAMES[family] || b.name} range, available in ${siblings + 1} versions.` : '',
  ].filter(Boolean).join(' ');

  const { kg: rawKg, size, ...base } = b; // generator-only fields
  void rawKg;
  return {
    ...base,
    item_code: 200000 + ((b.id * 7919) % 700000),
    ean: ean13('8437001' + String(b.id).padStart(5, '0')),
    description,
    family,
    size_label: size,
    min_order_qty: 1,
    unavailable,
    promo,
    stock: avail,
    ship_days: fastest ? fastest.shipping_days : null,
    ships_from: fastest ? fastest.warehouse : null,
    restock_date: restock,
    availability: lines,
    weight_kg: kg,
    dims_mm: dims,
    image: `${IMAGE_BASE}/${b.slug}.svg`,
    image_alt: `Technical drawing of ${b.name}`,
    tags: [b.category, b.sub, ...(b.std ? [b.std] : []), ...(b.off ? ['offer'] : []), ...(promo ? ['promo'] : [])],
    origin_country: brands.find((x) => x.slug === b.brand)!.country,
    hs_code: b.category === 'fasteners' ? (b.art.kind === 'washer' ? '7318.22' : b.art.kind === 'nut' ? '7318.16' : '7318.15') : legacy ? null : HS[b.category] ?? null,
    // codes, weight and package size live in their own columns; the product page adds them to the table
    spec_table: b.spec_table.filter(([k]) => k !== 'Part number' && k !== 'Weight per box'),
  };
});
const bySku = new Map(products.map((p) => [p.ref, p]));

/* ---------- families ---------- */
const famMembers = new Map<string, Product[]>();
for (const p of products) {
  if (!famMembers.has(p.family)) famMembers.set(p.family, []);
  famMembers.get(p.family)!.push(p);
}
const families: Family[] = [...famMembers.values()].map(([p]) => {
  const axes = p.mat && p.d !== null ? ['material', 'diameter_mm', ...(p.len !== null ? ['length_mm'] : [])] : famMembers.get(p.family)!.length > 1 ? ['size_label'] : [];
  return { slug: p.family, name: FAMILY_NAME[p.family] || BOLT_NAMES[p.family] || p.name, category: p.category, subcategory: p.sub, variant_axes: axes, description: null };
});

/* ---------- recommendations ---------- */
const recommendations: Recommendation[] = [];
function pushRecs(p: Product, out: [Product | undefined, Recommendation['kind']][]) {
  const seen = new Set([p.id]);
  let pos = 1;
  for (const [x, kind] of out) {
    if (!x || seen.has(x.id) || pos > 4) continue;
    seen.add(x.id);
    recommendations.push({ product_id: p.id, recommended_id: x.id, kind, position: pos++ });
  }
}

// the original products keep the recommendations they were generated with, chosen among the original catalogue
const legacyProducts = products.slice(0, LEGACY);
for (const p of legacyProducts) {
  const out: [Product | undefined, Recommendation['kind']][] = [];
  const mat = p.mat === 'A2' || p.mat === 'A4' ? 'A2' : 'ZN';
  const dd = p.d ? Math.min(12, Math.max(6, p.d)) : 8;
  if (p.art.kind === 'bolt' && p.art.t !== 'wood') {
    out.push([bySku.get(`SF-985-${mat}-${dd}`), 'accessory'], [bySku.get(`SF-125-${mat}-${dd}`), 'accessory'], [bySku.get('SF-LOC-50'), 'bought_together']);
    const alt = legacyProducts.find((x) => x.family === p.family && x.d === p.d && x.len === p.len && x.mat !== p.mat);
    out.push([alt, 'alternative']);
  } else if (p.art.kind === 'bolt') {
    out.push([bySku.get('SF-BIT-PZ2'), 'accessory'], [bySku.get('SF-NYL-8x40'), 'bought_together'], [bySku.get('SF-DRL-18A'), 'bought_together']);
  } else if (p.art.kind === 'nut' || p.art.kind === 'washer') {
    out.push([bySku.get(`SF-933-${mat}-${dd}x40`), 'bought_together'], [bySku.get(`SF-125-${mat}-${dd}`), 'accessory'], [bySku.get('SF-LOC-50'), 'bought_together']);
  } else {
    const r = rng('rec' + p.ref);
    const sib = legacyProducts.filter((x) => x.family === p.family && x.id !== p.id).slice(0, 1);
    sib.forEach((x) => out.push([x, 'alternative']));
    const pool = legacyProducts.filter((x) => x.category === p.category && x.sub !== p.sub && x.art.kind !== 'bolt');
    const wide = legacyProducts.filter((x) => x.category !== p.category && x.art.kind !== 'bolt' && x.price < 30);
    for (const src of [pool, pool, wide, wide]) if (src.length) out.push([src[Math.floor(r() * src.length)], 'bought_together']);
  }
  pushRecs(p, out);
}

// extended range: matching nuts and washers for bolts, bolts for nuts, family alternatives and same-category picks for the rest
const small = (p: Product) => p.family.endsWith('-diy');
const matFor = (m: string | null) => (m === 'A2' || m === 'A4' ? m : 'ZN');
const nutFor = (p: Product, d: number) => {
  const n = bySku.get(`SF-985-${matFor(p.mat)}-${d}`) ?? bySku.get(`SF-985-ZN-${d}`);
  return small(p) && n ? bySku.get(n.ref + '-P' + (d <= 6 ? 20 : 10)) ?? n : n;
};
const washerFor = (p: Product, d: number) => {
  const w = bySku.get(`SF-125-${matFor(p.mat)}-${d}`) ?? bySku.get(`SF-125-ZN-${d}`);
  return small(p) && w ? bySku.get(w.ref + '-P' + (d <= 6 ? 30 : 20)) ?? w : w;
};
const boltFor = (p: Product, d: number) =>
  (famMembers.get('bolt-hex') ?? []).filter((x) => x.d === d && x.mat === matFor(p.mat)).sort((a, b) => Math.abs((a.len ?? 0) - 4 * d) - Math.abs((b.len ?? 0) - 4 * d))[0];
const catPool = new Map<string, Product[]>();
for (const x of products) if (x.art.kind !== 'bolt' && x.category !== 'fasteners') {
  if (!catPool.has(x.category)) catPool.set(x.category, []);
  catPool.get(x.category)!.push(x);
}
const cheap = products.filter((x) => x.category !== 'fasteners' && x.price < 30);
for (const p of products.slice(LEGACY)) {
  const out: [Product | undefined, Recommendation['kind']][] = [];
  const k = p.art.kind;
  const fam = famMembers.get(p.family)!;
  const alt = (fn: (x: Product) => boolean) => fam.find((x) => x.id !== p.id && fn(x));
  if (k === 'bolt' && p.art.t !== 'wood' && p.d) {
    out.push([nutFor(p, p.d), 'accessory'], [washerFor(p, p.d), 'accessory'], [bySku.get('SF-LOC-50'), 'bought_together'], [alt((x) => x.d === p.d && x.len === p.len), 'alternative']);
  } else if (k === 'bolt') {
    out.push([bySku.get(p.d && p.d >= 6 ? 'SF-BIT-NRD-T40-25' : 'SF-BIT-PZ2'), 'accessory'], [bySku.get('SF-NYL-8x40'), 'bought_together'], [bySku.get('SF-DRL-18A'), 'bought_together'], [alt((x) => x.d === p.d && x.len === p.len), 'alternative']);
  } else if ((k === 'nut' || k === 'washer') && p.d) {
    out.push([boltFor(p, p.d), 'bought_together'], [k === 'nut' ? washerFor(p, p.d) : nutFor(p, p.d), 'accessory'], [bySku.get('SF-LOC-50'), 'bought_together'], [alt((x) => x.d === p.d), 'alternative']);
  } else if (k === 'rod' && p.d && p.mat) {
    out.push([bySku.get(`SF-934-${p.mat}-${p.d}`), 'accessory'], [washerFor(p, p.d), 'accessory'], [bySku.get('SF-RES-VE300'), 'bought_together'], [alt((x) => x.d === p.d && x.len === p.len), 'alternative']);
  } else {
    const r = rng('rec' + p.ref);
    const i = fam.indexOf(p);
    out.push([fam[i + 1] ?? fam[i - 1], 'alternative']);
    const pool = catPool.get(p.category) ?? [];
    for (const src of [pool, pool, cheap, cheap]) {
      for (let tries = 0; tries < 6 && src.length; tries++) {
        const x = src[Math.floor(r() * src.length)];
        if (x.sub !== p.sub && x.family !== p.family) { out.push([x, 'bought_together']); break; }
      }
    }
  }
  pushRecs(p, out);
}

/* ---------- output: local sample catalogue and database seed files ---------- */
// The bundled fallback holds the original catalogue only; the full range lives in Postgres.
const sampleIds = new Set(legacyProducts.map((p) => p.id));
const sample: Catalog = {
  categories,
  subcategories: subcategories.filter((s) => legacyProducts.some((p) => p.category === s.category && p.sub === s.slug)),
  brands: brands.filter((b) => legacyProducts.some((p) => p.brand === b.slug)),
  families: families.filter((f) => legacyProducts.some((p) => p.family === f.slug)),
  products: legacyProducts,
  recommendations: recommendations.filter((r) => sampleIds.has(r.product_id) && sampleIds.has(r.recommended_id)),
};
writeFileSync(new URL('../data/catalog.json', import.meta.url), JSON.stringify(sample));

const q = (s: string | null | undefined) => (s === null || s === undefined ? 'null' : "'" + s.replace(/'/g, "''") + "'");
const j = (v: unknown) => q(JSON.stringify(v)) + '::jsonb';
const arr = (v: string[]) => (v.length ? `array[${v.map(q).join(',')}]` : "'{}'") + '::text[]';
const rows = <T>(list: T[], n: number) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));

const seedDir = new URL('../supabase/seed/', import.meta.url);
rmSync(seedDir, { recursive: true, force: true });
mkdirSync(seedDir, { recursive: true });
const files: [string, string[]][] = [];
const HEAD = '-- Generated by scripts/generate-catalog.ts. Do not edit by hand.';

files.push(['00_reset.sql', [
  HEAD,
  '-- Empties every store table. Run it only to rebuild the data from scratch; the other files add what is missing and can be re-run.',
  'truncate public.sales, public.stock, public.warehouses, public.product_recommendations, public.order_lines, public.orders, public.products, public.product_families, public.brands, public.subcategories, public.categories restart identity cascade;',
]]);
files.push(['01_taxonomy.sql', [
  HEAD,
  'insert into public.categories (slug,name,tone,icon,blurb,position) values\n' + categories.map((c) => `(${q(c.slug)},${q(c.name)},${q(c.tone)},${q(c.icon)},${q(c.blurb)},${c.position})`).join(',\n') + '\non conflict (slug) do nothing;',
  'insert into public.subcategories (category,slug,name,position) values\n' + subcategories.map((s) => `(${q(s.category)},${q(s.slug)},${q(s.name)},${s.position})`).join(',\n') + '\non conflict (category, slug) do nothing;',
  'insert into public.brands (slug,name,country) values\n' + brands.map((b) => `(${q(b.slug)},${q(b.name)},${q(b.country)})`).join(',\n') + '\non conflict (slug) do nothing;',
  'insert into public.warehouses (id,code,name,city,country) values\n' + WAREHOUSES.map((w) => `(${w.id},${q(w.code)},${q(w.name)},${q(w.city)},'ES')`).join(',\n') + '\non conflict (id) do nothing;',
  `select setval(pg_get_serial_sequence('public.warehouses','id'), greatest(${WAREHOUSES.length}, (select max(id) from public.warehouses)));`,
  'insert into public.product_families (slug,name,category,subcategory,variant_axes) values\n' + families.map((f) => `(${q(f.slug)},${q(f.name)},${q(f.category)},${q(f.subcategory)},${arr(f.variant_axes)})`).join(',\n') + '\non conflict (slug) do nothing;',
]]);
const COLS = 'id,item_code,sku,ean,slug,name,description,highlights,key_specs,specifications,category,subcategory,brand,family,standard,material,diameter_mm,length_mm,size_label,' +
  'pack_length_mm,pack_width_mm,pack_height_mm,weight_kg,image_url,image_alt,art,pack_qty,sale_unit,volume_pricing,min_order_qty,price_ex_vat,discount_pct,unavailable,promo_enabled,promo_text,rating,review_count,tags,origin_country,hs_code';
rows(products, 1000).forEach((chunk, n) => {
  files.push([`1${n}_products.sql`, [HEAD, ...rows(chunk, 100).map((part) =>
    `insert into public.products (${COLS}) values\n` + part.map((p) => '(' + [
      p.id, p.item_code, q(p.ref), q(p.ean), q(p.slug), q(p.name), "''", j(p.blurb), j(p.specs), j(p.spec_table), q(p.category), q(p.sub), q(p.brand), q(p.family),
      q(p.std), q(p.mat), p.d ?? 'null', p.len ?? 'null', q(p.size_label), p.dims_mm[0], p.dims_mm[1], p.dims_mm[2], p.weight_kg, "''", "''", j(p.art),
      p.pack, q(p.unit), p.tier, p.min_order_qty, p.price, Math.round(p.off * 10000) / 100, p.unavailable, p.promo !== null, q(p.promo), p.rating, p.reviews, "'{}'", q(p.origin_country), q(p.hs_code),
    ].join(',') + ')').join(',\n') + '\non conflict (id) do nothing;')]]);
});
files.push(['20_product_text.sql', [
  HEAD,
  `select setval(pg_get_serial_sequence('public.products','id'), greatest(${products.length}, (select max(id) from public.products)));`,
  '-- Text derived from other columns is composed here rather than shipped in the inserts; it matches the generator output.',
  `update public.products p set
  description = (select string_agg(h, ' ' order by i) from jsonb_array_elements_text(p.highlights) with ordinality as t(h, i))
    || ' ' || p.name || ' by ' || b.name || '.'
    || case when fc.n > 1 then ' Part of the ' || f.name || ' range, available in ' || fc.n || ' versions.' else '' end,
  image_url = '${IMAGE_BASE}/' || p.slug || '.svg',
  image_alt = 'Technical drawing of ' || p.name,
  tags = array[p.category, p.subcategory] || case when p.standard is null then '{}'::text[] else array[p.standard] end
    || case when p.discount_pct > 0 then array['offer'] else '{}'::text[] end || case when p.promo_enabled then array['promo'] else '{}'::text[] end
from public.brands b, public.product_families f, (select family, count(*)::int as n from public.products group by family) fc
where b.slug = p.brand and f.slug = p.family and fc.family = p.family
  and (p.description is distinct from (select string_agg(h, ' ' order by i) from jsonb_array_elements_text(p.highlights) with ordinality as t(h, i))
    || ' ' || p.name || ' by ' || b.name || '.'
    || case when fc.n > 1 then ' Part of the ' || f.name || ' range, available in ' || fc.n || ' versions.' else '' end
    or p.image_url is distinct from '${IMAGE_BASE}/' || p.slug || '.svg');`,
]]);
files.push(['30_recommendations.sql', [HEAD, ...rows(recommendations, 2000).map((part) =>
  'insert into public.product_recommendations (product_id,recommended_id,kind,position) values\n' + part.map((r) => `(${r.product_id},${r.recommended_id},${q(r.kind)},${r.position})`).join(',') + '\non conflict do nothing;')]]);
files.push(['31_stock.sql', [HEAD, ...rows(stockRows, 2000).map((part) =>
  'insert into public.stock (product_id,warehouse_id,location,quantity,reserved,reorder_point,shipping_days,restock_date) values\n' +
    part.map((s) => `(${s.product_id},${s.warehouse_id},${q(s.location)},${s.quantity},${s.reserved},${s.reorder_point},${s.shipping_days},${q(s.restock_date)})`).join(',\n') + '\non conflict do nothing;')]]);
files.push(['40_sales.sql', [HEAD, `-- One synthetic year of daily sales per product and channel, for products that have none yet.
-- Popularity follows review count; the extended range sells less often than the original ${LEGACY} products. Trade (b2b) drops at weekends; about 5 % of sale days have a return.
-- On a hosted database with a statement timeout, run it in slices by adding "and p.id between X and Y" to the inner where clause.
select setseed(0.2026);
insert into public.sales (product_id, sale_date, channel, units_sold, units_returned, revenue_ex_vat, refunds_ex_vat)
select product_id, sale_date, channel, units, returned, round(units * unit_price, 2), round(returned * unit_price, 2)
from (
  select x.*, case when x.r_ret < 0.05 then greatest(1, floor(x.units * x.r_ret * 10))::int else 0 end as returned
  from (
    select p.id as product_id, d::date as sale_date, ch.channel,
      round(p.sale_price_ex_vat * ch.price_mult, 2) as unit_price,
      1 + floor(random() * ch.size * (0.4 + p.review_count / 150.0))::int as units,
      random() as r_ret,
      random() < least(0.9, ch.prob * (0.3 + p.review_count / 120.0) * (case when p.id <= ${LEGACY} then 1 else 0.4 end)
        * (1 + 0.25 * sin(2 * pi() * extract(doy from d) / 365.0))
        * (case when ch.channel = 'b2b' and extract(isodow from d) >= 6 then 0.15 else 1 end)
        * (case when p.unavailable and d > date '2026-08-01' then 0 else 1 end)) as sold
    from (select * from public.products p where not exists (select 1 from public.sales s where s.product_id = p.id)) p
    cross join generate_series(date '2025-10-11', date '2026-10-10', interval '1 day') d
    cross join (values ('web', 1.0, 0.18, 3), ('b2b', 0.92, 0.12, 14), ('marketplace', 1.06, 0.06, 2)) ch(channel, price_mult, prob, size)
  ) x
  where x.sold
) y;`]]);
files.push(['50_orders.sql', [HEAD, readOrdersSql()]]);
files.push(['60_accounts.sql', [HEAD, accountsSql()]]);

function readOrdersSql() {
  return `-- A year of past orders from fictitious customers (example.com addresses). Skipped when seeded orders already exist.
-- Lines favour popular products; prices follow the store rules (discount, volume tiers for boxes, shipping, 21 % VAT).
select setseed(0.3141);
create temp table seed_orders on commit drop as
select g as n,
  timestamptz '2025-10-11 07:00:00+02' + floor(random() * 365) * interval '1 day' + (random() * 12) * interval '1 hour' as created_at,
  case when random() < 0.42 then 'biz' else 'diy' end as mode,
  random() as r_ship, random() as r_pay, random() as r_status,
  1 + floor(random() * 50)::int as fi, 1 + floor(random() * 50)::int as li, 1 + floor(random() * 30)::int as ci, 1 + floor(random() * 24)::int as si,
  1 + floor(random() * 120)::int as house, 1 + floor(random() * 5)::int as nlines
from generate_series(1, 6000) g
where not exists (select 1 from public.orders where customer->>'source' = 'seed');

create temp table seed_pool on commit drop as
select row_number() over (order by p.id, k) as i, p.id, p.sku, p.name, p.sale_price_ex_vat, p.volume_pricing
from public.products p
join (select product_id from public.stock group by product_id having sum(quantity - reserved) > 0) s on s.product_id = p.id
cross join generate_series(1, 1 + p.review_count / 40) k
where not p.unavailable;

create temp table seed_lines on commit drop as
select o.n, l.line, sp.id as product_id, sp.sku, sp.name, q.qty,
  round(sp.sale_price_ex_vat * case when not sp.volume_pricing then 1 when q.qty >= 50 then 0.82 when q.qty >= 10 then 0.905 else 1 end, 2) as unit_price
from seed_orders o
cross join lateral generate_series(1, o.nlines) l(line)
cross join lateral (select 1 + floor(random() * (select count(*) from seed_pool))::int as pick, random() as rq, o.n + l.line * 0 as dep) r
join seed_pool sp on sp.i = r.pick
cross join lateral (select case when o.mode = 'biz' then 1 + floor(r.rq * r.rq * 60)::int else 1 + floor(r.rq * r.rq * r.rq * 6)::int end as qty) q;

with totals as (
  select n, sum(round(unit_price * qty, 2)) as subtotal from seed_lines group by n
), numbered as (
  select o.*, t.subtotal, row_number() over (order by o.created_at, o.n) as rn,
    case when o.r_ship < 0.12 then 'pickup' when o.r_ship < 0.22 then 'exp' else 'std' end as ship,
    case when o.mode = 'biz' and o.r_pay < 0.55 then 'invoice' when o.r_pay < 0.75 then 'card' else 'transfer' end as pay
  from seed_orders o join totals t using (n)
), base as (select coalesce(max(last_value), 104800) as start from public.order_number_seq)
insert into public.orders (id, number, mode, customer, ship_method, payment_method, subtotal, shipping, vat, total, status, created_at)
select md5('seed-order-' || o.n)::uuid,
  'SF-' || to_char(o.created_at, 'YY') || '-' || (b.start + o.rn),
  o.mode,
  jsonb_build_object(
    'name', (array['Lucía','Hugo','Martina','Mateo','Sofía','Leo','Valeria','Daniel','Julia','Pablo','Paula','Álvaro','Carla','Adrián','Elena','Manuel','Alba','Diego','Noa','Javier','Irene','Marcos','Sara','Iván','Laura','Jorge','Marta','Sergio','Clara','Raúl','Ana','David','Carmen','Andrés','Nerea','Óscar','Lara','Rubén','Inés','Víctor','Eva','Tomás','Rocío','Gonzalo','Celia','Íker','Aitana','Mario','Lola','Bruno'])[o.fi]
      || ' ' || (array['García','Martínez','López','Sánchez','González','Gómez','Fernández','Moreno','Jiménez','Pérez','Rodríguez','Navarro','Ruiz','Díaz','Serrano','Hernández','Muñoz','Sáez','Romero','Rubio','Alfaro','Molina','Lozano','Castillo','Picazo','Ortega','Morales','Ortiz','Delgado','Marín','Iglesias','Santos','Castro','Garrido','Vidal','Cano','Ramos','Gil','Prieto','Méndez','Calvo','Vega','Cruz','Herrera','Peña','Flores','Campos','León','Márquez','Soler'])[o.li],
    'email', 'customer' || o.n || '@example.com',
    'company', case when o.mode = 'biz' then (array['Reformas','Instalaciones','Montajes','Talleres','Construcciones','Carpintería','Electricidad','Fontanería'])[1 + o.n % 8] || ' ' || (array['García','Martínez','López','Sánchez','González','Gómez','Fernández','Moreno','Jiménez','Pérez'])[1 + o.li % 10] || ' SL' end,
    'address', (array['Calle Mayor','Avenida de la Constitución','Calle Real','Calle del Sol','Paseo de la Estación','Calle Industria','Polígono Las Américas, nave','Calle San Juan','Avenida de Andalucía','Calle de la Paz','Calle Nueva','Ronda Sur','Calle del Carmen','Calle Ancha','Avenida de Europa','Calle Toledo','Calle Valencia','Calle Alcalá','Camino Viejo','Calle Goya','Calle Princesa','Polígono El Pino, nave','Calle Cervantes','Avenida del Puerto'])[o.si] || ' ' || o.house,
    'city', (array['Madrid','Barcelona','Valencia','Sevilla','Zaragoza','Málaga','Murcia','Palma','Bilbao','Alicante','Córdoba','Valladolid','Vigo','Gijón','Granada','Vitoria','A Coruña','Elche','Getafe','Badalona','Cartagena','Terrassa','Pamplona','Almería','Burgos','Santander','Castellón','Albacete','Logroño','Salamanca'])[o.ci],
    'postcode', lpad(((array[28,8,46,41,50,29,30,7,48,3,14,47,36,33,18,1,15,3,28,8,30,8,31,4,9,39,12,2,26,37])[o.ci] * 1000 + 1 + o.house % 80)::text, 5, '0'),
    'source', 'seed'),
  o.ship, o.pay, o.subtotal, s.shipping, round((o.subtotal + s.shipping) * 0.21, 2), o.subtotal + s.shipping + round((o.subtotal + s.shipping) * 0.21, 2),
  case when o.created_at > timestamptz '2026-10-08' then 'received' when o.created_at > timestamptz '2026-09-30' then 'shipped'
    when o.r_status < 0.03 then 'cancelled' when o.r_status < 0.07 then 'returned' else 'delivered' end,
  o.created_at
from numbered o
cross join base b
cross join lateral (select case o.ship when 'pickup' then 0 when 'exp' then 24.90 else case when o.subtotal >= 150 then 0 else 9.90 end end as shipping) s;

insert into public.order_lines (order_id, product_id, sku, name, qty, unit_price, line_total)
select md5('seed-order-' || n)::uuid, product_id, sku, name, qty, unit_price, round(unit_price * qty, 2)
from seed_lines order by n, line;

select setval('public.order_number_seq', greatest((select last_value from public.order_number_seq), (select coalesce(max(split_part(number, '-', 3)::bigint), 0) from public.orders)));`;
}

for (const [name, parts] of files) writeFileSync(new URL(name, seedDir), ['begin;', ...parts, 'commit;'].join('\n\n') + '\n');
console.log(`products: ${products.length}, families: ${families.length}, recommendations: ${recommendations.length}, stock rows: ${stockRows.length}, unavailable: ${products.filter((p) => p.unavailable).length}, promo: ${products.filter((p) => p.promo).length}, files: ${files.length}`);

function accountsSql() {
  return `-- Demo customer accounts for the seeded orders: 750 fictitious customers (customer1@example.com … customer750@example.com),
-- all with the password "supplyforge-demo". Accounts 1-300 are businesses. Each seeded order is assigned to one of them
-- (business orders to business accounts) and its customer details are aligned with that account.
-- Only adds accounts that do not exist and only touches seeded orders that have no account yet.
create temp table seed_customers on commit drop as
select k, md5('seed-customer-' || k)::uuid as id, 'customer' || k || '@example.com' as email, k <= 300 as biz,
  (array['Lucía','Hugo','Martina','Mateo','Sofía','Leo','Valeria','Daniel','Julia','Pablo','Paula','Álvaro','Carla','Adrián','Elena','Manuel','Alba','Diego','Noa','Javier','Irene','Marcos','Sara','Iván','Laura','Jorge','Marta','Sergio','Clara','Raúl','Ana','David','Carmen','Andrés','Nerea','Óscar','Lara','Rubén','Inés','Víctor','Eva','Tomás','Rocío','Gonzalo','Celia','Íker','Aitana','Mario','Lola','Bruno'])[1 + (k * 7) % 50]
    || ' ' || (array['García','Martínez','López','Sánchez','González','Gómez','Fernández','Moreno','Jiménez','Pérez','Rodríguez','Navarro','Ruiz','Díaz','Serrano','Hernández','Muñoz','Sáez','Romero','Rubio','Alfaro','Molina','Lozano','Castillo','Picazo','Ortega','Morales','Ortiz','Delgado','Marín','Iglesias','Santos','Castro','Garrido','Vidal','Cano','Ramos','Gil','Prieto','Méndez','Calvo','Vega','Cruz','Herrera','Peña','Flores','Campos','León','Márquez','Soler'])[1 + (k * 13 + k / 50 * 7) % 50] as name,
  case when k <= 300 then (array['Reformas','Instalaciones','Montajes','Talleres','Construcciones','Carpintería','Electricidad','Fontanería'])[1 + k % 8]
    || ' ' || (array['García','Martínez','López','Sánchez','González','Gómez','Fernández','Moreno','Jiménez','Pérez','Rodríguez','Navarro','Ruiz','Díaz','Serrano','Hernández','Muñoz','Sáez','Romero','Rubio','Alfaro','Molina','Lozano','Castillo','Picazo','Ortega','Morales','Ortiz','Delgado','Marín','Iglesias','Santos','Castro','Garrido','Vidal','Cano','Ramos','Gil','Prieto','Méndez','Calvo','Vega','Cruz','Herrera','Peña','Flores','Campos','León','Márquez','Soler'])[1 + (k * 13 + k / 50 * 7) % 50] || ' SL' end as company,
  (array['Calle Mayor','Avenida de la Constitución','Calle Real','Calle del Sol','Paseo de la Estación','Calle Industria','Polígono Las Américas, nave','Calle San Juan','Avenida de Andalucía','Calle de la Paz','Calle Nueva','Ronda Sur','Calle del Carmen','Calle Ancha','Avenida de Europa','Calle Toledo','Calle Valencia','Calle Alcalá','Camino Viejo','Calle Goya','Calle Princesa','Polígono El Pino, nave','Calle Cervantes','Avenida del Puerto'])[1 + (k * 5) % 24] || ' ' || (1 + (k * 37) % 120) as address,
  (array['Madrid','Barcelona','Valencia','Sevilla','Zaragoza','Málaga','Murcia','Palma','Bilbao','Alicante','Córdoba','Valladolid','Vigo','Gijón','Granada','Vitoria','A Coruña','Elche','Getafe','Badalona','Cartagena','Terrassa','Pamplona','Almería','Burgos','Santander','Castellón','Albacete','Logroño','Salamanca'])[1 + (k * 11) % 30] as city,
  lpad(((array[28,8,46,41,50,29,30,7,48,3,14,47,36,33,18,1,15,3,28,8,30,8,31,4,9,39,12,2,26,37])[1 + (k * 11) % 30] * 1000 + 1 + (k * 37) % 80)::text, 5, '0') as postcode,
  '6' || lpad(((k * 7919) % 100000000)::text, 8, '0') as phone,
  timestamptz '2025-09-01 09:00:00+02' + (k % 40) * interval '1 day' as created_at
from generate_series(1, 750) k;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token, is_sso_user, is_anonymous)
select '00000000-0000-0000-0000-000000000000', c.id, 'authenticated', 'authenticated', c.email, pw.hash, c.created_at,
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_strip_nulls(jsonb_build_object('name', c.name, 'company', c.company, 'phone', c.phone, 'address', c.address, 'city', c.city,
    'postcode', c.postcode, 'mode', case when c.biz then 'biz' else 'diy' end, 'demo', true)),
  c.created_at, c.created_at, '', '', '', '', '', '', '', '', false, false
from seed_customers c
cross join (select extensions.crypt('supplyforge-demo', extensions.gen_salt('bf', 10)) as hash) pw
where not exists (select 1 from auth.users u where u.id = c.id or u.email = c.email);

insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
select c.id::text, c.id, jsonb_build_object('sub', c.id::text, 'email', c.email, 'email_verified', true, 'phone_verified', false), 'email', c.created_at, c.created_at
from seed_customers c
join auth.users u on u.id = c.id
on conflict (provider_id, provider) do nothing;

-- Business orders go to business accounts and home orders to home accounts, spread evenly by order id.
update public.orders o
set user_id = c.id,
  customer = jsonb_strip_nulls(jsonb_build_object('name', c.name, 'email', c.email, 'company', c.company, 'phone', c.phone,
    'address', c.address, 'city', c.city, 'postcode', c.postcode, 'source', 'seed'))
from seed_customers c
join auth.users u on u.id = c.id
where o.customer->>'source' = 'seed' and o.user_id is null
  and c.k = case when o.mode = 'biz' then 1 + abs(hashtext(o.id::text)) % 300 else 301 + abs(hashtext(o.id::text)) % 450 end;`;
}
