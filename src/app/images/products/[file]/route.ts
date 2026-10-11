import { getPopularSlugs, getProduct } from '@/lib/catalog';
import { artSVG } from '@/lib/art';

// Product images are drawn from the product's dimensions on request, so 10,000 products need no image files.
export async function generateStaticParams() {
  return (await getPopularSlugs(48)).map((slug) => ({ file: slug + '.svg' }));
}

export async function GET(_req: Request, ctx: RouteContext<'/images/products/[file]'>) {
  const { file } = await ctx.params;
  const p = file.endsWith('.svg') ? await getProduct(file.slice(0, -4)) : null;
  if (!p) return new Response('Not found', { status: 404 });
  // standalone files cannot read the page's CSS variables, so resolve them to the light theme colours
  const svg = artSVG(p.art, { H: 270, dc: '#5B6670', tc: '#14181B' }, p.name)
    .replace(/var\(--bg\)/g, '#FFFFFF').replace(/var\(--ink-2\)/g, '#5B6670').replace(/var\(--ink\)/g, '#14181B')
    .replace(/(<svg[^>]*>)/, '$1<rect width="100%" height="100%" fill="#FFFFFF"/>');
  return new Response(svg, { headers: { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=86400, stale-while-revalidate=604800' } });
}
