import Link from 'next/link';
import ProductCard from './ProductCard';
import { FilterPanel, SortSelect } from './FilterPanel';
import { PAGE_SIZE, applyListing, buildFacets, toQuery } from '@/lib/query';
import type { Filters, SortKey } from '@/lib/query';
import type { Catalog, Product } from '@/lib/types';

interface Props {
  catalog: Catalog;
  pool: Product[];
  basePath: string;
  filters: Filters;
  sort: SortKey;
  page: number;
  subnav?: { slug: string; name: string; count: number }[];
  emptyHint?: string;
}

const chipLabel = (k: string, v: string, catalog: Catalog) =>
  k === 'brand' ? catalog.brands.find((b) => b.slug === v)?.name || v : k === 'd' || k === 'len' ? `${v} mm` : v;

export default function ListingView({ catalog, pool, basePath, filters, sort, page, subnav, emptyHint }: Props) {
  const sorted = applyListing(pool, filters, sort);
  const facets = buildFacets(pool, filters, catalog);
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const slice = sorted.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);
  const active: { label: string; href: string }[] = [];
  (['brand', 'mat', 'std', 'd', 'len'] as const).forEach((k) =>
    filters[k].forEach((v) => active.push({ label: chipLabel(k, v, catalog), href: basePath + toQuery({ ...filters, [k]: filters[k].filter((x) => x !== v) }, sort, 1) })));
  if (filters.stock) active.push({ label: 'In stock', href: basePath + toQuery({ ...filters, stock: false }, sort, 1) });
  if (filters.offers) active.push({ label: 'On offer', href: basePath + toQuery({ ...filters, offers: false }, sort, 1) });
  const pageHref = (n: number) => basePath + toQuery(filters, sort, n);
  const nums: (number | '…')[] = [];
  for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - cur) <= 1) nums.push(i); else if (nums[nums.length - 1] !== '…') nums.push('…');

  return (
    <>
      {subnav && subnav.length > 0 && (
        <div className="subnav" role="navigation" aria-label="Subcategories">
          <Link href={basePath + toQuery({ ...filters, sub: undefined }, sort, 1)} aria-current={!filters.sub}>All <small>{pool.length}</small></Link>
          {subnav.map((s) => <Link key={s.slug} href={basePath + toQuery({ ...filters, sub: s.slug }, sort, 1)} aria-current={filters.sub === s.slug}>{s.name} <small>{s.count}</small></Link>)}
        </div>
      )}
      <div className="list-grid">
        <FilterPanel facets={facets} filters={filters} sort={sort} basePath={basePath} />
        <section aria-label="Products">
          <div className="toolbar">
            <p className="count" aria-live="polite"><b>{sorted.length}</b> {sorted.length === 1 ? 'product' : 'products'}</p>
            <SortSelect filters={filters} sort={sort} basePath={basePath} />
          </div>
          {active.length > 0 && (
            <div className="active" aria-label="Active filters">
              {active.map((a) => <Link key={a.label + a.href} href={a.href} aria-label={`Remove filter ${a.label}`}>{a.label}<span aria-hidden="true">×</span></Link>)}
              <Link href={basePath + toQuery({ ...filters, brand: [], mat: [], std: [], d: [], len: [], stock: false, offers: false }, sort, 1)}>Clear all</Link>
            </div>
          )}
          {slice.length ? (
            <div className="rail three">{slice.map((p) => <ProductCard key={p.ref} p={p} />)}</div>
          ) : (
            <div className="noresults">
              <h2>No products match</h2>
              <p className="muted">{emptyHint || 'Try removing a filter or checking the part number.'}</p>
              <Link className="btn btn-primary" href={basePath}>Clear filters</Link>
            </div>
          )}
          {pages > 1 && (
            <nav className="pager" aria-label="Pagination">
              {cur > 1 ? <Link href={pageHref(cur - 1)} rel="prev">Previous</Link> : <span className="dis">Previous</span>}
              {nums.map((n, i) => n === '…' ? <span key={'e' + i} className="dis">…</span> : <Link key={n} href={pageHref(n)} aria-current={n === cur ? 'page' : undefined}>{n}</Link>)}
              {cur < pages ? <Link href={pageHref(cur + 1)} rel="next">Next</Link> : <span className="dis">Next</span>}
            </nav>
          )}
        </section>
      </div>
    </>
  );
}
