'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { placeOrder } from '@/app/actions';
import type { OrderResult } from '@/app/actions';
import { useShop } from './Providers';
import { useAuth } from './Auth';
import { SignIn } from './AccountView';
import { Price, VatLabel } from './Price';
import { artSVG } from '@/lib/art';
import { eur, lineUnit, totals, unitFor } from '@/lib/pricing';
import type { ShipMethod } from '@/lib/pricing';
import { FREE_FROM, SHIP_EXP, SHIP_STD, pct, tierMult } from '@/lib/standards';
import type { CartLine } from '@/lib/types';

type Pay = 'card' | 'transfer' | 'invoice';

const SAMPLE = {
  company: 'Henares Renovations S.L.', vatId: 'B00000000', po: '', first: 'Alex', last: 'Morgan', phone: '600 000 000',
  email: 'alex@example.com', address: '12 Calle Mayor, Unit 3', postcode: '28805', city: 'Alcalá de Henares', notes: '',
};

function nextTierTip(l: CartLine) {
  if (!l.tier) return '';
  if (l.qty >= 50) return 'Best volume price applied.';
  const need = l.qty < 10 ? 10 - l.qty : 50 - l.qty;
  const m = l.qty < 10 ? 0.905 : 0.82;
  return { need, m, u: unitFor(l.list, l.off, true, l.qty < 10 ? 10 : 50) };
}

function deliveryText(ship: ShipMethod) {
  if (ship === 'pickup') return 'Ready to collect today at our warehouse in Alcalá de Henares, from 2 hours after your order.';
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return `Expected delivery on ${new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(d)}${ship === 'exp' ? ', before 10 am' : ''}.`;
}

export default function CartView({ recRefs, recCards }: { recRefs: string[]; recCards: Record<string, React.ReactNode> }) {
  const { cart, mode, setQty, removeLine, clearCart, ready } = useShop();
  const biz = mode === 'biz';
  const [step, setStep] = useState(1);
  const [ship, setShip] = useState<ShipMethod>('std');
  const [payRaw, setPay] = useState<Pay>('card');
  const pay: Pay = !biz && payRaw === 'invoice' ? 'card' : payRaw;
  const [form, setForm] = useState(SAMPLE);
  const [err, setErr] = useState<{ msg: string; field?: string } | null>(null);
  const [terms, setTerms] = useState(false);
  const [termsErr, setTermsErr] = useState(false);
  const [order, setOrder] = useState<{ res: OrderResult; delivery: string; email: string; biz: boolean } | null>(null);
  const [payErr, setPayErr] = useState('');
  const [pending, start] = useTransition();
  const { available: authOn, user, profile, token } = useAuth();
  // with accounts switched on, checkout past the basket needs a signed-in customer
  const gate = authOn && !user && (step === 2 || step === 3);
  const filled = useRef(false);

  // signed-in customers start from the details saved on their account
  useEffect(() => {
    if (!user || !profile || filled.current) return;
    filled.current = true;
    const [first, ...rest] = profile.name.split(' ');
    setForm((f) => ({
      ...f, email: user.email ?? f.email, first: first || f.first, last: rest.join(' ') || f.last, company: profile.company || f.company,
      phone: profile.phone || f.phone, address: profile.address || f.address, postcode: profile.postcode || f.postcode, city: profile.city || f.city,
    }));
  }, [user, profile]);

  // after a confirmed order, the next visit to the basket starts a new one
  if (step === 4 && cart.length > 0) { setStep(1); setOrder(null); setTerms(false); }
  const leftConfirmed = useRef(false);
  useEffect(() => { leftConfirmed.current = step === 4; }, [step]);
  useEffect(() => () => {
    // the page is kept alive in the background when you navigate away; drop the confirmation so it does not come back
    if (leftConfirmed.current) { setStep(1); setOrder(null); setTerms(false); }
  }, []);

  const T = totals(cart, ship);
  const items = cart.reduce((a, l) => a + l.qty, 0);
  const inCart = new Set(cart.map((l) => l.ref));
  const picks = recRefs.filter((r) => !inCart.has(r)).slice(0, 4);
  const go = (n: number) => { setStep(n); window.scrollTo({ top: 0 }); };
  const setF = (k: keyof typeof SAMPLE) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submitShip = (e: React.FormEvent) => {
    e.preventDefault();
    const req: [keyof typeof SAMPLE, string, string][] = (biz ? [['company', 'Company name', 'fr'], ['vatId', 'VAT number', 'fc']] : [['first', 'First name', 'ff'], ['last', 'Last name', 'fl']]).concat([['email', 'Email', 'fe'], ['address', 'Address', 'fd'], ['postcode', 'Postcode', 'fp'], ['city', 'City', 'fy']]) as [keyof typeof SAMPLE, string, string][];
    const miss = req.filter(([k]) => !form[k].trim());
    const bad = form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim());
    if (miss.length || bad) {
      const field = miss.length ? miss[0][2] : 'fe';
      setErr({ msg: miss.length ? `Missing: ${miss.map((x) => x[1]).join(', ')}.` : 'The email address is not valid. Check it includes @ and a domain.', field });
      document.getElementById(field)?.focus();
      return;
    }
    setErr(null);
    go(3);
  };

  const submitPay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terms) { setTermsErr(true); document.getElementById('terms')?.focus(); return; }
    setTermsErr(false); setPayErr('');
    start(async () => {
      const res = await placeOrder({
        mode, ship, pay,
        customer: { ...form, company: biz ? form.company : '', vatId: biz ? form.vatId : '' },
        lines: cart.map((l) => ({ ref: l.ref, qty: l.qty })),
        token: await token(),
      });
      if (!res.ok) { setPayErr(res.error); return; }
      setOrder({ res: res.order, delivery: deliveryText(ship), email: form.email, biz });
      clearCart();
      go(4);
    });
  };

  const steps = ['Basket', 'Delivery', 'Payment', 'Confirmed'];
  const empty = ready && !cart.length && step !== 4;

  const recs = picks.length > 0 && step === 1 ? (
    <div id="recs">
      <div className="sec-head"><div><span className="eyebrow">Customers also add</span><h2>Complete your order</h2></div></div>
      {cart.length > 0 && FREE_FROM - T.sub > 0 && (
        <div className="topup" style={{ marginBottom: 14 }}>
          <svg width="20" height="20" aria-hidden="true"><use href="#i-truck" /></svg>
          <span>Add <b className="num"><Price value={FREE_FROM - T.sub} /></b> to get free 24 h delivery. These are the usual extras for your items.</span>
        </div>
      )}
      <div className="rail rec">{picks.map((r) => <div key={r} style={{ display: 'contents' }}>{recCards[r]}</div>)}</div>
    </div>
  ) : null;

  return (
    <div className="wrap" style={{ paddingBlock: '24px 8px' }}>
      <ol className="steps" aria-label="Order progress">
        {steps.map((s, i) => {
          const n = i + 1;
          return <li key={s} className={(n === step ? 'on ' : '') + (n < step || step === 4 ? 'done' : '')} aria-current={n === step ? 'step' : undefined}><span className="d">{n}</span>{s}</li>;
        })}
      </ol>

      <div className="co" style={empty ? { gridTemplateColumns: '1fr' } : undefined}>
        <div>
          {!ready && <div className="panel empty"><p className="muted">Loading your basket…</p></div>}

          {empty && (
            <div className="panel empty">
              <svg width="48" height="48" aria-hidden="true"><use href="#i-cart" /></svg>
              <h2>Your basket is empty</h2>
              <p className="muted" style={{ maxWidth: '44ch' }}>Add products from the catalogue{biz ? ' or paste a list of part numbers in Quick order' : ''}.</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Link className="btn btn-primary" href="/c/fasteners">Shop fasteners</Link>
                <Link className="btn btn-line biz" href="/quick-order">Quick order</Link>
              </div>
            </div>
          )}

          {ready && cart.length > 0 && step === 1 && (
            <div className="panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '2rem' }}>Your basket <span className="muted" style={{ fontSize: '1.25rem' }}>({cart.length} {cart.length === 1 ? 'line' : 'lines'})</span></h1>
                <button className="linkbtn" type="button" onClick={clearCart}>Empty basket</button>
              </div>
              <div className="ship-bar">
                <div>{FREE_FROM - T.sub > 0 ? <>You are <b className="num"><Price value={FREE_FROM - T.sub} /></b> away from free delivery</> : <b>Free 24 h delivery on this order</b>}</div>
                <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={FREE_FROM} aria-valuenow={Math.round(Math.min(T.sub, FREE_FROM))} aria-label="Progress to free delivery"><i style={{ width: `${Math.min(100, (T.sub / FREE_FROM) * 100)}%` }} /></div>
              </div>
              <div>
                {cart.map((l) => {
                  const u = lineUnit(l);
                  const tip = nextTierTip(l);
                  return (
                    <div className="line" key={l.ref}>
                      <Link className="im" href={`/product/${l.slug}`} aria-hidden="true" tabIndex={-1} dangerouslySetInnerHTML={{ __html: artSVG(l.art, { dims: false }, l.name) }} />
                      <div style={{ minWidth: 0 }}>
                        <h3><Link href={`/product/${l.slug}`}>{l.name}</Link></h3>
                        <div className="muted mono" style={{ fontSize: '.75rem' }}>{l.ref}</div>
                        <div style={{ marginTop: 6, fontSize: '.875rem' }}>
                          <span className="stock ok">In stock</span>{' '}
                          <span className="muted">· <Price value={u} /> {l.tier ? `per box of ${l.pack}` : l.unit === 'each' ? 'each' : `per ${l.unit}`}{l.tier && tierMult(l.qty) < 1 ? ' · volume price' : ''}</span>
                        </div>
                        {tip && (typeof tip === 'string'
                          ? <div className="muted" style={{ fontSize: '.8125rem', marginTop: 4 }}>{tip}</div>
                          : <div className="muted" style={{ fontSize: '.8125rem', marginTop: 4 }}>Add {tip.need} more {tip.need === 1 ? 'box' : 'boxes'}: <Price value={tip.u} /> per box (−{pct(tip.m)})</div>)}
                        <div className="acts">
                          <div className="qty" role="group" aria-label={`Quantity of ${l.ref}`}>
                            <button type="button" aria-label="Remove one" onClick={() => setQty(l.ref, l.qty - 1)}>−</button>
                            <input type="text" inputMode="numeric" defaultValue={l.qty} key={l.qty} aria-label="Quantity" onBlur={(e) => setQty(l.ref, parseInt(e.target.value, 10) || 1)} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
                            <button type="button" aria-label="Add one" onClick={() => setQty(l.ref, l.qty + 1)}>+</button>
                          </div>
                          <button className="linkbtn" type="button" onClick={() => removeLine(l.ref)}>Remove</button>
                        </div>
                      </div>
                      <div className="tot num"><Price value={u * l.qty} /><small>{l.tier ? `${l.qty * l.pack} pcs · ` : ''}<VatLabel /></small></div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <Link className="btn btn-line" href="/c/fasteners">Continue shopping</Link>
                <button className="btn btn-primary btn-lg" type="button" onClick={() => go(2)}>{authOn && !user ? 'Sign in to check out' : 'Continue to delivery'}</button>
              </div>
            </div>
          )}

          {ready && cart.length > 0 && gate && (
            <div>
              <SignIn title="Sign in to place your order" />
              <div style={{ marginTop: 12 }}><button className="btn btn-line" type="button" onClick={() => go(1)}>Back to basket</button></div>
            </div>
          )}

          {ready && cart.length > 0 && !gate && step === 2 && (
            <form className="panel" onSubmit={submitShip} noValidate>
              <h1 style={{ fontSize: '2rem' }}>Delivery details</h1>
              <div><span className="lbl">{biz ? 'Company and contact' : 'Your details'} {user ? '(from your account)' : '(sample data)'}</span></div>
              <div className="form2">
                {biz ? (
                  <>
                    <Field id="fr" label="Company name" value={form.company} onChange={setF('company')} ac="organization" bad={err?.field === 'fr'} />
                    <Field id="fc" label="VAT number" value={form.vatId} onChange={setF('vatId')} mono bad={err?.field === 'fc'} />
                    <Field id="fn" label="Contact person" value={form.first} onChange={setF('first')} ac="name" />
                    <Field id="fpo" label="Purchase order no. (optional)" value={form.po} onChange={setF('po')} mono />
                  </>
                ) : (
                  <>
                    <Field id="ff" label="First name" value={form.first} onChange={setF('first')} ac="given-name" bad={err?.field === 'ff'} />
                    <Field id="fl" label="Last name" value={form.last} onChange={setF('last')} ac="family-name" bad={err?.field === 'fl'} />
                  </>
                )}
                <Field id="ft" label="Phone" value={form.phone} onChange={setF('phone')} ac="tel" mode="tel" />
                <Field id="fe" label={biz ? 'Invoice email' : 'Email'} value={form.email} onChange={setF('email')} type="email" ac="email" bad={err?.field === 'fe'} />
                <Field id="fd" label="Delivery address" value={form.address} onChange={setF('address')} ac="street-address" full bad={err?.field === 'fd'} />
                <Field id="fp" label="Postcode" value={form.postcode} onChange={setF('postcode')} ac="postal-code" mode="numeric" mono bad={err?.field === 'fp'} />
                <Field id="fy" label="City" value={form.city} onChange={setF('city')} ac="address-level2" bad={err?.field === 'fy'} />
                <Field id="fo" label="Delivery notes (optional)" value={form.notes} onChange={setF('notes')} full placeholder="Unloading hours, contact on site…" />
              </div>
              {err && <div className="err" role="alert">{err.msg}</div>}
              <div><span className="lbl">Delivery method</span></div>
              <div className="opts" role="radiogroup" aria-label="Delivery method">
                <Opt name="ship" value="std" checked={ship === 'std'} onChange={() => setShip('std')} title="24 h delivery" sub="Order before 5 pm, arrives tomorrow" right={T.sub >= FREE_FROM ? 'Free' : eur(SHIP_STD)} />
                <Opt name="ship" value="exp" checked={ship === 'exp'} onChange={() => setShip('exp')} title="Express before 10 am" sub="For stopped sites. Madrid and Guadalajara area" right={eur(SHIP_EXP)} />
                <Opt name="ship" value="pickup" checked={ship === 'pickup'} onChange={() => setShip('pickup')} title="Collect at our warehouse" sub="Alcalá de Henares · ready in 2 hours" right="Free" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <button className="btn btn-line" type="button" onClick={() => go(1)}>Back to basket</button>
                <button className="btn btn-primary btn-lg" type="submit">Continue to payment</button>
              </div>
            </form>
          )}

          {ready && cart.length > 0 && !gate && step === 3 && (
            <form className="panel" onSubmit={submitPay} noValidate>
              <h1 style={{ fontSize: '2rem' }}>Payment</h1>
              <div className="opts" role="radiogroup" aria-label="Payment method">
                <Opt name="pay" value="card" checked={pay === 'card'} onChange={() => setPay('card')} title="Credit or debit card" sub="Charged when you place the order" right={<span className="mono muted" style={{ fontSize: '.75rem' }}>VISA · MC</span>} />
                <Opt name="pay" value="transfer" checked={pay === 'transfer'} onChange={() => setPay('transfer')} title="Bank transfer" sub="We prepare the order when payment arrives" right="" />
                {biz && <Opt name="pay" value="invoice" checked={pay === 'invoice'} onChange={() => setPay('invoice')} title="Invoice, net 30 days" sub="Approved business account" right={<span className="tag tag-zinc">Business</span>} />}
              </div>
              {pay === 'card' && (
                <div>
                  <div className="form2">
                    <div className="field full"><label htmlFor="cn">Card number</label><input className="input mono" id="cn" inputMode="numeric" autoComplete="off" placeholder="•••• •••• •••• ••••" /></div>
                    <div className="field"><label htmlFor="cx">Expiry</label><input className="input mono" id="cx" inputMode="numeric" autoComplete="off" placeholder="MM/YY" /></div>
                    <div className="field"><label htmlFor="cv">CVC</label><input className="input mono" id="cv" inputMode="numeric" autoComplete="off" placeholder="•••" /></div>
                  </div>
                  <p className="muted" style={{ fontSize: '.8125rem', marginTop: 10 }}>Demo checkout: no payment is processed and no card data is read or stored.</p>
                </div>
              )}
              <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minHeight: 44 }}>
                <input type="checkbox" id="terms" checked={terms} onChange={(e) => setTerms(e.target.checked)} style={{ width: 22, height: 22, accentColor: 'var(--ink)', marginTop: 2 }} />
                <span>I accept the <Link href="/legal#terms">terms of sale</Link> and the <Link href="/help#returns">returns policy</Link>.</span>
              </label>
              {termsErr && <div className="err" role="alert">Accept the terms of sale to place your order.</div>}
              {payErr && <div className="err" role="alert">{payErr}</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <button className="btn btn-line" type="button" onClick={() => go(2)}>Back to delivery</button>
                <button className="btn btn-primary btn-lg" type="submit" disabled={pending}>{pending ? 'Placing order…' : `Place order · ${eur(T.total)}`}</button>
              </div>
            </form>
          )}

          {step === 4 && order && (
            <div className="panel done-box" style={{ alignItems: 'center' }}>
              <div className="ok-ring"><svg aria-hidden="true"><use href="#i-check" /></svg></div>
              <h1 style={{ fontSize: '2.25rem' }}>Order confirmed</h1>
              <p>Order number <b className="mono">{order.res.number}</b></p>
              <p className="muted">{order.delivery} We will email {order.biz ? 'the invoice' : 'your receipt'} to <b>{order.email}</b>.</p>
              <div style={{ width: '100%', textAlign: 'left', borderTop: '1px solid var(--line)' }}>
                {order.res.lines.map((l) => (
                  <div key={l.ref} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--line)', fontSize: '.9375rem' }}>
                    <span style={{ minWidth: 0 }}>{l.qty} × {l.name}</span>
                    <span className="num" style={{ whiteSpace: 'nowrap' }}>{eur(l.line_total * 1.21)}</span>
                  </div>
                ))}
              </div>
              <p className="muted" style={{ fontSize: '.8125rem' }}>
                {order.res.source === 'supabase' ? 'Your order was saved in the database and re-priced on the server.' : 'Demo mode: the order was validated and priced on the server but not stored.'}
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Link className="btn btn-primary" href="/">Continue shopping</Link>
                {user && order.res.source === 'supabase' && <Link className="btn btn-line" href={'/account#' + order.res.number}>See it in your account</Link>}
              </div>
            </div>
          )}
        </div>

        {!empty && ready && (cart.length > 0 || step === 4) && (
          <aside className="sum" aria-label="Order summary">
            {step === 4 && order ? (
              <>
                <h2 style={{ fontSize: '1.5rem' }}>Summary</h2>
                <div className="r"><span>Subtotal ex VAT</span><span className="num">{eur(order.res.subtotal)}</span></div>
                <div className="r"><span>Delivery</span><span className="num">{order.res.shipping ? eur(order.res.shipping) : 'Free'}</span></div>
                <div className="r"><span>VAT 21 %</span><span className="num">{eur(order.res.vat)}</span></div>
                <div className="r t"><span>Total</span><span className="num">{eur(order.res.total)}</span></div>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: '1.5rem' }}>Summary</h2>
                <div className="r"><span>Items ({items})</span><span className="num">{eur(T.list)}</span></div>
                {T.save > 0.004 && <div className="r" style={{ color: 'var(--ok)' }}><span>Discounts and volume price</span><span className="num">−{eur(T.save)}</span></div>}
                <div className="r"><span>Subtotal ex VAT</span><span className="num">{eur(T.sub)}</span></div>
                <div className="r"><span>{ship === 'pickup' ? 'Collect in store' : ship === 'exp' ? 'Express delivery' : '24 h delivery'}</span><span className="num">{T.shipping ? eur(T.shipping) : 'Free'}</span></div>
                <div className="r"><span>VAT 21 %</span><span className="num">{eur(T.vat)}</span></div>
                <div className="r t"><span>Total</span><span className="num">{eur(T.total)}</span></div>
                <small className="muted">{pay === 'invoice' && step >= 3 ? 'Invoice due 30 days after delivery.' : 'Prices in euros. VAT shown separately on your invoice.'}</small>
              </>
            )}
          </aside>
        )}
      </div>
      {recs}
    </div>
  );
}

function Field({ id, label, value, onChange, type = 'text', ac, mode, mono, full, bad, placeholder }: {
  id: string; label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; ac?: string; mode?: 'tel' | 'numeric'; mono?: boolean; full?: boolean; bad?: boolean; placeholder?: string;
}) {
  return (
    <div className={'field' + (full ? ' full' : '')}>
      <label htmlFor={id}>{label}</label>
      <input className={'input' + (mono ? ' mono' : '')} id={id} type={type} value={value} onChange={onChange} autoComplete={ac} inputMode={mode} aria-invalid={bad || undefined} placeholder={placeholder} />
    </div>
  );
}

function Opt({ name, value, checked, onChange, title, sub, right }: { name: string; value: string; checked: boolean; onChange: () => void; title: string; sub: string; right: React.ReactNode }) {
  return (
    <label className="optc">
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} />
      <span><b>{title}</b><small>{sub}</small></span>
      {typeof right === 'string' ? <b className="num">{right}</b> : right}
    </label>
  );
}

