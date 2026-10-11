import { artSVG } from '@/lib/art';
import type { ArtOpts } from '@/lib/art';
import type { ArtSpec } from '@/lib/types';

/** Renders a procedural blueprint drawing. The markup is generated from numbers only, never from user input. */
export default function Art({ art, label, ...opts }: { art: ArtSpec; label?: string } & ArtOpts) {
  return <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: artSVG(art, opts, label) }} />;
}
