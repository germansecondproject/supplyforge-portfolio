'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useAuth } from './Auth';
import { useShop } from './Providers';
import { checkParts } from '@/app/actions';
import { browserClient, DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/lib/supabase-browser';
import { eur } from '@/lib/pricing';

const PAGE = 10;
const STATUS: Record<string, [string, string]> = {
  received: ['Received', 'tag-zinc'], shipped: ['On its way', 'tag-zinc'], delivered: ['Delivered', 'tag-line'],
  cancelled: ['Cancelled', 'tag-red'], returned: ['Returned', 'tag-red'],
};
const SHIP: Record<string, string> = { std: '24 h delivery', exp: 'Express before 10 am', pickup: 'Collect at the warehouse' };
const PAY: Record<string, string> = { card: 'Card', transfer: 'Bank transfer', invoice: 'Invoice, net 30' };
const date = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

interface OrderRow {
  id: string; number: string; created_at: string; status: string; mode: 'diy' | 'biz'; total: number;
  order_lines: { count: number }[];
}
interface OrderDetail {
  number: string; created_at: string; status: string; mode: 'diy' | 'biz'; ship_method: string; payment_method: string;
  subtotal: number; shipping: number; vat: number; total: number; customer: Record<string, string>;
  order_lines: { sku: string; name: string; qty: number; unit_price: number; line_total: number; products: { slug: string } | null }[];
}

function Status({ s }: { s: string }) {
  const [label, cls] = STATUS[s] ?? [s, 'tag-line'];
  return <span className={'tag ' + cls}>{label}</span>;
}

/* ---------- signed out: sign in, create an account, or try a demo customer ---------- */
export function SignIn({ title }: { title?: string } = {}) {
  const { signIn, signUp } = useAuth();
  const [tab, setTab] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [biz, setBiz] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);
  const [pending, start] = useTransition();

  const doSignIn = (e: string, p: string) => start(async () => {
    setMsg(null);
    const err = await signIn(e, p);
    if (err) setMsg({ text: err });
  });

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setMsg({ text: 'Enter a valid email address.' }); return; }
    if (tab === 'in') { doSignIn(email, password); return; }
    if (password.length < 8) { setMsg({ text: 'Choose a password with at least 8 characters.' }); return; }
    if (!name.trim() || (biz && !company.trim())) { setMsg({ text: biz ? 'Enter your name and company.' : 'Enter your name.' }); return; }
    start(async () => {
      setMsg(null);
      const r = await signUp(email, password, { name: name.trim(), company: biz ? company.trim() : '', mode: biz ? 'biz' : 'diy' });
      if (r.error) setMsg({ text: r.error });
      else if (r.confirm) setMsg({ text: `We sent a confirmation link to ${email.trim()}. Open it to activate your account.`, ok: true });
    });
  };

  return (
    <div className="acct">
      <form className="panel" onSubmit={submit} noValidate>
        {title && <h1 style={{ fontSize: '2rem' }}>{title}</h1>}
        <div className="seg acct-tabs" role="group" aria-label="Account">
          <button type="button" aria-pressed={tab === 'in'} onClick={() => { setTab('in'); setMsg(null); }}>Sign in</button>
          <button type="button" aria-pressed={tab === 'up'} onClick={() => { setTab('up'); setMsg(null); }}>Create account</button>
        </div>
        {tab === 'up' && (
          <>
            <div className="seg" role="group" aria-label="Account type">
              <button type="button" aria-pressed={!biz} onClick={() => setBiz(false)}>Home &amp; DIY</button>
              <button type="button" aria-pressed={biz} onClick={() => setBiz(true)}>Business</button>
            </div>
            <div className="field"><label htmlFor="an">{biz ? 'Contact person' : 'Full name'}</label><input className="input" id="an" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
            {biz && <div className="field"><label htmlFor="ac">Company</label><input className="input" id="ac" value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" /></div>}
          </>
        )}
        <div className="field"><label htmlFor="ae">Email</label><input className="input" id="ae" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
        <div className="field"><label htmlFor="ap">Password</label><input className="input" id="ap" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={tab === 'in' ? 'current-password' : 'new-password'} /></div>
        {msg && <p className={msg.ok ? 'ok-t' : 'err'} role="status">{msg.text}</p>}
        <button className="btn btn-primary btn-lg" type="submit" disabled={pending}>{pending ? 'One moment…' : tab === 'in' ? 'Sign in' : 'Create account'}</button>
      </form>

      <div className="panel">
        <span className="eyebrow">Try it</span>
        <h2 style={{ fontSize: '1.5rem' }}>Sign in as a demo customer</h2>
        <p className="muted">The store has 750 fictitious customers with a year of past orders. Pick one to see the order history, or use any address from <span className="mono">customer1@example.com</span> to <span className="mono">customer750@example.com</span> with the password <span className="mono">{DEMO_PASSWORD}</span>.</p>
        {DEMO_ACCOUNTS.map((d) => (
          <button key={d.email} className="btn btn-line" type="button" disabled={pending} onClick={() => doSignIn(d.email, DEMO_PASSWORD)}>
            {d.label} · <span className="mono">{d.email}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- one order ---------- */
function Detail({ number, onBack }: { number: string; onBack: () => void }) {
  const { addLine, toast } = useShop();
  const [o, setO] = useState<OrderDetail | null | undefined>(undefined);
  const [pending, start] = useTransition();

  useEffect(() => {
    browserClient().from('orders')
      .select('number, created_at, status, mode, ship_method, payment_method, subtotal, shipping, vat, total, customer, order_lines(sku, name, qty, unit_price, line_total, products(slug))')
      .eq('number', number).maybeSingle()
      .then(({ data }) => setO((data as OrderDetail | null) ?? null));
  }, [number]);

  const again = () => start(async () => {
    if (!o) return;
    const checked = await checkParts(o.order_lines.map((l) => l.sku));
    let added = 0;
    for (const c of checked) {
      const l = o.order_lines.find((x) => x.sku === c.ref);
      if (!c.ok || !l) continue;
      addLine({ ref: c.ref, slug: c.slug!, name: c.name!, pack: c.pack!, tier: !!c.tier, unit: c.unit!, list: c.list!, off: c.off!, qty: l.qty, art: c.art! });
      added++;
    }
    toast(added === o.order_lines.length ? `Added ${added} lines to the basket` : `Added ${added} of ${o.order_lines.length} lines; the rest are not available now`, true);
  });

  if (o === undefined) return <div className="panel"><p className="muted">Loading order…</p></div>;
  if (o === null) return <div className="panel"><p>We could not find order <b className="mono">{number}</b> in your account.</p><button className="btn btn-line" type="button" onClick={onBack}>Back to your orders</button></div>;
  const c = o.customer;
  return (
    <div className="panel">
      <button className="linkbtn" type="button" onClick={onBack} style={{ alignSelf: 'flex-start' }}>← All orders</button>
      <div className="acct-head">
        <div><span className="eyebrow">Order</span><h2 className="mono" style={{ fontSize: '1.5rem' }}>{o.number}</h2></div>
        <Status s={o.status} />
      </div>
      <p className="muted">Placed on {date(o.created_at)} · {o.mode === 'biz' ? 'Business order' : 'Home & DIY order'} · {SHIP[o.ship_method]} · {PAY[o.payment_method]}</p>
      <div className="otable-wrap">
        <table className="otable">
          <thead><tr><th>Product</th><th className="r">Qty</th><th className="r">Unit ex VAT</th><th className="r">Total ex VAT</th></tr></thead>
          <tbody>
            {o.order_lines.map((l) => (
              <tr key={l.sku}>
                <td>{l.products ? <Link href={`/product/${l.products.slug}`}>{l.name}</Link> : l.name}<div className="mono muted" style={{ fontSize: '.75rem' }}>{l.sku}</div></td>
                <td className="r num">{l.qty}</td><td className="r num">{eur(l.unit_price)}</td><td className="r num">{eur(l.line_total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan={3}>Subtotal</td><td className="r num">{eur(o.subtotal)}</td></tr>
            <tr><td colSpan={3}>Shipping</td><td className="r num">{o.shipping > 0 ? eur(o.shipping) : 'Free'}</td></tr>
            <tr><td colSpan={3}>VAT 21 %</td><td className="r num">{eur(o.vat)}</td></tr>
            <tr className="tot"><td colSpan={3}>Total</td><td className="r num">{eur(o.total)}</td></tr>
          </tfoot>
        </table>
      </div>
      <div className="acct-cols">
        <div><span className="lbl">Delivered to</span><p>{c.company && <>{c.company}<br /></>}{c.name}<br />{c.address}<br />{c.postcode} {c.city}</p></div>
        <div><span className="lbl">Contact</span><p>{c.email}{c.phone && <><br />{c.phone}</>}</p></div>
      </div>
      <button className="btn btn-primary" type="button" onClick={again} disabled={pending} style={{ alignSelf: 'flex-start' }}>{pending ? 'Checking stock…' : 'Buy these again'}</button>
    </div>
  );
}

/* ---------- signed in: profile and order history ---------- */
function Orders() {
  const { user, profile, signOut } = useAuth();
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<OrderRow[] | null>(null);
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState<string | null>(null);

  // the open order lives in the URL hash so it survives a reload and can be shared with the account owner
  useEffect(() => {
    const read = () => setOpen(decodeURIComponent(window.location.hash.slice(1)) || null);
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  const show = useCallback((n: string | null) => {
    history.pushState(null, '', n ? '#' + encodeURIComponent(n) : window.location.pathname);
    setOpen(n);
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    let live = true;
    browserClient().from('orders')
      .select('id, number, created_at, status, mode, total, order_lines(count)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE, page * PAGE - 1)
      .then(({ data, count: n }) => { if (live) { setRows((data as OrderRow[] | null) ?? []); setCount(n ?? 0); } });
    return () => { live = false; };
  }, [page, user?.id]);

  const pages = Math.max(1, Math.ceil(count / PAGE));
  const p = profile!;

  return (
    <div className="acct">
      <div className="panel acct-side">
        <span className="eyebrow">{p.mode === 'biz' ? 'Business account' : 'Your account'}</span>
        <h2 style={{ fontSize: '1.5rem' }}>{p.name || user?.email}</h2>
        {p.company && <p><b>{p.company}</b></p>}
        <p className="muted" style={{ fontSize: '.9375rem' }}>
          {user?.email}{p.phone && <><br />{p.phone}</>}
          {p.address && <><br />{p.address}<br />{p.postcode} {p.city}</>}
        </p>
        {p.mode === 'biz' && <Link className="btn btn-primary" href="/quick-order">Quick order</Link>}
        <Link className="btn btn-line" href="/lists">{p.mode === 'biz' ? 'Saved lists' : 'Saved for later'}</Link>
        <button className="btn btn-line" type="button" onClick={() => signOut()}>Sign out</button>
      </div>

      <div className="acct-main">
        {open ? <Detail number={open} onBack={() => show(null)} /> : (
          <div className="panel">
            <div className="acct-head">
              <div><span className="eyebrow">Order history</span><h2 style={{ fontSize: '1.5rem' }}>Your orders</h2></div>
              {count > 0 && <span className="muted num">{count} {count === 1 ? 'order' : 'orders'}</span>}
            </div>
            {rows === null ? <p className="muted">Loading orders…</p> : rows.length === 0 ? (
              <div className="empty"><p>No orders yet. Orders you place while signed in appear here, and so do earlier orders placed with this email.</p><Link className="btn btn-primary" href="/">Start shopping</Link></div>
            ) : (
              <>
                <div className="otable-wrap">
                  <table className="otable">
                    <thead><tr><th>Order</th><th>Date</th><th>Status</th><th className="r">Lines</th><th className="r">Total</th></tr></thead>
                    <tbody>
                      {rows.map((o) => (
                        <tr key={o.id}>
                          <td><a className="mono" href={'#' + o.number} onClick={(e) => { e.preventDefault(); show(o.number); }}>{o.number}</a></td>
                          <td>{date(o.created_at)}</td>
                          <td><Status s={o.status} /></td>
                          <td className="r num">{o.order_lines[0]?.count ?? 0}</td>
                          <td className="r num">{eur(o.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pages > 1 && (
                  <nav className="pager" aria-label="Order pages">
                    <button type="button" className="btn btn-line" disabled={page <= 1} onClick={() => setPage(page - 1)}>Newer</button>
                    <span className="muted num">Page {page} of {pages}</span>
                    <button type="button" className="btn btn-line" disabled={page >= pages} onClick={() => setPage(page + 1)}>Older</button>
                  </nav>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AccountView() {
  const { available, ready, user } = useAuth();
  if (!available) {
    return <div className="panel"><p>Customer accounts need the Supabase database. Set <span className="mono">NEXT_PUBLIC_SUPABASE_URL</span> and <span className="mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</span> to enable them.</p></div>;
  }
  if (!ready) return <div className="panel"><p className="muted">Loading your account…</p></div>;
  return user ? <Orders /> : <SignIn />;
}
