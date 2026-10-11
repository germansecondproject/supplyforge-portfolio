import type { Metadata } from 'next';
import ListsView from '@/components/ListsView';

export const metadata: Metadata = { title: 'Saved lists' };

export default function Page() {
  return <div className="wrap" style={{ paddingBlock: '32px 48px' }}><ListsView /></div>;
}
