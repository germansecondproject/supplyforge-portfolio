import Link from 'next/link';

const LOGOS: { name: string; q: string; svg: string }[] = [
  { name: 'Kestrel Tools', q: 'Kestrel', svg: `<path d="M6 38L22 10l8 14 8-14 16 28-12-8-12 6-12-6z" fill="#D2360F"/><text x="66" y="32" font-family="Barlow Condensed,sans-serif" font-weight="700" font-size="25" letter-spacing="3" fill="currentColor">KESTREL</text><text x="66" y="45" font-family="IBM Plex Mono,monospace" font-size="8" letter-spacing="2" fill="currentColor" opacity=".6">POWER TOOLS</text>` },
  { name: 'Alpenfix', q: 'Alpenfix', svg: `<path d="M4 40L24 8l10 16 6-8 14 24z" fill="#1F5FBF"/><path d="M24 8l5 8h-10z" fill="#fff" opacity=".9"/><text x="64" y="35" font-family="IBM Plex Sans,sans-serif" font-weight="600" font-size="24" fill="currentColor">alpenfix</text>` },
  { name: 'Nordgrip', q: 'Nordgrip', svg: `<circle cx="24" cy="26" r="18" fill="#0B7A6E"/><path d="M14 26h20M17 19h14M17 33h14" stroke="#fff" stroke-width="3" stroke-linecap="round"/><text x="52" y="33" font-family="IBM Plex Sans,sans-serif" font-weight="600" font-size="21" letter-spacing="3" fill="currentColor">NORDGRIP</text>` },
  { name: 'Ferrum and Co', q: 'Ferrum', svg: `<path d="M24 4l18 10v22L24 46 6 36V14z" fill="#2A3036" stroke="currentColor" stroke-width="1.5"/><text x="24" y="33" text-anchor="middle" font-family="Barlow Condensed,sans-serif" font-weight="700" font-size="24" fill="#F2B705">F</text><text x="52" y="31" font-family="Barlow Condensed,sans-serif" font-weight="700" font-size="24" letter-spacing="1" fill="currentColor">FERRUM</text><text x="52" y="44" font-family="IBM Plex Mono,monospace" font-size="9" letter-spacing="3" fill="currentColor" opacity=".6">&amp; CO.</text>` },
  { name: 'Torque Lab', q: 'Torque Lab', svg: `<circle cx="24" cy="26" r="17" fill="none" stroke="#7A5BD0" stroke-width="5"/><path d="M24 26L36 14" stroke="#7A5BD0" stroke-width="5" stroke-linecap="round"/><text x="52" y="31" font-family="IBM Plex Mono,monospace" font-weight="600" font-size="16" letter-spacing="1" fill="currentColor">TORQUE</text><text x="52" y="45" font-family="IBM Plex Mono,monospace" font-weight="600" font-size="16" letter-spacing="1" fill="#7A5BD0">LAB</text>` },
  { name: 'Brava Pro', q: 'Brava', svg: `<rect x="8" y="8" width="204" height="36" fill="#F2B705"/><text x="110" y="35" text-anchor="middle" font-family="Barlow Condensed,sans-serif" font-weight="700" font-size="28" letter-spacing="5" fill="#101828">BRAVA PRO</text>` },
  { name: 'Anclatec', q: 'Anclatec', svg: `<path d="M8 8h32v10H8z" fill="#E8761B"/><path d="M17 18v7l4 4v12h6V29l4-4v-7" fill="#E8761B"/><text x="52" y="33" font-family="IBM Plex Sans,sans-serif" font-weight="600" font-size="22" fill="currentColor">anclatec</text>` },
  { name: 'Vektor', q: 'Vektor', svg: `<path d="M6 10h14l8 24 8-24h14L35 44H21z" fill="#D2360F"/><text x="68" y="34" font-family="Barlow Condensed,sans-serif" font-weight="700" font-style="italic" font-size="28" letter-spacing="3" fill="currentColor">VEKTOR</text>` },
];

export default function Brands() {
  return (
    <div className="brands" aria-label="Brands">
      {LOGOS.map((b) => (
        <Link key={b.name} className="brand" href={`/search?q=${encodeURIComponent(b.q)}`} aria-label={b.name}>
          <svg viewBox="0 0 220 52" role="img" aria-label={b.name} dangerouslySetInnerHTML={{ __html: b.svg }} />
        </Link>
      ))}
    </div>
  );
}
