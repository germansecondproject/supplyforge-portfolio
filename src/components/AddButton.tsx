'use client';

import { useShop } from './Providers';
import { toLine } from '@/lib/pricing';
import { buyable } from '@/lib/query';
import type { Product } from '@/lib/types';

export default function AddButton({ p, qty = 1, className = 'btn btn-primary', label = 'Add to basket', icon = true }: { p: Product; qty?: number; className?: string; label?: string; icon?: boolean }) {
  const { addLine, toast } = useShop();
  const out = !buyable(p);
  return (
    <button
      className={className}
      type="button"
      disabled={out}
      aria-label={`${label}: ${p.name}`}
      onClick={() => { addLine(toLine(p, qty)); toast(`Added: ${p.name}`, true); }}
    >
      <span>{p.unavailable ? 'Not available' : out ? 'Out of stock' : label}</span>
      {icon && !out && <svg width="20" height="20" aria-hidden="true"><use href="#i-cart" /></svg>}
    </button>
  );
}
