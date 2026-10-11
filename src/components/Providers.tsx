'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { CartLine } from '@/lib/types';

export type Mode = 'diy' | 'biz';

interface Ctx {
  mode: Mode;
  setMode: (m: Mode) => void;
  vat: boolean;
  setVat: (v: boolean) => void;
  cart: CartLine[];
  addLine: (l: CartLine) => void;
  setQty: (ref: string, qty: number) => void;
  removeLine: (ref: string) => void;
  clearCart: () => void;
  saved: CartLine[];
  save: (l: CartLine) => void;
  unsave: (ref: string) => void;
  toast: (msg: string, link?: boolean | 'lists') => void;
  ready: boolean;
}

const C = createContext<Ctx | null>(null);
export const useShop = () => {
  const v = useContext(C);
  if (!v) throw new Error('useShop must be used inside <Providers>');
  return v;
};

const K = { mode: 'roscado.mode', vat: 'roscado.vat', cart: 'roscado.cart', saved: 'roscado.saved' };
const safe = {
  get(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
};

export default function Providers({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>('diy');
  const [vat, setVatState] = useState(true);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [saved, setSaved] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState<{ text: string; link: boolean | 'lists' } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Read saved choices after hydration so server and client markup match on first paint.
  useEffect(() => {
    const m = safe.get(K.mode) === 'biz' ? 'biz' : 'diy';
    const v = safe.get(K.vat);
    const read = (k: string): CartLine[] => {
      try { const parsed = JSON.parse(safe.get(k) || '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setModeState(m); setVatState(v === null ? m === 'diy' : v === '1'); setCart(read(K.cart)); setSaved(read(K.saved)); setReady(true);
  }, []);

  useEffect(() => { document.documentElement.dataset.mode = mode; }, [mode]);
  useEffect(() => { if (ready) safe.set(K.cart, JSON.stringify(cart)); }, [cart, ready]);
  useEffect(() => { if (ready) safe.set(K.saved, JSON.stringify(saved)); }, [saved, ready]);

  const toast = useCallback((text: string, link: boolean | 'lists' = false) => {
    setMsg({ text, link });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 3800);
  }, []);

  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    setVatState(m === 'diy');
    safe.set(K.mode, m);
    safe.set(K.vat, m === 'diy' ? '1' : '0');
    toast(m === 'biz' ? 'Business view: ex-VAT prices, volume tiers, quick order and net-30 terms.' : 'Home & DIY view: prices include VAT and the page shows project help.');
  }, [toast]);

  const setVat = useCallback((v: boolean) => { setVatState(v); safe.set(K.vat, v ? '1' : '0'); }, []);

  const addLine = useCallback((l: CartLine) => {
    setCart((cur) => {
      const f = cur.find((x) => x.ref === l.ref);
      return f ? cur.map((x) => (x.ref === l.ref ? { ...x, qty: Math.min(9999, x.qty + l.qty) } : x)) : [...cur, l];
    });
  }, []);
  const setQty = useCallback((ref: string, qty: number) => setCart((cur) => cur.map((x) => (x.ref === ref ? { ...x, qty: Math.max(1, Math.min(9999, qty)) } : x))), []);
  const removeLine = useCallback((ref: string) => setCart((cur) => cur.filter((x) => x.ref !== ref)), []);
  const clearCart = useCallback(() => setCart([]), []);
  const save = useCallback((l: CartLine) => setSaved((cur) => [l, ...cur.filter((x) => x.ref !== l.ref)].slice(0, 200)), []);
  const unsave = useCallback((ref: string) => setSaved((cur) => cur.filter((x) => x.ref !== ref)), []);

  const value = useMemo(
    () => ({ mode, setMode, vat, setVat, cart, addLine, setQty, removeLine, clearCart, saved, save, unsave, toast, ready }),
    [mode, setMode, vat, setVat, cart, addLine, setQty, removeLine, clearCart, saved, save, unsave, toast, ready],
  );

  return (
    <C.Provider value={value}>
      {children}
      <div className={'toast' + (msg ? ' on' : '')} role="status" aria-live="polite">
        <span>{msg?.text}</span>
        {msg?.link === 'lists' ? <Link href="/lists">View saved</Link> : msg?.link && <Link href="/cart">View basket</Link>}
      </div>
    </C.Provider>
  );
}
