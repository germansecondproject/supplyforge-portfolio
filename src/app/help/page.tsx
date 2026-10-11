import type { Metadata } from 'next';
import Link from 'next/link';
import PageHead from '@/components/PageHead';

export const metadata: Metadata = { title: 'Help & returns', description: 'Delivery times, returns, payment options and how to reach SupplyForge.' };

const FAQ: [string, React.ReactNode][] = [
  ['Can I change an order after placing it?', 'Yes, until it leaves the warehouse. Orders placed before 2 pm usually ship the same day, so write to us as soon as possible with the order number.'],
  ['Do prices include VAT?', <>In Home &amp; DIY view prices include 21 % VAT. In Business view they are shown without VAT. Use the <b>Ex VAT / Inc VAT</b> switch in the header to change it at any time.</>],
  ['How do volume prices work?', <>Products sold in boxes get 9.5 % off per box from 10 boxes and 18 % off from 50 boxes. The discount is applied automatically in the basket. See <Link href="/trade#pricing">trade pricing</Link>.</>],
  ['Where can I see my past orders?', <><Link href="/account">Sign in</Link> and open <b>Your orders</b>. Orders placed as a guest with the same email appear there once your email is confirmed.</>],
  ['Is a part number I know in the catalogue?', <>Paste it in <Link href="/quick-order">Quick order</Link>: it checks every line against the catalogue and stock before adding it to the basket.</>],
  ['Is this a real shop?', 'No. SupplyForge is a portfolio project: products, prices, brands and customers are fictional and no payment is ever taken.'],
];

export default function Help() {
  return (
    <>
      <PageHead eyebrow="Customer service" title="Help & returns" intro="Delivery times, returns and payment, in plain words. If something is not covered here, write to us and a person answers the same working day." />
      <div className="wrap doc-grid">
        <nav className="doc-nav" aria-label="On this page">
          <a href="#delivery">Delivery &amp; timing</a>
          <a href="#returns">Returns</a>
          <a href="#payment">Payment</a>
          <a href="#contact">Contact</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="prose">
          <section id="delivery">
            <h2>Delivery &amp; timing</h2>
            <p>Every product page shows how many units we have, which warehouse ships them and when they arrive. Orders placed before <b>2 pm</b> leave the same day from the nearest warehouse with stock.</p>
            <table className="otable">
              <thead><tr><th>Option</th><th>When it arrives</th><th className="r">Cost</th></tr></thead>
              <tbody>
                <tr><td>24 h delivery</td><td>Next working day on the mainland, 2–3 days from regional warehouses</td><td className="r">€9.90, free over €150</td></tr>
                <tr><td>Express before 10 am</td><td>Next working day before 10 am, Madrid and Guadalajara area</td><td className="r">€24.90</td></tr>
                <tr><td>Click &amp; collect</td><td>Ready 2 hours after ordering at our trade counter in Alcalá de Henares</td><td className="r">Free</td></tr>
              </tbody>
            </table>
            <p>Balearic Islands: add one working day. We do not ship to the Canary Islands, Ceuta or Melilla yet. See <Link href="/warehouse">our warehouses</Link> for where each order ships from.</p>
          </section>

          <section id="returns">
            <h2>Returns</h2>
            <p><b>Home &amp; DIY customers</b> can return any unused product in its original box within <b>100 days</b>, free of charge. <b>Business accounts</b> have 30 days, and opened boxes of fasteners are accepted when at least 80 % of the pieces are returned.</p>
            <ol>
              <li>Write to us with the order number and the lines you want to return.</li>
              <li>We send a prepaid label, or you bring the box to the Alcalá de Henares counter.</li>
              <li>We refund to the original payment method within 5 working days of receiving it. Invoice customers get a credit note.</li>
            </ol>
            <p>Faulty or wrong products are collected at our cost at any time within the warranty period.</p>
          </section>

          <section id="payment">
            <h2>Payment</h2>
            <p>We accept Visa and Mastercard, charged when the order is placed, and bank transfer, prepared when the payment arrives. Approved business accounts can pay by <b>invoice at 30 days</b>, with one monthly statement. <Link href="/trade#net-30">How to apply</Link>.</p>
          </section>

          <section id="contact">
            <h2>Contact</h2>
            <div className="cards3">
              <div><span className="lbl">Phone</span><p><b className="mono">+34 900 000 000</b><br />Monday to Friday, 8 am to 6 pm</p></div>
              <div><span className="lbl">Email</span><p><b className="mono">help@supplyforge.example</b><br />Answered the same working day</p></div>
              <div><span className="lbl">Trade counter</span><p><b>Alcalá de Henares</b><br />Monday to Saturday, 7 am to 3 pm</p></div>
            </div>
          </section>

          <section id="faq">
            <h2>FAQ</h2>
            {FAQ.map(([q, a]) => (
              <details key={q} className="faq"><summary>{q}</summary><p>{a}</p></details>
            ))}
          </section>
        </div>
      </div>
    </>
  );
}
