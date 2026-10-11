import type { MetadataRoute } from 'next';
import { getProductSlugs, getTaxonomy } from '@/lib/catalog';
import { GUIDES } from '@/lib/guides';
import { SITE_URL } from '@/lib/site';

/** sitemap.xml: content pages, categories, guides and all products (about 10,000, under the 50,000 per file limit). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ categories }, products] = await Promise.all([getTaxonomy(), getProductSlugs()]);
  const pages = ['', '/deals', '/trade', '/quick-order', '/guides', '/help', '/warehouse', '/about', '/legal'];
  return [
    ...pages.map((p) => ({ url: SITE_URL + p, changeFrequency: 'weekly' as const, priority: p === '' ? 1 : 0.5 })),
    ...categories.map((c) => ({ url: `${SITE_URL}/c/${c.slug}`, changeFrequency: 'daily' as const, priority: 0.8 })),
    ...GUIDES.map((g) => ({ url: `${SITE_URL}/guides/${g.slug}`, changeFrequency: 'monthly' as const, priority: 0.4 })),
    ...products.map((p) => ({ url: `${SITE_URL}/product/${p.slug}`, ...(p.updated ? { lastModified: p.updated } : {}), changeFrequency: 'weekly' as const, priority: 0.6 })),
  ];
}
