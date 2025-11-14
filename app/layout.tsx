import type { Metadata } from 'next'
import { Open_Sans, Montserrat } from 'next/font/google'
import './globals.css'
import './styles/animations.css'

// Open Sans - fonte moderna, legível e versátil para corpo e UI
const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-open-sans',
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
})

// Montserrat - fonte para headings e títulos
const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: ['500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SwiftEDU - Login',
  description: 'Sistema de Gestão de Aprendizagem',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
}

import { ThemeProvider } from './contexts/ThemeContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { ToastProvider } from './components/Toast'
import PremiumToastProvider from './components/ui/ToastProvider'
import { AuthProvider } from './providers/AuthProvider'
import PerfMetrics from './components/PerfMetrics'
import InactivityLogout from './components/InactivityLogout'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={`${openSans.variable} ${montserrat.variable} font-open-sans`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus-ring fixed top-2 left-2 z-[9999] bg-navy-900 text-gold-100 px-3 py-2 rounded-md"
        >
          Pular para o conteúdo
        </a>
        <AuthProvider>
          <ThemeProvider>
            <LanguageProvider>
              <ToastProvider>
                <PremiumToastProvider />
                <InactivityLogout />
                <main id="main-content">
                  {children}
                </main>
                {/* Performance metrics (LCP/CLS) in dev tools */}
                <PerfMetrics />
              </ToastProvider>
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
