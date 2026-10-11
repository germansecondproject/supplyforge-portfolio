/* Technical guides linked from the home page. Plain data so the index and each article share it. */

export interface Guide {
  slug: string;
  tag: string;
  title: string;
  summary: string;
  minutes: number;
  sections: { h: string; p: string[]; table?: { head: string[]; rows: string[][] } }[];
  shop: { label: string; href: string }[];
}

export const GUIDES: Guide[] = [
  {
    slug: 'a2-or-a4-stainless',
    tag: 'Fasteners',
    title: 'A2 or A4 stainless: when is the extra cost worth it?',
    summary: 'Coastal air, pools and commercial kitchens. What corrodes what.',
    minutes: 4,
    sections: [
      {
        h: 'The short answer',
        p: [
          'A2 (304) stainless is right for almost everything indoors and for outdoor work inland. A4 (316) adds molybdenum, which resists chlorides: salt air, de-icing salt, pool water and cleaning chemicals. If chlorides reach the screw, pay for A4.',
        ],
      },
      {
        h: 'Where each grade belongs',
        p: ['Both grades have the same strength class (A2-70 and A4-70), so the choice is only about corrosion.'],
        table: {
          head: ['Location', 'Grade'],
          rows: [
            ['Indoors, dry', 'A2, or zinc-plated steel'],
            ['Outdoors, inland', 'A2'],
            ['Within 5 km of the sea', 'A4'],
            ['Swimming pools, spas', 'A4 (never above the water inside the pool hall)'],
            ['Commercial kitchens, food plants', 'A4'],
            ['Roads with de-icing salt', 'A4'],
          ],
        },
      },
      {
        h: 'Do not mix metals',
        p: [
          'Stainless screws in aluminium or galvanised steel can cause galvanic corrosion when water sits on the joint. Use nylon washers to separate them, or choose hot-dip galvanised fasteners for galvanised structures.',
        ],
      },
    ],
    shop: [
      { label: 'A2 hex bolts', href: '/c/fasteners?sub=hex-bolts&mat=A2' },
      { label: 'A4 hex bolts', href: '/c/fasteners?sub=hex-bolts&mat=A4' },
      { label: 'Washers', href: '/c/fasteners?sub=washers' },
    ],
  },
  {
    slug: 'anchor-by-wall-type',
    tag: 'Anchors',
    title: 'Nylon, metal or chemical anchor, by wall type',
    summary: 'Hollow brick, concrete and plasterboard, with a load table.',
    minutes: 5,
    sections: [
      {
        h: 'Start with the wall',
        p: [
          'Tap the wall and drill a test hole. Grey dust that gets harder as you go is concrete; red dust with sudden drops is hollow brick; white powder that gives way after a few millimetres is plasterboard.',
        ],
      },
      {
        h: 'Which anchor for which wall',
        p: ['Loads are a guide for one anchor in good condition, with a safety margin. For anything overhead or carrying people, use the manufacturer’s data and a professional.'],
        table: {
          head: ['Wall', 'Anchor', 'Typical safe load'],
          rows: [
            ['Concrete', 'Nylon plug 8 mm', '25 kg'],
            ['Concrete', 'Through bolt M10', '300 kg'],
            ['Solid brick', 'Nylon plug 8 mm', '20 kg'],
            ['Hollow brick', 'Long frame anchor or chemical anchor with sleeve', '40–120 kg'],
            ['Plasterboard', 'Metal cavity anchor', '15 kg'],
            ['Plasterboard', 'Nylon self-drill plug', '5 kg'],
          ],
        },
      },
      {
        h: 'Chemical anchors',
        p: [
          'Resin fills the cavities of hollow brick and bonds to concrete without expansion stress, so it works close to edges. Use a mesh sleeve in hollow walls, clean the hole with a brush and pump, and respect the curing time on the cartridge before loading.',
        ],
      },
    ],
    shop: [
      { label: 'Wall plugs', href: '/c/anchors?sub=wall-plugs' },
      { label: 'Frame anchors', href: '/c/anchors?sub=frame-anchors' },
      { label: 'Chemical fixings', href: '/c/anchors?sub=chemical-fixings' },
    ],
  },
  {
    slug: 'din-933-vs-din-931',
    tag: 'Standards',
    title: 'DIN 933 vs DIN 931: it comes down to the thread',
    summary: 'Full or partial thread, and how it changes the joint.',
    minutes: 3,
    sections: [
      {
        h: 'Same head, different shank',
        p: [
          'Both are hexagon head bolts with the same head sizes and strength classes. DIN 933 (ISO 4017) is threaded all the way to the head. DIN 931 (ISO 4014) has a plain shank under the head and thread only near the end.',
        ],
      },
      {
        h: 'When to use each',
        p: [
          'Use DIN 931 when the bolt works in shear across the joint, such as brackets, hinges and steel connections: the smooth shank sits in the hole and bears the load. Use DIN 933 when the bolt clamps parts together or screws into a tapped hole, and when the grip length varies.',
        ],
        table: {
          head: ['', 'DIN 933', 'DIN 931'],
          rows: [
            ['Thread', 'Full length', 'Partial (about 2 × d + 6 mm)'],
            ['Best for', 'Clamping, tapped holes', 'Shear joints, pivots'],
            ['ISO equivalent', 'ISO 4017', 'ISO 4014'],
          ],
        },
      },
      {
        h: 'Reading the part number',
        p: ['In this shop the part number tells you everything: SF-933-A2-8x40 is a DIN 933 bolt in A2 stainless, M8, 40 mm long. Paste it in Quick order to check stock straight away.'],
      },
    ],
    shop: [
      { label: 'Hex bolts DIN 933 and 931', href: '/c/fasteners?sub=hex-bolts' },
      { label: 'Nuts', href: '/c/fasteners?sub=nuts' },
      { label: 'Quick order', href: '/quick-order' },
    ],
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug) ?? null;
