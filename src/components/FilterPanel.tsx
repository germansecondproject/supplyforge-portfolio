'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toQuery } from '@/lib/query';
import type { Facet, Filters, SortKey } from '@/lib/query';
import { SORTS } from '@/lib/query';

type Key = 'brand' | 'mat' | 'std' | 'd' | 'len';

export function FilterPanel({ facets, filters, sort, basePath }: { facets: Facet[]; filters: Filters; sort: SortKey; basePath: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [pending, start] = useTransition();
  // Desktop shows filters open; on narrow screens they start collapsed.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (window.matchMedia('(max-width:860px)').matches) setOpen(false); }, []);

  const go = (f: Filters) => start(() => router.push(basePath + toQuery(f, sort, 1), { scroll: false }));
  const toggle = (k: Key, v: string) => {
    const cur = filters[k];
    go({ ...filters, [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  };

  return (
    <details className="filters" open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)} aria-busy={pending}>
      <summary>Filters <svg width="18" height="18" aria-hidden="true"><use href="#i-list" /></svg></summary>
      <div className="facet">
        <h3>Availability</h3>
        <label><input type="checkbox" checked={filters.stock} onChange={() => go({ ...filters, stock: !filters.stock })} />In stock</label>
        <label><input type="checkbox" checked={filters.offers} onChange={() => go({ ...filters, offers: !filters.offers })} />On offer</label>
      </div>
      {facets.map((f) => (
        <div className="facet" key={f.key} role="group" aria-label={f.title}>
          <h3>{f.title}</h3>
          {f.options.map((o) => (
            <label key={o.value} className={o.count === 0 && !o.checked ? 'zero' : ''}>
              <input type="checkbox" checked={o.checked} onChange={() => toggle(f.key, o.value)} />
              {o.label}<span className="n">{o.count}</span>
            </label>
          ))}
        </div>
      ))}
    </details>
  );
}

export function SortSelect({ filters, sort, basePath }: { filters: Filters; sort: SortKey; basePath: string }) {
  const router = useRouter();
  return (
    <div className="field">
      <label htmlFor="sort">Sort by</label>
      <select className="select" id="sort" value={sort} onChange={(e) => router.push(basePath + toQuery(filters, e.target.value as SortKey, 1), { scroll: false })}>
        {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
      </select>
    </div>
  );
}
