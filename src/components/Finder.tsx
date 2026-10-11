'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { artSVG } from '@/lib/art';
import { MATNAME, TYPES, cap, refOf, tl } from '@/lib/standards';
import type { BoltType, MatKey } from '@/lib/standards';
import type { FinderRow } from '@/lib/catalog';

interface FinderItem { t: BoltType; mat: MatKey; d: number; L: number; slug: string; stock: number }

const TYPE_LABEL: Record<BoltType, string> = {
  hex: 'Hex bolt DIN 933',
  socket: 'Socket cap DIN 912',
  flat: 'Countersunk DIN 7991',
  wood: 'Chipboard, Pozidriv',
};

/** Size finder for standard boxes of bolts and screws. Rows are compact tuples so the whole range stays small in the page. */
export default function Finder({ rows }: { rows: FinderRow[] }) {
  const router = useRouter();
  const items = useMemo<FinderItem[]>(() => rows.map(([t, mat, d, L, s]) => ({ t: t as BoltType, mat: mat as MatKey, d, L, slug: refOf(t as BoltType, mat as MatKey, d, L).toLowerCase(), stock: s })), [rows]);
  const [type, setType] = useState<BoltType>('hex');
  const [mat, setMat] = useState<MatKey>('A2');
  const [d, setD] = useState(8);
  const [len, setLen] = useState('40');

  const forType = useMemo(() => items.filter((i) => i.t === type), [items, type]);
  const mats = useMemo(() => [...new Set(forType.map((i) => i.mat))], [forType]);
  const diams = useMemo(() => [...new Set(forType.map((i) => i.d))].sort((a, b) => a - b), [forType]);
  const curMat = mats.includes(mat) ? mat : mats[0];
  const curD = diams.includes(d) ? d : diams[Math.min(1, diams.length - 1)];
  const lengths = useMemo(() => forType.filter((i) => i.mat === curMat && i.d === curD).sort((a, b) => a.L - b.L), [forType, curMat, curD]);

  const want = Math.min(200, Math.max(6, Number(len) || 40));
  const nearest = lengths.length ? lengths.reduce((a, b) => (Math.abs(b.L - want) < Math.abs(a.L - want) ? b : a)) : null;
  const inStock = lengths.filter((l) => l.stock > 0).length;
  const svg = nearest ? artSVG({ kind: 'bolt', t: type, mat: curMat, d: curD, L: nearest.L }, { H: 220, dims: false }, 'Preview of the selected screw') : '';

  return (
    <form
      className="finder"
      aria-labelledby="finderT"
      onSubmit={(e) => { e.preventDefault(); if (nearest) router.push(`/product/${nearest.slug}`); }}
    >
      <div className="finder-prev" aria-live="polite">
        <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: svg }} />
        <div>
          <b>{nearest ? `${tl(type, curD)} × ${nearest.L}` : '—'}</b>
          <div className="muted" style={{ fontSize: '.8125rem' }}>
            {nearest && nearest.L !== want ? `Nearest standard to ${want} mm. ` : ''}{lengths.length} lengths · {inStock} in stock
          </div>
        </div>
      </div>
      <div className="finder-fields">
        <div className="finder-h"><span className="eyebrow">Screw finder</span><h2 id="finderT">Choose your size</h2></div>
        <div className="row">
          <div className="field"><label htmlFor="f-type">Type</label>
            <select className="select" id="f-type" value={type} onChange={(e) => setType(e.target.value as BoltType)}>
              {(Object.keys(TYPES) as BoltType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select></div>
          <div className="field"><label htmlFor="f-mat">Material</label>
            <select className="select" id="f-mat" value={curMat} onChange={(e) => setMat(e.target.value as MatKey)}>
              {mats.map((m) => <option key={m} value={m}>{cap(MATNAME[m])}</option>)}
            </select></div>
          <div className="field"><label htmlFor="f-d">Diameter</label>
            <select className="select" id="f-d" value={curD} onChange={(e) => setD(+e.target.value)}>
              {diams.map((x) => <option key={x} value={x}>{tl(type, x)}</option>)}
            </select></div>
          <div className="field"><label htmlFor="f-l">Length (mm)</label>
            <input className="input mono" id="f-l" type="number" min={6} max={200} step={5} value={len} inputMode="numeric" onChange={(e) => setLen(e.target.value)} /></div>
        </div>
      </div>
      <button className="btn btn-primary btn-lg finder-go" type="submit">View this size <svg width="20" height="20" aria-hidden="true"><use href="#i-arrow" /></svg></button>
    </form>
  );
}
