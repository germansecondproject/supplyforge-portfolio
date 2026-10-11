import type { Metadata, Viewport } from 'next';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import './globals.css';
import Providers from '@/components/Providers';
import AuthProvider from '@/components/Auth';
import Sprites from '@/components/Sprites';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getTaxonomy } from '@/lib/catalog';

export const metadata: Metadata = {
  title: { default: 'SupplyForge · Fasteners, fixings and tools', template: '%s · SupplyForge' },
  description: 'Portfolio e-commerce for fasteners, anchors and tools, with a Home & DIY mode and a Business mode.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0F2547' };

// Applies saved theme and mode before first paint to avoid a flash.
const boot = `try{var d=document.documentElement,t=localStorage.getItem('roscado.theme');if(t)d.setAttribute('data-theme',t);d.dataset.mode=localStorage.getItem('roscado.mode')==='biz'?'biz':'diy'}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { categories } = await getTaxonomy();
  return (
    <html lang="en" data-mode="diy" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: boot }} /></head>
      <body>
        <Sprites />
        <Providers>
          <AuthProvider>
            <Header categories={categories} />
            <main id="content">{children}</main>
            <Footer categories={categories} />
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
