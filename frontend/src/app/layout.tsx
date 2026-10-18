import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';

export const metadata: Metadata = {
  title: 'EchoLet — Workshop Registration & Reliable Notification System',
  description: 'Production-grade workshop registration and guaranteed outbox delivery system',
  icons: {
    icon: '/icon.svg',
  },
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
      var brightness = 1.0;
      if (savedBrightness) {
        var parsed = parseFloat(savedBrightness);
        if (!isNaN(parsed) && parsed >= 0.9 && parsed <= 1.1) {
          brightness = parsed;
        }
      }
      var offsetPercent = ((brightness - 1.0) * 40).toFixed(1);
      document.documentElement.style.setProperty('--surface-offset', offsetPercent + '%');
      document.documentElement.style.setProperty('--brightness-value', brightness.toString());
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
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
