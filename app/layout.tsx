import type { Metadata } from 'next'
import { Merriweather, Roboto, Work_Sans } from 'next/font/google'
import './globals.css'

// Merriweather para títulos - fonte serifada elegante e acadêmica
const merriweather = Merriweather({ 
  subsets: ['latin'],
  variable: '--font-merriweather',
  weight: ['300', '400', '700', '900']
})

// Roboto para corpo do texto - fonte altamente legível e profissional
const roboto = Roboto({ 
  subsets: ['latin'],
  variable: '--font-roboto',
  weight: ['300', '400', '500', '700', '900']
})

// Work Sans para elementos UI - fonte moderna e versátil
const workSans = Work_Sans({ 
  subsets: ['latin'],
  variable: '--font-work-sans',
  weight: ['300', '400', '500', '600', '700', '800', '900']
})

export const metadata: Metadata = {
  title: 'SwiftEDU - Login',
  description: 'Sistema de Gestão de Aprendizagem',
  icons: {
    icon: '/favicon.ico',
  },
}

import { ThemeProvider } from './contexts/ThemeContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { ToastProvider } from './components/Toast'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={`${merriweather.variable} ${roboto.variable} ${workSans.variable}`}>
        <ThemeProvider>
          <LanguageProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}