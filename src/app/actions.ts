'use server';

import { getProductsBySku, supabaseClient, supabaseConfigured } from '@/lib/catalog';
import { normalizeSku } from '@/lib/query';
import { unitFor } from '@/lib/pricing';
import { FREE_FROM, IVA, SHIP_EXP, SHIP_STD } from '@/lib/standards';
import type { ArtSpec } from '@/lib/types';

export interface PartCheck {
  ref: string;
  ok: boolean;
  error?: string;
  slug?: string;
  name?: string;
  list?: number;
  off?: number;
  tier?: boolean;
  pack?: number;
  unit?: string;
  stock?: number;
  art?: ArtSpec;
}

/** Quick order: check part numbers against the catalogue. */
export async function checkParts(refs: string[]): Promise<PartCheck[]> {
  const list = refs.slice(0, 60).map((r) => String(r).trim());
  const idx = new Map((await getProductsBySku(list)).map((p) => [p.ref, p]));
  return list.map((ref) => {
    const p = idx.get(normalizeSku(ref));
    if (!p) return { ref, ok: false, error: 'Unknown part number' };
    if (p.unavailable) return { ref: p.ref, ok: false, error: 'Not available' };
    if (p.stock <= 0) return { ref: p.ref, ok: false, error: 'Out of stock' };
    return { ref: p.ref, ok: true, slug: p.slug, name: p.name, list: p.price, off: p.off, tier: p.tier, pack: p.pack, unit: p.unit, stock: p.stock, art: p.art };
  });
}

export interface OrderInput {
  mode: 'diy' | 'biz';
  ship: 'std' | 'exp' | 'pickup';
  pay: 'card' | 'transfer' | 'invoice';
  customer: Record<string, string>;
  lines: { ref: string; qty: number }[];
}
export interface OrderResult {
  number: string;
  subtotal: number;
  shipping: number;
  vat: number;
  total: number;
  lines: { ref: string; name: string; qty: number; unit_price: number; line_total: number }[];
  source: 'supabase' | 'demo';
}

const r2 = (n: number) => Math.round(n * 100) / 100;

function friendly(msg: string): string {
  const [code, a, b] = msg.split(':');
  switch (code.trim()) {
    case 'insufficient_stock': return `Only ${b} left of ${a}. Lower the quantity and try again.`;
    case 'unavailable': return `${a} is not available at the moment. Remove it to continue.`;
    case 'unknown_product': return `${a} is no longer in the catalogue.`;
    case 'invalid_email': return 'The email address is not valid.';
    case 'invalid_address': return 'The delivery address is incomplete.';
    case 'invoice_requires_business': return 'Invoice payment is only available in Business mode.';
    case 'invalid_quantity': return `Invalid quantity for ${a}.`;
    default: return 'We could not place the order. Please try again.';
  }
}

/**
 * Places the order. With Supabase configured it calls the place_order() SQL function, which re-prices every line on the server.
 * Without it, the same rules run here against the bundled catalogue and nothing is stored.
 */
export async function placeOrder(input: OrderInput): Promise<{ ok: true; order: OrderResult } | { ok: false; error: string }> {
  if (!input || !Array.isArray(input.lines) || !input.lines.length) return { ok: false, error: 'Your basket is empty.' };
  const lines = input.lines.slice(0, 100).map((l) => ({ ref: String(l.ref), qty: Math.floor(Number(l.qty)) }));
  if (lines.some((l) => !(l.qty >= 1 && l.qty <= 9999))) return { ok: false, error: 'Invalid quantity.' };

  if (supabaseConfigured()) {
    const { data, error } = await supabaseClient().rpc('place_order', {
      p_mode: input.mode, p_customer: input.customer, p_ship: input.ship, p_payment: input.pay, p_lines: lines.map((l) => ({ sku: l.ref, qty: l.qty })),
    });
    if (error) return { ok: false, error: friendly(error.message) };
    const o = data as Omit<OrderResult, 'source' | 'lines'> & { lines: (Omit<OrderResult['lines'][number], 'ref'> & { sku: string })[] };
    return { ok: true, order: { ...o, lines: o.lines.map(({ sku, ...l }) => ({ ...l, ref: sku })), source: 'supabase' } };
  }

  const idx = new Map((await getProductsBySku(lines.map((l) => l.ref))).map((p) => [p.ref, p]));
  if (input.pay === 'invoice' && input.mode !== 'biz') return { ok: false, error: friendly('invoice_requires_business') };
  if (!/^\S+@\S+\.\S+$/.test(input.customer.email || '')) return { ok: false, error: friendly('invalid_email') };
  if (!input.customer.address || !input.customer.city || !input.customer.postcode) return { ok: false, error: friendly('invalid_address') };
  const out: OrderResult['lines'] = [];
  let sub = 0;
  for (const l of lines) {
    const p = idx.get(normalizeSku(l.ref));
    if (!p) return { ok: false, error: friendly('unknown_product:' + l.ref) };
    if (p.unavailable) return { ok: false, error: friendly('unavailable:' + p.ref) };
    if (p.stock < l.qty) return { ok: false, error: friendly(`insufficient_stock:${p.ref}:${p.stock}`) };
    const unit = unitFor(p.price, p.off, p.tier, l.qty);
    const total = r2(unit * l.qty);
    sub += total;
    out.push({ ref: p.ref, name: p.name, qty: l.qty, unit_price: unit, line_total: total });
  }
  sub = r2(sub);
  const shipping = input.ship === 'pickup' ? 0 : input.ship === 'exp' ? SHIP_EXP : sub >= FREE_FROM ? 0 : SHIP_STD;
  const vat = r2((sub + shipping) * IVA);
  return {
    ok: true,
    order: { number: 'SF-26-' + (104800 + Math.floor(Math.random() * 900)), subtotal: sub, shipping, vat, total: r2(sub + shipping + vat), lines: out, source: 'demo' },
  };
}
