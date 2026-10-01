import type { ReactNode } from 'react';
import './globals.css';

export const metadata = { title: 'Jev issue triage' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="bg-base-200 min-h-screen">{children}</body>
    </html>
  );
}
