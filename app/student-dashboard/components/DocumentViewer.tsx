'use client'

import { useState, useRef, useEffect } from 'react'
import { FileText, Download, Maximize, X, ExternalLink, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface DocumentViewerProps {
  url: string
  title?: string
  onComplete?: () => void
}

export default function DocumentViewer({ url, title, onComplete }: DocumentViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Detectar tipo de documento e converter URLs para visualização embutida
  const getEmbedUrl = (originalUrl: string) => {
    // Google Drive
    if (originalUrl.includes('drive.google.com') || originalUrl.includes('docs.google.com')) {
      // Extrair ID do documento
      let docId = ''
      
      // Para links de documentos do Google
      if (originalUrl.includes('/document/d/')) {
        docId = originalUrl.split('/document/d/')[1].split('/')[0]
        return `https://docs.google.com/document/d/${docId}/preview`
      }
      // Para links de apresentações
      else if (originalUrl.includes('/presentation/d/')) {
        docId = originalUrl.split('/presentation/d/')[1].split('/')[0]
        return `https://docs.google.com/presentation/d/${docId}/embed`
      }
      // Para links de planilhas
      else if (originalUrl.includes('/spreadsheets/d/')) {
        docId = originalUrl.split('/spreadsheets/d/')[1].split('/')[0]
        return `https://docs.google.com/spreadsheets/d/${docId}/preview`
      }
      // Para links de Google Drive genéricos
      else if (originalUrl.includes('/file/d/')) {
        docId = originalUrl.split('/file/d/')[1].split('/')[0]
        return `https://drive.google.com/file/d/${docId}/preview`
      }
    }
    
    // OneDrive / SharePoint
    if (originalUrl.includes('onedrive.live.com') || originalUrl.includes('sharepoint.com')) {
      // Converter para URL de embed do Office 365
      const embedUrl = originalUrl.replace('/view.aspx', '/embed.aspx')
      return embedUrl.includes('embed.aspx') ? embedUrl : `${originalUrl}?embed=true`
    }
    
    // Dropbox
    if (originalUrl.includes('dropbox.com')) {
      return originalUrl.replace('?dl=0', '?raw=1')
    }
    
    // PDFs diretos
    if (originalUrl.endsWith('.pdf')) {
      return originalUrl
    }
    
    // Retornar URL original se não for reconhecido
    return originalUrl
  }

  const embedUrl = getEmbedUrl(url)

  const handleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
    setIsFullscreen(!isFullscreen)
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    // Marcar como completo após 10 segundos de visualização
    if (onComplete) {
      const timer = setTimeout(() => {
        onComplete()
      }, 10000)
      return () => clearTimeout(timer)
    }
  }, [onComplete])

  // Verificar se é um PDF direto
  const isPDF = embedUrl.endsWith('.pdf')

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[600px] bg-navy-900/50 rounded-lg overflow-hidden">
      {/* Controles */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-gold-400" />
            <h3 className="text-white font-medium">{title || 'Documento'}</h3>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.open(url, '_blank')}
              className="p-2 rounded-full bg-gold-500/20 hover:bg-gold-500/30 transition-colors"
              title="Abrir em nova aba"
            >
              <ExternalLink className="w-4 h-4 text-white" />
            </motion.button>
            
            {!isPDF && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.open(url, '_blank')}
                className="p-2 rounded-full bg-gold-500/20 hover:bg-gold-500/30 transition-colors"
                title="Baixar documento"
              >
                <Download className="w-4 h-4 text-white" />
              </motion.button>
            )}
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleFullscreen}
              className="p-2 rounded-full bg-gold-500/20 hover:bg-gold-500/30 transition-colors"
              title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
            >
              {isFullscreen ? (
                <X className="w-4 h-4 text-white" />
              ) : (
                <Maximize className="w-4 h-4 text-white" />
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-navy-900/50 z-20"
          >
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-gold-500 animate-spin mx-auto mb-3" />
              <p className="text-gold-300">Carregando documento...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visualizador de documento */}
      {isPDF ? (
        // Para PDFs, usar embed ou object
        <embed
          src={embedUrl}
          type="application/pdf"
          className="w-full h-full mt-14"
          onLoad={() => setIsLoading(false)}
        />
      ) : (
        // Para outros documentos, usar iframe
        <iframe
          ref={iframeRef}
          src={embedUrl}
          className="w-full h-full mt-14"
          frameBorder="0"
          allowFullScreen
          onLoad={() => setIsLoading(false)}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          title={title || 'Documento'}
        />
      )}

      {/* Fallback message */}
      {!isLoading && (
        <div className="absolute bottom-4 left-4 right-4 bg-navy-800/90 rounded-lg p-3 text-center">
          <p className="text-gold-300 text-sm">
            Problemas para visualizar? 
            <button
              onClick={() => window.open(url, '_blank')}
              className="ml-2 text-gold-400 hover:text-gold-200 underline"
            >
              Abrir documento original
            </button>
          </p>
        </div>
      )}
    </div>
  )
}