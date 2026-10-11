import type { Metadata } from 'next';
import CartView from '@/components/CartView';
import ProductCard from '@/components/ProductCard';
import { getCatalog } from '@/lib/catalog';
import { CART_EXTRAS, buyable } from '@/lib/query';

export const metadata: Metadata = { title: 'Basket and checkout' };

export default async function Page() {
  const { products } = await getCatalog();
  const extras = CART_EXTRAS.map((r) => products.find((p) => p.ref === r)).filter((p) => p && buyable(p));
  const cards: Record<string, React.ReactNode> = {};
  extras.forEach((p) => { cards[p!.ref] = <ProductCard p={p!} />; });
  return <CartView recRefs={extras.map((p) => p!.ref)} recCards={cards} />;
}
