import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '../context/ThemeContext';

export const metadata: Metadata = {
  title: 'EchoLet — Workshop Registration & Reliable Notification System',
  description: 'Production-Quality Transactional Outbox Workshop Registration System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-foreground selection:text-background">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
