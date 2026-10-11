import Link from 'next/link';
import Finder from '@/components/Finder';
import QuickOrder from '@/components/QuickOrder';
import ProductCard from '@/components/ProductCard';
import Brands from '@/components/Brands';
import { getFinderIndex, getListing, getTaxonomy } from '@/lib/catalog';

const Arrow = () => <svg width="18" height="18" aria-hidden="true"><use href="#i-arrow" /></svg>;

export default async function Home() {
  const noFilters = { brand: [], mat: [], std: [], d: [], len: [], stock: true, offers: false };
  const [{ categories, counts, total }, finder, deals] = await Promise.all([
    getTaxonomy(),
    getFinderIndex(),
    getListing({ offersOnly: true, filters: noFilters, sort: 'discount', page: 1, pageSize: 4 }),
  ]);
  const count = (slug: string) => (counts[slug] ?? 0).toLocaleString('en');
  const offers = deals.items;
  const totalLabel = total.toLocaleString('en');

  return (
    <>
      <div className="hero">
        <div className="wrap hero-in">
          <span className="eyebrow diy">Hardware &amp; DIY · {totalLabel} products</span>
          <span className="eyebrow biz">Industrial supply · {totalLabel} products</span>
          <h1 className="diy">Everything you need<br /><em>to finish the job</em></h1>
          <h1 className="biz">The exact size,<br /><em>on site tomorrow</em></h1>
          <p className="diy">Screws, anchors and tools with clear sizes, honest advice and delivery the next day. Pick your size below and we show what is in stock.</p>
          <p className="biz">Fasteners, fixings and tools for installers, workshops and contractors. Volume pricing, net-30 invoicing and real stock in our own warehouse.</p>
        </div>
      </div>

      <div className="wrap finder-wrap">
        <Finder rows={finder} />
        <div className="facts" aria-label="Key figures">
          <div><b>94 %</b><span>orders shipped in 24 h</span></div>
          <div><b>{totalLabel}</b><span>products in the catalogue</span></div>
          <div className="biz"><b>30 days</b><span>to pay by invoice</span></div>
          <div className="diy"><b>100 days</b><span>to change your mind</span></div>
        </div>
      </div>

      <div className="wrap sec" style={{ paddingTop: 8, paddingBottom: 0 }}>
        <div className="promos">
          <Link className="promo p-yellow" href="/help">
            <svg className="deco" aria-hidden="true"><use href="#c-screw" /></svg>
            <span className="tag tag-ink">Free delivery</span>
            <div><h3>Order before 5 pm,<br />get it tomorrow</h3><p>Free on orders over €150 <span className="biz">ex VAT</span></p></div>
            <span className="more">Delivery details <Arrow /></span>
          </Link>
          <Link className="promo p-navy diy" href="/c/anchors">
            <svg className="deco" aria-hidden="true"><use href="#c-drill" /></svg>
            <span className="tag tag-zinc">Weekend projects</span>
            <div><h3>Shelves, fences, doors:<br />everything to fix them</h3><p>Plugs, screws and bits, counted and labelled</p></div>
            <span className="more">Shop fixings <Arrow /></span>
          </Link>
          <Link className="promo p-navy biz" href="/c/fasteners">
            <svg className="deco" aria-hidden="true"><use href="#c-anchor" /></svg>
            <span className="tag tag-zinc">Volume pricing</span>
            <div><h3>Up to −18 % per box<br />from 50 boxes</h3><p>Price breaks shown on every product</p></div>
            <span className="more">Shop fasteners <Arrow /></span>
          </Link>
          <Link className="promo p-red" href="/deals">
            <svg className="deco" aria-hidden="true"><use href="#c-disc" /></svg>
            <span className="tag tag-white">Autumn sale</span>
            <div><h3>Up to −20 % on<br />selected lines</h3><p>While stock lasts</p></div>
            <span className="more">Shop the sale <Arrow /></span>
          </Link>
        </div>
      </div>

      <div className="wrap sec" style={{ paddingBottom: 0 }}>
        <div className="svc" role="list">
          <div role="listitem"><svg aria-hidden="true"><use href="#i-truck" /></svg><p><b>24 h delivery</b><span>Order before 5 pm. Free over €150 <span className="biz">ex VAT</span>.</span></p></div>
          <div role="listitem"><svg aria-hidden="true"><use href="#i-store" /></svg><p><b>Click &amp; collect</b><span>Ready in 2 hours. No fee, no minimum order.</span></p></div>
          <div role="listitem"><svg aria-hidden="true"><use href="#i-tag" /></svg><p><b>Save on larger orders</b><span>The more boxes you buy, the less each one costs.</span></p></div>
          <div role="listitem"><svg aria-hidden="true"><use href="#i-invoice" /></svg><p><b className="biz">Pay in 30 days</b><b className="diy">Free returns</b><span className="biz">Invoice terms for approved business accounts.</span><span className="diy">Return any unused box within 100 days.</span></p></div>
        </div>
      </div>

      <div className="wrap sec">
        <div className="sec-head"><div><span className="eyebrow">Catalogue</span><h2>Shop by category</h2></div><Link href="/c/fasteners">All categories</Link></div>
        <div className="tiles">
          {categories.map((c) => (
            <Link key={c.slug} className={`tile t-${c.tone}`} href={`/c/${c.slug}`}>
              <svg className="bg" aria-hidden="true"><use href={`#${c.icon}`} /></svg>
              <h3>{c.name}</h3><span className="n">{count(c.slug)} items</span>
            </Link>
          ))}
        </div>
      </div>

      <QuickOrder className="biz" />

      <div className="band">
        <div className="wrap sec">
          <div className="sec-head"><div><span className="eyebrow">While stock lasts</span><h2>Deals of the week</h2></div><Link href="/deals">See all deals</Link></div>
          <div className="rail">{offers.map((p) => <ProductCard key={p.ref} p={p} />)}</div>
        </div>
      </div>

      <div className="wrap sec">
        <Link className="wide diy" href="/help">
          <svg className="deco" aria-hidden="true"><use href="#c-wrench" /></svg>
          <div><span className="tag tag-zinc">New to DIY?</span><h2>Not sure which screw or plug?</h2><p>Tell us the material and the load. We pick the right size and give you a shopping list to take to the till.</p></div>
          <span className="btn btn-primary btn-lg">Use the project helper</span>
        </Link>
        <Link className="wide biz" href="/help">
          <svg className="deco" aria-hidden="true"><use href="#i-invoice" /></svg>
          <div><span className="tag tag-zinc">Business accounts</span><h2>Net-30 terms and a named account manager</h2><p>Open an account in two minutes. Trade prices, saved lists, repeat orders and one monthly invoice.</p></div>
          <span className="btn btn-primary btn-lg">Open a business account</span>
        </Link>
      </div>

      <div className="wrap sec" style={{ paddingTop: 0 }}>
        <div className="sec-head"><div><span className="eyebrow">Brands we stock</span><h2>Trusted by the trade</h2></div></div>
        <Brands />
      </div>

      <div className="wrap sec" style={{ paddingTop: 0 }}>
        <div className="duo">
          <Link className="promo p-teal" href="/help">
            <svg className="deco" aria-hidden="true"><use href="#i-store" /></svg>
            <span className="tag tag-white">Click &amp; collect</span>
            <div><h3>Ready in 2 hours</h3><p>Pick up at our warehouse in Alcalá de Henares. No fee.</p></div>
          </Link>
          <Link className="promo p-plum" href="/c/fasteners?mat=BK&sub=socket-screws">
            <svg className="deco" aria-hidden="true"><use href="#c-screw" /></svg>
            <span className="tag tag-white">New range</span>
            <div><h3>Black oxide 12.9 socket screws</h3><p>Maximum strength for machine and frame work.</p></div>
          </Link>
        </div>
      </div>

      <div className="wrap sec" style={{ paddingTop: 0 }}>
        <div className="sec-head"><div><span className="eyebrow">Technical guides</span><h2>Get it right the first time</h2></div><Link href="/help">All guides</Link></div>
        <div className="guides">
          <Link className="guide" href="/help"><span className="tag tag-line" style={{ alignSelf: 'flex-start' }}>Fasteners</span><h3>A2 or A4 stainless: when is the extra cost worth it?</h3><p>Coastal air, pools and commercial kitchens. What corrodes what.</p></Link>
          <Link className="guide" href="/help"><span className="tag tag-line" style={{ alignSelf: 'flex-start' }}>Anchors</span><h3>Nylon, metal or chemical anchor, by wall type</h3><p>Hollow brick, concrete and plasterboard, with a load table.</p></Link>
          <Link className="guide" href="/help"><span className="tag tag-line" style={{ alignSelf: 'flex-start' }}>Standards</span><h3>DIN 933 vs DIN 931: it comes down to the thread</h3><p>Full or partial thread, and how it changes the joint.</p></Link>
        </div>
      </div>
    </>
  );
}
