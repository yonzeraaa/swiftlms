'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Modal from './Modal'
import Button from './Button'
import { analyzeDriveItem, extractFolderId, validateDriveItem, type ItemType, type DriveItem, type ValidationError } from '@/lib/drive-import-utils'
import { Folder, FileText, BookOpen, GraduationCap, FileCheck, Loader2, CheckCircle2, AlertCircle, ChevronRight, ChevronDown, ChevronsDown, ChevronsUp, BarChart3, Square, CheckSquare, XCircle, ArrowLeft, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ImportProgress {
  completed: number
  total: number
  isImporting: boolean
  isPaused: boolean
}

interface DriveImportModalProps {
  isOpen: boolean
  isMinimized?: boolean
  onClose: () => void
  courseId: string
  onImportComplete?: () => void
  onMinimize?: () => void
  onProgressUpdate?: (progress: ImportProgress) => void
}

interface CourseOption {
  id: string
  title: string
}

interface ModuleOption {
  id: string
  title: string
  course_id: string
  code?: string
}

type ImportMode = 'full' | 'subject'
type ImportStep = 'link' | 'review'

const DRIVE_TOKEN_KEY = 'swiftlms_drive_token'
const DRIVE_TOKEN_EXPIRY_KEY = 'swiftlms_drive_token_expiry'

interface ProcessedItem extends DriveItem {
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  parentId?: string | null
  children?: ProcessedItem[]
  isExpanded?: boolean
  validationErrors?: ValidationError[]
  answerKey?: {
    success: boolean
    questionCount?: number
    error?: string
  }
}

declare global {
  interface Window {
    google?: any
    gapi?: any
  }
}

export default function DriveImportModal({ isOpen, isMinimized = false, onClose, courseId, onImportComplete, onMinimize, onProgressUpdate }: DriveImportModalProps) {
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
  const [step, setStep] = useState<ImportStep>('link')
  const [googleConfig, setGoogleConfig] = useState({ apiKey: '', clientId: '' })

  // Subject-only import mode states
  const [importMode, setImportMode] = useState<ImportMode>('full')
  const [availableCourses, setAvailableCourses] = useState<CourseOption[]>([])
  const [availableModules, setAvailableModules] = useState<ModuleOption[]>([])
  const [selectedTargetCourseId, setSelectedTargetCourseId] = useState<string | null>(null)
  const [selectedTargetModuleId, setSelectedTargetModuleId] = useState<string | null>(null)
  const [loadingTargets, setLoadingTargets] = useState(false)

  // Selection state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  const tokenClientRef = useRef<any>(null)
  const pausedRef = useRef(false)
  const cancelledRef = useRef(false)
  const driveIdToDbIdMap = useRef<Map<string, string>>(new Map())

useEffect(() => {
    if (!isOpen) return

    const loadConfig = async () => {
      try {
        const response = await fetch('/api/public/app-config', { credentials: 'include' })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Falha ao carregar configuracao publica')

        setGoogleConfig({
          apiKey: data.settings?.googleApiKey || '',
          clientId: data.settings?.googleClientId || '',
        })
      } catch {
        setGoogleConfig({ apiKey: '', clientId: '' })
      }
    }

    loadConfig()
  }, [isOpen])

useEffect(() => {
    if (!isOpen) return
    if (!googleConfig.apiKey) return

    // Resetar flags de cancelamento ao reabrir o modal
    cancelledRef.current = false
    setIsCancelled(false)

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
            apiKey: googleConfig.apiKey,
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
  }, [googleConfig.apiKey, isOpen])

  useEffect(() => {
    if (!isOpen) return

    const checkStoredToken = async () => {
      // Verificar token em sessionStorage
      const storedToken = sessionStorage.getItem(DRIVE_TOKEN_KEY)
      const storedExpiry = sessionStorage.getItem(DRIVE_TOKEN_EXPIRY_KEY)

      if (storedToken && storedExpiry) {
        const expiryTime = parseInt(storedExpiry, 10)
        const now = Date.now()

        // Token ainda não expirou?
        if (now < expiryTime) {
          // Validar se ainda funciona
          const isValid = await validateToken(storedToken)
          if (isValid) {
            setAccessToken(storedToken)
            setIsCheckingToken(false)
            return
          }
        }

        // Token expirado ou inválido - limpar
        sessionStorage.removeItem(DRIVE_TOKEN_KEY)
        sessionStorage.removeItem(DRIVE_TOKEN_EXPIRY_KEY)
      }

      // Se já temos token em memória, verificar se ainda é válido
      if (accessToken) {
        const isValid = await validateToken(accessToken)
        if (isValid) {
          setIsCheckingToken(false)
          return
        }
        setAccessToken(null)
      }

      setIsCheckingToken(false)
    }

    checkStoredToken()
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
    sessionStorage.removeItem(DRIVE_TOKEN_KEY)
    sessionStorage.removeItem(DRIVE_TOKEN_EXPIRY_KEY)
    resetModalState(true) // Limpar histórico de importação ao desconectar
    setStep('link')
  }

  const resetModalState = (clearImportHistory = false) => {
    setItems([])
    setDriveUrl('')
    setError(null)
    setIsImporting(false)
    setIsPaused(false)
    setIsCancelled(false)
    setShowSuccess(false)
    pausedRef.current = false
    cancelledRef.current = false
    // Só limpa histórico de importação se explicitamente solicitado
    if (clearImportHistory) {
      driveIdToDbIdMap.current.clear()
    }
  }

  // Fetch courses and modules for subject-only mode
  const fetchCoursesAndModules = async () => {
    setLoadingTargets(true)
    try {
      const response = await fetch('/api/import/drive/courses-modules')
      if (!response.ok) throw new Error('Erro ao buscar cursos')
      const data = await response.json()
      setAvailableCourses(data.courses || [])
      setAvailableModules(data.modules || [])
    } catch (err) {
      setError('Erro ao carregar cursos e módulos')
    } finally {
      setLoadingTargets(false)
    }
  }

  // Filter modules by selected course
  const filteredModules = useMemo(() => {
    if (!selectedTargetCourseId) return []
    return availableModules.filter(m => m.course_id === selectedTargetCourseId)
  }, [availableModules, selectedTargetCourseId])

  // Fetch courses when switching to subject mode
  useEffect(() => {
    if (importMode === 'subject' && availableCourses.length === 0 && !loadingTargets) {
      fetchCoursesAndModules()
    }
  }, [importMode])

  // Reset module selection when course changes
  const handleCourseSelect = (courseId: string) => {
    setSelectedTargetCourseId(courseId || null)
    setSelectedTargetModuleId(null)
  }

  useEffect(() => {
    // Só cancela o loop em fechamento real — minimizar apenas esconde o modal
    if (!isOpen && !isMinimized) {
      cancelledRef.current = true
      pausedRef.current = false
      setIsImporting(false)
      setIsPaused(false)
    }
  }, [isOpen, isMinimized])

  const flattenItems = (items: ProcessedItem[]): ProcessedItem[] => {
    const result: ProcessedItem[] = []
    const traverse = (items: ProcessedItem[]) => {
      items.forEach(item => {
        result.push(item)
        if (item.children && item.children.length > 0) {
          traverse(item.children)
        }
      })
    }
    traverse(items)
    return result
  }

  const sortItemsByCode = (items: ProcessedItem[]): ProcessedItem[] => {
    return items.sort((a, b) => {
      const codeA = a.code || ''
      const codeB = b.code || ''
      return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' })
    })
  }

  const sortTreeRecursively = (items: ProcessedItem[]): ProcessedItem[] => {
    const sorted = sortItemsByCode([...items])
    return sorted.map(item => ({
      ...item,
      children: item.children && item.children.length > 0
        ? sortTreeRecursively(item.children)
        : item.children
    }))
  }

  const updateItemInTree = (items: ProcessedItem[], itemId: string, updates: Partial<ProcessedItem>): ProcessedItem[] => {
    return items.map(item => {
      if (item.id === itemId) {
        return { ...item, ...updates }
      }
      if (item.children && item.children.length > 0) {
        return { ...item, children: updateItemInTree(item.children, itemId, updates) }
      }
      return item
    })
  }

  // Busca recursiva para encontrar item na árvore
  const findItemInTree = (items: ProcessedItem[], itemId: string): ProcessedItem | null => {
    for (const item of items) {
      if (item.id === itemId) return item
      if (item.children && item.children.length > 0) {
        const found = findItemInTree(item.children, itemId)
        if (found) return found
      }
    }
    return null
  }

  // Seleção de itens
  const toggleItemSelection = (itemId: string, item: ProcessedItem) => {
    setSelectedItems(prev => {
      const next = new Set(prev)

      if (next.has(itemId)) {
        // Deselecionar item e seus filhos
        next.delete(itemId)
        const deselectChildren = (children: ProcessedItem[] | undefined) => {
          children?.forEach(child => {
            next.delete(child.id)
            deselectChildren(child.children)
          })
        }
        deselectChildren(item.children)
      } else {
        // No modo subject, só pode selecionar um subject de cada vez
        if (importMode === 'subject' && item.type === 'subject') {
          // Limpar seleção de outros subjects
          const allFlat = flattenItems(items)
          allFlat.filter(i => i.type === 'subject' && i.id !== itemId).forEach(i => next.delete(i.id))
        }

        // Selecionar item e seus filhos (se não tiver erros de validação)
        if (!item.validationErrors || item.validationErrors.length === 0) {
          next.add(itemId)
          const selectChildren = (children: ProcessedItem[] | undefined) => {
            children?.forEach(child => {
              if (!child.validationErrors || child.validationErrors.length === 0) {
                next.add(child.id)
                selectChildren(child.children)
              }
            })
          }
          selectChildren(item.children)
        }
      }

      return next
    })
  }

  const selectAllValidItems = () => {
    const allFlat = flattenItems(items)
    const validIds = allFlat
      .filter(item => !item.validationErrors || item.validationErrors.length === 0)
      .filter(item => item.type !== 'unknown')
      .map(item => item.id)

    // No modo subject, selecionar apenas o primeiro subject válido e seus filhos
    if (importMode === 'subject') {
      const firstSubject = allFlat.find(i => i.type === 'subject' && (!i.validationErrors || i.validationErrors.length === 0))
      if (firstSubject) {
        const idsToSelect = new Set<string>()
        idsToSelect.add(firstSubject.id)
        const addChildren = (children: ProcessedItem[] | undefined) => {
          children?.forEach(child => {
            if (!child.validationErrors || child.validationErrors.length === 0) {
              idsToSelect.add(child.id)
              addChildren(child.children)
            }
          })
        }
        addChildren(firstSubject.children)
        setSelectedItems(idsToSelect)
        return
      }
    }

    setSelectedItems(new Set(validIds))
  }

  const clearSelection = () => {
    setSelectedItems(new Set())
  }

  const handleBackToLink = () => {
    setStep('link')
    setItems([])
    setSelectedItems(new Set())
    setError(null)
    setShowSuccess(false)
    setIsCancelled(false)
    // Mantém driveUrl, importMode, curso/módulo selecionados
  }

  const toggleExpand = (itemId: string) => {
    setItems(prev => {
      const item = findItemInTree(prev, itemId)
      return updateItemInTree(prev, itemId, { isExpanded: !item?.isExpanded })
    })
  }

  const expandAll = () => {
    const updateAll = (items: ProcessedItem[]): ProcessedItem[] => {
      return items.map(item => ({
        ...item,
        isExpanded: true,
        children: item.children ? updateAll(item.children) : item.children
      }))
    }
    setItems(prev => updateAll(prev))
  }

  const collapseAll = () => {
    const updateAll = (items: ProcessedItem[]): ProcessedItem[] => {
      return items.map(item => ({
        ...item,
        isExpanded: false,
        children: item.children ? updateAll(item.children) : item.children
      }))
    }
    setItems(prev => updateAll(prev))
  }

  const handleAuthenticate = () => {
    if (!window.google) {
      setError('Google API não carregada')
      return
    }

    const clientId = googleConfig.clientId

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
            // Salvar token e expiração em sessionStorage (expira em ~1h)
            const expiresIn = response.expires_in || 3600
            const expiryTime = Date.now() + (expiresIn * 1000)
            sessionStorage.setItem(DRIVE_TOKEN_KEY, response.access_token)
            sessionStorage.setItem(DRIVE_TOKEN_EXPIRY_KEY, expiryTime.toString())
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

  const listFilesRecursively = async (folderId: string, parentId: string | null = null, allFiles: any[] = [], depth: number = 0): Promise<any[]> => {
    let pageToken: string | null = null

    // Busca todas as páginas de resultados (a API retorna até 1000 por vez)
    do {
      const url: string = pageToken
        ? `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&fields=nextPageToken,files(id,name,mimeType)&pageSize=1000&pageToken=${pageToken}`
        : `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&fields=nextPageToken,files(id,name,mimeType)&pageSize=1000`

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      if (!response.ok) {
        throw new Error('Erro ao listar arquivos')
      }

      const data = await response.json()
      const files = data.files || []
      pageToken = data.nextPageToken || null

      for (const file of files) {
        allFiles.push({ ...file, parentId })

        if (file.mimeType === 'application/vnd.google-apps.folder') {
          await listFilesRecursively(file.id, file.id, allFiles, depth + 1)
        }
      }
    } while (pageToken)

    return allFiles
  }

  const handleListItems = async () => {
    if (!accessToken || !driveUrl) return

    // DEBUG: Log do URL original e folder ID extraído
    console.log('=== INICIANDO IMPORTAÇÃO DO GOOGLE DRIVE ===')
    console.log('[DriveImport] URL fornecido:', driveUrl)

    const folderId = extractFolderId(driveUrl)
    console.log('[DriveImport] Folder ID extraído:', folderId)

    if (!folderId) {
      setError('URL do Google Drive inválida')
      return
    }

    setIsListing(true)
    setError(null)

    try {
      console.log('[DriveImport] Iniciando busca recursiva...')
      const allFiles = await listFilesRecursively(folderId)

      console.log('[DriveImport] === RESUMO DA BUSCA ===')
      console.log('[DriveImport] Total de itens encontrados:', allFiles.length)
      console.log('[DriveImport] Itens raiz (sem parentId ou parentId = null):')
      allFiles.filter(f => !f.parentId).forEach(f => {
        console.log(`  - ${f.name} (ID: ${f.id})`)
      })

      const processedItems = allFiles
        .map((file: any) => {
          const analyzed = analyzeDriveItem(file)
          // Verificar se item já foi importado anteriormente
          const alreadyImported = driveIdToDbIdMap.current.has(file.id)

          // Subject-only mode: force root folder to be 'subject'
          let itemType = analyzed.type
          if (importMode === 'subject' && !file.parentId) {
            // Root folder in subject mode becomes the subject
            if (file.mimeType === 'application/vnd.google-apps.folder') {
              itemType = 'subject'
              console.log(`[DriveImport] Modo disciplina: forçando "${file.name}" como subject`)
            }
          }

          // Subject-only mode: skip module items (invalid structure)
          if (importMode === 'subject' && itemType === 'module') {
            console.log(`[DriveImport] Modo disciplina: ignorando módulo "${file.name}"`)
            return null
          }

          // Validar código/tipo
          const validationErrors = validateDriveItem({ code: analyzed.code, type: itemType })

          const item: ProcessedItem = {
            ...analyzed,
            type: itemType,
            status: alreadyImported ? 'success' : 'pending',
            parentId: file.parentId,
            children: [],
            isExpanded: true,
            validationErrors: validationErrors.length > 0 ? validationErrors : undefined
          }
          return item
        })
        .filter((item): item is ProcessedItem => item !== null && item.type !== 'unknown')

      const itemsMap = new Map<string, ProcessedItem>()
      const rootItems: ProcessedItem[] = []

      processedItems.forEach(item => {
        itemsMap.set(item.id, item)
      })

      // Validação de hierarquia: garante que tipos só podem ter filhos válidos
      const isValidHierarchy = (parent: ProcessedItem, child: ProcessedItem): boolean => {
        // Módulo só pode ter disciplinas como filhos
        if (parent.type === 'module') return child.type === 'subject'
        // Disciplina pode ter aulas ou testes como filhos
        if (parent.type === 'subject') return child.type === 'lesson' || child.type === 'test'
        // Aula não tem filhos válidos
        if (parent.type === 'lesson') return false
        // Teste não tem filhos válidos
        if (parent.type === 'test') return false
        return false
      }

      console.log('[DriveImport] === CONSTRUINDO ÁRVORE ===')
      processedItems.forEach(item => {
        if (item.parentId && itemsMap.has(item.parentId)) {
          const parent = itemsMap.get(item.parentId)!

          // Verificar se a hierarquia é válida
          if (isValidHierarchy(parent, item)) {
            // Validar código pai-filho
            const hierarchyErrors = validateDriveItem({ code: item.code, type: item.type }, parent.code)
            if (hierarchyErrors.length > 0) {
              item.validationErrors = [...(item.validationErrors || []), ...hierarchyErrors]
            }

            // Hierarquia válida: adicionar como filho
            parent.children = parent.children || []
            parent.children.push(item)
            console.log(`[DriveImport] ✓ ${item.name} → filho de ${parent.name}`)
          } else {
            // Hierarquia inválida (ex: módulo dentro de módulo)
            console.log(`[DriveImport] ✗ ${item.name} → IGNORADO (hierarquia inválida: ${item.type} dentro de ${parent.type})`)
          }
        } else if (!item.parentId) {
          // Item sem pai -> raiz legítima
          rootItems.push(item)
          console.log(`[DriveImport] ✓ ${item.name} → RAIZ (sem pai)`)
        } else {
          // Item tem parentId mas o pai NÃO está no mapa -> item órfão, IGNORAR
          console.log(`[DriveImport] ✗ ${item.name} → IGNORADO (parentId órfão: ${item.parentId})`)
        }
      })

      console.log('[DriveImport] === ITENS RAIZ FINAIS ===')
      console.log(`[DriveImport] Total: ${rootItems.length} itens`)
      rootItems.forEach(item => {
        console.log(`  📁 ${item.name} (${item.type})`)
      })

      const sortedRootItems = sortTreeRecursively(rootItems)
      setItems(sortedRootItems)

      // Limpar seleção e selecionar automaticamente itens válidos
      const allFlat = flattenItems(sortedRootItems)
      const validIds = allFlat
        .filter(item => !item.validationErrors || item.validationErrors.length === 0)
        .filter(item => item.type !== 'unknown')
        .map(item => item.id)
      setSelectedItems(new Set(validIds))

      // Mudar para etapa de revisão
      setStep('review')
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
    // Buscar o database ID do pai no Map
    let parentDatabaseId: string | null = null

    if (importMode === 'subject' && item.type === 'subject') {
      // Subject-only mode: the subject's parent is the selected module
      parentDatabaseId = selectedTargetModuleId
    } else if (item.parentId) {
      parentDatabaseId = driveIdToDbIdMap.current.get(item.parentId) || null
    }

    // Determine courseId based on mode
    const effectiveCourseId = importMode === 'subject' && selectedTargetCourseId
      ? selectedTargetCourseId
      : courseId

    const payload = {
      itemType: item.type,
      code: item.code || '',
      originalName: item.name,
      courseId: effectiveCourseId,
      driveFileId: item.id,
      mimeType: item.mimeType,
      parentDatabaseId: parentDatabaseId
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

    const result = await response.json()

    // Salvar o database ID no Map para futuros filhos
    if (result.databaseId) {
      driveIdToDbIdMap.current.set(item.id, result.databaseId)
    }

    return result
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
    if (selectedItems.size === 0) {
      setError('Selecione ao menos um item para importar')
      return
    }

    if (!isImporting) {
      setIsImporting(true)
      setIsPaused(false)
      setIsCancelled(false)
      pausedRef.current = false
      cancelledRef.current = false
    }

    setError(null)

    const typeOrder = { 'module': 1, 'subject': 2, 'lesson': 3, 'test': 4, 'unknown': 5 }
    const allFlatItems = flattenItems(items)
    // Filtrar apenas itens selecionados
    const selectedFlatItems = allFlatItems.filter(item => selectedItems.has(item.id))
    const sortedItems = [...selectedFlatItems].sort((a, b) => typeOrder[a.type] - typeOrder[b.type])

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
      if (item.status === 'success') continue
      // Pular itens com erros de validação
      if (item.validationErrors && item.validationErrors.length > 0) continue

      setItems(prev => updateItemInTree(prev, item.id, { status: 'uploading' }))

      try {
        const result = await uploadItem(item)

        const updateData: Partial<ProcessedItem> = { status: 'success' }

        // Se for um teste e tiver informações do gabarito, adicionar
        if (item.type === 'test' && result.answerKey) {
          updateData.answerKey = result.answerKey
        }

        setItems(prev => updateItemInTree(prev, item.id, updateData))
      } catch (err) {
        setItems(prev => updateItemInTree(prev, item.id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Erro desconhecido'
        }))
      }

      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setIsImporting(false)
    setIsPaused(false)
    setShowSuccess(true)
  }

  const getTypeIcon = (type: ItemType) => {
    switch (type) {
      case 'module': return <Folder className="w-5 h-5 text-[#8b6d22]" />
      case 'subject': return <BookOpen className="w-5 h-5 text-[#1e130c]" />
      case 'lesson': return <FileText className="w-5 h-5 text-[#7a6350]" />
      case 'test': return <GraduationCap className="w-5 h-5 text-[#8b6d22]" />
      default: return <FileCheck className="w-5 h-5 text-[#7a6350]/50" />
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

  const getTypeBadgeColors = (type: ItemType) => {
    return 'bg-transparent text-[#7a6350] border-[#1e130c]/20 border italic font-[family-name:var(--font-lora)]'
  }

  // Conta apenas itens selecionados (válidos) nos totais
  const getSelectedItemStats = () => {
    const stats = {
      modules: { total: 0, completed: 0 },
      subjects: { total: 0, completed: 0 },
      lessons: { total: 0, completed: 0 },
      tests: { total: 0, completed: 0 }
    }

    const allFlatItems = flattenItems(items)
    allFlatItems.forEach(item => {
      // Só contar se estiver selecionado ou já importado
      const isSelected = selectedItems.has(item.id)
      const isCompleted = item.status === 'success'

      if (!isSelected && !isCompleted) return

      if (item.type === 'module') {
        stats.modules.total++
        if (isCompleted) stats.modules.completed++
      } else if (item.type === 'subject') {
        stats.subjects.total++
        if (isCompleted) stats.subjects.completed++
      } else if (item.type === 'lesson') {
        stats.lessons.total++
        if (isCompleted) stats.lessons.completed++
      } else if (item.type === 'test') {
        stats.tests.total++
        if (isCompleted) stats.tests.completed++
      }
    })

    return stats
  }

  const getStatusIcon = (status: ProcessedItem['status']) => {
    switch (status) {
      case 'uploading': return <Loader2 className="w-4 h-4 animate-spin text-[#8b6d22]" />
      case 'success': return <CheckCircle2 className="w-4 h-4 text-[#1e130c]" />
      case 'error': return <AlertCircle className="w-4 h-4 text-[#7a6350]" />
      default: return null
    }
  }

  const allFlatItems = flattenItems(items)
  const validItems = allFlatItems.filter(item => item.type !== 'unknown')
  const completedItems = allFlatItems.filter(item => item.status === 'success').length

  // Report progress to layout-level context so the floating widget stays updated
  useEffect(() => {
    onProgressUpdate?.({
      completed: completedItems,
      total: validItems.length,
      isImporting,
      isPaused,
    })
  }, [completedItems, validItems.length, isImporting, isPaused, onProgressUpdate])

  const renderTreeItem = (item: ProcessedItem, depth: number = 0): React.ReactElement => {
    const hasChildren = item.children && item.children.length > 0
    const isSelected = selectedItems.has(item.id)
    const hasValidationErrors = item.validationErrors && item.validationErrors.length > 0

    const statusClasses = {
      pending: isSelected ? 'opacity-100' : 'opacity-60',
      uploading: 'bg-[#8b6d22]/10',
      success: 'bg-[#1e130c]/5 opacity-80',
      error: 'bg-red-900/5'
    }

    return (
      <motion.div
        key={item.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className="font-[family-name:var(--font-lora)]"
      >
        <motion.div
          className={`
            flex items-center gap-3 py-3 px-2 border-b border-dashed border-[#1e130c]/20
            transition-colors duration-200
            ${isSelected ? 'bg-[#1e130c]/[0.03]' : 'hover:bg-[#1e130c]/[0.02]'}
            ${hasValidationErrors ? 'opacity-50' : ''}
            ${statusClasses[item.status]}
          `}
          style={{ paddingLeft: `${depth * 24 + 8}px` }}
        >
          <button
            onClick={() => toggleItemSelection(item.id, item)}
            className={`p-1 transition-colors flex-shrink-0 ${
              hasValidationErrors
                ? 'text-[#7a6350] cursor-not-allowed'
                : 'hover:text-[#1e130c]'
            }`}
            disabled={hasValidationErrors || item.status === 'success'}
          >
            {hasValidationErrors ? (
              <XCircle className="w-5 h-5 text-[#7a6350]" />
            ) : isSelected ? (
              <CheckSquare className="w-5 h-5 text-[#8b6d22]" />
            ) : (
              <Square className="w-5 h-5 text-[#7a6350]/50" />
            )}
          </button>

          {hasChildren && (
            <button
              onClick={() => toggleExpand(item.id)}
              className="p-1 hover:text-[#8b6d22] transition-colors flex-shrink-0 text-[#1e130c]"
            >
              <motion.div
                initial={false}
                animate={{ rotate: item.isExpanded ? 0 : -90 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </button>
          )}
          {!hasChildren && <div className="w-6" />}

          <div className="flex-shrink-0">
            {getTypeIcon(item.type)}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-[#1e130c] text-sm font-medium truncate font-[family-name:var(--font-playfair)]">
                {item.name}
              </p>
              <span className={`px-2 py-0.5 rounded-none text-[0.65rem] uppercase tracking-wider ${getTypeBadgeColors(item.type)}`}>
                {getTypeLabel(item.type)}
              </span>
            </div>

            {item.code && (
              <p className="text-[#7a6350] text-xs font-mono">
                {item.code}
              </p>
            )}

            {item.validationErrors && item.validationErrors.length > 0 && (
              <div className="text-[#7a6350] italic text-xs mt-1 space-y-0.5">
                {item.validationErrors.map((err, idx) => (
                  <p key={idx} className="flex items-center gap-1">
                    <XCircle className="w-3 h-3 flex-shrink-0" />
                    {err.message}
                  </p>
                ))}
              </div>
            )}

            {item.error && (
              <p className="text-[#7a6350] italic text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {item.error}
              </p>
            )}

            {item.type === 'test' && item.status === 'success' && item.answerKey && (
              <div
                className={`
                  text-xs px-2 py-1 inline-flex items-center gap-1 italic mt-1
                  ${item.answerKey.success ? 'text-[#1e130c]' : 'text-[#7a6350]'}
                `}
              >
                {item.answerKey.success ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    Gabarito lavrado: {item.answerKey.questionCount} questões
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    {item.answerKey.error || 'Manuscrito de gabarito não encontrado'}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex-shrink-0">
            {getStatusIcon(item.status)}
          </div>
        </motion.div>

        <AnimatePresence>
          {hasChildren && item.isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {item.children!.map(child => renderTreeItem(child, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={isImporting && onMinimize ? onMinimize : onClose}
      title="Catalogar Acervo do Google Drive"
      size="xl"
      onMinimize={onMinimize}
      closeOnBackdrop={!isImporting}
      closeOnEscape={!isImporting}
    >
      <div className="space-y-6 font-[family-name:var(--font-lora)] text-[#1e130c]">
        {/* Checking Token */}
        {isCheckingToken && (
          <div className="text-center py-16 border border-dashed border-[#1e130c]/20 bg-[#faf6ee]/50">
            <Loader2 className="w-8 h-8 animate-spin text-[#8b6d22] mx-auto mb-4" />
            <p className="text-[#1e130c] font-[family-name:var(--font-playfair)] text-xl">Inspecionando selos de acesso...</p>
          </div>
        )}

        {/* Authentication */}
        {!isCheckingToken && !accessToken && (
          <div className="text-center py-16 border border-dashed border-[#1e130c]/20 bg-[#faf6ee]/50">
            <p className="text-[#1e130c] font-[family-name:var(--font-playfair)] text-2xl mb-2">
              Credenciais Necessárias
            </p>
            <p className="text-[#7a6350] italic mb-8">
              Apresente suas credenciais do Google para acesso aos manuscritos.
            </p>
            <Button
              onClick={handleAuthenticate}
              disabled={isAuthenticating}
              className="py-3 px-6 bg-[#1e130c] text-[#faf6ee] hover:bg-[#8b6d22] transition-colors font-medium text-center inline-flex items-center justify-center gap-2"
            >
              {isAuthenticating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Apresentar Credenciais
            </Button>
          </div>
        )}

        {/* URL Input - Step: link */}
        {!isCheckingToken && accessToken && step === 'link' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#1e130c]/10">
              <p className="text-[#1e130c] font-medium flex items-center gap-2 text-sm font-[family-name:var(--font-playfair)] tracking-wider uppercase">
                <CheckCircle2 className="w-4 h-4 text-[#8b6d22]" />
                Acesso Autorizado
              </p>
              <button
                onClick={handleDisconnect}
                className="text-[#7a6350] italic hover:text-[#1e130c] transition-colors text-sm"
              >
                Revogar Acesso
              </button>
            </div>

            {/* Import Mode Toggle */}
            <div className="flex p-1 bg-[#1e130c]/5 border border-[#1e130c]/10">
              <button
                onClick={() => setImportMode('full')}
                className={`flex-1 py-2 px-4 text-sm font-[family-name:var(--font-playfair)] transition-colors ${
                  importMode === 'full'
                    ? 'bg-[#1e130c] text-[#faf6ee]'
                    : 'text-[#1e130c]/70 hover:bg-[#1e130c]/10'
                }`}
              >
                Acervo Completo (Curso)
              </button>
              <button
                onClick={() => setImportMode('subject')}
                className={`flex-1 py-2 px-4 text-sm font-[family-name:var(--font-playfair)] transition-colors ${
                  importMode === 'subject'
                    ? 'bg-[#1e130c] text-[#faf6ee]'
                    : 'text-[#1e130c]/70 hover:bg-[#1e130c]/10'
                }`}
              >
                Tomo Específico (Disciplina)
              </button>
            </div>

            {/* Course/Module Selectors (subject mode only) */}
            {importMode === 'subject' && (
              <div className="space-y-4 p-5 bg-[#faf6ee] border border-dashed border-[#1e130c]/20">
                <p className="text-[#1e130c] font-[family-name:var(--font-playfair)] text-lg mb-2">Destino do Tomo</p>
                {loadingTargets ? (
                  <div className="flex items-center gap-2 text-[#7a6350] italic text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Consultando registros...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-[#7a6350] text-sm mb-1 italic">Curso Literário</label>
                      <select
                        value={selectedTargetCourseId || ''}
                        onChange={(e) => handleCourseSelect(e.target.value)}
                        className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:outline-none focus:border-[#8b6d22]"
                      >
                        <option value="">Selecione um curso...</option>
                        {availableCourses.map(c => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[#7a6350] text-sm mb-1 italic">Módulo</label>
                      <select
                        value={selectedTargetModuleId || ''}
                        onChange={(e) => setSelectedTargetModuleId(e.target.value || null)}
                        disabled={!selectedTargetCourseId}
                        className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:outline-none focus:border-[#8b6d22] disabled:opacity-50"
                      >
                        <option value="">Selecione um módulo...</option>
                        {filteredModules.map(m => (
                          <option key={m.id} value={m.id}>{m.title}{m.code ? ` (${m.code})` : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="mb-6 p-5 border border-dashed border-[#1e130c]/20 bg-[#faf6ee]/50">
                <div className="flex items-start gap-3">
                  <Info className="w-6 h-6 text-[#8b6d22] flex-shrink-0 mt-1" />
                  <div>
                    {importMode === 'full' ? (
                      <>
                        <p className="font-[family-name:var(--font-playfair)] text-[#1e130c] text-xl mb-1">Localização do Acervo</p>
                        <p className="text-[#7a6350] italic text-sm mb-4">Indique a coordenada exata da pasta do curso. A mesma deve conter os módulos como subpastas (ex: drive.google.com/drive/folders/...).</p>
                      </>
                    ) : (
                      <>
                        <p className="font-[family-name:var(--font-playfair)] text-[#1e130c] text-xl mb-1">Localização do Tomo</p>
                        <p className="text-[#7a6350] italic text-sm mb-4">Indique a coordenada da pasta da disciplina. A mesma deve conter os arquivos de aulas e testes.</p>
                      </>
                    )}
                    
                    <p className="text-[#1e130c] text-xs font-bold font-[family-name:var(--font-lora)] tracking-wider uppercase mb-3">Estrutura Esperada:</p>
                    <div className="text-[#7a6350] text-sm space-y-2 font-mono pl-4 border-l border-[#8b6d22]/50">
                      {importMode === 'full' ? (
                        <>
                          <div className="flex items-center gap-2"><Folder className="w-4 h-4 text-[#8b6d22]" /><span>Módulos (pastas raiz)</span></div>
                          <div className="flex items-center gap-2 ml-4"><BookOpen className="w-4 h-4 text-[#1e130c]" /><span>Disciplinas (subpastas)</span></div>
                          <div className="flex items-center gap-2 ml-8"><FileText className="w-4 h-4 text-[#1e130c]" /><span>Aulas (arquivos)</span></div>
                          <div className="flex items-center gap-2 ml-8"><GraduationCap className="w-4 h-4 text-[#8b6d22]" /><span>Testes (arquivos)</span></div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-[#1e130c]" /><span>Pasta raiz = Disciplina</span></div>
                          <div className="flex items-center gap-2 ml-4"><FileText className="w-4 h-4 text-[#1e130c]" /><span>Aulas (arquivos)</span></div>
                          <div className="flex items-center gap-2 ml-4"><GraduationCap className="w-4 h-4 text-[#8b6d22]" /><span>Testes (arquivos)</span></div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <label className="block text-[#1e130c] mb-2 font-[family-name:var(--font-playfair)] text-lg">
                Coordenada da Pasta (URL)
              </label>
              <input
                type="text"
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                placeholder="Ex: https://drive.google.com/drive/folders/..."
                className="w-full px-0 py-3 bg-transparent border-0 border-b-2 border-[#1e130c]/20 text-[#1e130c] placeholder-[#7a6350]/50 focus:outline-none focus:border-[#8b6d22] focus:ring-0 transition-colors text-lg"
              />
            </div>
            
            <Button
              onClick={handleListItems}
              disabled={isListing || !driveUrl || (importMode === 'subject' && !selectedTargetModuleId)}
              className="w-full py-4 px-6 bg-[#1e130c] text-[#faf6ee] hover:bg-[#8b6d22] transition-colors font-medium text-center flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-[family-name:var(--font-playfair)]"
            >
              {isListing ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {isListing ? 'Explorando Arquivos...' : 'Listar Manuscritos'}
            </Button>
            {importMode === 'subject' && !selectedTargetModuleId && driveUrl && (
              <p className="text-[#7a6350] italic text-sm flex items-center gap-1 mt-2 justify-center">
                <AlertCircle className="w-4 h-4" />
                Selecione um módulo de destino para prosseguir
              </p>
            )}
          </div>
        )}

        {/* Items List - Step: review */}
        {step === 'review' && items.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#1e130c]/10 pb-4">
              <Button
                onClick={handleBackToLink}
                disabled={isImporting}
                variant="ghost"
                className="text-[#8b6d22] hover:text-[#1e130c] transition-colors flex items-center gap-2 text-sm disabled:opacity-50 italic"
              >
                <ArrowLeft className="w-4 h-4" /> Retornar
              </Button>
              <p className="text-[#1e130c] font-[family-name:var(--font-playfair)] tracking-widest uppercase text-sm">
                Inspeção de Manuscritos
              </p>
            </div>

            {/* Pre-import Summary */}
            {!isImporting && completedItems === 0 && (
              <div className="p-5 border border-dashed border-[#1e130c]/20 bg-[#faf6ee]/50 text-center">
                <p className="font-[family-name:var(--font-playfair)] text-[#1e130c] text-xl mb-4">Sumário do Acervo</p>
                <div className="flex flex-wrap justify-center gap-6">
                  {importMode === 'full' && getSelectedItemStats().modules.total > 0 && (
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-[family-name:var(--font-playfair)] text-[#1e130c]">{getSelectedItemStats().modules.total}</span>
                      <span className="text-xs text-[#7a6350] uppercase tracking-wider">Módulos</span>
                    </div>
                  )}
                  {getSelectedItemStats().subjects.total > 0 && (
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-[family-name:var(--font-playfair)] text-[#1e130c]">{getSelectedItemStats().subjects.total}</span>
                      <span className="text-xs text-[#7a6350] uppercase tracking-wider">Disciplinas</span>
                    </div>
                  )}
                  {getSelectedItemStats().lessons.total > 0 && (
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-[family-name:var(--font-playfair)] text-[#1e130c]">{getSelectedItemStats().lessons.total}</span>
                      <span className="text-xs text-[#7a6350] uppercase tracking-wider">Aulas</span>
                    </div>
                  )}
                  {getSelectedItemStats().tests.total > 0 && (
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-[family-name:var(--font-playfair)] text-[#8b6d22]">{getSelectedItemStats().tests.total}</span>
                      <span className="text-xs text-[#7a6350] uppercase tracking-wider">Testes</span>
                    </div>
                  )}
                </div>
                <p className="text-[#7a6350] italic text-xs mt-4">
                  Gabaritos serão extraídos e lavrados automaticamente se presentes.
                </p>
              </div>
            )}

            {/* Statistics Cards (during/after import) */}
            {(isImporting || completedItems > 0) && (
              <div className="grid grid-cols-4 gap-4">
                {[
                  { type: 'modules', label: 'Módulos', icon: Folder },
                  { type: 'subjects', label: 'Disciplinas', icon: BookOpen },
                  { type: 'lessons', label: 'Aulas', icon: FileText },
                  { type: 'tests', label: 'Testes', icon: GraduationCap }
                ].map(({ type, label, icon: Icon }) => {
                  if (type === 'modules' && importMode === 'subject') return null
                  const stats = getSelectedItemStats()[type as keyof ReturnType<typeof getSelectedItemStats>]
                  if (stats.total === 0) return null

                  return (
                    <div key={type} className="p-3 border border-[#1e130c]/10 text-center bg-[#faf6ee]">
                      <Icon className="w-5 h-5 mx-auto text-[#8b6d22] mb-1" />
                      <p className="text-[0.65rem] uppercase tracking-wider text-[#7a6350] mb-1">{label}</p>
                      <p className="text-xl font-[family-name:var(--font-playfair)] text-[#1e130c]">
                        {stats.completed}<span className="text-[#7a6350] text-sm">/{stats.total}</span>
                      </p>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Progress Bar */}
            {(isImporting || completedItems > 0) && (
              <div className="space-y-2 py-4 border-y border-dashed border-[#1e130c]/20">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#1e130c] font-[family-name:var(--font-playfair)]">
                    Catalogando... {completedItems} de {validItems.length} tomos lavrados
                  </span>
                  <span className="text-[#8b6d22] font-mono">
                    {Math.round((completedItems / validItems.length) * 100)}%
                  </span>
                </div>
                <div className="h-1 bg-[#1e130c]/10 w-full overflow-hidden">
                  <div
                    className="h-full bg-[#8b6d22] transition-all duration-300 ease-out"
                    style={{ width: `${(completedItems / validItems.length) * 100}%` }}
                  />
                </div>
                {isPaused && (
                  <p className="text-[#7a6350] italic text-xs flex items-center gap-1 justify-center">
                    <AlertCircle className="w-3 h-3" /> Trabalhos suspensos temporariamente
                  </p>
                )}
                {isCancelled && (
                  <p className="text-[#7a6350] italic text-xs flex items-center gap-1 justify-center">
                    <AlertCircle className="w-3 h-3" /> Trabalhos cancelados
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button onClick={selectAllValidItems} className="text-[#7a6350] hover:text-[#1e130c] text-xs transition-colors flex items-center gap-1"><CheckSquare className="w-3 h-3"/> Selecionar Todos</button>
                <span className="text-[#1e130c]/20">|</span>
                <button onClick={clearSelection} className="text-[#7a6350] hover:text-[#1e130c] text-xs transition-colors flex items-center gap-1"><Square className="w-3 h-3"/> Limpar</button>
                <span className="text-[#1e130c]/20">|</span>
                <button onClick={expandAll} className="text-[#7a6350] hover:text-[#1e130c] text-xs transition-colors flex items-center gap-1"><ChevronsDown className="w-3 h-3"/> Expandir</button>
                <span className="text-[#1e130c]/20">|</span>
                <button onClick={collapseAll} className="text-[#7a6350] hover:text-[#1e130c] text-xs transition-colors flex items-center gap-1"><ChevronsUp className="w-3 h-3"/> Colapsar</button>
              </div>

              <div className="flex gap-3 items-center">
                {selectedItems.size > 0 && !isImporting && (
                  <span className="text-[#7a6350] italic text-xs mr-2">
                    {selectedItems.size} selecionado{selectedItems.size !== 1 ? 's' : ''}
                  </span>
                )}
                {!isImporting && !isCancelled && (
                  <Button
                    onClick={handleImportAll}
                    disabled={selectedItems.size === 0}
                    className="py-2 px-6 bg-[#1e130c] text-[#faf6ee] hover:bg-[#8b6d22] transition-colors font-[family-name:var(--font-playfair)] disabled:opacity-50"
                  >
                    {completedItems > 0 ? 'Retomar Catalogação' : 'Lavrar Registros'}
                  </Button>
                )}
                {isImporting && !isPaused && (
                  <>
                    <Button onClick={handlePause} className="py-2 px-4 border border-[#1e130c] text-[#1e130c] hover:bg-[#1e130c]/5 transition-colors font-[family-name:var(--font-playfair)]">
                      Pausar
                    </Button>
                    <Button onClick={handleCancel} className="py-2 px-4 border border-[#7a6350] text-[#7a6350] hover:bg-[#7a6350]/10 transition-colors font-[family-name:var(--font-playfair)]">
                      Cancelar
                    </Button>
                  </>
                )}
                {isPaused && (
                  <>
                    <Button onClick={handleResume} className="py-2 px-6 bg-[#1e130c] text-[#faf6ee] hover:bg-[#8b6d22] transition-colors font-[family-name:var(--font-playfair)]">
                      Retomar
                    </Button>
                    <Button onClick={handleCancel} className="py-2 px-4 border border-[#7a6350] text-[#7a6350] hover:bg-[#7a6350]/10 transition-colors font-[family-name:var(--font-playfair)]">
                      Cancelar
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Items Tree */}
            <div className="max-h-96 overflow-y-auto border border-[#1e130c]/20 bg-[#faf6ee] p-2 custom-scrollbar">
              {items.map(item => renderTreeItem(item))}
            </div>
          </div>
        )}

        {/* Success Message */}
        {showSuccess && !isImporting && (
          <div className="p-6 border border-[#8b6d22]/50 bg-[#8b6d22]/5 text-center">
            <CheckCircle2 className="w-8 h-8 text-[#8b6d22] mx-auto mb-3" />
            <p className="font-[family-name:var(--font-playfair)] text-[#1e130c] text-2xl mb-2">Catalogação Concluída</p>
            <p className="text-[#7a6350] italic mb-4">Os manuscritos foram incorporados ao acervo com sucesso.</p>
            <div className="flex justify-center gap-6 text-sm font-[family-name:var(--font-playfair)]">
              {importMode === 'full' && (
                <span>{allFlatItems.filter(it => it.type === 'module' && it.status === 'success').length} Módulos</span>
              )}
              <span>{allFlatItems.filter(it => it.type === 'subject' && it.status === 'success').length} Disciplinas</span>
              <span>{allFlatItems.filter(it => it.type === 'lesson' && it.status === 'success').length} Aulas</span>
              <span>{allFlatItems.filter(it => it.type === 'test' && it.status === 'success').length} Exames</span>
            </div>
            {allFlatItems.filter(it => it.status === 'error').length > 0 && (
              <p className="text-[#7a6350] mt-4 text-sm italic">
                ⚠ {allFlatItems.filter(it => it.status === 'error').length} itens falharam ao ser lavrados
              </p>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 border border-dashed border-[#7a6350]/50 bg-[#7a6350]/5 text-center">
            <p className="text-[#7a6350] italic flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
