'use client';

import { useShop } from './Providers';
import { IVA } from '@/lib/standards';
import { eur, n3 } from '@/lib/pricing';

/** Shows an ex-VAT amount as ex or inc VAT depending on the header toggle. */
export function Price({ value, digits3 = false }: { value: number; digits3?: boolean }) {
  const { vat } = useShop();
  const v = vat ? value * (1 + IVA) : value;
  return <>{digits3 ? n3.format(v) : eur(v)}</>;
}

export function VatLabel() {
  const { vat } = useShop();
  return <>{vat ? 'inc VAT' : 'ex VAT'}</>;
}
