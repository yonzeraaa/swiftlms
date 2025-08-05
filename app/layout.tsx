import type { Metadata } from 'next'
import { Cinzel, Crimson_Text } from 'next/font/google'
import './globals.css'

// Cinzel para títulos - fonte inspirada em inscrições romanas clássicas, evoca autoridade naval
const cinzel = Cinzel({ 
  subsets: ['latin'],
  variable: '--font-cinzel',
  weight: ['400', '500', '600', '700']
})

// Crimson Text para corpo - fonte serifada elegante e legível
const crimsonText = Crimson_Text({ 
  subsets: ['latin'],
  variable: '--font-crimson',
  weight: ['400', '600', '700']
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={`${cinzel.variable} ${crimsonText.variable}`}>
        <ThemeProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}