import type { Metadata } from 'next';
import Link from 'next/link';
import PageHead from '@/components/PageHead';

export const metadata: Metadata = { title: 'Our warehouses', description: 'Five SupplyForge warehouses across Spain, their cut-off times and delivery areas.' };

const WAREHOUSES = [
  { code: 'MAD', name: 'Madrid central', city: 'Getafe', area: 'Madrid, Castilla-La Mancha and Castilla y León', days: '24 h', note: 'Main warehouse. Supplies the Alcalá de Henares trade counter twice a day.' },
  { code: 'BCN', name: 'Barcelona hub', city: "L'Hospitalet de Llobregat", area: 'Catalonia, Aragon and the Balearic Islands', days: '24–48 h', note: 'Pallet orders for the north-east and the islands.' },
  { code: 'VLC', name: 'Valencia east', city: 'Riba-roja de Túria', area: 'Valencia region and Murcia', days: '24–48 h', note: 'Power tools, abrasives and electrical lines.' },
  { code: 'SVQ', name: 'Seville south', city: 'Dos Hermanas', area: 'Andalusia and Extremadura', days: '48–72 h', note: 'Anchors and construction fixings for the south.' },
  { code: 'BIO', name: 'Bilbao north', city: 'Basauri', area: 'Basque Country, Navarre, Cantabria and Asturias', days: '24–48 h', note: 'Industrial fasteners and safety equipment.' },
];

export default function Warehouse() {
  return (
    <>
      <PageHead eyebrow="Logistics" title="Our warehouses" intro="Every product page shows the stock in each warehouse and ships from the nearest one that can serve the whole line. Orders placed before 2 pm leave the same day." />
      <div className="wrap sec">
        <div className="wh-grid">
          {WAREHOUSES.map((w) => (
            <article key={w.code} className="panel wh">
              <div className="acct-head"><span className="tag tag-zinc">{w.code}</span><span className="muted mono" style={{ fontSize: '.8125rem' }}>Cut-off 2 pm</span></div>
              <h2>{w.name}</h2>
              <p className="muted">{w.city}</p>
              <dl>
                <div><dt>Delivers to</dt><dd>{w.area}</dd></div>
                <div><dt>Delivery</dt><dd>{w.days}</dd></div>
              </dl>
              <p style={{ fontSize: '.9375rem' }}>{w.note}</p>
            </article>
          ))}
          <article className="panel wh wh-counter">
            <div className="acct-head"><span className="tag tag-white">Counter</span><span className="mono" style={{ fontSize: '.8125rem' }}>Mon–Sat 7 am–3 pm</span></div>
            <h2>Click &amp; collect</h2>
            <p>Trade counter in Alcalá de Henares, Madrid. Orders are ready 2 hours after you place them, with no fee and no minimum.</p>
            <Link className="btn btn-primary" href="/help#delivery">Delivery options</Link>
          </article>
        </div>
      </div>
    </>
  );
}
