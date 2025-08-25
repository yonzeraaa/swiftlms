import type { Metadata } from 'next'
import { Open_Sans } from 'next/font/google'
import './globals.css'
import './styles/animations.css'

// Open Sans - fonte moderna, legível e versátil para todo o sistema
const openSans = Open_Sans({ 
  subsets: ['latin'],
  variable: '--font-open-sans',
  weight: ['300', '400', '500', '600', '700', '800'],
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={`${openSans.variable} font-open-sans`}>
        <ThemeProvider>
          <LanguageProvider>
            <ToastProvider>
              <PremiumToastProvider />
              {children}
            </ToastProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}