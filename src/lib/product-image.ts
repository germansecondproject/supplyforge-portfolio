/* The standalone image file for a product: its drawing with the light theme colours resolved, since a file outside the page cannot read its CSS variables. */
import { artSVG } from './art.ts';
import type { ArtSpec } from './types.ts';

export function productImageSVG(art: ArtSpec, name: string): string {
  return artSVG(art, { H: 270, dc: '#5B6670', tc: '#14181B' }, name)
    .replace(/var\(--bg\)/g, '#FFFFFF').replace(/var\(--ink-2\)/g, '#5B6670').replace(/var\(--ink\)/g, '#14181B')
    .replace(/(<svg[^>]*>)/, '$1<rect width="100%" height="100%" fill="#FFFFFF"/>');
}
