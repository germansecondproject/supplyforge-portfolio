/* Procedural blueprint-style product drawings. Pure string output so the same code runs on server and client. */
import { GEO, MATFILL, PITCH, TYPES, packOf, refOf, tl } from './standards.ts';
import type { BoltType, MatKey } from './standards.ts';
import type { ArtSpec } from './types.ts';

export interface ArtOpts {
  H?: number;
  dims?: boolean;
  dc?: string; // dimension line colour
  tc?: string; // dimension text colour
  view?: 'side' | 'top' | 'pack';
}

const S = '#2A3036';

function wrap(inner: string, H: number, label: string, offset = 0) {
  const body = offset ? `<g transform="translate(0 ${offset})">${inner}</g>` : inner;
  return `<svg viewBox="0 0 360 ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label.replace(/"/g, '&quot;')}" preserveAspectRatio="xMidYMid meet">${body}</svg>`;
}

function arrows(x1: number, x2: number, y: number, col: string) {
  const a = 5;
  return `<g fill="${col}" stroke="none"><path d="M${x1},${y}l${a * 1.6},-${a * 0.6}v${a * 1.2}z"/><path d="M${x2},${y}l-${a * 1.6},-${a * 0.6}v${a * 1.2}z"/></g><path d="M${x1},${y}H${x2}" stroke="${col}" stroke-width="1"/>`;
}

function hashId(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/* ---------- bolts and screws ---------- */
export function boltInner(t: BoltType, d: number, L: number, mat: MatKey, o: ArtOpts = {}) {
  const H = o.H || 220, W = 360, dims = o.dims !== false, F = MATFILL[mat];
  const D = o.dc || 'var(--ink-2)', T = o.tc || 'var(--ink)';
  const g = GEO[t](d), p = t === 'wood' ? d * 0.5 : PITCH[d];
  const total = g.k + L, hex = t === 'hex';
  const sc = Math.min(5.2, 270 / total, (H * 0.34) / ((g.hw * (hex ? 1.155 : 1)) / 2));
  const cy = dims ? H * 0.45 : H * 0.5, x0 = (W - total * sc) / 2, xs = x0 + g.k * sc, xe = xs + L * sc, rd = (d * sc) / 2, hh = (g.hw * sc) / 2, hhh = hex ? hh * 1.155 : hh;
  const uid = hashId(`${t}${d}${L}${mat}${H}${dims}`);
  const id = 'c' + uid, id2 = 'h' + uid, c = Math.min(rd * 0.35, 2.2 * sc);
  const tip = t === 'wood'
    ? `M${xs},${cy - rd}L${xe - rd * 2.4},${cy - rd}L${xe},${cy}L${xe - rd * 2.4},${cy + rd}L${xs},${cy + rd}Z`
    : `M${xs},${cy - rd}L${xe - c},${cy - rd}L${xe},${cy - rd + c}L${xe},${cy + rd - c}L${xe - c},${cy + rd}L${xs},${cy + rd}Z`;
  const head = t === 'flat' || t === 'wood'
    ? `M${x0},${cy - hh}L${xs},${cy - rd}L${xs},${cy + rd}L${x0},${cy + hh}Z`
    : `M${x0 + 1.5},${cy - hhh}H${xs}V${cy + hhh}H${x0 + 1.5}L${x0},${cy + hhh - 1.5}V${cy - hhh + 1.5}Z`;
  const thr = t === 'socket' || (t === 'flat' && L > 40) ? Math.min(L, 2 * d + 6) : L;
  let s = `<defs><clipPath id="${id}"><path d="${tip}"/></clipPath><clipPath id="${id2}"><path d="${head}"/></clipPath></defs>`;
  s += `<path d="${tip}" fill="${F}" stroke="${S}" stroke-width="1.4" stroke-linejoin="round"/>`;
  s += `<g clip-path="url(#${id})"><rect x="${xs}" y="${cy - rd}" width="${L * sc}" height="${rd * 0.7}" fill="#fff" opacity=".32"/><rect x="${xs}" y="${cy + rd * 0.4}" width="${L * sc}" height="${rd * 0.6}" fill="#000" opacity=".16"/>`;
  let th = '';
  for (let x = xe - thr * sc; x < xe; x += p * sc) th += `M${x.toFixed(1)},${(cy + rd).toFixed(1)}l${(p * sc * 0.6).toFixed(1)},${(-rd * 2).toFixed(1)}`;
  s += `<path d="${th}" stroke="${S}" stroke-width=".9" fill="none" opacity=".55"/></g>`;
  s += `<path d="${head}" fill="${F}" stroke="${S}" stroke-width="1.4" stroke-linejoin="round"/>`;
  s += `<g clip-path="url(#${id2})"><rect x="${x0}" y="${cy - hhh}" width="${g.k * sc + 2}" height="${hhh * 0.7}" fill="#fff" opacity=".32"/><rect x="${x0}" y="${cy + hhh * 0.4}" width="${g.k * sc + 2}" height="${hhh * 0.6}" fill="#000" opacity=".16"/></g>`;
  if (hex) s += `<path d="M${x0},${cy - hh * 0.577}H${xs}M${x0},${cy + hh * 0.577}H${xs}" stroke="${S}" stroke-width="1" opacity=".7"/>`;
  if (t !== 'hex') {
    const kh = (g.key * sc) / 2, kw = (t === 'socket' ? g.k * 0.55 : g.k * 0.7) * sc;
    s += `<rect x="${x0 + (t === 'socket' ? 2 : 1)}" y="${cy - kh}" width="${kw}" height="${kh * 2}" fill="none" stroke="${S}" stroke-width="1" stroke-dasharray="3 2" opacity=".75"/>`;
  }
  if (dims) {
    const yD = cy + hhh + 26;
    s += `<g font-family="IBM Plex Mono,monospace" font-size="11" text-anchor="middle">`;
    s += `<path d="M${xs},${cy + rd + 3}V${yD + 5}M${xe},${cy + rd + 3}V${yD + 5}" stroke="${D}" stroke-width="1"/>` + arrows(xs, xe, yD, D);
    s += `<text x="${(xs + xe) / 2}" y="${yD - 6}" fill="${T}">L = ${L} mm</text>`;
    s += `<text x="${(xs + xe) / 2}" y="${cy - rd - 9}" fill="${T}">${tl(t, d)}${t === 'wood' ? '' : ' × ' + p}</text>`;
    s += `<text x="${x0 + (g.k * sc) / 2}" y="${cy - hhh - 9}" fill="${D}">${hex ? 'AF ' + g.hw : 'Ø' + g.hw}</text></g>`;
  }
  return s;
}

function topInner(t: BoltType, d: number, mat: MatKey, H: number, D: string, T: string) {
  const g = GEO[t](d), F = MATFILL[mat], cx = 180, cy = H * 0.44, sc = (H * 0.5) / (g.hw * (t === 'hex' ? 1.155 : 1));
  const R = t === 'hex' ? (g.hw * sc) / 1.732 : (g.hw * sc) / 2;
  const hexPts = (r: number) => [0, 1, 2, 3, 4, 5].map((i) => `${(cx + r * Math.cos((i * Math.PI) / 3)).toFixed(1)},${(cy + r * Math.sin((i * Math.PI) / 3)).toFixed(1)}`).join(' ');
  let s = '';
  if (t === 'hex') s += `<polygon points="${hexPts(R)}" fill="${F}" stroke="${S}" stroke-width="1.6" stroke-linejoin="round"/><circle cx="${cx}" cy="${cy}" r="${R * 0.86}" fill="none" stroke="${S}" stroke-width="1" opacity=".6"/>`;
  else s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${F}" stroke="${S}" stroke-width="1.6"/>`;
  if (t === 'socket' || t === 'flat') s += `<polygon points="${hexPts((g.key * sc) / 1.732)}" fill="${mat === 'BK' ? '#14181B' : '#8E979D'}" stroke="${S}" stroke-width="1.2"/>`;
  if (t === 'wood') s += `<path d="M${cx - R * 0.5},${cy}H${cx + R * 0.5}M${cx},${cy - R * 0.5}V${cy + R * 0.5}" stroke="${S}" stroke-width="${R * 0.16}" stroke-linecap="round"/>`;
  const yy = cy + R + 24, x1 = cx - (g.hw * sc) / 2, x2 = cx + (g.hw * sc) / 2;
  s += `<g font-family="IBM Plex Mono,monospace" font-size="12" text-anchor="middle"><path d="M${x1},${yy - 8}V${yy + 4}M${x2},${yy - 8}V${yy + 4}" stroke="${D}"/>${arrows(x1, x2, yy - 2, D)}<text x="${cx}" y="${yy + 17}" fill="${T}">${t === 'hex' ? 'AF' : 'Ø'} ${g.hw} mm</text></g>`;
  return s;
}

function packInner(t: BoltType, mat: MatKey, d: number, L: number) {
  const ref = refOf(t, mat, d, L), n = packOf(t);
  return `<g transform="translate(9,-30) scale(.95)"><path d="M60,120L180,92L300,120L180,150z" fill="#D8B27A" stroke="${S}" stroke-width="1.4" stroke-linejoin="round"/><path d="M60,120V250L180,282V150z" fill="#C69A62" stroke="${S}" stroke-width="1.4" stroke-linejoin="round"/><path d="M300,120V250L180,282V150z" fill="#B58850" stroke="${S}" stroke-width="1.4" stroke-linejoin="round"/><path d="M165,112L195,102L215,110L185,120z" fill="#EFE3C8" opacity=".8"/>
  <path d="M76,170L164,194V252L76,228z" fill="#F4F1EA" stroke="${S}" stroke-width="1.2"/>
  <g font-family="IBM Plex Mono,monospace" fill="#1B1F23"><text x="84" y="190" font-size="8" font-weight="600" transform="rotate(16 84 190)">${ref}</text><text x="84" y="204" font-size="7" transform="rotate(16 84 204)">${tl(t, d)} × ${L}</text><text x="86" y="219" font-size="9" font-weight="700" transform="rotate(16 86 219)">${n} PCS</text></g></g>`;
}

/* ---------- other products ---------- */
const st = `stroke="${S}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"`;
const hexPoly = (cx: number, cy: number, r: number) => [0, 1, 2, 3, 4, 5].map((i) => `${(cx + r * Math.cos((i * Math.PI) / 3)).toFixed(1)},${(cy + r * Math.sin((i * Math.PI) / 3)).toFixed(1)}`).join(' ');

const OTHER: Record<string, (c: string | undefined, a: ArtSpec) => string> = {
  nut: (_c, a) => `<polygon points="${hexPoly(180, 110, 66)}" fill="${MATFILL[a.mat || 'A2']}" ${st}/><circle cx="180" cy="110" r="56" fill="none" stroke="${S}" opacity=".5"/><circle cx="180" cy="110" r="30" fill="var(--bg)" ${st}/><circle cx="180" cy="110" r="24" fill="none" stroke="${S}" stroke-dasharray="3 2" opacity=".7"/>`,
  washer: (_c, a) => `<circle cx="180" cy="110" r="72" fill="${MATFILL[a.mat || 'A2']}" ${st}/><circle cx="180" cy="110" r="64" fill="none" stroke="${S}" opacity=".35"/><circle cx="180" cy="110" r="32" fill="var(--bg)" ${st}/>`,
  anchor: (c) => {
    let r = '';
    for (let x = 96; x < 280; x += 18) r += `M${x},82v56`;
    const f = c || '#DAD6CA';
    return `<path d="M56,78H76V142H56z" fill="${f}" ${st}/><path d="M76,86H290L306,98V122L290,134H76z" fill="${f}" ${st}/><path d="${r}" stroke="${S}" opacity=".5" transform="translate(0 4)"/><path d="M76,110H250" stroke="${S}" stroke-dasharray="4 3" opacity=".7"/><rect x="76" y="86" width="228" height="20" fill="#fff" opacity=".3"/>`;
  },
  bits: (c) => {
    let s = '';
    const cols = c ? [c, '#F2B705', '#1F5FBF', '#0B7A6E'] : ['#F2B705', '#C9300C', '#1F5FBF', '#0B7A6E'];
    for (let i = 0; i < 4; i++) {
      const y = 48 + i * 30;
      s += `<rect x="56" y="${y}" width="150" height="14" fill="#B9C0C6" ${st}/><path d="M206,${y}L300,${y + 4}V${y + 10}L206,${y + 14}z" fill="#9AA3AA" ${st}/><rect x="118" y="${y}" width="16" height="14" fill="${cols[i]}" ${st}/>`;
    }
    return s;
  },
  tape: (c) => `<rect x="96" y="30" width="150" height="150" fill="${c || '#F2B705'}" ${st}/><rect x="108" y="42" width="126" height="126" fill="#101828" opacity=".12"/><circle cx="171" cy="105" r="42" fill="#1B1F23" ${st}/><circle cx="171" cy="105" r="14" fill="${c || '#F2B705'}"/><rect x="246" y="150" width="76" height="14" fill="#EEEEEE" ${st}/><path d="M322,146v26h-8v-26z" fill="#9AA3AA" ${st}/><path d="M256,150v6M266,150v10M276,150v6M286,150v10M296,150v6M306,150v10" stroke="${S}"/>`,
  locker: (c) => `<rect x="156" y="30" width="48" height="26" fill="#F2B705" ${st}/><rect x="164" y="56" width="32" height="18" fill="#C7CDD2" ${st}/><rect x="132" y="74" width="96" height="116" fill="${c || '#1F5FBF'}" ${st}/><rect x="142" y="104" width="76" height="56" fill="#F4F1EA" ${st}/><path d="M150,120h60M150,132h44M150,144h52" stroke="${S}" stroke-width="2"/>`,
  cartridge: (c) => `<rect x="60" y="76" width="190" height="68" fill="${c || '#1F5FBF'}" ${st}/><rect x="250" y="88" width="30" height="44" fill="#C7CDD2" ${st}/><path d="M280,98h40l8,12-8,12h-40z" fill="#E7ECF4" ${st}/><rect x="90" y="88" width="120" height="44" fill="#F4F1EA" ${st}/><path d="M100,104h90M100,118h60" stroke="${S}" stroke-width="2"/><rect x="40" y="82" width="20" height="56" fill="#9AA3AA" ${st}/>`,
  hammer: (c) => `<g transform="rotate(-28 180 110)"><rect x="168" y="62" width="24" height="150" fill="#C69A62" ${st}/><rect x="168" y="150" width="24" height="46" fill="${c || '#C9300C'}" ${st}/><path d="M122,62h118v26H122z" fill="#B9C0C6" ${st}/><path d="M122,62c-30,0-48,6-58,20l58,6z" fill="#B9C0C6" ${st}/><rect x="122" y="62" width="30" height="26" fill="#fff" opacity=".25"/></g>`,
  pliers: (c) => `<path d="M180,104L128,30l22-8,38,62z" fill="#B9C0C6" ${st}/><path d="M180,104L232,30l-22-8-38,62z" fill="#9AA3AA" ${st}/><path d="M176,104L126,194l-20-8,50-92z" fill="${c || '#C9300C'}" ${st}/><path d="M184,104L234,194l20-8-50-92z" fill="${c || '#C9300C'}" ${st}/><circle cx="180" cy="98" r="7" fill="#8E979D" ${st}/>`,
  wrench: (c) => `<rect x="30" y="96" width="220" height="28" fill="${c || '#C7CDD2'}" ${st}/><circle cx="278" cy="110" r="44" fill="${c || '#C7CDD2'}" ${st}/><path d="M278,92h70v36h-70z" fill="var(--bg)"/><path d="M278,92h56M278,128h56" stroke="${S}" stroke-width="1.5"/><circle cx="46" cy="110" r="7" fill="var(--bg)" ${st}/><rect x="30" y="96" width="220" height="9" fill="#fff" opacity=".3"/>`,
  level: (c) => `<rect x="28" y="84" width="304" height="52" fill="${c || '#F2B705'}" ${st}/><rect x="150" y="96" width="60" height="28" fill="#E1EAF8" ${st}/><path d="M162,110h36" stroke="${S}"/><ellipse cx="180" cy="110" rx="9" ry="5" fill="#9CE0A3" ${st}/><circle cx="70" cy="110" r="14" fill="#E1EAF8" ${st}/><circle cx="290" cy="110" r="14" fill="#E1EAF8" ${st}/><rect x="28" y="84" width="304" height="10" fill="#fff" opacity=".28"/>`,
  drill: (c) => `<path d="M60,58h150a24 24 0 0 1 24 24v26H60z" fill="${c || '#1F5FBF'}" ${st}/><rect x="234" y="72" width="40" height="28" fill="#9AA3AA" ${st}/><path d="M274,80h56v12h-56z" fill="#C7CDD2" ${st}/><path d="M120,108l-16,70h44l14-70z" fill="#2A3036" ${st}/><rect x="88" y="178" width="84" height="26" fill="${c ? '#2A3036' : '#F2B705'}" ${st}/><circle cx="96" cy="82" r="10" fill="#101828" opacity=".25"/><rect x="60" y="58" width="150" height="10" fill="#fff" opacity=".25"/>`,
  grinder: (c) => `<rect x="60" y="82" width="190" height="44" rx="2" fill="${c || '#1F5FBF'}" ${st}/><rect x="250" y="94" width="34" height="20" fill="#9AA3AA" ${st}/><ellipse cx="300" cy="104" rx="14" ry="68" fill="#C7CDD2" ${st}/><ellipse cx="300" cy="104" rx="5" ry="22" fill="#9AA3AA" ${st}/><path d="M60,126h-22l-6-18" fill="none" ${st}/><rect x="60" y="82" width="190" height="10" fill="#fff" opacity=".25"/>`,
  helmet: (c) => `<path d="M64,150a116 116 0 0 1 232 0z" fill="${c || '#F2B705'}" stroke="${S}" stroke-width="1.5" stroke-linejoin="round"/><rect x="44" y="150" width="272" height="16" fill="${c || '#F2B705'}" ${st}/><path d="M150,40v40M210,40v40M180,34v110" stroke="${S}" stroke-width="1.2" opacity=".5"/><rect x="150" y="34" width="60" height="14" fill="#fff" opacity=".25"/><path d="M90,166v14h180v-14" fill="none" stroke="${S}" stroke-dasharray="4 3" opacity=".6"/>`,
  glasses: (c) => `<path d="M30,92c40-14 80-14 100 0l-6 52c-24 12-70 6-86-16z" fill="${c || '#BBD7FA'}" fill-opacity=".55" ${st}/><path d="M330,92c-40-14-80-14-100 0l6 52c24 12 70 6 86-16z" fill="${c || '#BBD7FA'}" fill-opacity=".55" ${st}/><path d="M130,100c30-12 70-12 100 0" fill="none" ${st}/><path d="M30,92l-12-8M330,92l12-8" ${st}/>`,
  gloves: (c) => `<path d="M110,200v-70l-32-46c-6-10 6-20 14-12l28 30v-60c0-12 18-12 18 0v50-60c0-12 18-12 18 0v60-48c0-12 18-12 18 0v62-34c0-12 18-12 18 0v78c0 40-16 70-50 70z" fill="${c || '#2A3036'}" ${st}/><path d="M118,170h92" stroke="#fff" opacity=".35"/><path d="M150,92v40M168,92v40M186,92v40" stroke="#fff" opacity=".3"/>`,
  mask: (c) => `<path d="M60,70c70-30 170-30 240 0 16 46-12 100-120 116C72,170 44,116 60,70z" fill="${c || '#F4F1EA'}" ${st}/><path d="M60,70C20,60 12,108 30,128M300,70c40-10 48 38 30 58" fill="none" stroke="${S}" stroke-width="2"/><circle cx="180" cy="124" r="22" fill="#E8761B" ${st}/><path d="M168,124h24M180,112v24" stroke="${S}" opacity=".6"/><path d="M96,92c50-18 118-18 168 0" fill="none" stroke="${S}" opacity=".35"/>`,
  padlock: (c) => `<path d="M122,102V76a58 58 0 0 1 116 0v26" fill="none" stroke="#9AA3AA" stroke-width="16" stroke-linecap="round"/><path d="M122,102V76a58 58 0 0 1 116 0v26" fill="none" stroke="${S}" stroke-width="1.5"/><rect x="92" y="100" width="176" height="104" fill="${c || '#E3B73B'}" ${st}/><circle cx="180" cy="144" r="14" fill="#14181B" ${st}/><path d="M174,148h12l4 26h-20z" fill="#14181B"/><rect x="92" y="100" width="176" height="18" fill="#fff" opacity=".28"/>`,
  hinge: (c) => `<rect x="62" y="40" width="108" height="130" fill="${c || '#C7CDD2'}" ${st}/><rect x="190" y="40" width="108" height="130" fill="${c || '#C7CDD2'}" ${st}/><rect x="164" y="34" width="32" height="142" rx="12" fill="${c || '#B9C0C6'}" ${st}/><g fill="var(--bg)" ${st}><circle cx="100" cy="72" r="8"/><circle cx="100" cy="138" r="8"/><circle cx="260" cy="72" r="8"/><circle cx="260" cy="138" r="8"/><circle cx="130" cy="105" r="8"/><circle cx="230" cy="105" r="8"/></g>`,
  disc: (c) => `<circle cx="180" cy="110" r="84" fill="${c || '#1F5FBF'}" ${st}/><circle cx="180" cy="110" r="70" fill="none" stroke="#fff" opacity=".4"/><circle cx="180" cy="110" r="22" fill="var(--bg)" ${st}/><circle cx="180" cy="110" r="36" fill="none" stroke="${S}" stroke-dasharray="3 3" opacity=".6"/><path d="M180,26v30M180,164v30M96,110h30M234,110h30" stroke="${S}" opacity=".35"/>`,
  sheet: (c) => `<path d="M96,40h168v140H96z" fill="${c || '#D8B27A'}" ${st}/><path d="M112,28h168v140" fill="none" ${st} opacity=".7"/><g fill="${S}" opacity=".5">${Array.from({ length: 40 }, (_, i) => `<circle cx="${112 + (i % 8) * 20}" cy="${58 + Math.floor(i / 8) * 24}" r="1.6"/>`).join('')}</g>`,
  cable: (c) => {
    let teeth = '';
    for (let x = 90; x < 270; x += 8) teeth += `M${x},92v-8`;
    return `<rect x="70" y="92" width="210" height="14" fill="${c || '#2A3036'}" ${st}/><path d="${teeth}" stroke="${S}" opacity=".8"/><rect x="266" y="76" width="40" height="46" fill="${c || '#2A3036'}" ${st}/><rect x="276" y="92" width="20" height="14" fill="var(--bg)" ${st}/><path d="M70,106 q-40 40 20 60 q60 16 120-4" fill="none" stroke="${c || '#2A3036'}" stroke-width="12" stroke-linecap="round" opacity=".5"/>`;
  },
  connector: (c) => `<rect x="60" y="70" width="240" height="74" rx="4" fill="${c || '#E7ECF4'}" ${st}/><rect x="60" y="70" width="240" height="20" fill="#fff" opacity=".4"/><g fill="#F2B705" ${st}><rect x="84" y="46" width="48" height="26"/><rect x="156" y="46" width="48" height="26"/><rect x="228" y="46" width="48" height="26"/></g><g fill="#B9C0C6" ${st}><rect x="40" y="96" width="24" height="12"/><rect x="40" y="116" width="24" height="12"/><rect x="296" y="96" width="24" height="12"/></g>`,
  outlet: (c) => `<rect x="90" y="30" width="180" height="160" rx="6" fill="${c || '#F4F1EA'}" ${st}/><circle cx="180" cy="110" r="58" fill="none" ${st}/><circle cx="180" cy="110" r="52" fill="#E7ECF4" stroke="${S}" opacity=".9"/><circle cx="158" cy="110" r="8" fill="#14181B"/><circle cx="202" cy="110" r="8" fill="#14181B"/><rect x="172" y="50" width="16" height="10" fill="#9AA3AA" ${st}/><rect x="172" y="160" width="16" height="10" fill="#9AA3AA" ${st}/><circle cx="110" cy="48" r="4" fill="#9AA3AA" ${st}/><circle cx="250" cy="172" r="4" fill="#9AA3AA" ${st}/>`,
};

export function artSVG(art: ArtSpec, o: ArtOpts = {}, label = 'Product drawing'): string {
  const H = o.H || 220;
  if (art.kind === 'bolt' && art.t && art.mat && art.d && art.L) {
    if (o.view === 'top') return wrap(topInner(art.t, art.d, art.mat, H, o.dc || 'var(--ink-2)', o.tc || 'var(--ink)'), H, 'Head view of ' + label);
    if (o.view === 'pack') return wrap(packInner(art.t, art.mat, art.d, art.L), H, 'Box of ' + label);
    return wrap(boltInner(art.t, art.d, art.L, art.mat, { ...o, H }), H, label);
  }
  const fn = OTHER[art.kind] || OTHER.washer;
  return wrap(fn(art.color, art), H, label, (H - 220) / 2);
}

export const BOLT_TYPES = TYPES;
