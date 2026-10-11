# SupplyForge

Portfolio e-commerce for fasteners, anchors and tools. Next.js 16 (App Router, Cache Components), React 19, TypeScript, Supabase (Postgres) and Netlify. All products, prices, brands, stock and sales are synthetic.

- **Two shopping modes**: Home & DIY (prices inc VAT) and Business (ex VAT, volume price tiers, quick order, net-30 invoice). The switch is in the top bar and is remembered.
- **Catalogue**: 188 products in 8 categories and 26 subcategories, grouped into 43 product families. Technical filters (brand, material, standard, thread, length), sorting, pagination and search ("DIN 933 M8x40" works).
- **Product page**: everything comes from the database: name, description, highlights, specifications, weight and package size, SKU, item code and EAN, price, discount and VAT, promotional text, availability per warehouse with delivery time, size configurator and "other sizes" from the family, and stored recommendations.
- **Images**: every product has an `image_url` (`public/images/products/<slug>.svg`), a technical drawing generated from the product's dimensions (`src/lib/art.ts`).
- **Checkout**: basket with recommendations, delivery and payment steps. Orders go through the `place_order()` SQL function, which re-prices every line on the server, checks stock and the unavailable flag, and adds the sale to `sales`. No payment is processed.

## Data model

| Table | What it holds |
| --- | --- |
| `categories`, `subcategories`, `brands` | Taxonomy. |
| `product_families` | Product lines (`bolt-hex`, `tape-measure`...) and the attributes that vary inside them (`variant_axes`). |
| `products` | `item_code` (6 digits), `sku`, `ean` (EAN-13, checksum enforced), `name`, `description`, `highlights`, `key_specs`, `specifications`, `category`, `subcategory`, `brand`, `family`, variant attributes (`standard`, `material`, `diameter_mm`, `length_mm`, `size_label`), measurements (`pack_length_mm`, `pack_width_mm`, `pack_height_mm`, `weight_kg`), `image_url`, `image_alt`, selling (`pack_qty`, `sale_unit`, `volume_pricing`, `min_order_qty`), price (`price_ex_vat`, `vat_rate`, `discount_pct`, and generated `price_inc_vat`, `sale_price_ex_vat`, `sale_price_inc_vat`), `unavailable`, `promo_enabled` + `promo_text`, `rating`, `review_count`, `tags`, `origin_country`, `hs_code`. |
| `product_recommendations` | Per product, ordered recommendations of kind `accessory`, `bought_together` or `alternative`. |
| `warehouses` | Madrid, Barcelona and Seville, with order cut-off time. |
| `stock` | Per product and warehouse: `location` (aisle-rack-level-bin), `quantity`, `reserved`, `reorder_point`, `shipping_days`, `restock_date`. View `product_availability` sums it per product. |
| `sales` | Daily units sold, units returned, revenue and refunds per product and channel (`web`, `b2b`, `marketplace`). One synthetic year is seeded. View `sales_monthly`. |
| `orders`, `order_lines` | Orders placed through the store. |

Row level security: catalogue, families, recommendations, warehouses and stock are public read-only. Sales and orders cannot be read or written from the browser.

Flip a product from the Supabase table editor and the store follows on the next catalogue refresh (cached for one hour): set `unavailable` to hide the buy button, or set `promo_enabled` with a `promo_text` to show a promotional line on the card and product page.

## Run locally

```bash
npm install
npm run dev
```

With no environment variables the app reads `data/catalog.json` and the checkout validates and prices orders without storing them.

## Connect Supabase

1. In your Supabase project open the SQL editor and run `supabase/migrations/20261011000000_init.sql`, then `supabase/seed.sql`.
2. Copy `.env.example` to `.env.local` and fill in the project URL and the publishable (anon) key.
3. Restart. The catalogue is now read from Postgres and orders are stored in `orders` / `order_lines` and counted in `sales`.

To regenerate the catalogue: `npm run catalog` (rewrites `data/catalog.json`, `supabase/seed.sql` and the product images).

## Deploy to Netlify

Import the repository, set the two environment variables above, and deploy. `netlify.toml` pins Node 22; the Next.js runtime is detected automatically.
