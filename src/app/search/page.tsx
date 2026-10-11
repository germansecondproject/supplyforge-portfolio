import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import ListingView from '@/components/ListingView';
import { getCatalog } from '@/lib/catalog';
import { parseParams, searchProducts } from '@/lib/query';

export const metadata: Metadata = { title: 'Search' };

export default function Page(props: PageProps<'/search'>) {
  return (
    <div className="wrap" style={{ paddingBottom: 8 }}>
      <Suspense fallback={<p className="muted" style={{ padding: 40 }}>Searching…</p>}>
        <Content {...props} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: PageProps<'/search'>) {
  const catalog = await getCatalog();
  const { filters, sort, page } = parseParams(await searchParams);
  const q = filters.q || '';
  const pool = q ? searchProducts(catalog, q) : [];
  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Search</span></nav>
      <div className="list-head">
        <h1>{q ? <>Results for “{q}”</> : 'Search'}</h1>
        <p className="muted">Try a part number, a size such as “DIN 933 M8x40”, a brand or a product name.</p>
      </div>
      <ListingView catalog={catalog} pool={pool} basePath="/search" filters={{ ...filters, sub: undefined }} sort={sort} page={page}
        emptyHint={q ? `Nothing matches “${q}”. Check the part number or try fewer words.` : 'Type something in the search box above.'} />
    </>
  );
}
