import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';

// Font setup
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-poppins',
});

// Metadata setup
export const metadata: Metadata = {
  title: 'StoreIt',
  description: 'StoreIt - The best storage solution for you.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} font-poppins antialiased`}>
        {children}
      </body>
    </html>
  );
}
