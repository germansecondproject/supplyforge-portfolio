'use client';

import { useEffect, useState } from 'react';
import { checkParts } from '@/app/actions';
import type { PartCheck } from '@/app/actions';
import { useShop } from './Providers';
import { Price } from './Price';
import type { CartLine } from '@/lib/types';
import { parseQuickOrder } from '@/lib/paste';

const SAMPLE = `SF-933-A2-8x40, 2
SF-912-BK-6x30, 5
SF-985-A2-8, 4
SF-933-A2-8x45, 1`;

interface Row { raw: string; q: number; err?: string; part?: PartCheck }

export default function QuickOrder({ id = 'quick-order', className = '' }: { id?: string; className?: string }) {
  const { addLine, toast } = useShop();
  const [text, setText] = useState(SAMPLE);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const parsed = parseQuickOrder(text);
    const refs = parsed.filter((p) => !p.bad).map((p) => p.raw);
    let live = true;
    const t = setTimeout(async () => {
      const res = refs.length ? await checkParts(refs) : [];
      if (!live) return;
      let i = 0;
      setRows(parsed.map((p) => {
        if (p.bad) return { raw: p.raw, q: 0, err: 'Invalid format' };
        const part = res[i++];
        return part.ok ? { raw: part.ref, q: p.q, part } : { raw: p.raw.toUpperCase(), q: p.q, err: part.error };
      }));
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [text]);

  const ok = rows.filter((r) => r.part);
  const add = () => {
    ok.forEach((r) => {
      const p = r.part!;
      const line: CartLine = { ref: p.ref, slug: p.slug!, name: p.name!, pack: p.pack!, tier: p.tier!, unit: p.unit!, list: p.list!, off: p.off!, qty: r.q, art: p.art! };
      addLine(line);
    });
    if (ok.length) toast(`${ok.length} ${ok.length === 1 ? 'line' : 'lines'} added to your basket`, true);
  };

  return (
    <div className={'wrap sec ' + className} id={id} style={{ paddingTop: 0 }}>
      <div className="qo">
        <div>
          <div><span className="eyebrow">For business accounts</span><h2>Quick order</h2></div>
          <p className="muted">Type one part number per line with the number of boxes, or copy the part number and quantity columns from Excel and paste them here. We check stock instantly and add valid lines to your basket.</p>
          <div className="field"><label htmlFor="qoText">Part numbers and quantities</label>
            <textarea className="input" id="qoText" placeholder={'SF-933-A2-8x40\t2\nSF-912-BK-6x30\t5'} spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} /></div>
          <div><button className="btn btn-primary" type="button" disabled={!ok.length} onClick={add}>{ok.length ? `Add ${ok.length} ${ok.length === 1 ? 'line' : 'lines'} to basket` : 'Add to basket'}</button></div>
        </div>
        <div className="side">
          <span className="eyebrow">Stock check</span>
          <div className="qo-lines" aria-live="polite">
            {rows.length === 0 && <p className="muted">Type or paste your part numbers.</p>}
            {rows.map((r, i) => r.err
              ? <div className="qo-line bad" key={i}><span>{r.raw}</span><span className="st bad-t">{r.err}</span><span></span></div>
              : <div className="qo-line" key={i}><span>{r.raw}</span><span className="st ok-t">In stock</span><span className="num">{r.q} × <Price value={r.part!.list! * (1 - r.part!.off!)} /></span></div>)}
          </div>
          <p className="muted" style={{ fontSize: '.8125rem', marginTop: 'auto' }}>Format: <span className="mono">PART NUMBER, BOXES</span>. From a spreadsheet, extra columns and a header row are ignored; a line without a quantity counts as 1 box. Up to 60 lines.</p>
        </div>
      </div>
    </div>
  );
}
