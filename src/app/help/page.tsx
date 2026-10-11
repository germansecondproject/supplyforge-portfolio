import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Help & returns' };

export default function Help() {
  return (
    <div className="wrap sec" style={{ maxWidth: 820 }}>
      <span className="eyebrow">Portfolio project</span>
      <h1 style={{ marginBlock: '8px 16px' }}>This page is not part of the demo</h1>
      <p className="muted" style={{ marginBottom: 16 }}>
        SupplyForge is a portfolio e-commerce build: catalogue, filters, product configurator, basket and a simulated checkout are real,
        but help, account, lists and legal pages are intentionally left out.
      </p>
      <p><Link className="btn btn-primary" href="/">Back to the shop</Link></p>
    </div>
  );
}
