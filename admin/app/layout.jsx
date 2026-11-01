import './globals.css';
import { Public_Sans } from 'next/font/google';

const font = Public_Sans({ subsets: ['latin'], display: 'swap' });

export const metadata = { title: 'RK Travel Hub – Admin', robots: { index: false, follow: false } };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={font.className}>{children}</body>
    </html>
  );
}
