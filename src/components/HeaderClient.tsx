'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useShop } from './Providers';
import { useAuth } from './Auth';

/** The one switch between the two shops: home customers see retail prices, distributors get the Business view. */
export function DistributorButton() {
  const { mode, setMode } = useShop();
  const on = mode === 'biz';
  return (
    <button
      type="button"
      className="dist"
      aria-pressed={on}
      aria-label="Distributors: business prices and quick order"
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

export function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState('');
  return (
    <form
      className="search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const v = q.trim();
        if (v) router.push('/search?q=' + encodeURIComponent(v));
      }}
    >
      <label className="sr" htmlFor="q">Search products</label>
      <input id="q" type="search" placeholder="Part number, size or standard" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
      <button type="submit"><svg width="20" height="20" aria-hidden="true"><use href="#i-search" /></svg><span>Search</span></button>
    </form>
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
