import "./globals.css";
import Navbar from "@/components/Navbar";
import { LangProvider } from "@/context/LangContext";
import { Cairo, Inter } from "next/font/google";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400","600","700"], variable: "--font-cairo" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "ElecPOS",
  description: "Simple POS & Accounting",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={[
          cairo.variable,
          inter.variable,
          "min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900 antialiased"
        ].join(" ")}
      >
        {/* خلفية ناعمة */}
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(600px_400px_at_90%_0%,rgba(99,102,241,0.12),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(700px_500px_at_10%_100%,rgba(14,165,233,0.10),transparent_60%)]" />
        </div>

        <LangProvider>
          <Navbar />
          <main className="container mx-auto max-w-7xl px-4 py-8">
            {children}
          </main>
        </LangProvider>
      </body>
    </html>
  );
}
