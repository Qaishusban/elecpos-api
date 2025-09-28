import './globals.css';
import Navbar from '@/components/Navbar';
import { LangProvider, useLang } from '@/context/LangContext';
import { Cairo, Inter } from 'next/font/google';

const cairo = Cairo({ subsets: ['arabic'], weight: ['400','600','700'], variable: '--font-cairo' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

function BodyWrap({ children }: { children: React.ReactNode }) {
  const { lang } = useLang();
  return (
    <html lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <body className={`${cairo.variable} ${inter.variable} min-h-screen bg-gradient-to-br from-slate-50 to-slate-100`}>
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(600px_400px_at_90%_0%,rgba(99,102,241,0.12),transparent_60%)]" />
        <Navbar />
        <main className="container py-6 sm:py-8">{children}</main>
      </body>
    </html>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <LangProvider>
      <BodyWrap>{children}</BodyWrap>
    </LangProvider>
  );
}
