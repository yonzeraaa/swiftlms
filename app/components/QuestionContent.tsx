'use client'

import { useState } from 'react'
import { Image as ImageIcon, AlertCircle, ExternalLink } from 'lucide-react'
import MathFormula from './MathFormula'

interface QuestionContentProps {
  text: string
  imageUrl?: string | null
  hasFormula?: boolean | null
  className?: string
}

export default function QuestionContent({ 
  text, 
  imageUrl, 
  hasFormula = false, 
  className = '' 
}: QuestionContentProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  
  // Validar URL da imagem
  const isValidImageUrl = imageUrl && 
    typeof imageUrl === 'string' && 
    imageUrl.length > 10 && 
    (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))
  
  // Log para debug
  if (imageUrl && !isValidImageUrl) {
    console.warn('Invalid image URL:', imageUrl)
  } else if (isValidImageUrl) {
    console.log('QuestionContent rendering image:', imageUrl)
  }

  // Renderizar texto com suporte a fórmulas
  const renderText = () => {
    if (hasFormula) {
      return <MathFormula content={text} className="text-gold-100" />
    }
    return <span className="text-gold-100">{text}</span>
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Texto da questão */}
      <div>{renderText()}</div>

      {/* Imagem da questão */}
      {isValidImageUrl && (
        <div className="mt-3">
          {imageError ? (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-400 font-medium">Erro ao carregar imagem</p>
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-300 text-sm hover:text-red-200 inline-flex items-center gap-1 mt-1"
                >
                  Abrir em nova aba
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ) : (
            <div className="relative rounded-lg overflow-hidden bg-navy-900/50 border border-gold-500/20">
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-navy-900/80">
                  <div className="flex flex-col items-center gap-2">
                    <ImageIcon className="w-8 h-8 text-gold-400 animate-pulse" />
                    <span className="text-gold-300 text-sm">Carregando imagem...</span>
                  </div>
                </div>
              )}
              <img
                src={imageUrl}
                alt="Imagem da questão"
                className="max-w-full h-auto object-contain"
                style={{ maxHeight: '500px' }}
                loading="lazy"
                onError={(e) => {
                  console.error('Image load error - Full URL:', imageUrl)
                  console.error('Error details:', e)
                  setImageError(true)
                  setImageLoading(false)
                }}
                onLoad={() => {
                  console.log('Image loaded successfully:', imageUrl)
                  setImageLoading(false)
                }}
              />
              {!imageLoading && !imageError && (
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-2 right-2 p-2 bg-navy-900/80 rounded-lg text-gold-400 hover:text-gold-200 transition-colors"
                  title="Abrir em tamanho completo"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}