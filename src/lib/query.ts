import { MATNAME } from './standards';
import type { MatKey } from './standards';
import type { Catalog, FamilyMember, Product } from './types';

export const PAGE_SIZE = 24;

export type SortKey = 'relevance' | 'price-asc' | 'price-desc' | 'rating' | 'name';
export const SORTS: { key: SortKey; label: string }[] = [
  { key: 'relevance', label: 'Relevance' },
  { key: 'price-asc', label: 'Price: low to high' },
  { key: 'price-desc', label: 'Price: high to low' },
  { key: 'rating', label: 'Best rated' },
  { key: 'name', label: 'Name A–Z' },
];

export interface Filters {
  sub?: string;
  brand: string[];
  mat: string[];
  std: string[];
  d: string[];
  len: string[];
  stock: boolean;
  offers: boolean;
  q?: string;
}

type Raw = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const list = (v: string | string[] | undefined) => (first(v) ? first(v)!.split(',').filter(Boolean) : []);

export function parseParams(sp: Raw) {
  const filters: Filters = {
    sub: first(sp.sub) || undefined,
    brand: list(sp.brand), mat: list(sp.mat), std: list(sp.std), d: list(sp.d), len: list(sp.len),
    stock: first(sp.stock) === '1', offers: first(sp.offers) === '1',
    q: first(sp.q)?.slice(0, 80),
  };
  const sortRaw = first(sp.sort) as SortKey | undefined;
  const sort: SortKey = SORTS.some((s) => s.key === sortRaw) ? sortRaw! : 'relevance';
  const page = Math.max(1, parseInt(first(sp.page) || '1', 10) || 1);
  return { filters, sort, page };
}

/** Rebuild a query string from parsed state. Keeps URLs short and stable for caching. */
export function toQuery(f: Filters, sort: SortKey, page: number) {
  const u = new URLSearchParams();
  if (f.q) u.set('q', f.q);
  if (f.sub) u.set('sub', f.sub);
  (['brand', 'mat', 'std', 'd', 'len'] as const).forEach((k) => f[k].length && u.set(k, f[k].join(',')));
  if (f.stock) u.set('stock', '1');
  if (f.offers) u.set('offers', '1');
  if (sort !== 'relevance') u.set('sort', sort);
  if (page > 1) u.set('page', String(page));
  const s = u.toString();
  return s ? '?' + s : '';
}

/** Can be added to the basket: not flagged unavailable and stock left in some warehouse. */
export const buyable = (p: Pick<Product, 'unavailable' | 'stock'>) => !p.unavailable && p.stock > 0;

export const offerPriceOf = (p: Product) => Math.round(p.price * (1 - p.off) * 100) / 100;

export const FACET_KEYS = ['brand', 'mat', 'std', 'd', 'len'] as const;
export type FacetKey = (typeof FACET_KEYS)[number];
export type FacetCounts = Record<FacetKey, Record<string, number>>;

function valueOf(p: Product, k: FacetKey): string | null {
  const v = p[k];
  return v === null || v === undefined ? null : String(v);
}

function matches(p: Product, f: Filters, skip?: FacetKey | 'sub') {
  if (skip !== 'sub' && f.sub && p.sub !== f.sub) return false;
  for (const k of FACET_KEYS) {
    if (k === skip) continue;
    const sel = f[k];
    if (sel.length) {
      const v = valueOf(p, k);
      if (v === null || !sel.includes(v)) return false;
    }
  }
  if (f.stock && !buyable(p)) return false;
  if (f.offers && !p.off) return false;
  return true;
}

export interface FacetOption { value: string; label: string; count: number; checked: boolean }
export interface Facet { key: FacetKey; title: string; options: FacetOption[] }

/** Facet counts over an in-memory pool (bundled catalogue). Postgres computes the same in catalog_listing(). */
export function facetCounts(pool: Product[], f: Filters): FacetCounts {
  const out = Object.fromEntries(FACET_KEYS.map((k) => [k, {}])) as FacetCounts;
  for (const k of FACET_KEYS) {
    for (const p of pool) {
      if (!matches(p, f, k)) continue;
      const v = valueOf(p, k);
      if (v !== null) out[k][v] = (out[k][v] || 0) + 1;
    }
  }
  return out;
}

export function buildFacets(counts: FacetCounts, f: Filters, brandName: Record<string, string>): Facet[] {
  const titles: Record<FacetKey, string> = { brand: 'Brand', mat: 'Material', std: 'Standard', d: 'Thread / diameter', len: 'Length' };
  const label = (k: FacetKey, v: string) =>
    k === 'brand' ? brandName[v] || v : k === 'mat' ? (MATNAME[v as MatKey] ? MATNAME[v as MatKey][0].toUpperCase() + MATNAME[v as MatKey].slice(1) : v) : k === 'd' ? `${v} mm` : k === 'len' ? `${v} mm` : v;
  const out: Facet[] = [];
  for (const k of FACET_KEYS) {
    const map = new Map(Object.entries(counts[k] ?? {}));
    // keep selected values visible even when their count falls to zero
    f[k].forEach((v) => !map.has(v) && map.set(v, 0));
    if (map.size < 2 && !f[k].length) continue;
    const opts = [...map.entries()].map(([value, count]) => ({ value, label: label(k, value), count, checked: f[k].includes(value) }));
    opts.sort((a, b) => (k === 'd' || k === 'len' ? Number(a.value) - Number(b.value) : a.label.localeCompare(b.label)));
    out.push({ key: k, title: titles[k], options: opts });
  }
  return out;
}

export type ListSort = SortKey | 'discount';

export function applyListing(pool: Product[], f: Filters, sort: ListSort) {
  const items = pool.filter((p) => matches(p, f));
  const sorted = [...items];
  if (sort === 'price-asc') sorted.sort((a, b) => offerPriceOf(a) / a.pack - offerPriceOf(b) / b.pack || a.id - b.id);
  else if (sort === 'price-desc') sorted.sort((a, b) => offerPriceOf(b) / b.pack - offerPriceOf(a) / a.pack || a.id - b.id);
  else if (sort === 'rating') sorted.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
  else if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'discount') sorted.sort((a, b) => b.off - a.off || Number(buyable(b)) - Number(buyable(a)) || b.reviews - a.reviews);
  else sorted.sort((a, b) => Number(buyable(b)) - Number(buyable(a)) || b.reviews - a.reviews);
  return sorted;
}

/* ---------- search ---------- */
export interface SearchTerms { tokens: string[]; d: number | null; len: number | null }

/** Splits a query into a size (M8, 8x40, M8×40) and lower-case words. Words keep only letters, digits, dot and dash. */
export function parseSearch(q: string): SearchTerms {
  let s = ' ' + q.toLowerCase().replace(/×/g, 'x') + ' ';
  let d: number | null = null, len: number | null = null;
  const size = /\bm?(\d{1,2})\s*x\s*(\d{2,4})\b/.exec(s);
  if (size) { d = +size[1]; len = +size[2]; s = s.replace(size[0], ' '); }
  else {
    const dm = /\bm(\d{1,2})\b/.exec(s);
    if (dm) { d = +dm[1]; s = s.replace(dm[0], ' '); }
  }
  const tokens = s.split(/[\s,]+/).map((t) => t.replace(/[^\p{L}\p{N}.\-]/gu, '')).filter(Boolean).slice(0, 8);
  return { tokens, d, len };
}

export function searchProducts(catalog: Catalog, terms: SearchTerms): Product[] {
  const { tokens, d, len } = terms;
  const brandName = Object.fromEntries(catalog.brands.map((b) => [b.slug, b.name]));
  const subName = Object.fromEntries(catalog.subcategories.map((x) => [x.category + '/' + x.slug, x.name]));
  const catName = Object.fromEntries(catalog.categories.map((c) => [c.slug, c.name]));
  return catalog.products.filter((p) => {
    if (d !== null && p.d !== d) return false;
    if (len !== null && p.len !== len) return false;
    if (!tokens.length) return d !== null || len !== null;
    const hay = `${p.name} ${p.ref} ${p.std || ''} ${brandName[p.brand]} ${subName[p.category + '/' + p.sub]} ${catName[p.category]}`.toLowerCase().replace(/×/g, 'x');
    return tokens.every((t) => hay.includes(t));
  });
}

/* ---------- variants (product page configurator) ---------- */
export type VariantKey = 'mat' | 'd' | 'len' | 'size';
export interface VariantOption { value: string; label: string; selected: boolean; slug: string; disabled: boolean; low: boolean }
export interface VariantGroup { key: VariantKey; title: string; options: VariantOption[] }

/** Size chips for a family. Families of sized products (gloves, discs...) get one "Version" row when it stays short. */
export function variantGroups(sib: FamilyMember[], cur: FamilyMember, woodThread: boolean): VariantGroup[] {
  const groups: VariantGroup[] = [];
  const spec: [VariantKey, string][] = [['mat', 'Material'], ['d', 'Thread size'], ['len', 'Length']];
  if (cur.mat === null && cur.d === null && cur.size && sib.length > 1 && sib.length <= 24) {
    groups.push({ key: 'size', title: 'Version', options: sib.filter((p) => p.size).map((p) => ({
      value: p.size!, label: p.size!, selected: p.id === cur.id, slug: p.slug, disabled: p.id !== cur.id && !buyable(p), low: buyable(p) && p.stock < 30,
    })) });
    return groups;
  }
  for (const [key, title] of spec) {
    const values = [...new Set(sib.map((p) => p[key as 'mat' | 'd' | 'len']).filter((v) => v !== null))] as (string | number)[];
    if (values.length < 2) continue;
    values.sort((a, b) => (typeof a === 'number' ? a - (b as number) : 0));
    const options = values.map((v) => {
      // nearest sibling that has this value while keeping the other options as close as possible
      let best: FamilyMember | null = null, bestScore = Infinity;
      for (const p of sib) {
        if (p[key as 'mat' | 'd' | 'len'] !== v) continue;
        let score = 0;
        for (const [k] of spec) {
          if (k === key) continue;
          const a = p[k as 'mat' | 'd' | 'len'], b = cur[k as 'mat' | 'd' | 'len'];
          if (a === b) continue;
          score += typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) / 100 + 1 : 50;
        }
        if (!buyable(p)) score += 0.5;
        if (score < bestScore) { bestScore = score; best = p; }
      }
      const label = key === 'mat' ? MATNAME[v as MatKey] : key === 'd' ? (woodThread ? 'Ø' + v : 'M' + v) : v + ' mm';
      return {
        value: String(v),
        label: key === 'mat' ? label[0].toUpperCase() + label.slice(1) : label,
        selected: cur[key as 'mat' | 'd' | 'len'] === v,
        slug: (best || cur).slug,
        disabled: cur[key as 'mat' | 'd' | 'len'] !== v && (!best || !buyable(best)),
        low: !!best && buyable(best) && best.stock < 30,
      };
    });
    groups.push({ key, title, options });
  }
  return groups;
}

/** Other sizes and versions of the same family, closest first (same material, then nearest size, then neighbouring versions). */
export function similarSizes(sib: FamilyMember[], p: FamilyMember, n = 8): number[] {
  const dist = (x: FamilyMember) => (x.mat === p.mat ? 0 : 100) + Math.abs((x.d ?? 0) - (p.d ?? 0)) * 10 + Math.abs((x.len ?? 0) - (p.len ?? 0)) / 10;
  return sib.filter((x) => x.id !== p.id).sort((a, b) => dist(a) - dist(b) || Math.abs(a.id - p.id) - Math.abs(b.id - p.id) || a.id - b.id).slice(0, n).map((x) => x.id);
}

export const toMember = (p: Product): FamilyMember => ({ id: p.id, slug: p.slug, mat: p.mat, d: p.d, len: p.len, size: p.size_label, stock: p.stock, unavailable: p.unavailable });

/* ---------- related products (bundled catalogue) ---------- */
/** Recommendations stored for this product, topped up from the same category when some are not buyable. */
export function boughtTogether(catalog: Catalog, p: Product, n = 4): Product[] {
  const byId = new Map(catalog.products.map((x) => [x.id, x]));
  const out: Product[] = [];
  const seen = new Set([p.id]);
  const recs = catalog.recommendations.filter((r) => r.product_id === p.id).sort((a, b) => a.position - b.position);
  for (const r of recs) {
    const x = byId.get(r.recommended_id);
    if (x && buyable(x) && !seen.has(x.id)) { out.push(x); seen.add(x.id); }
  }
  for (const x of catalog.products) {
    if (out.length >= n) break;
    if (!seen.has(x.id) && buyable(x) && x.category === p.category && x.family !== p.family) { out.push(x); seen.add(x.id); }
  }
  return out.slice(0, n);
}

export const CART_EXTRAS = ['SF-985-A2-8', 'SF-125-A2-8', 'SF-LOC-50', 'SF-NYL-8x40', 'SF-BIT-PZ2', 'SF-TAPE-5', 'SF-GLV-9', 'SF-GLS-CLR', 'SF-INS-19', 'SF-TIE-200', 'SF-HAM-450', 'SF-SND-P120'];

/** Part numbers are upper case except the "x" between two sizes (SF-933-A2-8x40). */
export const normalizeSku = (s: string) => s.trim().toUpperCase().replace(/(\d)X(\d)/g, '$1x$2');
