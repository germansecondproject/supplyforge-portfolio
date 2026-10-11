import Link from 'next/link';
import { DistributorButton, VatSwitch, CartLink, SearchBox, AccountLink } from './HeaderClient';
import type { Category } from '@/lib/types';

export default function Header({ categories }: { categories: Category[] }) {
  return (
    <>
      <a className="sr" href="#content">Skip to content</a>
      <div className="util">
        <div className="wrap">
          <span className="u-msg"><b>24 h delivery</b> on orders before 5 pm · Free over €150 <span className="biz">ex VAT</span></span>
          <div className="u-links">
            <Link href="/help">Help &amp; returns</Link>
            <Link href="/warehouse">Our warehouses</Link>
            <Link href="/trade">Trade accounts</Link>
          </div>
        </div>
      </div>
      <header className="hdr">
        <div className="wrap hdr-main">
          <Link className="logo" href="/" aria-label="SupplyForge, go to the homepage">
            <svg aria-hidden="true"><use href="#logo-mark" /></svg>
            <span><b>SupplyForge</b><small>Fasteners &amp; supplies</small></span>
          </Link>
          <SearchBox />
          <div className="hdr-actions">
            <DistributorButton />
            <VatSwitch />
            <AccountLink />
            <Link className="hact" href="/lists"><svg aria-hidden="true"><use href="#i-list" /></svg><span>Lists</span></Link>
            <CartLink />
          </div>
        </div>
        <nav className="nav" aria-label="Categories">
          <div className="wrap">
            {categories.map((c) => <Link key={c.slug} href={`/c/${c.slug}`}>{c.name}</Link>)}
            <Link href="/quick-order" className="qol"><svg aria-hidden="true"><use href="#i-zap" /></svg>Quick order</Link>
            <Link href="/deals" className="pro">Deals</Link>
          </div>
        </nav>
      </header>
    </>
  );
}
