import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import ListingView from '@/components/ListingView';
import ListingSkeleton from '@/components/ListingSkeleton';
import { getListing, getTaxonomy } from '@/lib/catalog';
import { parseParams } from '@/lib/query';

export const metadata: Metadata = { title: 'Deals' };

export default function Page(props: PageProps<'/deals'>) {
  return (
    <div className="wrap" style={{ paddingBottom: 8 }}>
      <Suspense fallback={<ListingSkeleton label="Loading deals…" />}>
        <Content {...props} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: PageProps<'/deals'>) {
  const { filters, sort, page } = parseParams(await searchParams);
  const f = { ...filters, offers: false, sub: undefined };
  const [{ brands }, listing] = await Promise.all([getTaxonomy(), getListing({ offersOnly: true, filters: f, sort, page })]);
  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Deals</span></nav>
      <div className="list-head"><h1>Autumn deals</h1><p className="muted">Up to −20 % on selected lines, while stock lasts.</p></div>
      <ListingView listing={listing} brands={brands} basePath="/deals" filters={f} sort={sort} />
    </>
  );
}
