'use client'

import { useState, useEffect, useRef } from 'react'
import Modal from './Modal'
import Button from './Button'
import { analyzeDriveItem, extractFolderId, type ItemType, type DriveItem } from '@/lib/drive-import-utils'
import { Folder, FileText, BookOpen, GraduationCap, FileCheck, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

interface DriveImportModalProps {
  isOpen: boolean
  onClose: () => void
  courseId: string
  onImportComplete?: () => void
}

interface ProcessedItem extends DriveItem {
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

declare global {
  interface Window {
    google?: any
    gapi?: any
  }
}

const STORAGE_KEY = 'google_drive_token'

export default function DriveImportModal({ isOpen, onClose, courseId, onImportComplete }: DriveImportModalProps) {
  const [driveUrl, setDriveUrl] = useState('')
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [isListing, setIsListing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isCancelled, setIsCancelled] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [items, setItems] = useState<ProcessedItem[]>([])
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCheckingToken, setIsCheckingToken] = useState(true)

  const tokenClientRef = useRef<any>(null)
  const pausedRef = useRef(false)
  const cancelledRef = useRef(false)

useEffect(() => {
    if (!isOpen) return

    const loadGoogleAPIs = () => {
      const script1 = document.createElement('script')
      script1.src = 'https://accounts.google.com/gsi/client'
      script1.async = true
      script1.defer = true
      document.body.appendChild(script1)

      const script2 = document.createElement('script')
      script2.src = 'https://apis.google.com/js/api.js'
      script2.async = true
      script2.defer = true
      document.body.appendChild(script2)

      script2.onload = () => {
        window.gapi?.load('client', () => {
          window.gapi.client.init({
            apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
          })
        })
      }

      return () => {
        document.body.removeChild(script1)
        document.body.removeChild(script2)
      }
    }

    const cleanup = loadGoogleAPIs()
    return cleanup
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const checkSavedToken = async () => {
      setIsCheckingToken(true)
      const savedToken = localStorage.getItem(STORAGE_KEY)

      if (savedToken) {
        const isValid = await validateToken(savedToken)
        if (isValid) {
          setAccessToken(savedToken)
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      }

      setIsCheckingToken(false)
    }

    checkSavedToken()
  }, [isOpen])

  const validateToken = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
        headers: { Authorization: `Bearer ${token}` }
      })
      return response.ok
    } catch {
      return false
    }
  }

  const handleDisconnect = () => {
    setAccessToken(null)
    localStorage.removeItem(STORAGE_KEY)
    setItems([])
    setDriveUrl('')
  }

  const handleAuthenticate = () => {
    if (!window.google) {
      setError('Google API não carregada')
      return
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

    if (!clientId) {
      setError('CLIENT_ID não configurado')
      return
    }

    setIsAuthenticating(true)
    setError(null)

    if (!tokenClientRef.current) {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: (response: any) => {
          if (response.access_token) {
            setAccessToken(response.access_token)
            localStorage.setItem(STORAGE_KEY, response.access_token)
            setIsAuthenticating(false)
          } else {
            setError('Falha na autenticação')
            setIsAuthenticating(false)
          }
        }
      })
    }

    tokenClientRef.current.requestAccessToken()
  }

  const listFilesRecursively = async (folderId: string, allFiles: any[] = []): Promise<any[]> => {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&fields=files(id,name,mimeType)&pageSize=1000`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    )

    if (!response.ok) {
      throw new Error('Erro ao listar arquivos')
    }

    const data = await response.json()
    const files = data.files || []

    for (const file of files) {
      allFiles.push(file)

      if (file.mimeType === 'application/vnd.google-apps.folder') {
        await listFilesRecursively(file.id, allFiles)
      }
    }

    return allFiles
  }

  const handleListItems = async () => {
    if (!accessToken || !driveUrl) return

    const folderId = extractFolderId(driveUrl)
    if (!folderId) {
      setError('URL do Google Drive inválida')
      return
    }

    setIsListing(true)
    setError(null)

    try {
      const allFiles = await listFilesRecursively(folderId)

      const processedItems: ProcessedItem[] = allFiles
        .map((file: any) => ({
          ...analyzeDriveItem(file),
          status: 'pending' as const
        }))
        .filter(item => item.type !== 'unknown')

      setItems(processedItems)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setIsListing(false)
    }
  }

  const downloadFile = async (fileId: string): Promise<Blob | null> => {
    if (!accessToken) return null

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      )

      if (!response.ok) return null
      return await response.blob()
    } catch {
      return null
    }
  }

  const uploadItem = async (item: ProcessedItem) => {
    const payload = {
      itemType: item.type,
      code: item.code || '',
      originalName: item.name,
      courseId: courseId,
      driveFileId: item.id,
      mimeType: item.mimeType
    }

    const response = await fetch('/api/import/drive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      let errorMessage = 'Erro ao importar'
      try {
        const data = await response.json()
        errorMessage = data.error || errorMessage
      } catch {
        const text = await response.text()
        errorMessage = text || `Erro HTTP ${response.status}`
      }
      throw new Error(errorMessage)
    }

    return response.json()
  }

  const handlePause = () => {
    setIsPaused(true)
    pausedRef.current = true
  }

  const handleResume = () => {
    setIsPaused(false)
    pausedRef.current = false
    handleImportAll()
  }

  const handleCancel = () => {
    setIsCancelled(true)
    cancelledRef.current = true
    setIsImporting(false)
    setIsPaused(false)
  }

  const handleImportAll = async () => {
    if (!isImporting) {
      setIsImporting(true)
      setIsPaused(false)
      setIsCancelled(false)
      pausedRef.current = false
      cancelledRef.current = false
    }

    setError(null)

    const typeOrder = { 'module': 1, 'subject': 2, 'lesson': 3, 'test': 4, 'unknown': 5 }
    const sortedItems = [...items].sort((a, b) => typeOrder[a.type] - typeOrder[b.type])

    for (let i = 0; i < sortedItems.length; i++) {
      if (cancelledRef.current) {
        setIsImporting(false)
        return
      }

      while (pausedRef.current) {
        await new Promise(resolve => setTimeout(resolve, 500))
        if (cancelledRef.current) {
          setIsImporting(false)
          return
        }
      }

      const item = sortedItems[i]

      if (item.type === 'unknown') continue

      const originalIndex = items.findIndex(it => it.id === item.id)
      const currentStatus = items[originalIndex]?.status

      if (currentStatus === 'success') continue

      setItems(prev => prev.map((it, idx) =>
        idx === originalIndex ? { ...it, status: 'uploading' } : it
      ))

      try {
        await uploadItem(item)

        setItems(prev => prev.map((it, idx) =>
          idx === originalIndex ? { ...it, status: 'success' } : it
        ))
      } catch (err) {
        setItems(prev => prev.map((it, idx) =>
          idx === originalIndex ? {
            ...it,
            status: 'error',
            error: err instanceof Error ? err.message : 'Erro desconhecido'
          } : it
        ))
      }

      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setIsImporting(false)
    setIsPaused(false)
    setShowSuccess(true)
    onImportComplete?.()
  }

  const getTypeIcon = (type: ItemType) => {
    switch (type) {
      case 'module': return <Folder className="w-5 h-5 text-blue-400" />
      case 'subject': return <BookOpen className="w-5 h-5 text-purple-400" />
      case 'lesson': return <FileText className="w-5 h-5 text-green-400" />
      case 'test': return <GraduationCap className="w-5 h-5 text-orange-400" />
      default: return <FileCheck className="w-5 h-5 text-gray-400" />
    }
  }

  const getTypeLabel = (type: ItemType) => {
    switch (type) {
      case 'module': return 'Módulo'
      case 'subject': return 'Disciplina'
      case 'lesson': return 'Aula'
      case 'test': return 'Teste'
      default: return 'Desconhecido'
    }
  }

  const getStatusIcon = (status: ProcessedItem['status']) => {
    switch (status) {
      case 'uploading': return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
      case 'success': return <CheckCircle2 className="w-4 h-4 text-green-400" />
      case 'error': return <AlertCircle className="w-4 h-4 text-red-400" />
      default: return null
    }
  }

  const validItems = items.filter(item => item.type !== 'unknown')
  const completedItems = items.filter(item => item.status === 'success').length

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Importar do Google Drive"
      size="xl"
    >
      <div className="space-y-6">
        {/* Checking Token */}
        {isCheckingToken && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-gold-400 mx-auto mb-3" />
            <p className="text-gold-300 text-sm">Verificando autenticação...</p>
          </div>
        )}

        {/* Authentication */}
        {!isCheckingToken && !accessToken && (
          <div className="text-center py-8">
            <p className="text-gold-300 mb-4">
              Primeiro, autentique-se com sua conta Google
            </p>
            <Button
              onClick={handleAuthenticate}
              isLoading={isAuthenticating}
              variant="primary"
            >
              Conectar ao Google Drive
            </Button>
          </div>
        )}

        {/* URL Input */}
        {!isCheckingToken && accessToken && items.length === 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-green-400 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Conectado ao Google Drive
              </p>
              <button
                onClick={handleDisconnect}
                className="text-red-400 hover:text-red-300 text-sm underline"
              >
                Desconectar
              </button>
            </div>
            <div>
              <label className="block text-gold-300 mb-2 text-sm font-medium">
                URL da pasta do Google Drive
              </label>
              <input
                type="text"
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="w-full px-4 py-2 bg-navy-700 border border-gold-500/30 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
            <Button
              onClick={handleListItems}
              isLoading={isListing}
              disabled={!driveUrl}
              variant="primary"
              fullWidth
            >
              {isListing ? 'Explorando pastas...' : 'Listar Itens'}
            </Button>
          </div>
        )}

        {/* Items List */}
        {items.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <p className="text-green-400 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Conectado
                </p>
                <button
                  onClick={handleDisconnect}
                  className="text-red-400 hover:text-red-300 text-xs underline"
                >
                  Desconectar
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-gold-300 text-sm">
                {validItems.length} itens encontrados {isImporting && `(${completedItems}/${validItems.length})`}
                {isPaused && <span className="text-yellow-400 ml-2">• Pausado</span>}
                {isCancelled && <span className="text-red-400 ml-2">• Cancelado</span>}
              </p>
              <div className="flex gap-2">
                {!isImporting && !isCancelled && (
                  <Button
                    onClick={handleImportAll}
                    variant="success"
                    size="sm"
                    disabled={validItems.length === 0}
                  >
                    {completedItems > 0 ? 'Continuar Importação' : 'Importar Todos'}
                  </Button>
                )}
                {isImporting && !isPaused && (
                  <>
                    <Button
                      onClick={handlePause}
                      variant="warning"
                      size="sm"
                    >
                      Pausar
                    </Button>
                    <Button
                      onClick={handleCancel}
                      variant="danger"
                      size="sm"
                    >
                      Cancelar
                    </Button>
                  </>
                )}
                {isPaused && (
                  <>
                    <Button
                      onClick={handleResume}
                      variant="success"
                      size="sm"
                    >
                      Retomar
                    </Button>
                    <Button
                      onClick={handleCancel}
                      variant="danger"
                      size="sm"
                    >
                      Cancelar
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 bg-navy-700/50 rounded-lg border border-gold-500/20"
                >
                  {getTypeIcon(item.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-gold-100 text-sm font-medium truncate">
                      {item.name}
                    </p>
                    <p className="text-gold-400 text-xs">
                      {getTypeLabel(item.type)} {item.code && `• ${item.code}`}
                    </p>
                    {item.error && (
                      <p className="text-red-400 text-xs mt-1">{item.error}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {getStatusIcon(item.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success Message */}
        {showSuccess && !isImporting && (
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-green-400 font-medium mb-2">Importação concluída com sucesso!</p>
                <div className="text-green-300 text-sm space-y-1">
                  <p>• {items.filter(it => it.type === 'module' && it.status === 'success').length} módulos importados</p>
                  <p>• {items.filter(it => it.type === 'subject' && it.status === 'success').length} disciplinas importadas</p>
                  <p>• {items.filter(it => it.type === 'lesson' && it.status === 'success').length} aulas importadas</p>
                  <p>• {items.filter(it => it.type === 'test' && it.status === 'success').length} testes importados</p>
                  {items.filter(it => it.status === 'error').length > 0 && (
                    <p className="text-yellow-400 mt-2">⚠ {items.filter(it => it.status === 'error').length} itens falharam</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
