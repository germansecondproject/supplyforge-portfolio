import Link from 'next/link';
import ThemeButton from './ThemeButton';
import type { Category } from '@/lib/types';

export default function Footer({ categories }: { categories: Category[] }) {
  return (
    <footer className="ftr">
      <div className="wrap">
        <div className="ftr-grid">
          <div>
            <Link className="logo" href="/" style={{ marginBottom: 14 }}><svg aria-hidden="true"><use href="#logo-mark" /></svg><span><b>SupplyForge</b></span></Link>
            <p style={{ maxWidth: '34ch' }}>Fasteners, fixings and tools for homes, workshops and building sites across Spain.</p>
            <div className="pay" style={{ marginTop: 14 }}><span>VISA</span><span>MASTERCARD</span><span>BANK TRANSFER</span><span className="biz">NET 30</span></div>
          </div>
          <div><h4>Shop</h4><ul>{categories.slice(0, 4).map((c) => <li key={c.slug}><Link href={`/c/${c.slug}`}>{c.name}</Link></li>)}<li><Link href="/deals">Deals</Link></li></ul></div>
          <div><h4>Business</h4><ul><li><Link href="/trade">For distributors</Link></li><li><Link href="/quick-order">Quick order</Link></li><li><Link href="/trade#pricing">Volume pricing</Link></li><li><Link href="/trade#net-30">Net-30 terms</Link></li><li><Link href="/account">Your account</Link></li></ul></div>
          <div><h4>Help</h4><ul><li><Link href="/help#delivery">Delivery &amp; timing</Link></li><li><Link href="/help#returns">Returns</Link></li><li><Link href="/help#contact">Contact</Link></li><li><Link href="/help#faq">FAQ</Link></li><li><Link href="/guides">Guides</Link></li></ul></div>
          <div><h4>SupplyForge</h4><ul><li><Link href="/about">About us</Link></li><li><Link href="/warehouse">Our warehouses</Link></li><li><Link href="/legal#legal">Legal notice</Link></li><li><Link href="/legal#privacy">Privacy</Link></li><li><Link href="/legal#cookies">Cookies</Link></li></ul></div>
        </div>
        <div className="ftr-bot">
          <span>© 2026 SupplyForge. A portfolio project: products, prices, brands and payments are fictional and no real orders are taken.</span>
          <ThemeButton />
        </div>
      </div>
    </footer>
  );
}
