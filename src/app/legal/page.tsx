import type { Metadata } from 'next';
import Link from 'next/link';
import PageHead from '@/components/PageHead';

export const metadata: Metadata = { title: 'Legal notice, privacy and terms' };

export default function Legal() {
  return (
    <>
      <PageHead eyebrow="Legal" title="Legal notice, privacy and terms" intro="SupplyForge is a portfolio project. These texts describe how the demo works; they are not the terms of a real shop." />
      <div className="wrap doc-grid">
        <nav className="doc-nav" aria-label="On this page">
          <a href="#legal">Legal notice</a>
          <a href="#terms">Terms of sale</a>
          <a href="#privacy">Privacy</a>
          <a href="#cookies">Cookies</a>
        </nav>
        <div className="prose">
          <section id="legal">
            <h2>Legal notice</h2>
            <p>This website is a non-commercial portfolio project. SupplyForge, its brands, products, prices, warehouses and customers are fictional. Any resemblance to real companies or people is a coincidence. No goods are sold and no payment is processed.</p>
          </section>
          <section id="terms">
            <h2>Terms of sale</h2>
            <p>Orders placed in the demo are validated and priced on the server exactly as a real order would be, and stored in the demo database so they appear in your account. They are never shipped or charged.</p>
            <ul>
              <li>Prices are in euros. Home &amp; DIY prices include 21 % VAT; Business prices are shown without VAT.</li>
              <li>Volume breaks apply per order line: −9.5 % from 10 boxes and −18 % from 50 boxes.</li>
              <li>Invoice payment at 30 days is available only to business accounts.</li>
              <li>Returns: 100 days for home customers and 30 days for business accounts. See <Link href="/help#returns">returns</Link>.</li>
            </ul>
          </section>
          <section id="privacy">
            <h2>Privacy</h2>
            <p>If you create an account, the demo stores your email, the name and company you enter, and the orders you place, so you can see them later. Passwords are handled by Supabase Auth and are never visible to the shop. Each account can read only its own orders.</p>
            <p>Use a made-up name and an address you do not mind being in a demo database. Write to <b className="mono">privacy@supplyforge.example</b> to have an account removed.</p>
          </section>
          <section id="cookies">
            <h2>Cookies</h2>
            <p>The site does not use advertising or analytics cookies. It keeps a few choices in your browser&apos;s local storage: the shopping view (Home or Business), the VAT display, the theme, your basket, saved products and, if you sign in, your session.</p>
          </section>
        </div>
      </div>
    </>
  );
}
