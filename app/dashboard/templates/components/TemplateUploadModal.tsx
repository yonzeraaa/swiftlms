'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Info, FileText, Settings, AlertTriangle, RotateCw } from 'lucide-react'
import { useAuth } from '../../../providers/AuthProvider'
import Button from '../../../components/Button'
import Card from '../../../components/Card'
import Modal from '../../../components/Modal'
import { createSuggestedMapping, validateMapping, type TemplateAnalysis, type SuggestedMapping } from '@/lib/template-analyzer'
import { extractArrayMapping, extractStaticMappings, buildMetadata } from '@/lib/template-utils'
import MappingEditor from './MappingEditor'
import { TEMPLATE_CATEGORIES } from '../constants'
import { deleteTemplateFile, uploadTemplateFile, updateTemplate, createTemplate } from '@/lib/actions/template-upload'

const INK = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'
const PARCH = '#faf6ee'
const BORDER = 'rgba(30,19,12,0.14)'

interface ExcelTemplate {
  id: string
  name: string
  description: string | null
  category: string
  storage_path: string
  storage_bucket: string
  is_active: boolean
  created_at: string
  created_by: string
  metadata: any
}

interface TemplateUploadModalProps {
  onClose: () => void
  onSuccess: () => void
  defaultCategory?: string
  template?: ExcelTemplate
  onUpdate?: () => void
}

export default function TemplateUploadModal({ onClose, onSuccess, defaultCategory = 'users', template, onUpdate }: TemplateUploadModalProps) {
  const { user } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(defaultCategory)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<TemplateAnalysis | null>(null)
  const [analysisError, setAnalysisError] = useState('')
  const [customMapping, setCustomMapping] = useState<SuggestedMapping | null>(null)
  const [staticMappings, setStaticMappings] = useState<Record<string, string>>({})
  const [manualMode, setManualMode] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'mapping'>('info')
  const [replaceFile, setReplaceFile] = useState(false)
  const [categoryChanged, setCategoryChanged] = useState(false)
  const [originalCategory, setOriginalCategory] = useState<string | null>(null)
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isEditMode = !!template

  // Cleanup ao desmontar componente
  useEffect(() => {
    return () => {
      // Limpar interval se existir
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      // Liberar referências de arquivo
      setFile(null)
      setAnalysis(null)
    }
  }, [])

  const normalizeStoredAnalysis = (raw: any): TemplateAnalysis => {
    const safeHeaders = Array.isArray(raw?.headers) ? raw.headers : []
    const safeStaticCells = Array.isArray(raw?.staticCells)
      ? raw.staticCells.map((cell: any) => ({
          address: cell.address,
          row: cell.row ?? 0,
          column: cell.column ?? 0,
          label: cell.label ?? '',
          value: cell.value ?? '',
          suggestedField: cell.suggestedField,
          type: 'static',
        }))
      : []
    const sheetName = raw?.sheetName || raw?.sheet || 'Sheet1'

    return {
      headers: safeHeaders,
      staticCells: safeStaticCells,
      dataStartRow: raw?.dataStartRow || raw?.startRow || 2,
      sheetName,
      totalColumns: raw?.totalColumns || safeHeaders.length,
      availableSheets: Array.isArray(raw?.availableSheets) && raw.availableSheets.length > 0
        ? raw.availableSheets
        : [sheetName],
      version: raw?.version || 1,
    }
  }

  const resolvedMapping = useMemo(() => {
    if (!analysis) return null
    if (customMapping) {
      return customMapping
    }
    return createSuggestedMapping(analysis, category)
  }, [analysis, category, customMapping])

  // Preencher campos quando em modo de edição
  useEffect(() => {
    if (template) {
      setName(template.name)
      setDescription(template.description || '')
      setCategory(template.category)
      setOriginalCategory(template.category)

      // Carregar metadata existente se disponível
      if (template.metadata) {
        if (template.metadata.analysis) {
          const normalized = normalizeStoredAnalysis(template.metadata.analysis)
          setAnalysis(normalized)
          setSelectedSheet(normalized.sheetName)
        }

        // Extrair mapeamentos existentes
        const arrayMapping = extractArrayMapping(template.metadata)
        const staticMaps = extractStaticMappings(template.metadata)

        if (arrayMapping) {
          setCustomMapping(arrayMapping)
        }

        if (Object.keys(staticMaps).length > 0) {
          setStaticMappings(staticMaps)
        }
      }
    }
  }, [template])

  // Detectar mudança de categoria
  useEffect(() => {
    if (isEditMode && originalCategory && category !== originalCategory) {
      setCategoryChanged(true)
    } else {
      setCategoryChanged(false)
    }
  }, [category, originalCategory, isEditMode])

  const categories = TEMPLATE_CATEGORIES.map(({ value, label }) => ({ value, label }))

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Validar tamanho (máximo 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB em bytes
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: 'Arquivo muito grande. O tamanho máximo é 10MB.',
      }
    }

    // Validar tipo MIME
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ]
    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx')) {
      return {
        valid: false,
        error: 'Por favor, envie apenas arquivos Excel (.xlsx)',
      }
    }

    return { valid: true }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      const validation = validateFile(file)

      if (!validation.valid) {
        alert(validation.error)
        return
      }

      setFile(file)
      if (!name) setName(file.name.replace('.xlsx', ''))

      // Analisar template automaticamente
      await analyzeTemplateFile(file)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const validation = validateFile(file)

      if (!validation.valid) {
        alert(validation.error)
        e.target.value = '' // Limpar input
        return
      }

      setFile(file)
      if (!name) setName(file.name.replace('.xlsx', ''))

      // Analisar template automaticamente
      await analyzeTemplateFile(file)
    }
  }

  const createManualAnalysis = () => {
    // Criar análise manual básica para configuração do zero
    const manualAnalysis: TemplateAnalysis = {
      headers: [
        { column: 1, value: 'Coluna 1', suggestedField: undefined },
        { column: 2, value: 'Coluna 2', suggestedField: undefined },
        { column: 3, value: 'Coluna 3', suggestedField: undefined },
      ],
      staticCells: [],
      dataStartRow: 2,
      sheetName: 'Sheet1',
      totalColumns: 3,
      availableSheets: ['Sheet1'],
      version: 2,
    }
    setAnalysis(manualAnalysis)
    setSelectedSheet('Sheet1')
    setCustomMapping(null)
    setStaticMappings({})
    setManualMode(true)
    setAnalysisError('')
  }

  const analyzeTemplateFile = async (file: File, options: { sheetName?: string } = {}) => {
    try {
      setAnalyzing(true)
      setAnalysisError('')

      const formData = new FormData()
      formData.append('file', file)
      if (options.sheetName) {
        formData.append('sheet', options.sheetName)
      }

      const response = await fetch('/api/analyze-template', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao analisar template')
      }

      const normalizedAnalysis = normalizeStoredAnalysis(data.analysis)
      setAnalysis(normalizedAnalysis)
      setSelectedSheet(normalizedAnalysis.sheetName)
      setCustomMapping(null)
      setStaticMappings({})
      setManualMode(false)
    } catch (error) {
      console.error('Erro ao analisar template:', error)
      setAnalysisError(error instanceof Error ? error.message : 'Erro ao analisar template')
      setAnalysis(null)
      setSelectedSheet(null)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSheetChange = async (sheetName: string) => {
    if (!file) {
      setSelectedSheet(sheetName)
      if (analysis) {
        setAnalysis({
          ...analysis,
          sheetName,
        })
      }
      return
    }

    setSelectedSheet(sheetName)
    await analyzeTemplateFile(file, { sheetName })
  }

  const handleUpload = async () => {
    // Em modo de edição, não precisa de arquivo
    if (isEditMode && (!name || !user)) {
      setErrorMessage('Preencha todos os campos obrigatórios')
      setUploadStatus('error')
      return
    }

    // Em modo de criação, precisa de arquivo
    if (!isEditMode && (!file || !name || !user)) {
      setErrorMessage('Preencha todos os campos obrigatórios')
      setUploadStatus('error')
      return
    }

    try {
      setUploading(true)
      setUploadStatus('uploading')
      setUploadProgress(0)
      setErrorMessage('')

      // Em modo de edição
      if (isEditMode && template) {
        setUploadProgress(30)

        // Se está substituindo arquivo, fazer re-upload
        if (replaceFile && file) {
          // Upload do novo arquivo usando UUID (evita race conditions)
          const uniqueId = crypto.randomUUID()
          const sanitizedFileName = file.name
            .replace(/\s+/g, '_')
            .replace(/[^a-zA-Z0-9._-]/g, '')
            .toLowerCase()
          const fileName = `${category}/${uniqueId}_${sanitizedFileName}`

          // Deletar arquivo antigo usando server action
          if (template.storage_path) {
            const deleteResult = await deleteTemplateFile(template.storage_path)
            if (!deleteResult.success) {
              throw new Error(deleteResult.error || 'Erro ao deletar arquivo antigo')
            }
          }

          // Upload novo arquivo usando server action
          const uploadResult = await uploadTemplateFile(file, fileName)

          if (!uploadResult.success || !uploadResult.data) {
            throw new Error(uploadResult.error || 'Erro ao fazer upload do arquivo')
          }

          setUploadProgress(60)

          // Atualizar com novo caminho
          template.storage_path = uploadResult.data.path
        }

        // Construir metadata atualizado
        let metadata = template.metadata || {}

        // Se tem análise e mapeamentos, atualizar metadata
        if (analysis && (resolvedMapping || Object.keys(staticMappings).length > 0)) {
          const finalMapping = resolvedMapping || createSuggestedMapping(analysis, category)
          metadata = buildMetadata(analysis, finalMapping, staticMappings)
        }

        setUploadProgress(80)

        // Atualizar banco de dados usando server action
        const updateData: any = {
          name,
          description: description || null,
          category,
        }

        // Se substituiu arquivo, atualizar storage_path
        if (replaceFile && template.storage_path) {
          updateData.storage_path = template.storage_path
        }

        // Se tem metadata, atualizar
        if (Object.keys(metadata).length > 0) {
          updateData.metadata = metadata
        }

        const updateResult = await updateTemplate(template.id, updateData)

        if (!updateResult.success) {
          throw new Error(updateResult.error || 'Erro ao atualizar template')
        }

        setUploadProgress(100)
        setUploadStatus('success')

        setTimeout(() => {
          onUpdate?.()
          onSuccess()
        }, 1500)

        return
      }

      // Modo de criação: fazer upload do arquivo
      if (!file) {
        throw new Error('Arquivo não selecionado')
      }

      // Simular progress (storage upload não tem callback de progress)
      progressIntervalRef.current = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      // Gerar caminho único para o arquivo usando UUID (evita race conditions)
      const uniqueId = crypto.randomUUID()
      const sanitizedFileName = file.name
        .replace(/\s+/g, '_')  // Substitui espaços por underscore
        .replace(/[^a-zA-Z0-9._-]/g, '')  // Remove caracteres especiais
        .toLowerCase()
      const fileName = `${category}/${uniqueId}_${sanitizedFileName}`

      // Upload para Supabase Storage usando server action
      const uploadResult = await uploadTemplateFile(file, fileName)

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }

      if (!uploadResult.success || !uploadResult.data) {
        throw new Error(uploadResult.error || 'Erro ao fazer upload do arquivo')
      }

      setUploadProgress(95)

      // Criar metadata automaticamente se houver análise
      let metadata = null
      if (analysis) {
        const finalMapping = resolvedMapping || createSuggestedMapping(analysis, category)
        const validation = validateMapping(finalMapping, category)

        // Construir mappings combinando estáticos e array
        const allMappings: Record<string, string | any> = {
          // Mapeamentos estáticos (células individuais)
          ...staticMappings,
          // Mapeamento de array (tabela)
          [finalMapping.source]: finalMapping
        }

        metadata = {
          mappings: allMappings,
          analysis: {
            headers: analysis.headers,
            staticCells: analysis.staticCells || [],
            sheetName: analysis.sheetName,
            validation: validation
          }
        }
      }

      // Salvar metadata no banco de dados usando server action
      if (!user) throw new Error('Usuário não autenticado')

      const createResult = await createTemplate({
        name,
        description: description || null,
        category,
        storage_path: uploadResult.data.path,
        storage_bucket: 'excel-templates',
        created_by: user.id,
        is_active: true,
        metadata: metadata
      })

      if (!createResult.success) {
        throw new Error(createResult.error || 'Erro ao criar template')
      }

      setUploadProgress(100)
      setUploadStatus('success')

      // Aguardar um pouco para mostrar animação de sucesso
      setTimeout(() => {
        onSuccess()
      }, 1500)
    } catch (error: any) {
      console.error('Erro ao enviar template:', error)
      setErrorMessage(error.message || 'Erro ao enviar template')
      setUploadStatus('error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isEditMode ? 'Editar Template' : 'Novo Template Excel'}
      size="xl"
    >
      <div className="font-[family-name:var(--font-lora)] relative z-10 px-1 py-1">
        {/* Tabs - Apenas no modo edição */}
        {isEditMode && (
          <div className="flex gap-2 mb-6 border-b border-[#1e130c]/10">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex items-center gap-2 px-4 py-2.5 text-[0.65rem] font-bold uppercase tracking-widest transition-all duration-300 ${
                activeTab === 'info'
                  ? 'text-[#1e130c] border-b-2 border-[#8b6d22]'
                  : 'text-[#7a6350] hover:text-[#1e130c]'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Informações
            </button>
            <button
              onClick={() => setActiveTab('mapping')}
              className={`flex items-center gap-2 px-4 py-2.5 text-[0.65rem] font-bold uppercase tracking-widest transition-all duration-300 ${
                activeTab === 'mapping'
                  ? 'text-[#1e130c] border-b-2 border-[#8b6d22]'
                  : 'text-[#7a6350] hover:text-[#1e130c]'
              }`}
            >
              <Settings className="h-3.5 w-3.5" />
              Mapeamento
              {analysis && (
                <span className="ml-1 text-[#8b6d22]">✓</span>
              )}
            </button>
          </div>
        )}

        {/* Conteúdo Principal */}
        <div className="space-y-6">
          {/* Aba: Informações Básicas */}
          {(!isEditMode || activeTab === 'info') && (
            <>
              {/* Upload Area - Estilo Classic */}
              {!isEditMode && (
                <div
                  className={`border-2 border-dashed p-8 text-center transition-all duration-500 ${
                    dragActive
                      ? 'border-[#8b6d22] bg-[#8b6d22]/5'
                      : 'border-[#1e130c]/20 bg-white/30 hover:border-[#1e130c]/40'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-4">
                      <div className="p-2.5 bg-[#1e130c]/5 border border-[#1e130c]/10">
                        <FileSpreadsheet className="h-6 w-6 text-[#1e130c]" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-[#1e130c] text-base leading-tight">{file.name}</p>
                        <p className="text-[0.6rem] text-[#7a6350] uppercase tracking-widest mt-0.5">
                          {(file.size / 1024).toFixed(2)} KB • Pronto
                        </p>
                      </div>
                      <button
                        onClick={() => setFile(null)}
                        className="ml-4 p-1.5 text-[#7a6350] hover:text-[#1e130c] transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center border border-[#1e130c]/10 bg-[#faf6ee]">
                        <Upload className="h-6 w-6 text-[#8b6d22]" />
                      </div>
                      <p className="font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-1 italic">
                        Selecione a matriz Excel
                      </p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        type="button"
                        className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-[#8b6d22] hover:text-[#1e130c] transition-colors py-1.5 border-b border-[#8b6d22]/30"
                      >
                        Procurar no Computador
                      </button>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              )}

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-[0.65rem] font-bold uppercase text-[#7a6350] tracking-[0.2em] mb-1.5">
                    Título do Template <span className="text-[#8b6d22]">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/30 focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none text-base font-medium"
                    placeholder="Ex: Matriz de Relatório IPETEC"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-[0.65rem] font-bold uppercase text-[#7a6350] tracking-[0.2em] mb-1.5">
                    Categoria Acadêmica <span className="text-[#8b6d22]">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none cursor-pointer text-sm"
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value} className="bg-[#faf6ee]">
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[0.65rem] font-bold uppercase text-[#7a6350] tracking-[0.2em] mb-1.5">
                    Observações
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={1}
                    className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/30 focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none resize-none italic text-sm"
                    placeholder="Descreva o propósito..."
                  />
                </div>
              </div>
            </>
          )}

          {/* Aba: Mapeamento de Campos */}
          {isEditMode && activeTab === 'mapping' && (
            <div className="space-y-6">
              {/* Toggle Substituir Arquivo */}
              <div className="p-4 border border-[#1e130c]/10 bg-white/20">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={replaceFile}
                      onChange={(e) => setReplaceFile(e.target.checked)}
                      className="w-4 h-4 text-[#8b6d22] bg-transparent border-[#1e130c]/30 rounded-none focus:ring-0"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-[#1e130c] font-bold uppercase text-[0.6rem] tracking-[0.1em] group-hover:text-[#8b6d22] transition-colors">
                      Substituir Matriz Excel
                    </span>
                  </div>
                  <RotateCw className={`h-3.5 w-3.5 text-[#8b6d22] ${replaceFile ? 'animate-spin' : ''}`} />
                </label>
              </div>

              {/* Upload Area (Substituição) */}
              {replaceFile && (
                <div
                  className={`border-2 border-dashed p-8 text-center transition-all duration-500 ${
                    dragActive
                      ? 'border-[#8b6d22] bg-[#8b6d22]/5'
                      : 'border-[#1e130c]/20 bg-white/30 hover:border-[#1e130c]/40'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-4">
                      <div className="p-2.5 bg-[#1e130c]/5 border border-[#1e130c]/10">
                        <FileSpreadsheet className="h-6 w-6 text-[#1e130c]" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-[#1e130c] text-sm leading-tight">{file.name}</p>
                      </div>
                      <button
                        onClick={() => setFile(null)}
                        className="ml-4 p-1.5 text-[#7a6350] hover:text-[#1e130c]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-1 italic">
                        Arraste o novo arquivo aqui
                      </p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        type="button"
                        className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-[#8b6d22] hover:text-[#1e130c] transition-colors py-1.5 border-b border-[#8b6d22]/30"
                      >
                        Selecionar Novo Arquivo
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Analysis Feedback Area */}
          {(!isEditMode || (isEditMode && activeTab === 'mapping')) && (
            <div className="space-y-4">
              {analyzing && (
                <div className="p-4 border border-[#8b6d22]/20 bg-[#faf6ee]/50 flex items-center gap-3">
                  <div className="w-8 h-8 border-2 border-[#8b6d22]/20 border-t-[#8b6d22] rounded-full animate-spin" />
                  <div>
                    <p className="text-[#1e130c] font-bold uppercase text-[0.65rem] tracking-widest">Processando</p>
                  </div>
                </div>
              )}

              {analysis && !analyzing && (
                <div className="space-y-4">
                  {/* Summary Card */}
                  <div className="p-4 border border-[#1e130c]/10 bg-white/40 shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[0.7rem] text-[#7a6350]">
                      <div className="flex flex-col gap-0.5">
                        <span className="uppercase tracking-widest opacity-60 font-bold text-[0.55rem]">Planilha</span>
                        <div className="flex items-center gap-2">
                          {analysis.availableSheets.length > 1 && file ? (
                            <select
                              value={selectedSheet || analysis.sheetName}
                              onChange={(e) => handleSheetChange(e.target.value)}
                              className="bg-transparent border-0 border-b border-[#1e130c]/20 text-[#1e130c] font-bold py-0.5 focus:ring-0 focus:border-[#8b6d22] cursor-pointer text-[0.7rem]"
                            >
                              {analysis.availableSheets.map(sheet => (
                                <option key={sheet} value={sheet}>{sheet}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-[#1e130c] font-bold truncate">{analysis.sheetName}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="uppercase tracking-widest opacity-60 font-bold text-[0.55rem]">Início</span>
                        <span className="text-[#1e130c] font-bold">Linha {analysis.dataStartRow}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="uppercase tracking-widest opacity-60 font-bold text-[0.55rem]">Colunas</span>
                        <span className="text-[#1e130c] font-bold">{analysis.headers.length} detectadas</span>
                      </div>
                    </div>
                  </div>

                  {/* Mapping Component */}
                  {resolvedMapping && (
                    <div className="border border-[#1e130c]/10">
                      <MappingEditor
                        analysis={analysis}
                        category={category}
                        initialMapping={resolvedMapping}
                        onChange={setCustomMapping}
                        onStaticMappingsChange={setStaticMappings}
                        initialStaticMappings={staticMappings}
                        manualMode={manualMode}
                        onAnalysisChange={setAnalysis}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Progress Section */}
          {uploadStatus !== 'idle' && (
            <div className="p-4 border border-[#1e130c]/10 bg-[#faf6ee]/30 space-y-3">
              <div className="flex items-center justify-between text-[0.6rem] uppercase font-bold tracking-[0.15em]">
                <span className={uploadStatus === 'error' ? 'text-red-800' : 'text-[#7a6350]'}>
                  {uploadStatus === 'uploading' && 'Transmitindo...'}
                  {uploadStatus === 'success' && 'Concluído'}
                  {uploadStatus === 'error' && 'Erro'}
                </span>
                <span className="text-[#1e130c]">{uploadProgress}%</span>
              </div>
              <div className="h-1 w-full bg-[#1e130c]/10 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    uploadStatus === 'success' ? 'bg-[#8b6d22]' : uploadStatus === 'error' ? 'bg-red-800' : 'bg-[#1e130c]'
                  }`}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 mt-6 border-t border-[#1e130c]/10">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading || uploadStatus === 'success'}
            className="flex-1 py-3 border border-[#1e130c]/20 text-[#1e130c] hover:bg-[#1e130c]/5 transition-colors font-bold uppercase tracking-[0.15em] text-[0.6rem]"
          >
            {uploadStatus === 'success' ? 'Fechar' : 'Cancelar'}
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={isEditMode ? (!name || uploading || uploadStatus === 'success') : (!file || !name || uploading || uploadStatus === 'success')}
            className="flex-2 py-3 bg-[#1e130c] text-[#faf6ee] hover:bg-[#8b6d22] transition-colors font-bold uppercase tracking-[0.15em] text-[0.6rem] flex items-center justify-center gap-2 px-8"
          >
            {uploading ? (
              <span>Processando...</span>
            ) : uploadStatus === 'success' ? (
              <>
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Concluído</span>
              </>
            ) : (
              <span>{isEditMode ? 'Gravar Alterações' : 'Publicar Template'}</span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
