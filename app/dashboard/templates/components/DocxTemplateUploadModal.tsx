'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Upload, FileText, CheckCircle, AlertCircle, Settings, MapPin } from 'lucide-react'
import { useAuth } from '../../../providers/AuthProvider'
import Button from '../../../components/Button'
import Card from '../../../components/Card'
import {
  uploadCertificateDocxTemplate,
  updateTemplateMappings,
  uploadDocxForAnalysis,
  deleteDocxAnalysisFile,
} from '@/lib/actions/certificate-docx-templates'
import {
  CertificateKind,
  FieldMapping,
  DocxPlaceholder,
  CERTIFICATE_DOCX_FIELDS,
  CertificateDocxTemplate,
} from '@/types/certificate-docx'

interface DocxTemplateUploadModalProps {
  onClose: () => void
  onSuccess: () => void
  editingTemplate?: CertificateDocxTemplate
}

export default function DocxTemplateUploadModal({
  onClose,
  onSuccess,
  editingTemplate,
}: DocxTemplateUploadModalProps) {
  const { user } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [certificateKind, setCertificateKind] = useState<CertificateKind>('all')
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<
    'idle' | 'uploading' | 'success' | 'error'
  >('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [placeholders, setPlaceholders] = useState<DocxPlaceholder[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [mappings, setMappings] = useState<FieldMapping[]>([])
  const [activeTab, setActiveTab] = useState<'info' | 'preview' | 'mapping'>('info')
  const [previewData, setPreviewData] = useState<{
    placeholders: DocxPlaceholder[]
    warnings: string[]
  } | null>(null)
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [tempStoragePath, setTempStoragePath] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingTemplate) {
      setName(editingTemplate.name)
      setDescription(editingTemplate.description || '')
      setCertificateKind(editingTemplate.certificate_kind)
      setPlaceholders(editingTemplate.placeholders)
      setTemplateId(editingTemplate.id)
      setWarnings(editingTemplate.validation_warnings || [])

      if (editingTemplate.metadata?.mappings) {
        setMappings(editingTemplate.metadata.mappings)
      } else {
        setMappings(editingTemplate.placeholders.map((p: DocxPlaceholder) => ({
          placeholder: p.name,
          source: p.source || '',
          transform: p.format as FieldMapping['transform'],
        })))
      }

      setUploadStatus('success')
      setActiveTab('mapping')
    }
  }, [editingTemplate])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile && droppedFile.name.endsWith('.docx')) {
      setFile(droppedFile)
      if (!name) {
        setName(droppedFile.name.replace('.docx', ''))
      }
    } else {
      setErrorMessage('Por favor, selecione um arquivo .docx')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.name.endsWith('.docx')) {
        setFile(selectedFile)
        if (!name) {
          setName(selectedFile.name.replace('.docx', ''))
        }
        setErrorMessage('')
        setPreviewData(null)
      } else {
        setErrorMessage('Por favor, selecione um arquivo .docx')
      }
    }
  }

  const handlePreview = async () => {
    if (!file) return

    setPreviewing(true)
    setErrorMessage('')

    try {
      // 1. Upload para Storage via server action (contorna limite de payload)
      const uploadResult = await uploadDocxForAnalysis(file)
      if (!uploadResult.success || !uploadResult.storagePath) {
        throw new Error(uploadResult.error || 'Erro ao fazer upload para análise')
      }

      setTempStoragePath(uploadResult.storagePath)

      // 2. Chamar API com path do Storage
      const response = await fetch('/api/analyze-docx-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath: uploadResult.storagePath }),
        credentials: 'include',
      })

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Resposta não-JSON da API:', text.substring(0, 500))
        throw new Error(`Erro do servidor (${response.status}): resposta inválida`)
      }

      const result = await response.json()

      if (result.success) {
        setPreviewData({
          placeholders: result.placeholders,
          warnings: result.warnings,
        })
        setActiveTab('preview')
      } else {
        // Limpar arquivo temporário em caso de erro
        await deleteDocxAnalysisFile(uploadResult.storagePath)
        setTempStoragePath(null)
        setErrorMessage(result.error || 'Erro ao analisar template')
      }
    } catch (error: unknown) {
      console.error('Erro ao fazer preview:', error)
      const msg = error instanceof Error ? error.message : 'Erro ao fazer preview do template'
      setErrorMessage(msg)
      // Limpar arquivo temporário em caso de erro
      if (tempStoragePath) {
        await deleteDocxAnalysisFile(tempStoragePath)
        setTempStoragePath(null)
      }
    } finally {
      setPreviewing(false)
    }
  }

  const handleUpload = async () => {
    if (!file || !name || !user?.id) {
      setErrorMessage('Preencha todos os campos obrigatórios')
      return
    }

    setUploading(true)
    setUploadStatus('uploading')
    setErrorMessage('')

    try {
      const result = await uploadCertificateDocxTemplate(
        file,
        name,
        description || null,
        certificateKind,
        user.id,
        tempStoragePath || undefined
      )

      // Limpar referência ao arquivo temporário após sucesso
      setTempStoragePath(null)

      setTemplateId(result.templateId)
      setPlaceholders(result.placeholders)
      setWarnings(result.warnings)
      setMappings(result.mappings || result.placeholders.map((p: DocxPlaceholder) => ({
        placeholder: p.name,
        source: p.source || '',
        transform: p.format as FieldMapping['transform'],
      })))

      setUploadStatus('success')
      setActiveTab('mapping')
    } catch (error: unknown) {
      console.error('Erro ao fazer upload:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer upload do template'
      setErrorMessage(errorMessage)
      setUploadStatus('error')
    } finally {
      setUploading(false)
    }
  }

  const handleMappingChange = (index: number, field: keyof FieldMapping, value: string | undefined) => {
    const newMappings = [...mappings]
    newMappings[index] = { ...newMappings[index], [field]: value }
    setMappings(newMappings)
  }

  const handleFinish = async () => {
    if (!templateId) return

    setUploading(true)
    try {
      await updateTemplateMappings(templateId, mappings)
      setUploadStatus('idle')
      onSuccess()
      onClose()
    } catch (error: unknown) {
      console.error('Erro ao salvar mapeamentos:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro ao salvar mapeamentos'
      setErrorMessage(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const getLocationLabel = (loc: string) => {
    const labels: Record<string, string> = {
      body: 'Corpo',
      header: 'Cabeçalho',
      footer: 'Rodapé'
    }
    return labels[loc] || loc
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" padding="none">
        {/* Header */}
        <div className="p-6 border-b border-gold-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-gold-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gold">
                {editingTemplate ? 'Editar Mapeamentos' : 'Novo Template DOCX'}
              </h2>
              <p className="text-sm text-gold-400">
                {editingTemplate ? 'Configure os campos do template' : 'Upload de template de certificado'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gold-500/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gold-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gold-500/20 px-6">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('info')}
              className={`py-3 px-1 border-b-2 transition-colors font-medium ${
                activeTab === 'info'
                  ? 'border-gold-500 text-gold-300'
                  : 'border-transparent text-gold-500 hover:text-gold-300'
              }`}
            >
              Informações
            </button>
            {!editingTemplate && (
              <button
                onClick={() => setActiveTab('preview')}
                disabled={!previewData && !previewing}
                className={`py-3 px-1 border-b-2 transition-colors font-medium ${
                  activeTab === 'preview'
                    ? 'border-gold-500 text-gold-300'
                    : 'border-transparent text-gold-500 hover:text-gold-300'
                } ${!previewData && !previewing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Preview
              </button>
            )}
            <button
              onClick={() => setActiveTab('mapping')}
              disabled={uploadStatus !== 'success'}
              className={`py-3 px-1 border-b-2 transition-colors font-medium flex items-center gap-2 ${
                activeTab === 'mapping'
                  ? 'border-gold-500 text-gold-300'
                  : 'border-transparent text-gold-500 hover:text-gold-300'
              } ${uploadStatus !== 'success' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Settings className="w-4 h-4" />
              Mapeamentos
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Upload Area */}
              {!editingTemplate && (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 transition-all ${
                    dragActive
                      ? 'border-gold-500 bg-gold-500/10'
                      : 'border-gold-500/30 bg-navy-900/50 hover:border-gold-500/50'
                  }`}
                >
                  <div className="text-center">
                    <Upload
                      className={`w-12 h-12 mx-auto mb-4 ${
                        dragActive ? 'text-gold-400' : 'text-gold-500'
                      }`}
                    />
                    <p className="text-sm font-medium text-gold-300 mb-2">
                      {file
                        ? file.name
                        : 'Arraste um arquivo .docx ou clique para selecionar'}
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".docx"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      size="sm"
                      disabled={uploading}
                    >
                      Selecionar Arquivo
                    </Button>
                  </div>
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gold-300 mb-2">
                    Nome do Template *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-navy-900/80 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500/50 disabled:opacity-50"
                    placeholder="Ex: Certificado de Conclusão Técnico"
                    disabled={uploading || !!editingTemplate}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gold-300 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-navy-900/80 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500/50 disabled:opacity-50 resize-none"
                    placeholder="Descrição opcional do template"
                    rows={3}
                    disabled={uploading || !!editingTemplate}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gold-300 mb-2">
                    Tipo de Certificado
                  </label>
                  <select
                    value={certificateKind}
                    onChange={(e) => setCertificateKind(e.target.value as CertificateKind)}
                    className="w-full px-4 py-2.5 bg-navy-900/80 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500/50 disabled:opacity-50"
                    disabled={uploading || !!editingTemplate}
                  >
                    <option value="all">Todos os tipos</option>
                    <option value="technical">Apenas Técnico</option>
                    <option value="lato-sensu">Apenas Lato Sensu</option>
                  </select>
                </div>
              </div>

              {/* Status Messages */}
              {errorMessage && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-300">{errorMessage}</p>
                </div>
              )}

              {uploadStatus === 'success' && (
                <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-green-300 font-medium">
                      Template enviado com sucesso!
                    </p>
                    <p className="text-xs text-green-400/80 mt-1">
                      {placeholders.length} placeholder(s) encontrado(s). Configure os mapeamentos na próxima aba.
                    </p>
                  </div>
                </div>
              )}

              {warnings.length > 0 && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-sm font-medium text-yellow-300 mb-2">
                    Avisos de Validação:
                  </p>
                  <ul className="text-sm text-yellow-400/80 space-y-1">
                    {warnings.map((warning, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-yellow-500">•</span>
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview Button */}
              {file && !previewData && (
                <Button
                  onClick={handlePreview}
                  variant="outline"
                  disabled={previewing || uploading}
                  loading={previewing}
                  fullWidth
                >
                  {previewing ? 'Analisando...' : 'Analisar Placeholders'}
                </Button>
              )}
            </div>
          )}

          {activeTab === 'preview' && previewData && (
            <div className="space-y-4">
              <div className="bg-gold-500/10 border border-gold-500/30 rounded-lg p-4">
                <p className="text-sm font-medium text-gold-300">
                  {previewData.placeholders.length} placeholder(s) encontrado(s)
                </p>
                <p className="text-xs text-gold-400/80 mt-1">
                  Revise os campos detectados antes de enviar o template
                </p>
              </div>

              {/* Placeholders List */}
              <div className="space-y-3">
                <h3 className="font-medium text-gold-200">Placeholders Detectados:</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {previewData.placeholders.map((placeholder, index) => {
                    const knownField = CERTIFICATE_DOCX_FIELDS[placeholder.name as keyof typeof CERTIFICATE_DOCX_FIELDS]

                    return (
                      <div key={index} className="bg-navy-900/60 border border-gold-500/15 rounded-lg p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <code className="text-sm font-mono bg-navy-800 text-gold-300 px-2 py-1 rounded border border-gold-500/20">
                                {'{{'}{placeholder.name}{'}}'}
                              </code>
                              {placeholder.format && (
                                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                                  {placeholder.format}
                                </span>
                              )}
                            </div>
                            {knownField && (
                              <p className="text-sm text-gold-400 mt-2">
                                {knownField.description}
                              </p>
                            )}
                            {!knownField && (
                              <p className="text-sm text-yellow-400/80 mt-2">
                                Campo desconhecido - será necessário mapear manualmente
                              </p>
                            )}
                            {/* Location info */}
                            {placeholder.locations && placeholder.locations.length > 0 && (
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <MapPin className="w-3.5 h-3.5 text-gold-500" />
                                {placeholder.locations.map((loc, i) => (
                                  <span
                                    key={i}
                                    className="text-xs bg-navy-800 text-gold-400 px-2 py-0.5 rounded border border-gold-500/20"
                                  >
                                    {getLocationLabel(loc.location)} ({loc.count}x)
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              placeholder.required
                                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                : 'bg-navy-800 text-gold-400 border border-gold-500/20'
                            }`}>
                              {placeholder.required ? 'Obrigatório' : 'Opcional'}
                            </span>
                            <span className="text-xs text-gold-500 capitalize">
                              {placeholder.type}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Warnings */}
              {previewData.warnings.length > 0 && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-sm font-medium text-yellow-300 mb-2">
                    Avisos:
                  </p>
                  <ul className="text-sm text-yellow-400/80 space-y-1">
                    {previewData.warnings.map((warning, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-yellow-500">•</span>
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-gold-500/20">
                <Button
                  onClick={() => setActiveTab('info')}
                  variant="outline"
                >
                  Voltar
                </Button>
                <Button onClick={() => setActiveTab('info')}>
                  Prosseguir com Upload
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'mapping' && (
            <div className="space-y-4">
              <div className="bg-gold-500/10 border border-gold-500/30 rounded-lg p-4">
                <p className="text-sm text-gold-300">
                  Configure como cada placeholder será preenchido com dados do certificado.
                </p>
              </div>

              {mappings.map((mapping, index) => {
                const placeholder = placeholders[index]
                const knownField = CERTIFICATE_DOCX_FIELDS[placeholder?.name as keyof typeof CERTIFICATE_DOCX_FIELDS]

                return (
                  <div key={index} className="bg-navy-900/60 border border-gold-500/15 rounded-lg p-4">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-gold-200">
                            {placeholder?.name}
                          </p>
                          {knownField && (
                            <p className="text-sm text-gold-400">
                              {knownField.description}
                            </p>
                          )}
                          {/* Location info in mapping */}
                          {placeholder?.locations && placeholder.locations.length > 0 && (
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <MapPin className="w-3.5 h-3.5 text-gold-500" />
                              {placeholder.locations.map((loc, i) => (
                                <span
                                  key={i}
                                  className="text-xs bg-navy-800 text-gold-400 px-2 py-0.5 rounded border border-gold-500/20"
                                >
                                  {getLocationLabel(loc.location)} ({loc.count}x)
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          placeholder?.required
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-navy-800 text-gold-400 border border-gold-500/20'
                        }`}>
                          {placeholder?.required ? 'Obrigatório' : 'Opcional'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gold-400 mb-1.5">
                            Fonte de Dados
                          </label>
                          <select
                            value={mapping.source}
                            onChange={(e) =>
                              handleMappingChange(index, 'source', e.target.value)
                            }
                            className="w-full px-3 py-2 text-sm bg-navy-900/80 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                          >
                            <option value="">Valor fixo</option>
                            {Object.entries(CERTIFICATE_DOCX_FIELDS).map(([key, field]) => (
                              <option key={key} value={key}>
                                {field.description}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gold-400 mb-1.5">
                            Transformação
                          </label>
                          <select
                            value={mapping.transform || ''}
                            onChange={(e) =>
                              handleMappingChange(index, 'transform', e.target.value || undefined)
                            }
                            className="w-full px-3 py-2 text-sm bg-navy-900/80 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50 disabled:opacity-50"
                            disabled={!mapping.source}
                          >
                            <option value="">Nenhuma</option>
                            <option value="uppercase">MAIÚSCULAS</option>
                            <option value="lowercase">minúsculas</option>
                            <option value="capitalize">Capitalizar</option>
                            <option value="date-short">Data curta (DD/MM/AAAA)</option>
                            <option value="date-long">Data por extenso</option>
                          </select>
                        </div>
                      </div>

                      {!mapping.source && (
                        <div>
                          <label className="block text-xs font-medium text-gold-400 mb-1.5">
                            Valor Fixo
                          </label>
                          <input
                            type="text"
                            value={mapping.fixedValue || ''}
                            onChange={(e) =>
                              handleMappingChange(index, 'fixedValue', e.target.value)
                            }
                            className="w-full px-3 py-2 text-sm bg-navy-900/80 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                            placeholder="Digite o valor fixo"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gold-500/20 flex justify-end gap-3">
          <Button onClick={onClose} variant="outline" disabled={uploading}>
            Cancelar
          </Button>

          {activeTab === 'info' && !editingTemplate && (
            <Button
              onClick={handleUpload}
              disabled={!file || !name || uploading}
              loading={uploading}
            >
              {uploading ? 'Enviando...' : 'Enviar Template'}
            </Button>
          )}
          {activeTab === 'info' && editingTemplate && (
             <Button onClick={() => setActiveTab('mapping')}>
               Editar Mapeamentos
             </Button>
          )}

          {activeTab === 'mapping' && (
            <Button onClick={handleFinish} loading={uploading}>
              Concluir
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
