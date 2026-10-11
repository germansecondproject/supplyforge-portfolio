'use client';

export default function ThemeButton() {
  return (
    <button
      className="hact"
      type="button"
      style={{ flexDirection: 'row', gap: 8, minHeight: 44 }}
      onClick={() => {
        const r = document.documentElement;
        const cur = r.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        const next = cur === 'dark' ? 'light' : 'dark';
        r.setAttribute('data-theme', next);
        try { localStorage.setItem('roscado.theme', next); } catch { /* ignore */ }
      }}
    >
      <svg aria-hidden="true"><use href="#i-sun" /></svg>
      <span style={{ display: 'inline' }}>Light / dark theme</span>
    </button>
  );
}
