import type { Metadata } from 'next';
import Link from 'next/link';
import PageHead from '@/components/PageHead';
import QuickOrder from '@/components/QuickOrder';
import { BusinessViewButton } from '@/components/HeaderClient';

export const metadata: Metadata = { title: 'For distributors and trade', description: 'Quick order by part number, volume pricing, net-30 invoicing and a named account manager for installers, workshops and distributors.' };

export default function Trade() {
  return (
    <>
      <PageHead eyebrow="Distributors & trade" title="Order by part number, pay in 30 days" intro="For installers, workshops, resellers and distributors. Paste your list of part numbers, check stock line by line and get trade prices with volume breaks on every box.">
        <div className="page-cta">
          <a className="btn btn-primary btn-lg" href="#quick-order"><svg width="20" height="20" aria-hidden="true"><use href="#i-zap" /></svg>Go to quick order</a>
          <Link className="btn btn-ghost btn-lg" href="/account">Open a trade account</Link>
          <BusinessViewButton />
        </div>
      </PageHead>

      <div className="wrap sec" style={{ paddingBottom: 0 }}>
        <div className="svc" role="list">
          <div role="listitem"><svg aria-hidden="true"><use href="#i-zap" /></svg><p><b>Quick order</b><span>Paste part numbers and quantities, or a column from a spreadsheet.</span></p></div>
          <div role="listitem"><svg aria-hidden="true"><use href="#i-tag" /></svg><p><b>Volume pricing</b><span>Up to −18 % per box, applied automatically.</span></p></div>
          <div role="listitem"><svg aria-hidden="true"><use href="#i-invoice" /></svg><p><b>Net-30 invoice</b><span>One monthly statement for approved accounts.</span></p></div>
          <div role="listitem"><svg aria-hidden="true"><use href="#i-truck" /></svg><p><b>Delivery to site</b><span>Express before 10 am for stopped jobs.</span></p></div>
        </div>
      </div>

      <QuickOrder id="quick-order" />

      <div className="wrap sec">
        <div className="doc-grid">
          <nav className="doc-nav" aria-label="On this page">
            <a href="#pricing">Volume pricing</a>
            <a href="#net-30">Net-30 terms</a>
            <a href="#account">Trade account</a>
            <a href="#distributors">Distributors</a>
          </nav>
          <div className="prose">
            <section id="pricing">
              <h2>Volume pricing</h2>
              <p>Fasteners and fixings sold in boxes have three price breaks. The basket applies them per line, so mixing sizes never costs you the discount on the lines that qualify.</p>
              <table className="otable">
                <thead><tr><th>Boxes per line</th><th className="r">Price per box</th></tr></thead>
                <tbody>
                  <tr><td>1 to 9</td><td className="r">List price</td></tr>
                  <tr><td>10 to 49</td><td className="r">−9.5 %</td></tr>
                  <tr><td>50 or more</td><td className="r">−18 %</td></tr>
                </tbody>
              </table>
              <p>Offers on the product are applied first, then the volume break.</p>
            </section>
            <section id="net-30">
              <h2>Net-30 terms</h2>
              <p>Approved business accounts pay by invoice 30 days from the end of the month, with one statement covering every delivery. Choose <b>Invoice, net 30 days</b> at checkout in Business view. A purchase order number can be added to each order so it matches your own records.</p>
            </section>
            <section id="account">
              <h2>Trade account</h2>
              <p>Create a <Link href="/account">business account</Link> with your company name. You get the order history of every order placed with your account email, saved lists for repeat purchases and the Business view by default when you sign in.</p>
              <ul>
                <li>Ex VAT prices and volume tiers on every page.</li>
                <li>Repeat any past order from <b>Your orders</b> with one click.</li>
                <li>A named account manager from your first €1,500 per month.</li>
              </ul>
            </section>
            <section id="distributors">
              <h2>Distributors and resellers</h2>
              <p>We supply hardware shops and industrial distributors across Spain from five warehouses. Pallet orders ship directly from the warehouse with the most stock, and we can deliver to your customer with your delivery note.</p>
              <p>Write to <b className="mono">trade@supplyforge.example</b> with your company details and the lines you buy most often, and we prepare a price list for you.</p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
