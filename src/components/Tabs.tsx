'use client';

import { useState } from 'react';

export interface TabDef { id: string; label: string; content: React.ReactNode }

export default function Tabs({ tabs, label }: { tabs: TabDef[]; label: string }) {
  const [cur, setCur] = useState(tabs[0].id);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = tabs.findIndex((t) => t.id === cur);
    const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    setCur(n.id);
    document.getElementById('t-' + n.id)?.focus();
  };
  return (
    <>
      <div className="tabs" role="tablist" aria-label={label} onKeyDown={onKey}>
        {tabs.map((t) => (
          <button key={t.id} className="tab" role="tab" id={'t-' + t.id} aria-controls={'p-' + t.id} aria-selected={cur === t.id} tabIndex={cur === t.id ? 0 : -1} onClick={() => setCur(t.id)}>{t.label}</button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} className="tabpanel" role="tabpanel" id={'p-' + t.id} aria-labelledby={'t-' + t.id} hidden={cur !== t.id}>{t.content}</div>
      ))}
    </>
  );
}
