import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import ListingView from '@/components/ListingView';
import { getCatalog } from '@/lib/catalog';
import { parseParams } from '@/lib/query';

export const metadata: Metadata = { title: 'Deals' };

export default function Page(props: PageProps<'/deals'>) {
  return (
    <div className="wrap" style={{ paddingBottom: 8 }}>
      <Suspense fallback={<p className="muted" style={{ padding: 40 }}>Loading deals…</p>}>
        <Content {...props} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: PageProps<'/deals'>) {
  const catalog = await getCatalog();
  const { filters, sort, page } = parseParams(await searchParams);
  const pool = catalog.products.filter((p) => p.off > 0);
  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Deals</span></nav>
      <div className="list-head"><h1>Autumn deals</h1><p className="muted">Up to −20 % on selected lines, while stock lasts.</p></div>
      <ListingView catalog={catalog} pool={pool} basePath="/deals" filters={{ ...filters, offers: false, sub: undefined }} sort={sort} page={page} />
    </>
  );
}
