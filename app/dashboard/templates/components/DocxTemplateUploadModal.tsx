'use client'

import { useState, useRef } from 'react'
import { X, Upload, FileText, CheckCircle, AlertCircle, Settings } from 'lucide-react'
import { useAuth } from '../../../providers/AuthProvider'
import Button from '../../../components/Button'
import Card from '../../../components/Card'
import {
  uploadCertificateDocxTemplate,
  updateTemplateMappings,
} from '@/lib/actions/certificate-docx-templates'
import {
  CertificateKind,
  FieldMapping,
  DocxPlaceholder,
  CERTIFICATE_DOCX_FIELDS,
} from '@/types/certificate-docx'

interface DocxTemplateUploadModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function DocxTemplateUploadModal({
  onClose,
  onSuccess,
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
  const [activeTab, setActiveTab] = useState<'info' | 'mapping'>('info')
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      } else {
        setErrorMessage('Por favor, selecione um arquivo .docx')
      }
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
        user.id
      )

      setPlaceholders(result.placeholders)
      setWarnings(result.warnings)
      setMappings(result.placeholders.map((p: DocxPlaceholder) => ({
        placeholder: p.name,
        source: p.source || '',
        transform: p.format as any,
      })))

      setUploadStatus('success')
      setActiveTab('mapping')
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error)
      setErrorMessage(error.message || 'Erro ao fazer upload do template')
      setUploadStatus('error')
    } finally {
      setUploading(false)
    }
  }

  const handleMappingChange = (index: number, field: keyof FieldMapping, value: any) => {
    const newMappings = [...mappings]
    newMappings[index] = { ...newMappings[index], [field]: value }
    setMappings(newMappings)
  }

  const handleFinish = () => {
    setUploadStatus('idle')
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">
                Novo Template DOCX
              </h2>
              <p className="text-sm text-neutral-500">
                Upload de template de certificado
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-neutral-200 px-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('info')}
              className={`py-3 px-1 border-b-2 transition-colors ${
                activeTab === 'info'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              Informações
            </button>
            <button
              onClick={() => setActiveTab('mapping')}
              disabled={uploadStatus !== 'success'}
              className={`py-3 px-1 border-b-2 transition-colors ${
                activeTab === 'mapping'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              } ${uploadStatus !== 'success' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Mapeamentos
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Upload Area */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 transition-colors ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-neutral-300 bg-neutral-50'
                }`}
              >
                <div className="text-center">
                  <Upload
                    className={`w-12 h-12 mx-auto mb-4 ${
                      dragActive ? 'text-blue-500' : 'text-neutral-400'
                    }`}
                  />
                  <p className="text-sm font-medium text-neutral-700 mb-2">
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

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Nome do Template *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Certificado de Conclusão Técnico"
                    disabled={uploading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Descrição opcional do template"
                    rows={3}
                    disabled={uploading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Tipo de Certificado
                  </label>
                  <select
                    value={certificateKind}
                    onChange={(e) => setCertificateKind(e.target.value as CertificateKind)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={uploading}
                  >
                    <option value="all">Todos os tipos</option>
                    <option value="technical">Apenas Técnico</option>
                    <option value="lato-sensu">Apenas Lato Sensu</option>
                  </select>
                </div>
              </div>

              {/* Status Messages */}
              {errorMessage && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700">{errorMessage}</p>
                </div>
              )}

              {uploadStatus === 'success' && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-green-700 font-medium">
                      Template enviado com sucesso!
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      {placeholders.length} placeholder(s) encontrado(s). Configure os mapeamentos na próxima aba.
                    </p>
                  </div>
                </div>
              )}

              {warnings.length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800 mb-2">
                    Avisos de Validação:
                  </p>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {warnings.map((warning, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span>•</span>
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'mapping' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Configure como cada placeholder será preenchido com dados do certificado.
                </p>
              </div>

              {mappings.map((mapping, index) => {
                const placeholder = placeholders[index]
                const knownField = CERTIFICATE_DOCX_FIELDS[placeholder?.name as keyof typeof CERTIFICATE_DOCX_FIELDS]

                return (
                  <Card key={index} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-neutral-900">
                            {placeholder?.name}
                          </p>
                          {knownField && (
                            <p className="text-sm text-neutral-500">
                              {knownField.description}
                            </p>
                          )}
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          placeholder?.required
                            ? 'bg-red-100 text-red-700'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}>
                          {placeholder?.required ? 'Obrigatório' : 'Opcional'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-1">
                            Fonte de Dados
                          </label>
                          <select
                            value={mapping.source}
                            onChange={(e) =>
                              handleMappingChange(index, 'source', e.target.value)
                            }
                            className="w-full px-2 py-1.5 text-sm border border-neutral-300 rounded focus:ring-2 focus:ring-blue-500"
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
                          <label className="block text-xs font-medium text-neutral-700 mb-1">
                            Transformação
                          </label>
                          <select
                            value={mapping.transform || ''}
                            onChange={(e) =>
                              handleMappingChange(index, 'transform', e.target.value || undefined)
                            }
                            className="w-full px-2 py-1.5 text-sm border border-neutral-300 rounded focus:ring-2 focus:ring-blue-500"
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
                          <label className="block text-xs font-medium text-neutral-700 mb-1">
                            Valor Fixo
                          </label>
                          <input
                            type="text"
                            value={mapping.fixedValue || ''}
                            onChange={(e) =>
                              handleMappingChange(index, 'fixedValue', e.target.value)
                            }
                            className="w-full px-2 py-1.5 text-sm border border-neutral-300 rounded focus:ring-2 focus:ring-blue-500"
                            placeholder="Digite o valor fixo"
                          />
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-200 flex justify-end gap-3">
          <Button onClick={onClose} variant="outline" disabled={uploading}>
            Cancelar
          </Button>

          {activeTab === 'info' && (
            <Button
              onClick={handleUpload}
              disabled={!file || !name || uploading}
              loading={uploading}
            >
              {uploading ? 'Enviando...' : 'Enviar Template'}
            </Button>
          )}

          {activeTab === 'mapping' && (
            <Button onClick={handleFinish}>Concluir</Button>
          )}
        </div>
      </Card>
    </div>
  )
}
