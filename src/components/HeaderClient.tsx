'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useShop } from './Providers';
import { useAuth } from './Auth';
import { Price } from './Price';
import { parseSearch } from '@/lib/query';

/** The one switch between the two shops: home customers see retail prices, distributors get the Business view. */
export function DistributorButton() {
  const { mode, setMode } = useShop();
  const on = mode === 'biz';
  return (
    <button
      type="button"
      className="dist"
      aria-pressed={on}
      title={on ? 'Back to Home & DIY prices' : 'Switch to distributor prices, quick order and invoice terms'}
      onClick={() => setMode(on ? 'diy' : 'biz')}
    >
      <svg aria-hidden="true"><use href={on ? '#i-check' : '#i-store'} /></svg>
      <span className="l-full">{on ? 'Distributor view' : 'Distributors'}</span>
      <span className="l-short" aria-hidden="true">B2B</span>
    </button>
  );
}

export function VatSwitch() {
  const { vat, setVat } = useShop();
  return (
    <div className="vat" role="group" aria-label="Show prices">
      <div className="seg">
        <button type="button" aria-pressed={!vat} onClick={() => setVat(false)}>Ex VAT</button>
        <button type="button" aria-pressed={vat} onClick={() => setVat(true)}>Inc VAT</button>
      </div>
    </div>
  );
}

export function CartLink() {
  const { cart } = useShop();
  const n = cart.length;
  return (
    <Link className="hact" href="/cart" aria-label={`Basket, ${n} ${n === 1 ? 'line' : 'lines'}`}>
      <svg aria-hidden="true"><use href="#i-cart" /></svg>
      <span>Basket</span>
      {n > 0 && <i className="badge">{n}</i>}
    </Link>
  );
}

interface Suggest { tokens: string[]; total: number; items: { slug: string; ref: string; name: string; price: number; pack: number; buyable: boolean }[] }

/**
 * Search with suggestions: after a short pause the box asks /api/suggest for the best products, already corrected
 * for typos. Arrow keys move through the list, Enter opens the highlighted product or runs the full search.
 */
export function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [, setLoaded] = useState(0);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const cache = useRef(new Map<string, Suggest>());
  const key = q.trim().toLowerCase();

  // fetch suggestions for the typed text after a short pause; answers are kept per query for the session
  useEffect(() => {
    if (key.length < 2 || cache.current.has(key)) return;
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch('/api/suggest?q=' + encodeURIComponent(key), { signal: ctl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: Suggest | null) => { if (d) { cache.current.set(key, d); setLoaded((n) => n + 1); } })
        .catch(() => undefined);
    }, 180);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [key]);
  // eslint-disable-next-line react-hooks/refs
  const res = key.length >= 2 ? cache.current.get(key) ?? null : null;

  useEffect(() => {
    const close = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  const typed = parseSearch(q).tokens;
  const corrected = res !== null && res.tokens.some((t, i) => t !== typed[i]);
  const items = res?.items ?? [];
  const show = open && res !== null;

  const search = (v: string) => { setOpen(false); if (v.trim()) router.push('/search?q=' + encodeURIComponent(v.trim())); };
  const go = (slug: string) => { setOpen(false); setQ(''); router.push('/product/' + slug); };

  return (
    <div className="search-box" ref={box}>
      <form
        className="search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (show && hi >= 0 && hi < items.length) go(items[hi].slug);
          else search(q);
        }}
      >
        <label className="sr" htmlFor="q">Search products</label>
        <input
          id="q" type="search" placeholder="Part number, size or standard" autoComplete="off" value={q}
          role="combobox" aria-expanded={show} aria-controls="q-list" aria-autocomplete="list"
          aria-activedescendant={show && hi >= 0 ? `q-opt-${hi}` : undefined}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
            else if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); setOpen(true); setHi((h) => (h + 1) % items.length); }
            else if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); setHi((h) => (h <= 0 ? items.length - 1 : h - 1)); }
          }}
        />
        <button type="submit"><svg width="20" height="20" aria-hidden="true"><use href="#i-search" /></svg><span>Search</span></button>
      </form>
      {show && (
        <div className="suggest">
          {corrected && <p className="suggest-fix">Showing results for <b>{res!.tokens.join(' ')}</b></p>}
          {items.length > 0 ? (
            <ul id="q-list" role="listbox" aria-label="Suggested products">
              {items.map((p, i) => (
                <li key={p.slug} id={`q-opt-${i}`} role="option" aria-selected={i === hi}
                  onPointerEnter={() => setHi(i)} onPointerDown={(e) => { e.preventDefault(); go(p.slug); }}>
                  <span className="s-name">{p.name}</span>
                  <span className="s-meta"><span className="mono">{p.ref}</span>{!p.buyable && <span> · Out of stock</span>}</span>
                  <span className="s-price num"><Price value={p.price} /></span>
                </li>
              ))}
            </ul>
          ) : <p className="suggest-none" id="q-list" role="status">No products match “{q.trim()}”.</p>}
          {res!.total > items.length && (
            <button type="button" className="suggest-all" onPointerDown={(e) => { e.preventDefault(); search(q); }}>
              See all {res!.total.toLocaleString('en')} results
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function AccountLink() {
  const { user, profile } = useAuth();
  const first = profile?.name.split(' ')[0];
  return (
    <Link className="hact" href="/account" aria-label={user ? `Your account, signed in as ${profile?.name || user.email}` : 'Sign in to your account'}>
      <svg aria-hidden="true"><use href="#i-user" /></svg>
      <span>{user ? first || 'Account' : 'Sign in'}</span>
      {user && <i className="dot" aria-hidden="true" />}
    </Link>
  );
}

export function BusinessViewButton() {
  const { mode, setMode } = useShop();
  if (mode === 'biz') return <span className="btn btn-ghost btn-lg" aria-live="polite">Business view is on</span>;
  return <button type="button" className="btn btn-ghost btn-lg" onClick={() => setMode('biz')}>Switch to Business view</button>;
}
