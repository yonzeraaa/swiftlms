'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Info, FileText, Settings, AlertTriangle, RotateCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '../../../providers/AuthProvider'
import Button from '../../../components/Button'
import Card from '../../../components/Card'
import { createSuggestedMapping, validateMapping, type TemplateAnalysis, type SuggestedMapping } from '@/lib/template-analyzer'
import { extractArrayMapping, extractStaticMappings, buildMetadata } from '@/lib/template-utils'
import MappingEditor from './MappingEditor'
import { TEMPLATE_CATEGORIES } from '../constants'

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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const isEditMode = !!template

  // Preencher campos quando em modo de edição
  useEffect(() => {
    if (template) {
      setName(template.name)
      setDescription(template.description || '')
      setCategory(template.category)
      setOriginalCategory(template.category)

      // Carregar metadata existente se disponível
      if (template.metadata) {
        // Carregar análise salva
        if (template.metadata.analysis) {
          setAnalysis(template.metadata.analysis)
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

        console.log('[TemplateUploadModal] Metadata carregado:', {
          hasAnalysis: !!template.metadata.analysis,
          hasArrayMapping: !!arrayMapping,
          staticCellsCount: Object.keys(staticMaps).length,
        })
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

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.name.endsWith('.xlsx')
      ) {
        setFile(file)
        if (!name) setName(file.name.replace('.xlsx', ''))

        // Analisar template automaticamente
        await analyzeTemplateFile(file)
      } else {
        alert('Por favor, envie apenas arquivos .xlsx')
      }
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
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
    }
    setAnalysis(manualAnalysis)
    setManualMode(true)
    setAnalysisError('')
  }

  const analyzeTemplateFile = async (file: File) => {
    try {
      setAnalyzing(true)
      setAnalysisError('')

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/analyze-template', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao analisar template')
      }

      setAnalysis(data.analysis)
      setManualMode(false)
      console.log('Template analisado:', data.analysis)
    } catch (error) {
      console.error('Erro ao analisar template:', error)
      setAnalysisError(error instanceof Error ? error.message : 'Erro ao analisar template')
      setAnalysis(null)
    } finally {
      setAnalyzing(false)
    }
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
          // Upload do novo arquivo
          const timestamp = Date.now()
          const sanitizedFileName = file.name
            .replace(/\s+/g, '_')
            .replace(/[^a-zA-Z0-9._-]/g, '')
            .toLowerCase()
          const fileName = `${category}/${timestamp}_${sanitizedFileName}`

          // Deletar arquivo antigo
          if (template.storage_path) {
            await supabase.storage
              .from('excel-templates')
              .remove([template.storage_path])
          }

          // Upload novo arquivo
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('excel-templates')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false,
            })

          if (uploadError) throw uploadError

          setUploadProgress(60)

          // Atualizar com novo caminho
          template.storage_path = uploadData.path
        }

        // Construir metadata atualizado
        let metadata = template.metadata || {}

        // Se tem análise e mapeamentos, atualizar metadata
        if (analysis && (customMapping || Object.keys(staticMappings).length > 0)) {
          const finalMapping = customMapping || createSuggestedMapping(analysis, category)
          metadata = buildMetadata(analysis, finalMapping, staticMappings)

          console.log('[TemplateUploadModal] Metadata atualizado:', metadata)
        }

        setUploadProgress(80)

        // Atualizar banco de dados
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

        const { error: dbError } = await supabase
          .from('excel_templates')
          .update(updateData)
          .eq('id', template.id)

        if (dbError) throw dbError

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
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      // Gerar caminho único para o arquivo (sem espaços e caracteres especiais)
      const timestamp = Date.now()
      const sanitizedFileName = file.name
        .replace(/\s+/g, '_')  // Substitui espaços por underscore
        .replace(/[^a-zA-Z0-9._-]/g, '')  // Remove caracteres especiais
        .toLowerCase()
      const fileName = `${category}/${timestamp}_${sanitizedFileName}`

      // Upload para Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('excel-templates')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      clearInterval(progressInterval)

      if (uploadError) throw uploadError

      setUploadProgress(95)

      // Criar metadata automaticamente se houver análise
      let metadata = null
      if (analysis) {
        // Usar mapeamento customizado se existir, senão usar sugerido
        const finalMapping = customMapping || createSuggestedMapping(analysis, category)
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

        console.log('Metadata gerado:', customMapping ? '(customizado)' : '(automático)', metadata)
        console.log('Mapeamentos estáticos:', Object.keys(staticMappings).length, 'células')
      }

      // Salvar metadata no banco de dados
      if (!user) throw new Error('Usuário não autenticado')

      const { error: dbError } = await supabase.from('excel_templates').insert({
        name,
        description: description || null,
        category,
        storage_path: uploadData.path,
        storage_bucket: 'excel-templates',
        created_by: user.id,
        is_active: true,
        metadata: metadata
      })

      if (dbError) throw dbError

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card variant="elevated" depth={3} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gold">
              {isEditMode ? 'Editar Template' : 'Novo Template Excel'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-navy-700 rounded-lg transition-colors text-gold-400 hover:text-gold-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs - Apenas no modo edição */}
          {isEditMode && (
            <div className="flex gap-2 mb-6 border-b border-gold-500/20">
              <button
                onClick={() => setActiveTab('info')}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-all ${
                  activeTab === 'info'
                    ? 'text-gold-400 border-b-2 border-gold-500'
                    : 'text-gold-300/60 hover:text-gold-300'
                }`}
              >
                <FileText className="h-4 w-4" />
                Informações Básicas
              </button>
              <button
                onClick={() => setActiveTab('mapping')}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-all ${
                  activeTab === 'mapping'
                    ? 'text-gold-400 border-b-2 border-gold-500'
                    : 'text-gold-300/60 hover:text-gold-300'
                }`}
              >
                <Settings className="h-4 w-4" />
                Mapeamento de Campos
                {analysis && (
                  <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full">
                    ✓
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Aviso de mudança de categoria */}
          {categoryChanged && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-300 font-medium mb-1">
                    Categoria alterada
                  </p>
                  <p className="text-sm text-amber-300/70">
                    Você alterou a categoria de "{categories.find(c => c.value === originalCategory)?.label}"
                    para "{categories.find(c => c.value === category)?.label}".
                    Verifique se os mapeamentos de campos ainda estão corretos.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Aba: Informações Básicas */}
          {(!isEditMode || activeTab === 'info') && (
            <>
              {/* Upload Area - Apenas no modo criação */}
              {!isEditMode && (
                <div
                className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center transition-all duration-300 ${
                  dragActive
                    ? 'border-gold-500 bg-gold-500/10 scale-[1.02]'
                    : 'border-gold-500/30 bg-navy-800/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-green-400" />
                <div className="text-left">
                  <p className="font-medium text-gold-100">{file.name}</p>
                  <p className="text-sm text-gold-300/70">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                  className="ml-auto"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 mx-auto text-gold-400 mb-4" />
                <p className="text-gold-100 mb-2">
                  Arraste o arquivo Excel aqui ou
                </p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  Selecionar Arquivo
                </Button>
                <p className="text-xs text-gold-300/70 mt-2">Apenas arquivos .xlsx (máx 10MB)</p>
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
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gold-200 mb-2">
                Nome do Template *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 transition-all"
                placeholder="Ex: Relatório de Usuários IPETEC"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gold-200 mb-2">
                Descrição
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 transition-all resize-none"
                placeholder="Descreva o propósito deste template..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gold-200 mb-2">
                Categoria *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500 transition-all cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value} className="bg-navy-800 text-gold-100">
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
            </>
          )}

          {/* Aba: Mapeamento de Campos */}
          {isEditMode && activeTab === 'mapping' && (
            <>
              {/* Toggle Substituir Arquivo */}
              <div className="mb-6 p-4 bg-navy-800/50 border border-navy-600 rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceFile}
                    onChange={(e) => setReplaceFile(e.target.checked)}
                    className="w-4 h-4 text-gold-500 bg-navy-900 border-navy-600 rounded focus:ring-gold-500 focus:ring-2"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <RotateCw className="h-4 w-4 text-gold-400" />
                    <span className="text-gold-200 font-medium">
                      Substituir arquivo Excel
                    </span>
                  </div>
                </label>
                <p className="text-xs text-gold-300/70 mt-2 ml-7">
                  Marque para fazer upload de um novo arquivo e re-analisar a estrutura
                </p>
              </div>

              {/* Upload Area - Apenas se marcou "substituir arquivo" */}
              {replaceFile && (
                <div
                  className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center transition-all duration-300 ${
                    dragActive
                      ? 'border-gold-500 bg-gold-500/10 scale-[1.02]'
                      : 'border-gold-500/30 bg-navy-800/50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileSpreadsheet className="h-8 w-8 text-green-400" />
                      <div className="text-left">
                        <p className="font-medium text-gold-100">{file.name}</p>
                        <p className="text-sm text-gold-300/70">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFile(null)}
                        className="ml-auto"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 mx-auto text-gold-400 mb-4" />
                      <p className="text-gold-100 mb-2">
                        Arraste o novo arquivo Excel aqui ou
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        type="button"
                      >
                        Selecionar Arquivo
                      </Button>
                      <p className="text-xs text-gold-300/70 mt-2">Apenas arquivos .xlsx (máx 10MB)</p>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {/* Template Analysis */}
          {(!isEditMode || (isEditMode && activeTab === 'mapping')) && analyzing && (
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-blue-300">
                <Info className="h-5 w-5 animate-pulse" />
                <span>Analisando estrutura do template...</span>
              </div>
            </div>
          )}

          {(!isEditMode || (isEditMode && activeTab === 'mapping')) && analysis && !analyzing && (
            <>
              <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-green-300">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">Template analisado com sucesso!</span>
                </div>
                <div className="text-sm text-gold-200 space-y-1">
                  <p>• Planilha: <span className="text-gold-100 font-medium">{analysis.sheetName}</span></p>
                  <p>• Linha de dados: <span className="text-gold-100 font-medium">{analysis.dataStartRow}</span></p>
                  <p>• Colunas encontradas: <span className="text-gold-100 font-medium">{analysis.headers.length}</span></p>
                </div>
                <div className="text-xs text-gold-300/70">
                  Configure os mapeamentos abaixo ou use os sugeridos automaticamente
                </div>
              </div>

              {/* Editor de Mapeamento */}
              {(() => {
                // DEBUG: Log para rastrear categoria antes de passar para MappingEditor
                console.log('[TemplateUploadModal] Passing category to MappingEditor:', category)
                console.log('[TemplateUploadModal] Analysis headers:', analysis.headers.map(h => h.value))
                console.log('[TemplateUploadModal] Analysis static cells:', analysis.staticCells?.map(c => `${c.address}: ${c.label}`))
                return null
              })()}
              <MappingEditor
                analysis={analysis}
                category={category}
                initialMapping={customMapping || createSuggestedMapping(analysis, category)}
                onChange={setCustomMapping}
                onStaticMappingsChange={setStaticMappings}
                manualMode={manualMode}
                onAnalysisChange={setAnalysis}
              />
            </>
          )}

          {(!isEditMode || (isEditMode && activeTab === 'mapping')) && analysisError && !analyzing && !analysis && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg space-y-4">
              <div className="flex items-center gap-2 text-red-300">
                <AlertCircle className="h-5 w-5" />
                <div className="flex-1">
                  <p className="font-semibold">Erro ao analisar template automaticamente</p>
                  <p className="text-sm mt-1">{analysisError}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2 border-t border-red-500/30">
                <Button
                  variant="outline"
                  onClick={createManualAnalysis}
                  className="flex-1"
                  type="button"
                >
                  Configurar Manualmente
                </Button>
                <p className="text-xs text-red-300/70 flex-1">
                  Configure os mapeamentos do zero ou tente novamente o upload
                </p>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {uploadStatus !== 'idle' && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gold-300">
                  {uploadStatus === 'uploading' && 'Enviando template...'}
                  {uploadStatus === 'success' && 'Upload concluído!'}
                  {uploadStatus === 'error' && 'Erro no upload'}
                </span>
                <span className="text-gold-400 font-medium">{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    uploadStatus === 'success'
                      ? 'bg-gradient-to-r from-green-500 to-green-400'
                      : uploadStatus === 'error'
                      ? 'bg-gradient-to-r from-red-500 to-red-400'
                      : 'bg-gradient-to-r from-gold-500 to-gold-400'
                  }`}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              {uploadStatus === 'success' && (
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  Template enviado com sucesso!
                </div>
              )}
              {uploadStatus === 'error' && errorMessage && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {errorMessage}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={uploading || uploadStatus === 'success'}
            >
              {uploadStatus === 'success' ? 'Fechar' : 'Cancelar'}
            </Button>
            <Button
              onClick={handleUpload}
              variant={uploadStatus === 'success' ? 'success' : 'primary'}
              className="flex-1 gap-2"
              disabled={isEditMode ? (!name || uploading || uploadStatus === 'success') : (!file || !name || uploading || uploadStatus === 'success')}
              glow={uploadStatus === 'success'}
            >
              {uploadStatus === 'success' && <CheckCircle className="h-4 w-4" />}
              {uploading ? (isEditMode ? 'Salvando...' : 'Enviando...') : uploadStatus === 'success' ? 'Concluído' : (isEditMode ? 'Salvar Alterações' : 'Enviar Template')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
