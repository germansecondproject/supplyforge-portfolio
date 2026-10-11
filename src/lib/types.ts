import type { BoltType, MatKey } from './standards';

export interface ArtSpec {
  kind: string;
  t?: BoltType;
  mat?: MatKey;
  d?: number;
  L?: number;
  color?: string;
}

export interface Category {
  slug: string;
  name: string;
  tone: string; // css class suffix: yellow, navy, red...
  icon: string; // svg symbol id
  blurb: string;
  position: number;
}

export interface Subcategory {
  category: string;
  slug: string;
  name: string;
  position: number;
}

export interface Brand {
  slug: string;
  name: string;
  country: string;
}

export interface Family {
  slug: string;
  name: string;
  category: string;
  subcategory: string;
  variant_axes: string[];
  description: string | null;
}

export type RecKind = 'accessory' | 'bought_together' | 'alternative';
export interface Recommendation {
  product_id: number;
  recommended_id: number;
  kind: RecKind;
  position: number;
}

export interface StockLine {
  warehouse: string; // warehouse name
  city: string;
  available: number;
  shipping_days: number;
  restock_date: string | null;
}

/** App-side product. The database names differ in places (sku, subcategory, price_ex_vat, discount_pct...); see lib/catalog.ts. */
export interface Product {
  id: number;
  item_code: number; // six digits
  ean: string; // EAN-13
  slug: string;
  ref: string; // SKU
  name: string;
  description: string;
  category: string;
  sub: string;
  brand: string;
  family: string;
  size_label: string | null;
  std: string | null;
  mat: MatKey | null;
  d: number | null;
  len: number | null;
  pack: number;
  unit: string;
  tier: boolean;
  min_order_qty: number;
  price: number; // list price ex VAT per sale unit
  off: number; // discount, 0..1
  unavailable: boolean;
  promo: string | null; // promotional text, set only when the promo flag is on
  stock: number; // sum of available units across warehouses
  ship_days: number | null; // fastest delivery from a warehouse with stock
  ships_from: string | null;
  restock_date: string | null;
  availability: StockLine[];
  weight_kg: number; // per sale unit
  dims_mm: [number, number, number]; // length, width, height of one sale unit as shipped
  image: string; // URL of the product image
  image_alt: string;
  tags: string[];
  origin_country: string;
  hs_code: string | null;
  rating: number;
  reviews: number;
  specs: string[];
  blurb: string[];
  spec_table: [string, string][];
  art: ArtSpec;
}

export interface Catalog {
  categories: Category[];
  subcategories: Subcategory[];
  brands: Brand[];
  families: Family[];
  products: Product[];
  recommendations: Recommendation[];
}

export interface CartLine {
  ref: string;
  slug: string;
  name: string;
  pack: number;
  tier: boolean;
  unit: string;
  list: number; // list price per box/unit, ex VAT
  off: number; // product offer, 0..1
  qty: number;
  art: ArtSpec;
}
