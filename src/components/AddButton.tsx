'use client';

import { useShop } from './Providers';
import type { CartLine } from '@/lib/types';

/** Takes a ready-made basket line rather than the product, so listings send a few fields per card to the browser, not whole products. */
export default function AddButton({ line, unavailable, out, className = 'btn btn-primary', label = 'Add to basket', icon = true }: { line: CartLine; unavailable: boolean; out: boolean; className?: string; label?: string; icon?: boolean }) {
  const { addLine, toast } = useShop();
  return (
    <button
      className={className}
      type="button"
      disabled={out}
      aria-label={`${label}: ${line.name}`}
      onClick={() => { addLine(line); toast(`Added: ${line.name}`, true); }}
    >
      <span>{unavailable ? 'Not available' : out ? 'Out of stock' : label}</span>
      {icon && !out && <svg width="20" height="20" aria-hidden="true"><use href="#i-cart" /></svg>}
    </button>
  );
}
