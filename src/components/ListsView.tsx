'use client';

import Link from 'next/link';
import { useShop } from './Providers';
import { Price, VatLabel } from './Price';
import { artSVG } from '@/lib/art';
import { lineUnit } from '@/lib/pricing';

/** Products saved for later, kept in this browser. */
export default function ListsView() {
  const { saved, unsave, addLine, toast, mode, ready } = useShop();
  const biz = mode === 'biz';
  const title = biz ? 'Saved list' : 'Saved for later';

  if (!ready) return <div className="panel empty"><p className="muted">Loading…</p></div>;
  if (!saved.length) {
    return (
      <div className="panel empty">
        <svg width="48" height="48" aria-hidden="true"><use href="#i-list" /></svg>
        <h1 style={{ fontSize: '2rem' }}>{title}</h1>
        <p className="muted" style={{ maxWidth: '48ch' }}>
          Nothing saved yet. On any product page, choose <b>{biz ? 'Add to a list' : 'Save for later'}</b> to keep it here with the quantity you picked.
        </p>
        <Link className="btn btn-primary" href="/c/fasteners">Browse the catalogue</Link>
      </div>
    );
  }

  const addAll = () => { saved.forEach((l) => addLine(l)); toast(`Added ${saved.length} ${saved.length === 1 ? 'line' : 'lines'} to the basket`, true); };
  return (
    <div className="panel">
      <div className="acct-head">
        <h1 style={{ fontSize: '2rem' }}>{title} <span className="muted" style={{ fontSize: '1.25rem' }}>({saved.length})</span></h1>
        <button className="btn btn-primary" type="button" onClick={addAll}>Add all to basket</button>
      </div>
      <p className="muted" style={{ fontSize: '.875rem' }}>Saved in this browser. {biz ? 'Reorder the same list from here every time you restock.' : ''}</p>
      <div>
        {saved.map((l) => {
          const u = lineUnit(l);
          return (
            <div className="line" key={l.ref}>
              <Link className="im" href={`/product/${l.slug}`} aria-hidden="true" tabIndex={-1} dangerouslySetInnerHTML={{ __html: artSVG(l.art, { dims: false }, l.name) }} />
              <div style={{ minWidth: 0 }}>
                <h3><Link href={`/product/${l.slug}`}>{l.name}</Link></h3>
                <div className="muted mono" style={{ fontSize: '.75rem' }}>{l.ref}</div>
                <div className="muted" style={{ marginTop: 6, fontSize: '.875rem' }}>
                  {l.qty} × <Price value={u} /> {l.tier ? `per box of ${l.pack}` : l.unit === 'each' ? 'each' : `per ${l.unit}`}
                </div>
                <div className="acts">
                  <button className="btn btn-line" type="button" onClick={() => { addLine(l); toast(`Added ${l.qty} × ${l.name}`, true); }}>Add to basket</button>
                  <button className="linkbtn" type="button" onClick={() => unsave(l.ref)}>Remove</button>
                </div>
              </div>
              <div className="tot num"><Price value={u * l.qty} /><small><VatLabel /></small></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
