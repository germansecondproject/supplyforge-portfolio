import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHead from '@/components/PageHead';
import { GUIDES, guideBySlug } from '@/lib/guides';

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<'/guides/[slug]'>): Promise<Metadata> {
  const g = guideBySlug((await params).slug);
  return g ? { title: g.title, description: g.summary } : {};
}

export default async function GuidePage({ params }: PageProps<'/guides/[slug]'>) {
  const g = guideBySlug((await params).slug);
  if (!g) notFound();
  return (
    <>
      <PageHead eyebrow={`${g.tag} · ${g.minutes} min read`} title={g.title} intro={g.summary} crumb={['Guides', '/guides']} />
      <div className="wrap sec">
        <article className="prose" style={{ maxWidth: 760 }}>
          {g.sections.map((s) => (
            <section key={s.h}>
              <h2>{s.h}</h2>
              {s.p.map((t) => <p key={t}>{t}</p>)}
              {s.table && (
                <table className="otable">
                  <thead><tr>{s.table.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                  <tbody>{s.table.rows.map((r) => <tr key={r.join('|')}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
                </table>
              )}
            </section>
          ))}
          <section>
            <h2>Shop this guide</h2>
            <div className="page-cta">{g.shop.map((s) => <Link key={s.href} className="btn btn-line" href={s.href}>{s.label}</Link>)}</div>
          </section>
        </article>
      </div>
    </>
  );
}
