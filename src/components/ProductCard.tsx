import Link from 'next/link';
import Art from './Art';
import AddButton from './AddButton';
import { Price, VatLabel } from './Price';
import { buyable, offerPriceOf } from '@/lib/query';
import type { Product } from '@/lib/types';

const Stars = () => (
  <span className="stars" aria-hidden="true">
    {[0, 1, 2, 3, 4].map((i) => <svg key={i}><use href="#i-star" /></svg>)}
  </span>
);

export default function ProductCard({ p }: { p: Product }) {
  const pr = offerPriceOf(p);
  const per = p.tier ? pr / p.pack : null;
  const unit = p.tier ? 'per box' : p.unit === 'each' ? 'each' : `per ${p.unit}`;
  return (
    <article className="card">
      <Link className="card-img" href={`/product/${p.slug}`} tabIndex={-1} aria-hidden="true">
        <Art art={p.art} label={p.name} dims={false} />
        {p.off > 0 && <span className="tag tag-red">−{Math.round(p.off * 100)} %</span>}
        {!buyable(p) && <span className="tag tag-line" style={{ right: 10, left: 'auto', background: 'var(--surface)' }}>{p.unavailable ? 'Not available' : 'Out of stock'}</span>}
      </Link>
      <div className="card-body">
        <span className="ref">{p.ref}</span>
        <h3><Link href={`/product/${p.slug}`}>{p.name}</Link></h3>
        {p.promo && <p className="promo-line">{p.promo}</p>}
        <ul className="specs3">{p.specs.map((s) => <li key={s}>{s}</li>)}</ul>
        <span className="rating"><Stars /><b>{p.rating}</b> <span>({p.reviews})</span></span>
        <div className="price-row">
          <span className={'price num' + (p.off ? ' sale' : '')}><Price value={pr} /></span>
          {p.off > 0 && <span className="old num"><Price value={p.price} /></span>}
          <small className="muted num" style={{ flexBasis: '100%', fontSize: '.75rem' }}>
            {unit} · <VatLabel />{per !== null && <> · <Price value={per} digits3 /> €/pc</>}
          </small>
        </div>
      </div>
      <div className="card-foot"><AddButton p={p} /></div>
    </article>
  );
}
