import type { Metadata } from 'next'
import { Playfair_Display, Inter, Poppins } from 'next/font/google'
import './globals.css'

// Playfair Display para títulos - fonte elegante e sofisticada
const playfair = Playfair_Display({ 
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['400', '500', '600', '700', '800', '900']
})

// Inter para corpo do texto - fonte moderna e altamente legível
const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700']
})

// Poppins para elementos UI - fonte clean e profissional
const poppins = Poppins({ 
  subsets: ['latin'],
  variable: '--font-poppins',
  weight: ['300', '400', '500', '600', '700']
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
      <body className={`${playfair.variable} ${inter.variable} ${poppins.variable}`}>
        <ThemeProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}