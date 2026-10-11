import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import ListingView from '@/components/ListingView';
import ListingSkeleton from '@/components/ListingSkeleton';
import { getListing, getTaxonomy } from '@/lib/catalog';
import { parseParams, parseSearch } from '@/lib/query';

export const metadata: Metadata = { title: 'Search', robots: { index: false, follow: true } };

export default function Page(props: PageProps<'/search'>) {
  return (
    <div className="wrap" style={{ paddingBottom: 8 }}>
      <Suspense fallback={<ListingSkeleton label="Searching…" />}>
        <Content {...props} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: PageProps<'/search'>) {
  const { filters, sort, page } = parseParams(await searchParams);
  const q = filters.q || '';
  const terms = parseSearch(q);
  const { brands } = await getTaxonomy();
  const empty = !terms.tokens.length && terms.d === null && terms.len === null;
  const listing = empty
    ? { items: [], total: 0, page: 1, pages: 1, facets: [] }
    : await getListing({ search: terms, filters: { ...filters, sub: undefined, q: undefined }, sort, page });
  // words the database swapped for the closest catalogue word ("scrw" → "screw")
  const used = 'tokens' in listing ? listing.tokens : undefined;
  const fixed = used && used.some((t, i) => t !== terms.tokens[i]) ? used.join(' ') : null;
  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Search</span></nav>
      <div className="list-head">
        <h1>{q ? <>Results for “{q}”</> : 'Search'}</h1>
        {fixed ? (
          <p>Showing results for <b>{fixed}</b>. We corrected words that appear in no product.</p>
        ) : (
          <p className="muted">Try a part number, a size such as “DIN 933 M8x40”, a brand or a product name.</p>
        )}
      </div>
      <ListingView listing={listing} brands={brands} basePath="/search" filters={{ ...filters, sub: undefined }} sort={sort}
        emptyHint={q ? `Nothing matches “${q}”. Check the part number or try fewer words.` : 'Type something in the search box above.'} />
    </>
  );
}
