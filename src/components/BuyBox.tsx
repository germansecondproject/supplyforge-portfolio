'use client';

import { useState } from 'react';
import { useShop } from './Providers';
import { Price, VatLabel } from './Price';
import { toLine, unitFor, unitLabel, unitWord } from '@/lib/pricing';
import { TIERS, pct, tierIdx } from '@/lib/standards';
import { buyable } from '@/lib/query';
import type { Product } from '@/lib/types';

export default function BuyBox({ p, step }: { p: Product; step: number }) {
  const { addLine, toast, vat } = useShop();
  const [qty, setQty] = useState(1);
  const [text, setText] = useState('1');
  const set = (n: number) => { const v = Math.max(1, Math.min(9999, n)); setQty(v); setText(String(v)); };
  const unit = unitFor(p.price, p.off, p.tier, qty);
  const out = !buyable(p);
  const low = !out && p.stock < 30;
  const restock = p.restock_date ? new Date(p.restock_date + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : null;
  const delivery = p.ship_days === null ? null : p.ship_days <= 1 ? `Delivery tomorrow if ordered before 2 pm · ships from ${p.ships_from}` : `Delivery in ${p.ship_days} working days · ships from ${p.ships_from}`;
  const outLabel = p.unavailable ? 'Not available' : 'Out of stock';
  const word = unitWord(p, qty);
  const add = () => { addLine(toLine(p, qty)); toast(`Added ${qty} ${word}: ${p.name}`, true); };
  const uLabel = unitLabel(p);

  return (
    <>
      <div className="cfg-step">
        <div className="cfg-h"><i>{step}</i><span id="oQ">{p.tier ? 'Boxes' : 'Quantity'}</span></div>
        <div className="qrow">
          <div className="qty" role="group" aria-label={p.tier ? 'Number of boxes' : 'Quantity'}>
            <button type="button" aria-label="Remove one" onClick={() => set(qty - 1)}>−</button>
            <input type="text" inputMode="numeric" value={text} aria-label="Quantity"
              onChange={(e) => { setText(e.target.value.replace(/\D/g, '')); const n = parseInt(e.target.value, 10); if (n > 0) setQty(Math.min(9999, n)); }}
              onBlur={() => set(parseInt(text, 10) || 1)} />
            <button type="button" aria-label="Add one" onClick={() => set(qty + 1)}>+</button>
          </div>
          {p.tier && (
            <>
              <div className="tiers biz" role="group" aria-label="Volume pricing">
                {TIERS.map((t, i) => (
                  <button key={t.from} type="button" className="tier" aria-pressed={i === tierIdx(qty)} onClick={() => set(t.from)}>
                    <b>{t.label} boxes</b>
                    <small><Price value={unitFor(p.price, p.off, true, t.from)} />{t.mult < 1 ? ` · −${pct(t.mult)}` : ''}</small>
                  </button>
                ))}
              </div>
              <p className="diy muted" style={{ fontSize: '.875rem' }}>Buy 10 boxes or more and save 9.5 % per box.</p>
            </>
          )}
        </div>
      </div>
      <div className="cfg-buy">
        <div>
          <div className="big num">
            <span><Price value={unit} /></span> <small>{uLabel} · <VatLabel /></small>
            {unit < p.price - 0.004 && <small className="old num" style={{ marginLeft: 8 }}><Price value={p.price} /></small>}
          </div>
          {p.tier && <div className="muted num" style={{ fontSize: '.8125rem' }}><Price value={unit / p.pack} digits3 /> € per piece · box of {p.pack}</div>}
          <div className="muted num" style={{ fontSize: '.8125rem', marginTop: 2 }}>
            Line total <Price value={unit * qty} /> {p.tier && `· ${qty * p.pack} pcs`}{qty > p.stock && !out ? ` · exceeds stock${restock ? ', more arriving ' + restock : ''}` : ''}
          </div>
        </div>
        <div className="buy-btns">
          <button className="btn btn-primary btn-lg" type="button" onClick={add} disabled={out}>{out ? outLabel : 'Add to basket'}</button>
          <button className="btn btn-line" type="button" onClick={() => toast('Shopping lists are not part of this demo.')}>
            <span className="diy">Save for later</span><span className="biz">Add to a list</span>
          </button>
        </div>
      </div>
      <div className="cfg-foot">
        <span className={'stock ' + (out ? 'low' : low ? 'low' : 'ok')}>
          {p.unavailable ? 'Not available for sale at the moment'
            : out ? `Out of stock${restock ? ' · back on ' + restock : ''}`
            : low ? `Only ${p.stock} ${p.tier ? 'boxes' : 'left'} left${restock ? ' · restock ' + restock : ''}`
            : `In stock · ${p.stock} ${p.tier ? 'boxes' : unitWord(p, p.stock)}`}
        </span>
        {delivery && !p.unavailable && <span className="f"><svg width="18" height="18" aria-hidden="true"><use href="#i-truck" /></svg>{delivery}</span>}
        {!out && p.availability.some((a) => a.shipping_days <= 1 && a.available >= qty) && (
          <span className="f"><svg width="18" height="18" aria-hidden="true"><use href="#i-store" /></svg>Collect today in {p.availability.find((a) => a.shipping_days <= 1)!.city}</span>
        )}
        <span className="f biz"><svg width="18" height="18" aria-hidden="true"><use href="#i-invoice" /></svg>Net-30 invoice for approved accounts</span>
      </div>
      <div className="mbar">
        <div className="p num"><Price value={unit} /><small>{uLabel} · {vat ? 'inc VAT' : 'ex VAT'}</small></div>
        <button className="btn btn-primary btn-lg" type="button" onClick={add} disabled={out}>{out ? outLabel : 'Add'}</button>
      </div>
    </>
  );
}

