import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="wrap sec" style={{ maxWidth: 720 }}>
      <span className="eyebrow">Error 404</span>
      <h1 style={{ marginBlock: '8px 16px' }}>We could not find that page</h1>
      <p className="muted" style={{ marginBottom: 16 }}>The part number may have changed or the link is out of date. Try the search box or go back to the catalogue.</p>
      <p style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><Link className="btn btn-primary" href="/">Home</Link><Link className="btn btn-line" href="/c/fasteners">Shop fasteners</Link></p>
    </div>
  );
}
