import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '../context/ThemeContext';

export const metadata: Metadata = {
  title: 'EchoLet — Workshop Registration & Reliable Notification System',
  description: 'Production-grade workshop registration and guaranteed outbox delivery system',
};

const themeScript = `
  (function() {
    try {
      var saved = localStorage.getItem('echolet_theme');
      var isDark = saved === 'dark' || (saved === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      var savedBrightness = localStorage.getItem('echolet_brightness');
      if (savedBrightness) {
        document.documentElement.style.setProperty('--brightness', savedBrightness);
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-foreground selection:text-background">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
