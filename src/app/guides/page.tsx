import type { Metadata } from 'next';
import Link from 'next/link';
import PageHead from '@/components/PageHead';
import { GUIDES } from '@/lib/guides';

export const metadata: Metadata = { title: 'Technical guides' };

export default function Guides() {
  return (
    <>
      <PageHead eyebrow="Technical guides" title="Get it right the first time" intro="Short, practical guides to choosing the right fastener, anchor and grade. Each one ends with the products it talks about." />
      <div className="wrap sec">
        <div className="guides">
          {GUIDES.map((g) => (
            <Link key={g.slug} className="guide" href={`/guides/${g.slug}`}>
              <span className="tag tag-line" style={{ alignSelf: 'flex-start' }}>{g.tag}</span>
              <h3>{g.title}</h3><p>{g.summary}</p>
              <span className="muted mono" style={{ fontSize: '.75rem' }}>{g.minutes} min read</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
