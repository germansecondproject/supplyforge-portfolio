import type { Metadata } from 'next';
import Link from 'next/link';
import PageHead from '@/components/PageHead';

export const metadata: Metadata = { title: 'About us' };

export default function About() {
  return (
    <>
      <PageHead eyebrow="SupplyForge" title="About us" intro="The right screw, in stock, at your door tomorrow. That is the whole idea." />
      <div className="wrap sec">
        <div className="prose" style={{ maxWidth: 760 }}>
          <section>
            <h2>What we do</h2>
            <p>SupplyForge sells fasteners, fixings, tools and safety equipment to two kinds of customer: people fixing things at home, and the installers, workshops and distributors who do it for a living. The same catalogue serves both, with a <b>Home &amp; DIY</b> view that explains sizes and includes VAT, and a <b>Business</b> view with ex-VAT prices, volume breaks, quick order by part number and invoice terms.</p>
            <p>Every product carries its standard, material, dimensions and weight, so a DIN 933 M8×40 in A2 stainless is exactly that, whichever brand is on the box.</p>
          </section>
          <section>
            <h2>A portfolio project</h2>
            <p>SupplyForge is not a real company. It is a portfolio build that shows a complete e-commerce: the catalogue of 10,000 products, prices, stock in five warehouses, a year of sales and 6,000 orders are all synthetic, and no payment is ever taken.</p>
            <div className="cards3">
              <div><span className="lbl">Front end</span><p>Next.js with server rendering and cached pages, React, TypeScript</p></div>
              <div><span className="lbl">Data</span><p>Postgres on Supabase: listings, filters and search run in the database</p></div>
              <div><span className="lbl">Accounts</span><p>Supabase Auth with row level security on every order</p></div>
            </div>
          </section>
          <section>
            <h2>Find your way around</h2>
            <ul>
              <li><Link href="/c/fasteners">Fasteners</Link>: filter by standard, material, diameter and length.</li>
              <li><Link href="/trade">For distributors</Link>: quick order, volume pricing and net-30 terms.</li>
              <li><Link href="/account">Your account</Link>: sign in as a demo customer to see a year of orders.</li>
              <li><Link href="/guides">Technical guides</Link>: which screw, plug or stainless grade to choose.</li>
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
