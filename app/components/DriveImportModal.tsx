'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import Modal from './Modal'
import Button from './Button'
import { analyzeDriveItem, extractFolderId, validateDriveItem, type ItemType, type DriveItem, type ValidationError } from '@/lib/drive-import-utils'
import { Folder, FileText, BookOpen, GraduationCap, FileCheck, Loader2, CheckCircle2, AlertCircle, ChevronRight, ChevronDown, ChevronsDown, ChevronsUp, BarChart3, Square, CheckSquare, XCircle, ArrowLeft, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface DriveImportModalProps {
  isOpen: boolean
  onClose: () => void
  courseId: string
  onImportComplete?: () => void
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
  const [step, setStep] = useState<ImportStep>('link')

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
    if (!isOpen) {
      // Cancelar loop de importação ao fechar o modal, mas manter token
      cancelledRef.current = true
      pausedRef.current = false
      setIsImporting(false)
      setIsPaused(false)
      // Não limpar accessToken para reaproveitar na próxima abertura
    }
  }, [isOpen])

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
    // DEBUG: Log da busca atual
    console.log(`[DriveImport] ${'  '.repeat(depth)}📁 Buscando arquivos em folder ID: ${folderId}`)
    console.log(`[DriveImport] ${'  '.repeat(depth)}   Parent ID: ${parentId || 'ROOT'}`)

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&fields=files(id,name,mimeType,parents)&pageSize=1000`,
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

    console.log(`[DriveImport] ${'  '.repeat(depth)}   Encontrados ${files.length} itens`)

    for (const file of files) {
      // DEBUG: Log de cada arquivo/pasta encontrado
      const icon = file.mimeType === 'application/vnd.google-apps.folder' ? '📁' : '📄'
      console.log(`[DriveImport] ${'  '.repeat(depth)}   ${icon} ${file.name} (ID: ${file.id})`)
      console.log(`[DriveImport] ${'  '.repeat(depth)}      Parents retornados pela API: ${JSON.stringify(file.parents || [])}`)
      console.log(`[DriveImport] ${'  '.repeat(depth)}      Parent ID atribuído: ${parentId}`)

      allFiles.push({ ...file, parentId })

      if (file.mimeType === 'application/vnd.google-apps.folder') {
        await listFilesRecursively(file.id, file.id, allFiles, depth + 1)
      }
    }

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

  const getTypeBadgeColors = (type: ItemType) => {
    switch (type) {
      case 'module': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'subject': return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
      case 'lesson': return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'test': return 'bg-orange-500/20 text-orange-300 border-orange-500/30'
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
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
      case 'uploading': return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
      case 'success': return <CheckCircle2 className="w-4 h-4 text-green-400" />
      case 'error': return <AlertCircle className="w-4 h-4 text-red-400" />
      default: return null
    }
  }

  const allFlatItems = flattenItems(items)
  const validItems = allFlatItems.filter(item => item.type !== 'unknown')
  const completedItems = allFlatItems.filter(item => item.status === 'success').length

  const renderTreeItem = (item: ProcessedItem, depth: number = 0): React.ReactElement => {
    const hasChildren = item.children && item.children.length > 0
    const isSelected = selectedItems.has(item.id)
    const hasValidationErrors = item.validationErrors && item.validationErrors.length > 0

    // Classes base e status
    const borderColors = {
      module: 'border-l-blue-500',
      subject: 'border-l-purple-500',
      lesson: 'border-l-green-500',
      test: 'border-l-orange-500',
      unknown: 'border-l-gray-500'
    }

    const statusClasses = {
      pending: isSelected ? 'opacity-100' : 'opacity-40',
      uploading: 'bg-blue-500/5 border-blue-500/40',
      success: 'bg-green-500/5',
      error: 'bg-red-500/5 border-red-500/40'
    }

    return (
      <motion.div
        key={item.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className={`
            flex items-center gap-3 p-3 rounded-lg border-l-4
            bg-navy-700/50 border border-gold-500/20
            hover:bg-navy-700/70 hover:shadow-md
            transition-all duration-200
            ${borderColors[item.type]}
            ${statusClasses[item.status]}
            ${item.status === 'uploading' ? 'animate-pulse' : ''}
            ${hasValidationErrors ? 'border-red-500/50 bg-red-500/10' : ''}
          `}
          style={{ marginLeft: `${depth * 24}px` }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          {/* Checkbox de seleção */}
          <motion.button
            onClick={() => toggleItemSelection(item.id, item)}
            className={`p-1 rounded transition-colors flex-shrink-0 ${
              hasValidationErrors
                ? 'text-red-400 cursor-not-allowed'
                : 'hover:bg-navy-600'
            }`}
            disabled={hasValidationErrors || item.status === 'success'}
            whileHover={!hasValidationErrors ? { scale: 1.1 } : {}}
            whileTap={!hasValidationErrors ? { scale: 0.9 } : {}}
          >
            {hasValidationErrors ? (
              <XCircle className="w-5 h-5 text-red-400" />
            ) : isSelected ? (
              <CheckSquare className="w-5 h-5 text-gold-400" />
            ) : (
              <Square className="w-5 h-5 text-gold-400/50" />
            )}
          </motion.button>

          {/* Expand/Collapse button */}
          {hasChildren && (
            <motion.button
              onClick={() => toggleExpand(item.id)}
              className="p-1 hover:bg-navy-600 rounded transition-colors flex-shrink-0"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <motion.div
                initial={false}
                animate={{ rotate: item.isExpanded ? 0 : -90 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4 text-gold-400" />
              </motion.div>
            </motion.button>
          )}
          {!hasChildren && <div className="w-6" />}

          {/* Type icon */}
          <div className="flex-shrink-0">
            {getTypeIcon(item.type)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-gold-100 text-sm font-medium truncate">
                {item.name}
              </p>
              {/* Type badge */}
              <span className={`
                px-2 py-0.5 rounded-full text-xs font-medium border
                ${getTypeBadgeColors(item.type)}
              `}>
                {getTypeLabel(item.type)}
              </span>
            </div>

            {/* Code */}
            {item.code && (
              <p className="text-gold-400 text-xs font-mono">
                {item.code}
              </p>
            )}

            {/* Validation errors */}
            {item.validationErrors && item.validationErrors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-xs mt-1 space-y-0.5"
              >
                {item.validationErrors.map((err, idx) => (
                  <p key={idx} className="flex items-center gap-1">
                    <XCircle className="w-3 h-3 flex-shrink-0" />
                    {err.message}
                  </p>
                ))}
              </motion.div>
            )}

            {/* Error message */}
            {item.error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-xs mt-1 flex items-center gap-1"
              >
                <AlertCircle className="w-3 h-3" />
                {item.error}
              </motion.p>
            )}

            {/* Answer key feedback for tests */}
            {item.type === 'test' && item.status === 'success' && item.answerKey && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`
                  text-xs px-2 py-1 rounded inline-flex items-center gap-1
                  ${item.answerKey.success
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                    : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                  }
                `}
              >
                {item.answerKey.success ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    Gabarito: {item.answerKey.questionCount} questões
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    {item.answerKey.error || 'Gabarito não encontrado'}
                  </>
                )}
              </motion.div>
            )}
          </div>

          {/* Status icon */}
          <div className="flex-shrink-0">
            <motion.div
              initial={item.status === 'success' ? { scale: 0 } : {}}
              animate={item.status === 'success' ? { scale: 1 } : {}}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              {getStatusIcon(item.status)}
            </motion.div>
          </div>
        </motion.div>

        {/* Children */}
        <AnimatePresence>
          {hasChildren && item.isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-1 space-y-1 overflow-hidden"
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

        {/* URL Input - Step: link */}
        {!isCheckingToken && accessToken && step === 'link' && (
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

            {/* Import Mode Toggle */}
            <div className="flex gap-1 p-1 bg-navy-800 rounded-lg">
              <button
                onClick={() => setImportMode('full')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  importMode === 'full'
                    ? 'bg-gold-500 text-navy-900'
                    : 'text-gold-300 hover:bg-navy-700'
                }`}
              >
                Curso Completo
              </button>
              <button
                onClick={() => setImportMode('subject')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  importMode === 'subject'
                    ? 'bg-gold-500 text-navy-900'
                    : 'text-gold-300 hover:bg-navy-700'
                }`}
              >
                Apenas Disciplina
              </button>
            </div>

            {/* Course/Module Selectors (subject mode only) */}
            {importMode === 'subject' && (
              <div className="space-y-3 p-4 bg-navy-700/50 rounded-lg border border-gold-500/20">
                <p className="text-gold-300 text-xs font-medium mb-2">Selecione o destino da disciplina:</p>
                {loadingTargets ? (
                  <div className="flex items-center gap-2 text-gold-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Carregando cursos e módulos...
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-gold-400 text-xs mb-1">Curso de Destino</label>
                      <select
                        value={selectedTargetCourseId || ''}
                        onChange={(e) => handleCourseSelect(e.target.value)}
                        className="w-full px-3 py-2 bg-navy-800 border border-gold-500/30 rounded-lg text-gold-100 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                      >
                        <option value="">Selecione um curso...</option>
                        {availableCourses.map(c => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-gold-400 text-xs mb-1">Módulo de Destino</label>
                      <select
                        value={selectedTargetModuleId || ''}
                        onChange={(e) => setSelectedTargetModuleId(e.target.value || null)}
                        disabled={!selectedTargetCourseId}
                        className="w-full px-3 py-2 bg-navy-800 border border-gold-500/30 rounded-lg text-gold-100 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Selecione um módulo...</option>
                        {filteredModules.map(m => (
                          <option key={m.id} value={m.id}>{m.title}{m.code ? ` (${m.code})` : ''}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            )}

            <div>
              <label className="block text-gold-300 mb-2 text-sm font-medium">
                URL da pasta do Google Drive
              </label>

              {/* Mensagem explícita sobre o link */}
              <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-blue-300 text-xs">
                    {importMode === 'full' ? (
                      <>
                        <p className="font-medium mb-1">Cole o link da pasta do curso.</p>
                        <p className="text-blue-400/80">A pasta deve conter os módulos como subpastas. Formato: drive.google.com/drive/folders/...</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium mb-1">Cole o link da pasta do módulo que contém as disciplinas.</p>
                        <p className="text-blue-400/80">As disciplinas dentro desse módulo serão listadas para seleção e importação.</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Estrutura esperada - conditional based on mode */}
              {importMode === 'full' ? (
                <div className="mb-3 p-3 bg-navy-700/50 border border-gold-500/20 rounded-lg">
                  <p className="text-gold-300 text-xs font-medium mb-2">Estrutura esperada (Curso):</p>
                  <div className="text-gold-400 text-xs space-y-1 font-mono">
                    <div className="flex items-center gap-2">
                      <Folder className="w-3 h-3 text-blue-400" />
                      <span>Módulos (pastas raiz)</span>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <BookOpen className="w-3 h-3 text-purple-400" />
                      <span>Disciplinas (subpastas)</span>
                    </div>
                    <div className="flex items-center gap-2 ml-8">
                      <FileText className="w-3 h-3 text-green-400" />
                      <span>Aulas (arquivos)</span>
                    </div>
                    <div className="flex items-center gap-2 ml-8">
                      <GraduationCap className="w-3 h-3 text-orange-400" />
                      <span>Testes (arquivos)</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-3 p-3 bg-navy-700/50 border border-gold-500/20 rounded-lg">
                  <p className="text-gold-300 text-xs font-medium mb-2">Estrutura esperada (Disciplina):</p>
                  <div className="text-gold-400 text-xs space-y-1 font-mono">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-3 h-3 text-purple-400" />
                      <span>Pasta raiz = Disciplina</span>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <FileText className="w-3 h-3 text-green-400" />
                      <span>Aulas (arquivos)</span>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <GraduationCap className="w-3 h-3 text-orange-400" />
                      <span>Testes (arquivos)</span>
                    </div>
                  </div>
                  <p className="text-gold-400/70 text-xs mt-2">
                    A pasta será importada como disciplina no módulo selecionado
                  </p>
                </div>
              )}

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
              disabled={!driveUrl || (importMode === 'subject' && !selectedTargetModuleId)}
              variant="primary"
              fullWidth
            >
              {isListing ? 'Explorando pastas...' : 'Listar Itens'}
            </Button>
            {importMode === 'subject' && !selectedTargetModuleId && driveUrl && (
              <p className="text-yellow-400 text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Selecione um módulo de destino para continuar
              </p>
            )}
          </div>
        )}

        {/* Items List - Step: review */}
        {step === 'review' && items.length > 0 && (
          <div className="space-y-4">
            {/* Header with connection status and back button */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleBackToLink}
                  variant="ghost"
                  size="xs"
                  icon={<ArrowLeft className="w-4 h-4" />}
                  disabled={isImporting}
                >
                  Voltar
                </Button>
                <p className="text-green-400 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Conectado
                </p>
              </div>
              <button
                onClick={handleDisconnect}
                className="text-red-400 hover:text-red-300 text-xs underline"
                disabled={isImporting}
              >
                Desconectar
              </button>
            </div>

            {/* Pre-import Summary */}
            {!isImporting && completedItems === 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-navy-700/50 border border-gold-500/30 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <BarChart3 className="w-5 h-5 text-gold-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-gold-300 font-medium mb-3">Resumo da Importação</p>
                    <div className="grid grid-cols-2 gap-3">
                      {importMode === 'full' && getSelectedItemStats().modules.total > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                          <span className="text-gold-200 text-sm">
                            {getSelectedItemStats().modules.total} {getSelectedItemStats().modules.total === 1 ? 'Módulo' : 'Módulos'}
                          </span>
                        </div>
                      )}
                      {getSelectedItemStats().subjects.total > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                          <span className="text-gold-200 text-sm">
                            {getSelectedItemStats().subjects.total} {getSelectedItemStats().subjects.total === 1 ? 'Disciplina' : 'Disciplinas'}
                          </span>
                        </div>
                      )}
                      {getSelectedItemStats().lessons.total > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-400"></div>
                          <span className="text-gold-200 text-sm">
                            {getSelectedItemStats().lessons.total} {getSelectedItemStats().lessons.total === 1 ? 'Aula' : 'Aulas'}
                          </span>
                        </div>
                      )}
                      {getSelectedItemStats().tests.total > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                          <span className="text-gold-200 text-sm">
                            {getSelectedItemStats().tests.total} {getSelectedItemStats().tests.total === 1 ? 'Teste' : 'Testes'}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-gold-400 text-xs mt-3">
                      ✓ Gabaritos serão extraídos automaticamente
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Statistics Cards (during/after import) */}
            {(isImporting || completedItems > 0) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-4 gap-3"
              >
                {[
                  { type: 'modules', label: 'Módulos', icon: Folder, color: 'blue' },
                  { type: 'subjects', label: 'Disciplinas', icon: BookOpen, color: 'purple' },
                  { type: 'lessons', label: 'Aulas', icon: FileText, color: 'green' },
                  { type: 'tests', label: 'Testes', icon: GraduationCap, color: 'orange' }
                ].map(({ type, label, icon: Icon, color }) => {
                  // Hide modules in subject-only mode
                  if (type === 'modules' && importMode === 'subject') return null
                  const stats = getSelectedItemStats()[type as keyof ReturnType<typeof getSelectedItemStats>]
                  if (stats.total === 0) return null

                  return (
                    <div
                      key={type}
                      className={`
                        p-3 rounded-lg border
                        bg-${color}-500/10 border-${color}-500/30
                      `}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`w-4 h-4 text-${color}-400`} />
                        <span className="text-xs text-gold-300">{label}</span>
                      </div>
                      <p className={`text-lg font-bold text-${color}-300`}>
                        {stats.completed}/{stats.total}
                      </p>
                    </div>
                  )
                })}
              </motion.div>
            )}

            {/* Progress Bar */}
            {(isImporting || completedItems > 0) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gold-300">
                    {completedItems} de {validItems.length} itens importados
                  </span>
                  <span className="text-gold-400 font-mono">
                    {Math.round((completedItems / validItems.length) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(completedItems / validItems.length) * 100}%` }}
                    transition={{ duration: 0.3 }}
                    className={`h-full rounded-full ${
                      completedItems === validItems.length
                        ? 'bg-gradient-to-r from-green-500 to-green-600'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600'
                    }`}
                  />
                </div>
                {isPaused && (
                  <p className="text-yellow-400 text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Importação pausada
                  </p>
                )}
                {isCancelled && (
                  <p className="text-red-400 text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Importação cancelada
                  </p>
                )}
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={selectAllValidItems}
                  variant="ghost"
                  size="xs"
                  icon={<CheckSquare className="w-3 h-3" />}
                >
                  Selecionar Válidos
                </Button>
                <Button
                  onClick={clearSelection}
                  variant="ghost"
                  size="xs"
                  icon={<Square className="w-3 h-3" />}
                >
                  Limpar Seleção
                </Button>
                <Button
                  onClick={expandAll}
                  variant="ghost"
                  size="xs"
                  icon={<ChevronsDown className="w-3 h-3" />}
                >
                  Expandir
                </Button>
                <Button
                  onClick={collapseAll}
                  variant="ghost"
                  size="xs"
                  icon={<ChevronsUp className="w-3 h-3" />}
                >
                  Colapsar
                </Button>
              </div>

              <div className="flex gap-2 items-center">
                {selectedItems.size > 0 && !isImporting && (
                  <span className="text-gold-400 text-xs">
                    {selectedItems.size} selecionado{selectedItems.size !== 1 ? 's' : ''}
                  </span>
                )}
                {!isImporting && !isCancelled && (
                  <Button
                    onClick={handleImportAll}
                    variant="success"
                    size="sm"
                    disabled={selectedItems.size === 0}
                  >
                    {completedItems > 0 ? 'Continuar Importação' : `Importar (${selectedItems.size})`}
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

            {/* Items Tree */}
            <div className="max-h-96 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
              {items.map(item => renderTreeItem(item))}
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
                  {importMode === 'full' && (
                    <p>• {allFlatItems.filter(it => it.type === 'module' && it.status === 'success').length} módulos importados</p>
                  )}
                  <p>• {allFlatItems.filter(it => it.type === 'subject' && it.status === 'success').length} disciplinas importadas</p>
                  <p>• {allFlatItems.filter(it => it.type === 'lesson' && it.status === 'success').length} aulas importadas</p>
                  <p>• {allFlatItems.filter(it => it.type === 'test' && it.status === 'success').length} testes importados</p>
                  {allFlatItems.filter(it => it.status === 'error').length > 0 && (
                    <p className="text-yellow-400 mt-2">⚠ {allFlatItems.filter(it => it.status === 'error').length} itens falharam</p>
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
