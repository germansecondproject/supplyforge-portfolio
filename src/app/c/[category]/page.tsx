import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ListingView from '@/components/ListingView';
import { getListing, getTaxonomy } from '@/lib/catalog';
import { parseParams } from '@/lib/query';

export async function generateStaticParams() {
  const { categories } = await getTaxonomy();
  return categories.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: PageProps<'/c/[category]'>): Promise<Metadata> {
  const { category } = await params;
  const c = (await getTaxonomy()).categories.find((x) => x.slug === category);
  return c ? { title: c.name, description: c.blurb } : {};
}

export default function Page(props: PageProps<'/c/[category]'>) {
  return (
    <div className="wrap" style={{ paddingBottom: 8 }}>
      <Suspense fallback={<p className="muted" style={{ padding: 40 }}>Loading products…</p>}>
        <Content {...props} />
      </Suspense>
    </div>
  );
}

async function Content({ params, searchParams }: PageProps<'/c/[category]'>) {
  const { category } = await params;
  const tax = await getTaxonomy();
  const cat = tax.categories.find((c) => c.slug === category);
  if (!cat) notFound();
  const { filters, sort, page } = parseParams(await searchParams);
  const subs = tax.subcategories.filter((s) => s.category === cat.slug).map((s) => ({ slug: s.slug, name: s.name, count: tax.counts[cat.slug + '/' + s.slug] ?? 0 })).filter((s) => s.count > 0);
  const sub = subs.find((s) => s.slug === filters.sub);
  const listing = await getListing({ category: cat.slug, filters: { ...filters, sub: sub?.slug }, sort, page });
  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link><span aria-hidden="true">/</span>
        {sub ? <><Link href={`/c/${cat.slug}`}>{cat.name}</Link><span aria-hidden="true">/</span><span aria-current="page">{sub.name}</span></> : <span aria-current="page">{cat.name}</span>}
      </nav>
      <div className="list-head">
        <h1>{sub ? sub.name : cat.name}</h1>
        <p className="muted">{cat.blurb}</p>
      </div>
      <ListingView listing={listing} brands={tax.brands} basePath={`/c/${cat.slug}`} filters={filters} sort={sort} subnav={subs} allCount={tax.counts[cat.slug] ?? 0} />
    </>
  );
}
