'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Upload, FileText, CheckCircle, AlertCircle, Settings, MapPin, AlertTriangle, RotateCw, Info } from 'lucide-react'
import { useAuth } from '../../../providers/AuthProvider'
import Button from '../../../components/Button'
import Card from '../../../components/Card'
import Modal from '../../../components/Modal'
import { updateTemplateMappings } from '@/lib/actions/certificate-docx-templates'
import {
  CertificateKind,
  FieldMapping,
  DocxPlaceholder,
  CERTIFICATE_DOCX_FIELDS,
  CertificateDocxTemplate,
} from '@/types/certificate-docx'

const INK = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'
const PARCH = '#faf6ee'
const BORDER = 'rgba(30,19,12,0.14)'

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
      // 1. Upload temporário via API
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const uploadResponse = await fetch('/api/upload-docx-temp', {
        method: 'POST',
        body: uploadFormData,
        credentials: 'include',
      })

      const uploadResult = await uploadResponse.json()
      if (!uploadResult.success || !uploadResult.storagePath) {
        throw new Error(uploadResult.error || 'Erro ao fazer upload para análise')
      }

      setTempStoragePath(uploadResult.storagePath)

      // 2. Chamar API de análise
      const response = await fetch('/api/analyze-docx-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath: uploadResult.storagePath }),
        credentials: 'include',
      })

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
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
        setErrorMessage(result.error || 'Erro ao analisar template')
      }
    } catch (error: unknown) {
      console.error('Erro ao fazer preview:', error)
      const msg = error instanceof Error ? error.message : 'Erro ao fazer preview do template'
      setErrorMessage(msg)
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
      let storagePath = tempStoragePath
      if (!storagePath) {
        const uploadFormData = new FormData()
        uploadFormData.append('file', file)

        const tempResponse = await fetch('/api/upload-docx-temp', {
          method: 'POST',
          body: uploadFormData,
          credentials: 'include',
        })

        const tempResult = await tempResponse.json()
        if (!tempResult.success) {
          throw new Error(tempResult.error || 'Erro ao fazer upload temporário')
        }
        storagePath = tempResult.storagePath
      }

      const response = await fetch('/api/upload-docx-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempStoragePath: storagePath,
          name,
          description: description || null,
          certificateKind,
          userId: user.id,
          fileName: file.name,
        }),
        credentials: 'include',
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Erro ao fazer upload do template')
      }

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
      const msg = error instanceof Error ? error.message : 'Erro ao fazer upload do template'
      setErrorMessage(msg)
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
      onSuccess()
      onClose()
    } catch (error: unknown) {
      console.error('Erro ao salvar mapeamentos:', error)
      const msg = error instanceof Error ? error.message : 'Erro ao salvar mapeamentos'
      setErrorMessage(msg)
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
    <Modal
      isOpen={true}
      onClose={onClose}
      title={editingTemplate ? 'Vincular Atributos DOCX' : 'Novo Template DOCX'}
      size="xl"
    >
      <div className="font-[family-name:var(--font-lora)] relative z-10 px-1 py-1">
        {/* Tabs */}
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
            Matriz
          </button>
          {!editingTemplate && (
            <button
              onClick={() => setActiveTab('preview')}
              disabled={!previewData && !previewing}
              className={`flex items-center gap-2 px-4 py-2.5 text-[0.65rem] font-bold uppercase tracking-widest transition-all duration-300 ${
                activeTab === 'preview'
                  ? 'text-[#1e130c] border-b-2 border-[#8b6d22]'
                  : 'text-[#7a6350] hover:text-[#1e130c]'
              } ${!previewData && !previewing ? 'opacity-30 cursor-not-allowed' : ''}`}
            >
              Análise
            </button>
          )}
          <button
            onClick={() => setActiveTab('mapping')}
            disabled={uploadStatus !== 'success'}
            className={`flex items-center gap-2 px-4 py-2.5 text-[0.65rem] font-bold uppercase tracking-widest transition-all duration-300 ${
              activeTab === 'mapping'
                ? 'text-[#1e130c] border-b-2 border-[#8b6d22]'
                : 'text-[#7a6350] hover:text-[#1e130c]'
            } ${uploadStatus !== 'success' ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            <Settings className="h-3.5 w-3.5" />
            Vínculos
          </button>
        </div>

        {/* Conteúdo Principal */}
        <div className="space-y-6">
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Upload Area */}
              {!editingTemplate && (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed p-8 text-center transition-all duration-500 ${
                    dragActive
                      ? 'border-[#8b6d22] bg-[#8b6d22]/5'
                      : 'border-[#1e130c]/20 bg-white/30 hover:border-[#1e130c]/40'
                  }`}
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-4">
                      <div className="p-2.5 bg-[#1e130c]/5 border border-[#1e130c]/10">
                        <FileText className="h-6 w-6 text-[#1e130c]" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-[#1e130c] text-base leading-tight">{file.name}</p>
                        <p className="text-[0.6rem] text-[#7a6350] uppercase tracking-widest mt-0.5">
                          Pronto para análise
                        </p>
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
                      <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center border border-[#1e130c]/10 bg-[#faf6ee]">
                        <Upload className="h-6 w-6 text-[#8b6d22]" />
                      </div>
                      <p className="font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-1 italic">
                        Selecione a matriz Word (.docx)
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
                    accept=".docx"
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
                    className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none text-base font-medium"
                    placeholder="Ex: Certificado de Pós-Graduação"
                    disabled={uploading || !!editingTemplate}
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-[0.65rem] font-bold uppercase text-[#7a6350] tracking-[0.2em] mb-1.5">
                    Categoria <span className="text-[#8b6d22]">*</span>
                  </label>
                  <select
                    value={certificateKind}
                    onChange={(e) => setCertificateKind(e.target.value as CertificateKind)}
                    className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none cursor-pointer text-sm"
                    disabled={uploading || !!editingTemplate}
                  >
                    <option value="all" className="bg-[#faf6ee]">Todos os tipos</option>
                    <option value="technical" className="bg-[#faf6ee]">Ensino Técnico</option>
                    <option value="lato-sensu" className="bg-[#faf6ee]">Lato Sensu (Pós)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[0.65rem] font-bold uppercase text-[#7a6350] tracking-[0.2em] mb-1.5">
                    Descrição
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={1}
                    className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none resize-none italic text-sm"
                    placeholder="Observações..."
                    disabled={uploading || !!editingTemplate}
                  />
                </div>
              </div>

              {/* Status Messages */}
              {errorMessage && (
                <div className="p-4 border border-red-900/10 bg-[#7a6350]/5 flex items-start gap-3">
                  <AlertCircle className="h-4 w-4 text-[#7a6350] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[#1e130c] font-bold uppercase text-[0.6rem] tracking-widest mb-0.5">Erro</p>
                    <p className="text-xs text-[#7a6350] italic">{errorMessage}</p>
                  </div>
                </div>
              )}

              {uploadStatus === 'success' && !editingTemplate && (
                <div className="p-4 border border-[#1e130c]/10 bg-white/40 flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 text-[#8b6d22] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[#1e130c] font-bold uppercase text-[0.6rem] tracking-widest mb-0.5">Arquivo Catalogado</p>
                    <p className="text-xs text-[#7a6350] italic">
                      {placeholders.length} variáveis identificadas.
                    </p>
                  </div>
                </div>
              )}

              {warnings.length > 0 && (
                <div className="p-4 border border-[#8b6d22]/20 bg-[#8b6d22]/5 space-y-2">
                  <p className="text-[#1e130c] font-bold uppercase text-[0.6rem] tracking-widest flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#8b6d22]" />
                    Inconsistências:
                  </p>
                  <ul className="text-[0.65rem] text-[#7a6350] italic space-y-0.5 ml-5">
                    {warnings.slice(0, 3).map((warning, i) => (
                      <li key={i}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              {!editingTemplate && file && !previewData && (
                <button
                  onClick={handlePreview}
                  disabled={previewing || uploading}
                  className="w-full py-3 bg-[#1e130c] text-[#faf6ee] font-bold uppercase tracking-[0.15em] text-[0.65rem] hover:bg-[#8b6d22] transition-all flex items-center justify-center gap-3"
                >
                  {previewing ? (
                    <span>Analisando...</span>
                  ) : (
                    <span>Realizar Leitura</span>
                  )}
                </button>
              )}
            </div>
          )}

          {activeTab === 'preview' && previewData && (
            <div className="space-y-6">
              <div className="p-4 border border-[#1e130c]/10 bg-white/40 flex items-center gap-3">
                <Info className="h-4 w-4 text-[#8b6d22]" />
                <p className="text-[0.65rem] font-bold text-[#1e130c] uppercase tracking-widest">
                  {previewData.placeholders.length} variáveis extraídas
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1e130c]">Mapeamento de Variáveis</h3>
                <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {previewData.placeholders.map((placeholder, index) => {
                    const knownField = CERTIFICATE_DOCX_FIELDS[placeholder.name as keyof typeof CERTIFICATE_DOCX_FIELDS]
                    return (
                      <div key={index} className="p-4 bg-white/30 border border-[#1e130c]/10 hover:border-[#8b6d22]/30 transition-colors group">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <code className="text-[0.7rem] font-mono bg-[#1e130c]/5 text-[#1e130c] px-1.5 py-0.5 border border-[#1e130c]/10 font-bold uppercase">
                                {'{{'}{placeholder.name}{'}}'}
                              </code>
                            </div>
                            {knownField && (
                              <p className="text-[0.65rem] text-[#7a6350] italic mt-2 uppercase tracking-tight opacity-70">
                                {knownField.description}
                              </p>
                            )}
                          </div>
                          <span className={`text-[0.55rem] font-bold uppercase tracking-widest px-1.5 py-0.5 ${
                            placeholder.required ? 'bg-red-800/10 text-red-800' : 'bg-[#1e130c]/5 text-[#7a6350]'
                          }`}>
                            {placeholder.required ? 'Obrigatório' : 'Opcional'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-between pt-6 border-t border-[#1e130c]/10">
                <button
                  onClick={() => setActiveTab('info')}
                  className="px-6 py-2.5 border border-[#1e130c]/20 text-[#1e130c] font-bold uppercase tracking-widest text-[0.6rem] hover:bg-[#1e130c]/5 transition-colors"
                >
                  Revisar
                </button>
                <button
                  onClick={() => setActiveTab('info')}
                  className="px-6 py-2.5 bg-[#1e130c] text-[#faf6ee] font-bold uppercase tracking-widest text-[0.6rem] hover:bg-[#8b6d22] transition-colors"
                >
                  Publicar
                </button>
              </div>
            </div>
          )}

          {activeTab === 'mapping' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#faf6ee] border border-[#1e130c]/10">
                <p className="text-[0.65rem] text-[#7a6350] font-bold uppercase tracking-widest">
                  Defina os vínculos acadêmicos para cada campo identificado.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                {mappings.map((mapping, index) => {
                  const placeholder = placeholders[index]
                  return (
                    <div key={index} className="p-4 bg-white/30 border border-[#1e130c]/10 space-y-4">
                      <div className="flex items-start justify-between gap-4 border-b border-[#1e130c]/5 pb-2">
                        <p className="text-[0.75rem] font-bold text-[#1e130c] uppercase tracking-wider">
                          {placeholder?.name}
                        </p>
                        <span className={`text-[0.55rem] font-bold uppercase tracking-widest px-1.5 py-0.5 ${
                          placeholder?.required ? 'bg-red-800/10 text-red-800' : 'bg-[#1e130c]/5 text-[#7a6350]'
                        }`}>
                          {placeholder?.required ? 'Obrigatório' : 'Opcional'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[0.55rem] font-bold uppercase text-[#7a6350] tracking-widest mb-1">
                            Fonte de Dados
                          </label>
                          <select
                            value={mapping.source}
                            onChange={(e) => handleMappingChange(index, 'source', e.target.value)}
                            className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-[#1e130c]/20 text-[#1e130c] focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none font-bold italic text-xs"
                          >
                            <option value="" className="bg-[#faf6ee] not-italic">--- Valor Fixo ---</option>
                            {Object.entries(CERTIFICATE_DOCX_FIELDS).map(([key, field]) => (
                              <option key={key} value={key} className="bg-[#faf6ee] not-italic">
                                {field.description}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[0.55rem] font-bold uppercase text-[#7a6350] tracking-widest mb-1">
                            Formatação
                          </label>
                          <select
                            value={mapping.transform || ''}
                            onChange={(e) => handleMappingChange(index, 'transform', e.target.value || undefined)}
                            className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-[#1e130c]/20 text-[#1e130c] focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none font-bold italic text-xs"
                            disabled={!mapping.source}
                          >
                            <option value="" className="bg-[#faf6ee] not-italic">Padrão</option>
                            <option value="uppercase" className="bg-[#faf6ee] not-italic">MAIÚSCULAS</option>
                            <option value="lowercase" className="bg-[#faf6ee] not-italic">minúsculas</option>
                            <option value="capitalize" className="bg-[#faf6ee] not-italic">Capitalizar</option>
                            <option value="date-short" className="bg-[#faf6ee] not-italic">Data Curta</option>
                            <option value="date-long" className="bg-[#faf6ee] not-italic">Data Extenso</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 mt-6 border-t border-[#1e130c]/10">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="flex-1 py-3 border border-[#1e130c]/20 text-[#1e130c] font-bold uppercase tracking-[0.15em] text-[0.6rem] hover:bg-[#1e130c]/5 transition-colors disabled:opacity-30"
          >
            Cancelar
          </button>

          {activeTab === 'info' && !editingTemplate && (
            <button
              onClick={handleUpload}
              disabled={!file || !name || uploading}
              className="flex-2 py-3 bg-[#1e130c] text-[#faf6ee] font-bold uppercase tracking-[0.15em] text-[0.6rem] hover:bg-[#8b6d22] transition-all flex items-center justify-center gap-2 px-8 disabled:opacity-50"
            >
              {uploading ? (
                <span>Publicando...</span>
              ) : (
                <span>Enviar Template Word</span>
              )}
            </button>
          )}

          {activeTab === 'mapping' && (
            <button
              onClick={handleFinish}
              disabled={uploading}
              className="flex-2 py-3 bg-[#1e130c] text-[#faf6ee] font-bold uppercase tracking-[0.15em] text-[0.6rem] hover:bg-[#8b6d22] transition-all flex items-center justify-center gap-2 px-8 disabled:opacity-50"
            >
              {uploading ? (
                <span>Salvando...</span>
              ) : (
                <span>Finalizar</span>
              )}
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
