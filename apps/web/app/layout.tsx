import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Synapse — AI Virtual Office',
  description: 'Watch AI agents collaborate in real time',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
