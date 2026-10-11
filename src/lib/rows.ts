import type { Product, StockLine } from './types.ts';

/* Row shapes as stored in Postgres (supabase/migrations). Only the columns the store reads are listed. */
export interface ProductRow {
  id: number; item_code: number; sku: string; ean: string; slug: string; name: string; description: string;
  highlights: string[]; key_specs: string[]; specifications: [string, string][];
  category: string; subcategory: string; brand: string; family: string;
  standard: string | null; material: string | null; diameter_mm: number | string | null; length_mm: number | null; size_label: string | null;
  pack_length_mm: number; pack_width_mm: number; pack_height_mm: number; weight_kg: number | string;
  image_url: string; image_alt: string; art: Product['art'];
  pack_qty: number; sale_unit: string; volume_pricing: boolean; min_order_qty: number;
  price_ex_vat: number | string; discount_pct: number | string; unavailable: boolean; promo_enabled: boolean; promo_text: string | null;
  rating: number | string; review_count: number; tags: string[]; origin_country: string; hs_code: string | null;
}
export interface StockRow {
  product_id: number; quantity: number; reserved: number; shipping_days: number; restock_date: string | null;
  warehouses: { name: string; city: string } | null;
}

export function toProduct(r: ProductRow, stock: StockRow[]): Product {
  const availability: StockLine[] = stock
    .map((s) => ({ warehouse: s.warehouses?.name ?? '', city: s.warehouses?.city ?? '', available: s.quantity - s.reserved, shipping_days: s.shipping_days, restock_date: s.restock_date }))
    .sort((a, b) => a.shipping_days - b.shipping_days);
  const fastest = availability.find((a) => a.available > 0) ?? null;
  return {
    id: r.id, item_code: r.item_code, ean: r.ean, slug: r.slug, ref: r.sku, name: r.name, description: r.description,
    category: r.category, sub: r.subcategory, brand: r.brand, family: r.family, size_label: r.size_label,
    std: r.standard, mat: r.material as Product['mat'], d: r.diameter_mm === null ? null : Number(r.diameter_mm), len: r.length_mm,
    pack: r.pack_qty, unit: r.sale_unit, tier: r.volume_pricing, min_order_qty: r.min_order_qty,
    price: Number(r.price_ex_vat), off: Number(r.discount_pct) / 100,
    unavailable: r.unavailable, promo: r.promo_enabled ? r.promo_text : null,
    stock: availability.reduce((n, a) => n + Math.max(0, a.available), 0),
    ship_days: fastest ? fastest.shipping_days : null, ships_from: fastest ? fastest.warehouse : null,
    restock_date: availability.map((a) => a.restock_date).filter((d): d is string => !!d).sort()[0] ?? null,
    availability,
    weight_kg: Number(r.weight_kg), dims_mm: [r.pack_length_mm, r.pack_width_mm, r.pack_height_mm],
    image: r.image_url, image_alt: r.image_alt, tags: r.tags, origin_country: r.origin_country, hs_code: r.hs_code,
    rating: Number(r.rating), reviews: r.review_count, specs: r.key_specs, blurb: r.highlights, spec_table: r.specifications, art: r.art,
  };
}
