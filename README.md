# SupplyForge

Portfolio e-commerce for fasteners, anchors and tools. Next.js 16 (App Router, Cache Components), React 19, TypeScript, Supabase (Postgres) and Netlify. All products, prices, brands, stock and sales are synthetic.

- **Two shopping modes**: Home & DIY (prices inc VAT) and Business (ex VAT, volume price tiers, quick order, net-30 invoice). The switch is in the top bar and is remembered.
- **Catalogue**: 10,000 products in 8 categories and 37 subcategories, from 16 brands and 301 product families. Listings, technical filters (brand, material, standard, thread, length), facet counts, sorting, pagination and search ("DIN 933 M8x40" works) all run in Postgres (`catalog_listing()` in `supabase/migrations/20261011120000_catalog_queries.sql`), so a page only ever reads the 24 products it shows. Product pages read one product, its family's variant axes and its recommendations.
- **Product page**: everything comes from the database: name, description, highlights, specifications, weight and package size, SKU, item code and EAN, price, discount and VAT, promotional text, availability per warehouse with delivery time, size configurator and "other sizes" from the family, and stored recommendations.
- **Images**: every product has an `image_url` pointing to its file in the public Supabase Storage bucket `product-images`: a technical drawing generated from the product's dimensions (`src/lib/art.ts`, `src/lib/product-image.ts`). The store pages draw the same image inline so it follows the light and dark theme; `image_url` is what shares, search engines and other clients use. To (re)upload the files, deploy `supabase/functions/upload-product-images` and follow the steps at the top of that file.
- **Accounts**: sign in with Supabase Auth to see your order history, open any order and buy it again. 750 demo customers (`customer1@example.com` to `customer750@example.com`, password `supplyforge-demo`) own the 6,000 seeded orders. Orders placed while signed in are saved to the account, and guest orders join it once the email is confirmed.
- **Search**: suggestions appear under the search box as you type (`/api/suggest`, `search_suggest()`), and typos are forgiven: a word found in no product is swapped for the closest catalogue word (`fix_tokens()`, pg_trgm), so "scrw" finds screws. After changing product names or brands, run `select public.refresh_search_terms();` to update the word list.
- **Trade**: a Distributors button and a Quick order link in the header lead to quick order by part number, volume pricing and net-30 terms (`/trade`).
- **Content pages**: help and returns, warehouses, technical guides, about and legal pages, and saved lists kept in the browser.
- **Quick order**: type part numbers and quantities, or paste the columns straight from Excel or Google Sheets; extra columns and a header row are ignored.
- **Checkout**: basket with recommendations, delivery and payment steps. Orders go through the `place_order()` SQL function, which re-prices every line on the server, checks stock and the unavailable flag, and adds the sale to `sales`. No payment is processed. Customers can check out as a guest or signed in. Each account can place at most 10 orders per hour; guests at most 10 per email per hour, and 30 guest orders per hour across the shop. Delivery details are limited to the store's own fields and lengths.
- **Locked credentials**: customers cannot change their email or password through Supabase Auth (a trigger on `auth.users` refuses it), so nobody can take over the shared demo accounts. The owner changes them with SQL, for example `update auth.users set encrypted_password = extensions.crypt('new password', extensions.gen_salt('bf')) where email = '...';`.
- **Search engines**: `sitemap.xml` lists every page, category, guide and product, `robots.txt` keeps the basket, account and search pages out, and each page sets its canonical URL. The favicon and touch icon come from the logo.
- **Security headers**: `netlify.toml` sets a Content Security Policy, frame blocking, HSTS and related headers on every response.

## Data model

| Table | What it holds |
| --- | --- |
| `categories`, `subcategories`, `brands` | Taxonomy. |
| `product_families` | Product lines (`bolt-hex`, `tape-measure`...) and the attributes that vary inside them (`variant_axes`). |
| `products` | `item_code` (6 digits), `sku`, `ean` (EAN-13, checksum enforced), `name`, `description`, `highlights`, `key_specs`, `specifications`, `category`, `subcategory`, `brand`, `family`, variant attributes (`standard`, `material`, `diameter_mm`, `length_mm`, `size_label`), measurements (`pack_length_mm`, `pack_width_mm`, `pack_height_mm`, `weight_kg`), `image_url`, `image_alt`, selling (`pack_qty`, `sale_unit`, `volume_pricing`, `min_order_qty`), price (`price_ex_vat`, `vat_rate`, `discount_pct`, and generated `price_inc_vat`, `sale_price_ex_vat`, `sale_price_inc_vat`), `unavailable`, `promo_enabled` + `promo_text`, `rating`, `review_count`, `tags`, `origin_country`, `hs_code`. |
| `product_recommendations` | Per product, ordered recommendations of kind `accessory`, `bought_together` or `alternative`. |
| `warehouses` | Madrid, Barcelona, Seville, Valencia and Bilbao, with order cut-off time. |
| `stock` | Per product and warehouse: `location` (aisle-rack-level-bin), `quantity`, `reserved`, `reorder_point`, `shipping_days`, `restock_date`. View `product_availability` sums it per product. |
| `sales` | Daily units sold, units returned, revenue and refunds per product and channel (`web`, `b2b`, `marketplace`). One synthetic year is seeded. View `sales_monthly`. |
| `orders`, `order_lines` | Orders placed through the store, plus 6,000 seeded orders from fictitious customers (`customer.source = 'seed'`). `user_id` links an order to its Supabase Auth account. |

Row level security: catalogue, families, recommendations, warehouses and stock are public read-only. Sales cannot be read or written from the browser. A signed-in customer can read only their own orders and order lines; nobody can write them except through `place_order()`. The browser roles have no INSERT, UPDATE or DELETE grants on any table. The `http` extension, used only to load data, can be switched off in the dashboard (Database, Extensions).

Flip a product from the Supabase table editor and the store follows on the next catalogue refresh (cached for one hour): set `unavailable` to hide the buy button, or set `promo_enabled` with a `promo_text` to show a promotional line on the card and product page.

## Run locally

```bash
npm install
npm run dev
```

With no environment variables the app reads `data/catalog.json`, a 188-product sample of the catalogue, and the checkout validates and prices orders without storing them.

## Connect Supabase

1. Apply the migrations in `supabase/migrations/` in order, then load the seed files in `supabase/seed/` in name order, for example:
   ```bash
   for f in supabase/seed/[1-5]*.sql; do psql "$DB_URL" -f "$f"; done
   ```
   The files only add rows (`on conflict do nothing`), so they are safe to re-run. `00_reset.sql` empties the catalogue tables first and is only for a fresh rebuild. The full data set takes about 110 MB, most of it the year of daily `sales`.
2. Copy `.env.example` to `.env.local` and fill in the project URL and the publishable (anon) key.
3. Restart. The catalogue is now read from Postgres and orders are stored in `orders` / `order_lines` and counted in `sales`.
4. For sign-up confirmation emails, set the Site URL and add `<your site>/account` to the redirect URLs in Supabase, Authentication, URL Configuration. The demo customers are already confirmed and need no email.

To regenerate the catalogue: `npm run catalog` (rewrites `data/catalog.json` and `supabase/seed/`). The generator is deterministic; the original 188 products keep their ids and data. Image URLs point at this project's bucket; set `IMAGE_BASE_URL` to use another one.

## Deploy to Netlify

Import the repository, set the two environment variables above, and deploy. `netlify.toml` pins Node 22; the Next.js runtime is detected automatically.
