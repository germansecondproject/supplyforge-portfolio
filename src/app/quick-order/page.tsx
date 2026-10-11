import type { Metadata } from 'next';
import QuickOrder from '@/components/QuickOrder';

export const metadata: Metadata = { title: 'Quick order' };

export default function Page() {
  return <div style={{ paddingTop: 32 }}><QuickOrder id="quick-order" /></div>;
}
