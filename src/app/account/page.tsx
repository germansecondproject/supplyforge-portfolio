import type { Metadata } from 'next';
import AccountView from '@/components/AccountView';

export const metadata: Metadata = { title: 'Your account' };

export default function Page() {
  return (
    <div className="wrap" style={{ paddingBlock: '32px 48px' }}>
      <h1 style={{ marginBottom: 20 }}>Your account</h1>
      <AccountView />
    </div>
  );
}
