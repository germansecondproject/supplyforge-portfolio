import { cacheLife, cacheTag } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import local from '../../data/catalog.json';
import { toProduct } from './rows';
import type { ProductRow, StockRow } from './rows';
import {
  PAGE_SIZE, FACET_KEYS, applyListing, boughtTogether, buildFacets, buyable, facetCounts, normalizeSku, searchProducts, similarSizes, toMember,
} from './query';
import type { Facet, FacetCounts, Filters, ListSort, SearchTerms } from './query';
import type { Brand, Catalog, Category, Family, FamilyMember, Product, Subcategory } from './types';

/*
 * Data access for the store. With Supabase configured, every read is a small query: one page of a listing, one product,
 * one family's variant axes. Listings, facets and search run in Postgres (catalog_listing() and friends in
 * supabase/migrations). Without Supabase the same functions answer from data/catalog.json, a 188-product sample.
 * Every function is cached for an hour under the 'catalog' tag.
 */

export const supabaseConfigured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/** A server-side client; with a customer's access token, queries and functions run as that customer. */
export function supabaseClient(token?: string | null) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}),
  });
}

const sample = local as unknown as Catalog;
const CARD_SELECT = '*, stock(quantity, reserved, shipping_days, restock_date, warehouses(name, city))';

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/** Full products for a list of ids, in the order given. */
async function productsByIds(ids: number[]): Promise<Product[]> {
  if (!ids.length) return [];
  const rows = must(await supabaseClient().from('products').select(CARD_SELECT).in('id', ids)) as (ProductRow & { stock: StockRow[] })[];
  const byId = new Map(rows.map((r) => [r.id, toProduct(r, r.stock)]));
  return ids.map((id) => byId.get(id)).filter((p): p is Product => !!p);
}

/* ---------- taxonomy ---------- */
export interface Taxonomy {
  categories: Category[];
  subcategories: Subcategory[];
  brands: Brand[];
  /** product counts keyed by category and by 'category/subcategory' */
  counts: Record<string, number>;
  total: number;
}

export async function getTaxonomy(): Promise<Taxonomy> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog');
  let categories = sample.categories, subcategories = sample.subcategories, brands = sample.brands;
  let bySub: Record<string, number> = {};
  if (supabaseConfigured()) {
    const sb = supabaseClient();
    const [c, s, b, n] = await Promise.all([
      sb.from('categories').select('*').order('position'),
      sb.from('subcategories').select('*').order('position'),
      sb.from('brands').select('*').order('name'),
      sb.rpc('catalog_counts'),
    ]);
    categories = must(c) as Category[];
    subcategories = must(s) as Subcategory[];
    brands = must(b) as Brand[];
    bySub = must(n) as Record<string, number>;
  } else {
    for (const p of sample.products) bySub[p.category + '/' + p.sub] = (bySub[p.category + '/' + p.sub] || 0) + 1;
  }
  const counts: Record<string, number> = { ...bySub };
  let total = 0;
  for (const [k, v] of Object.entries(bySub)) {
    const cat = k.split('/')[0];
    counts[cat] = (counts[cat] || 0) + v;
    total += v;
  }
  return { categories, subcategories, brands, counts, total };
}

/* ---------- listings: category, search, deals ---------- */
export interface ListingQuery {
  category?: string;
  offersOnly?: boolean;
  search?: SearchTerms;
  filters: Filters;
  sort: ListSort;
  page: number;
  pageSize?: number;
}
export interface Listing {
  items: Product[];
  total: number;
  page: number;
  pages: number;
  facets: Facet[];
}

export async function getListing(q: ListingQuery): Promise<Listing> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog');
  const size = q.pageSize ?? PAGE_SIZE;
  const { brands } = await getTaxonomy();
  const brandName = Object.fromEntries(brands.map((b) => [b.slug, b.name]));
  const f = q.filters;

  if (!supabaseConfigured()) {
    let pool = q.search ? searchProducts(sample, q.search) : sample.products;
    if (q.category) pool = pool.filter((p) => p.category === q.category);
    if (q.offersOnly) pool = pool.filter((p) => p.off > 0);
    const sorted = applyListing(pool, f, q.sort);
    const pages = Math.max(1, Math.ceil(sorted.length / size));
    const page = Math.min(q.page, pages);
    return { items: sorted.slice((page - 1) * size, page * size), total: sorted.length, page, pages, facets: buildFacets(facetCounts(pool, f), f, brandName) };
  }

  const args = {
    p_category: q.category ?? null, p_sub: f.sub ?? null, p_offers_only: !!q.offersOnly,
    p_tokens: q.search?.tokens.length ? q.search.tokens : null, p_d: q.search?.d ?? null, p_len: q.search?.len ?? null,
    f_brand: f.brand, f_mat: f.mat, f_std: f.std, f_d: f.d.map(Number).filter(Number.isFinite), f_len: f.len.map(Number).filter(Number.isInteger),
    f_stock: f.stock, f_offers: f.offers, p_sort: q.sort, p_limit: size,
  };
  const sb = supabaseClient();
  let res = must(await sb.rpc('catalog_listing', { ...args, p_offset: (q.page - 1) * size })) as { total: number; ids: number[]; facets: FacetCounts };
  const pages = Math.max(1, Math.ceil(res.total / size));
  const page = Math.min(q.page, pages);
  // a page number past the end shows the last page
  if (page !== q.page) res = must(await sb.rpc('catalog_listing', { ...args, p_offset: (page - 1) * size })) as typeof res;
  const counts = Object.fromEntries(FACET_KEYS.map((k) => [k, res.facets[k] ?? {}])) as FacetCounts;
  return { items: await productsByIds(res.ids), total: res.total, page, pages, facets: buildFacets(counts, f, brandName) };
}

/* ---------- single products ---------- */
export async function getProduct(slug: string): Promise<Product | null> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog');
  if (!supabaseConfigured()) return sample.products.find((p) => p.slug === slug) ?? null;
  const rows = must(await supabaseClient().from('products').select(CARD_SELECT).eq('slug', slug).limit(1)) as (ProductRow & { stock: StockRow[] })[];
  return rows.length ? toProduct(rows[0], rows[0].stock) : null;
}

export async function getProductsBySku(skus: string[]): Promise<Product[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog');
  const wanted = [...new Set(skus.map(normalizeSku))].slice(0, 100);
  if (!wanted.length) return [];
  if (!supabaseConfigured()) return wanted.map((s) => sample.products.find((p) => p.ref === s)).filter((p): p is Product => !!p);
  const rows = must(await supabaseClient().from('products').select(CARD_SELECT).in('sku', wanted)) as (ProductRow & { stock: StockRow[] })[];
  const bySku = new Map(rows.map((r) => [r.sku, toProduct(r, r.stock)]));
  return wanted.map((s) => bySku.get(s)).filter((p): p is Product => !!p);
}

export interface ProductPage {
  product: Product;
  family: Family | null;
  members: FamilyMember[];
  together: Product[];
  similar: Product[];
}

/** Everything the product page needs: the product, its family's variant axes, stored recommendations and similar sizes. */
export async function getProductPage(slug: string): Promise<ProductPage | null> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog');
  const product = await getProduct(slug);
  if (!product) return null;

  if (!supabaseConfigured()) {
    const sib = sample.products.filter((p) => p.family === product.family);
    const members = sib.map(toMember);
    const ids = similarSizes(members, toMember(product));
    return {
      product,
      family: sample.families.find((f) => f.slug === product.family) ?? null,
      members,
      together: boughtTogether(sample, product),
      similar: ids.map((id) => sample.products.find((p) => p.id === id)!),
    };
  }

  const sb = supabaseClient();
  const [fam, mem, recs] = await Promise.all([
    sb.from('product_families').select('*').eq('slug', product.family).maybeSingle(),
    sb.rpc('family_index', { p_family: product.family }),
    sb.from('product_recommendations').select('recommended_id').eq('product_id', product.id).order('position'),
  ]);
  const members = (must(mem) as (Omit<FamilyMember, 'd'> & { d: number | string | null })[]).map((m) => ({ ...m, d: m.d === null ? null : Number(m.d) }));
  const recIds = (must(recs) as { recommended_id: number }[]).map((r) => r.recommended_id);
  const simIds = similarSizes(members, toMember(product));
  // top up recommendations with popular buyable products from the same category, outside this family
  const fill = must(await sb.from('product_index').select('id').eq('category', product.category).neq('family', product.family).eq('buyable', true)
    .order('review_count', { ascending: false }).limit(8)) as { id: number }[];
  const cards = await productsByIds([...new Set([...recIds, ...fill.map((x) => x.id), ...simIds])]);
  const byId = new Map(cards.map((p) => [p.id, p]));
  const together: Product[] = [];
  for (const id of [...recIds, ...fill.map((x) => x.id)]) {
    const p = byId.get(id);
    if (p && buyable(p) && !together.some((x) => x.id === id) && together.length < 4) together.push(p);
  }
  return {
    product,
    family: (must(fam) as Family | null) ?? null,
    members,
    together,
    similar: simIds.map((id) => byId.get(id)).filter((p): p is Product => !!p),
  };
}

/** Most reviewed products: prerendered at build time, the rest render on first visit. */
export async function getPopularSlugs(n: number): Promise<string[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog');
  if (!supabaseConfigured()) return [...sample.products].sort((a, b) => b.reviews - a.reviews).slice(0, n).map((p) => p.slug);
  return (must(await supabaseClient().from('products').select('slug').order('review_count', { ascending: false }).limit(n)) as { slug: string }[]).map((r) => r.slug);
}

/** Bolts and screws for the home page size finder, as [type, material, diameter, length, in stock (1/0)]. */
export type FinderRow = [string, string, number, number, number];
export async function getFinderIndex(): Promise<FinderRow[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalog');
  if (!supabaseConfigured()) {
    return sample.products.filter((p) => p.art.kind === 'bolt' && p.family === 'bolt-' + p.art.t).map((p) => [p.art.t!, p.mat!, p.d!, p.len!, buyable(p) ? 1 : 0]);
  }
  return (must(await supabaseClient().rpc('finder_index')) as [string, string, number | string, number, number][]).map(([t, m, d, l, s]) => [t, m, Number(d), l, s]);
}
