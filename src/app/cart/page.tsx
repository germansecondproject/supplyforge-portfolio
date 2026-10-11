import type { Metadata } from 'next';
import CartView from '@/components/CartView';
import ProductCard from '@/components/ProductCard';
import { getProductsBySku } from '@/lib/catalog';
import { CART_EXTRAS, buyable } from '@/lib/query';

export const metadata: Metadata = { title: 'Basket and checkout' };

export default async function Page() {
  const extras = (await getProductsBySku(CART_EXTRAS)).filter(buyable);
  const cards: Record<string, React.ReactNode> = {};
  extras.forEach((p) => { cards[p.ref] = <ProductCard p={p} />; });
  return <CartView recRefs={extras.map((p) => p.ref)} recCards={cards} />;
}
