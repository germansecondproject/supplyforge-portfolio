import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Gallery from '@/components/Gallery';
import type { GalleryView } from '@/components/Gallery';
import Tabs from '@/components/Tabs';
import BuyBox from '@/components/BuyBox';
import ProductCard from '@/components/ProductCard';
import { getCatalog } from '@/lib/catalog';
import { artSVG } from '@/lib/art';
import { boughtTogether, buyable, familyOf, offerPriceOf, similarSizes, variantGroups } from '@/lib/query';
import { GEO, MATGRADE, PITCH, TYPES, boltBoxWeight, tl } from '@/lib/standards';
import type { Product } from '@/lib/types';

export async function generateStaticParams() {
  const { products } = await getCatalog();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<'/product/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const p = (await getCatalog()).products.find((x) => x.slug === slug);
  if (!p) return {};
  return { title: p.name, description: `${p.specs.join(' · ')}. SKU ${p.ref}.`, openGraph: { images: [{ url: p.image, alt: p.image_alt }] } };
}

function galleryFor(p: Product): { views: GalleryView[]; facts: [string, string][] } {
  const title = p.name;
  if (p.art.kind === 'bolt' && p.art.t && p.mat && p.d && p.len) {
    const t = p.art.t, g = GEO[t](p.d);
    const dark = { dc: '#9CC4FF', tc: '#FFFFFF' };
    return {
      views: [
        { label: 'Side view with dimensions', svg: artSVG(p.art, { H: 270, dims: true, ...dark }, title) },
        { label: 'Head view', svg: artSVG(p.art, { H: 270, view: 'top', ...dark }, title) },
        { label: `Box of ${p.pack} pieces`, svg: artSVG(p.art, { H: 270, view: 'pack' }, title) },
      ],
      facts: [
        ['Thread', tl(t, p.d) + (t === 'wood' ? '' : ' × ' + PITCH[p.d])],
        ['Strength', MATGRADE[p.mat]],
        [t === 'hex' ? 'Spanner' : t === 'wood' ? 'Drive' : 'Hex key', t === 'hex' ? 'AF ' + g.key + ' mm' : t === 'wood' ? (p.d >= 6 ? 'PZ3' : 'PZ2') : g.key + ' mm'],
      ],
    };
  }
  const facts = p.spec_table.filter(([k]) => !['Part number', 'Brand', 'Sold as'].includes(k)).slice(0, 3) as [string, string][];
  return { views: [{ label: 'Technical drawing', svg: artSVG(p.art, { H: 270 }, title) }], facts };
}

export default function Page(props: PageProps<'/product/[slug]'>) {
  return <Content {...props} />;
}

async function Content({ params }: PageProps<'/product/[slug]'>) {
  const { slug } = await params;
  const catalog = await getCatalog();
  const p = catalog.products.find((x) => x.slug === slug);
  if (!p) notFound();
  const cat = catalog.categories.find((c) => c.slug === p.category)!;
  const sub = catalog.subcategories.find((s) => s.category === p.category && s.slug === p.sub);
  const brand = catalog.brands.find((b) => b.slug === p.brand)?.name || '';
  const groups = variantGroups(catalog.products, p);
  const fam = familyOf(catalog.products, p);
  const together = boughtTogether(catalog, p);
  const similar = similarSizes(catalog.products, p);
  const family = catalog.families.find((x) => x.slug === p.family);
  const { views, facts } = galleryFor(p);
  const isBolt = p.art.kind === 'bolt' && !!p.art.t;
  const pr = offerPriceOf(p);

  const sizeChart = isBolt && p.len ? (() => {
    const t = p.art.t!;
    const dg = groups.find((g) => g.key === 'd');
    const diams = [...new Set(fam.map((x) => x.d!))].sort((a, b) => a - b);
    return (
      <>
        <p className="muted" style={{ marginBottom: 14, maxWidth: '62ch' }}>Nominal dimensions in millimetres. Select a size to load it into the product above.</p>
        <div className="dim-table">
          <table className="spec" style={{ maxWidth: 'none' }}>
            <thead><tr><th scope="col">Thread</th><th scope="col">Pitch</th><th scope="col">k</th><th scope="col">{t === 'hex' ? 'AF' : 'Head Ø'}</th><th scope="col">Weight per box · L={p.len}</th></tr></thead>
            <tbody>
              {diams.map((d) => {
                const g = GEO[t](d);
                const target = dg?.options.find((o) => o.value === String(d));
                return (
                  <tr key={d} style={d === p.d ? { background: 'var(--zinc-soft)' } : undefined}>
                    <th scope="row" style={{ width: 'auto' }}>
                      {target && d !== p.d ? <Link href={`/product/${target.slug}`} style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink)' }}>{tl(t, d)}</Link> : <span className="mono" style={{ color: 'var(--ink)' }}>{tl(t, d)}</span>}
                    </th>
                    <td>{t === 'wood' ? '—' : PITCH[d]}</td><td>{g.k}</td><td>{g.hw}</td><td>{boltBoxWeight(t, d, p.len!).toFixed(2)} kg</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    );
  })() : null;

  const tabs = [
    { id: 'spec', label: 'Specifications', content: (
      <table className="spec"><tbody>
        {[...p.spec_table,
          ['Weight', `${p.weight_kg.toFixed(p.weight_kg < 1 ? 3 : 2)} kg ${p.tier ? 'per box' : p.pack > 1 ? 'per pack' : ''}`.trim()],
          ['Package (L × W × H)', p.dims_mm.join(' × ') + ' mm'],
          ['Country of origin', p.origin_country],
          ...(p.hs_code ? [['Customs code (HS)', p.hs_code]] : []),
          ['SKU', p.ref], ['Item code', String(p.item_code)], ['EAN', p.ean],
        ].map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>)}
      </tbody></table>
    ) },
    { id: 'stock', label: 'Availability', content: (
      <table className="avail">
        <thead><tr><th scope="col">Warehouse</th><th scope="col">Available</th><th scope="col">Delivery</th><th scope="col">Next restock</th></tr></thead>
        <tbody>{p.availability.map((a) => (
          <tr key={a.warehouse}><td>{a.warehouse} · <span className="muted">{a.city}</span></td><td className="num">{a.available}</td><td>{a.shipping_days} working {a.shipping_days === 1 ? 'day' : 'days'}</td><td>{a.restock_date ?? '—'}</td></tr>
        ))}</tbody>
      </table>
    ) },
    ...(sizeChart ? [{ id: 'dim', label: 'Size chart', content: sizeChart }] : []),
    { id: 'doc', label: 'Documents', content: (
      <div className="docs">
        {['Data sheet (PDF)', 'Material certificate 3.1', 'Declaration of performance (CE)'].map((d) => (
          <div className="doc" key={d} aria-disabled="true"><span>{d}</span><span className="mono muted">Sample</span></div>
        ))}
      </div>
    ) },
    { id: 'rev', label: `Reviews (${p.reviews})`, content: (
      <div className="twocol">
        <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}><b style={{ font: '700 3rem/1 var(--f-display)' }}>{p.rating}</b><span className="muted">out of 5 · {p.reviews} reviews</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><b>Consistent quality between batches</b><p className="muted">Used on site for two seasons and no complaints. Sizes match the data sheet. <span className="mono" style={{ fontSize: '.75rem' }}>— Installer, Guadalajara</span></p></div>
          <div><b>Good price at volume</b><p className="muted">The price drops noticeably on larger orders. Arrived next day as promised. <span className="mono" style={{ fontSize: '.75rem' }}>— Workshop, Madrid</span></p></div>
        </div>
      </div>
    ) },
  ];

  const ld = {
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, sku: p.ref, mpn: String(p.item_code), gtin13: p.ean, image: p.image, description: p.description, brand: { '@type': 'Brand', name: brand },
    weight: { '@type': 'QuantitativeValue', value: p.weight_kg, unitCode: 'KGM' },
    aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.reviews },
    offers: { '@type': 'Offer', priceCurrency: 'EUR', price: pr.toFixed(2), availability: buyable(p) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' },
  };

  return (
    <div className="wrap pdp-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link><span aria-hidden="true">/</span>
        <Link href={`/c/${cat.slug}`}>{cat.name}</Link><span aria-hidden="true">/</span>
        {sub && <><Link href={`/c/${cat.slug}?sub=${sub.slug}`}>{sub.name}</Link><span aria-hidden="true">/</span></>}
        <span aria-current="page">{p.std || p.ref}</span>
      </nav>

      <div className="pdp2">
        <Gallery views={views} facts={facts} />
        <div className="cfg-col">
          <div>
            <span className="eyebrow">{cat.name}{p.std ? ` · ${p.std}${isBolt && TYPES[p.art.t!].iso ? ' / ' + TYPES[p.art.t!].iso : ''}` : ''}</span>
            <h1>{p.name}</h1>
          </div>
          <div className="meta">
            <span>SKU <b className="mono">{p.ref}</b></span>
            <span className="rating"><span className="stars" aria-hidden="true">{[0, 1, 2, 3, 4].map((i) => <svg key={i}><use href="#i-star" /></svg>)}</span><b>{p.rating}</b> ({p.reviews} reviews)</span>
            <span>Brand <b>{brand}</b></span>
          </div>
          <div className="codes"><span>Item code <b>{p.item_code}</b></span><span>EAN <b>{p.ean}</b></span>{p.size_label && <span>Version <b>{p.size_label}</b></span>}</div>
          {p.promo && <div className="promo-banner" role="note"><svg width="18" height="18" aria-hidden="true"><use href="#i-check" /></svg>{p.promo}</div>}
          <div className="cfg" aria-label="Configure your product">
            {groups.map((g, i) => (
              <div className="cfg-step" key={g.key}>
                <div className="cfg-h"><i>{i + 1}</i><span id={'o-' + g.key}>{g.title}</span></div>
                <div className="opt-row" role="group" aria-labelledby={'o-' + g.key}>
                  {g.options.map((o) => (
                    <Link key={o.value} href={`/product/${o.slug}`} className="chip" aria-pressed={o.selected} aria-disabled={o.disabled || undefined} aria-label={o.disabled ? `${o.label}, out of stock` : undefined} scroll={false}>
                      {o.label}{o.low && <small>Few left</small>}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <BuyBox p={p} step={groups.length + 1} />
          </div>
          <ul className="bullets">{p.blurb.map((b) => <li key={b}>{b}</li>)}</ul>
          <p className="desc">{p.description}</p>
        </div>
      </div>

      <div className="sec" style={{ paddingBottom: 0 }}>
        <Tabs tabs={tabs} label="Product information" />
      </div>

      <div className="sec" style={{ paddingBottom: 0 }}>
        <div className="sec-head"><div><span className="eyebrow">{isBolt ? 'For this joint' : 'Customers also buy'}</span><h2>Bought together</h2></div></div>
        <div className="rail">{together.map((x) => <ProductCard key={x.ref} p={x} />)}</div>
      </div>

      {similar.length > 0 && (
        <div className="sec" style={{ paddingBottom: 0 }}>
          <div className="sec-head"><div><span className="eyebrow">{family?.name}</span><h2>Other sizes and versions</h2></div></div>
          <div className="rail">{similar.map((x) => <ProductCard key={x.ref} p={x} />)}</div>
        </div>
      )}
    </div>
  );
}

