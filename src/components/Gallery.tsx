'use client';

import { useState } from 'react';

export interface GalleryView { label: string; svg: string }

export default function Gallery({ views, facts }: { views: GalleryView[]; facts: [string, string][] }) {
  const [i, setI] = useState(0);
  return (
    <div className="gal">
      <div className="bp">
        <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: views[i].svg }} />
        <span className="cap">{views[i].label}</span>
      </div>
      {views.length > 1 && (
        <div className="thumbs" role="group" aria-label="Product views">
          {views.map((v, n) => (
            <button key={v.label} type="button" className="thumb" aria-pressed={n === i} aria-label={v.label} onClick={() => setI(n)}
              dangerouslySetInnerHTML={{ __html: v.svg.replace('<svg ', '<svg aria-hidden="true" ').replace(/role="img"/, '').replace(/<text[\s\S]*?<\/text>/g, '') }} />
          ))}
        </div>
      )}
      <div className="gal-facts">{facts.map(([k, v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}</div>
      <div className="gal-note"><svg width="18" height="18" aria-hidden="true"><use href="#i-check" /></svg><span>Technical drawing generated from catalogue data. Dimensions in mm.</span></div>
    </div>
  );
}
