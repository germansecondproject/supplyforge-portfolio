import type { NextRequest } from 'next/server';
import { getSuggestions } from '@/lib/catalog';
import { parseSearch } from '@/lib/query';

/** Search box suggestions: GET /api/suggest?q=hex bolt m8. Answers are the same for everyone, so the CDN caches them. */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') || '').slice(0, 80);
  const terms = parseSearch(q);
  const empty = !terms.tokens.length && terms.d === null && terms.len === null;
  const body = empty ? { tokens: [], total: 0, items: [] } : await getSuggestions(terms);
  return Response.json(body, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400' } });
}
