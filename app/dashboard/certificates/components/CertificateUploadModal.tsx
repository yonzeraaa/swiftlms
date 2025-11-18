'use client'

import { useState, useRef } from 'react'
import { X, Upload, FileText, File as FileIcon, CheckCircle, AlertCircle } from 'lucide-react'
import Button from '../../../components/Button'
import Card from '../../../components/Card'
import { uploadCertificateFile, checkDocxToPdfAvailability } from '@/lib/actions/certificate-upload'
import toast from 'react-hot-toast'

interface CertificateUploadModalProps {
  certificateId: string
  certificateNumber: string
  studentName: string
  onClose: () => void
  onSuccess: () => void
}

export default function CertificateUploadModal({
  certificateId,
  certificateNumber,
  studentName,
  onClose,
  onSuccess,
}: CertificateUploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [convertToPdf, setConvertToPdf] = useState(true)
  const [pdfAvailable, setPdfAvailable] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Verificar disponibilidade de conversão PDF
  useState(() => {
    checkDocxToPdfAvailability().then((result) => {
      setPdfAvailable(result.available)
    })
  })

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
    if (droppedFile) {
      validateAndSetFile(droppedFile)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      validateAndSetFile(selectedFile)
    }
  }

  const validateAndSetFile = (selectedFile: File) => {
    const isDocx = selectedFile.name.endsWith('.docx') ||
                   selectedFile.type.includes('wordprocessingml')
    const isPdf = selectedFile.name.endsWith('.pdf') ||
                  selectedFile.type === 'application/pdf'

    if (!isDocx && !isPdf) {
      setErrorMessage('Por favor, selecione um arquivo DOCX ou PDF')
      return
    }

    setFile(selectedFile)
    setErrorMessage('')
  }

  const handleUpload = async () => {
    if (!file) {
      setErrorMessage('Selecione um arquivo')
      return
    }

    setUploading(true)
    setUploadStatus('uploading')
    setErrorMessage('')

    try {
      await uploadCertificateFile(certificateId, file, convertToPdf)

      setUploadStatus('success')
      toast.success('Certificado enviado com sucesso!')

      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error)
      setErrorMessage(error.message || 'Erro ao fazer upload do certificado')
      setUploadStatus('error')
      toast.error('Erro ao enviar certificado')
    } finally {
      setUploading(false)
    }
  }

  const getFileIcon = () => {
    if (!file) return <Upload className="w-12 h-12 text-neutral-400" />

    const isDocx = file.name.endsWith('.docx')
    return isDocx ? (
      <FileText className="w-12 h-12 text-blue-500" />
    ) : (
      <FileIcon className="w-12 h-12 text-red-500" />
    )
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">
                Upload de Certificado
              </h2>
              <p className="text-sm text-neutral-500">
                {studentName} - {certificateNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
            disabled={uploading}
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
              {getFileIcon()}

              {!file ? (
                <>
                  <p className="text-sm font-medium text-neutral-700 mb-2 mt-4">
                    Arraste um arquivo DOCX ou PDF ou clique para selecionar
                  </p>
                  <p className="text-xs text-neutral-500 mb-4">
                    Formatos aceitos: .docx, .pdf (máx. 10MB)
                  </p>
                </>
              ) : (
                <div className="mt-4">
                  <p className="text-sm font-medium text-neutral-900">
                    {file.name}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                size="sm"
                disabled={uploading}
                className="mt-2"
              >
                {file ? 'Trocar Arquivo' : 'Selecionar Arquivo'}
              </Button>
            </div>
          </div>

          {/* Convert to PDF Option */}
          {file && file.name.endsWith('.docx') && pdfAvailable && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={convertToPdf}
                  onChange={(e) => setConvertToPdf(e.target.checked)}
                  className="mt-1"
                  disabled={uploading}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    Converter automaticamente para PDF
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    O arquivo DOCX será convertido para PDF e armazenado. Isso facilita a visualização
                    e impressão do certificado.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Info */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
            <p className="text-xs text-neutral-600">
              <strong>Dica:</strong> Certifique-se de que o arquivo contém todas as informações
              corretas do aluno e do curso antes de fazer o upload. O arquivo será associado
              permanentemente a este certificado.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          )}

          {/* Success Message */}
          {uploadStatus === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700">
                Certificado enviado com sucesso!
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-200 flex justify-end gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={uploading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            loading={uploading}
          >
            {uploading ? 'Enviando...' : 'Enviar Certificado'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
