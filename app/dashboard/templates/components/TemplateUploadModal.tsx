'use client'

import { useState, useRef } from 'react'
import { X, Upload, FileSpreadsheet } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '../../../providers/AuthProvider'
import Button from '../../../components/Button'
import Card from '../../../components/Card'

interface TemplateUploadModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function TemplateUploadModal({ onClose, onSuccess }: TemplateUploadModalProps) {
  const { user } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('users')
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const categories = [
    { value: 'users', label: 'Relatório de Usuários' },
    { value: 'grades', label: 'Relatório de Notas' },
    { value: 'enrollments', label: 'Relatório de Matrículas' },
    { value: 'access', label: 'Relatório de Acessos' },
  ]

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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.name.endsWith('.xlsx')
      ) {
        setFile(file)
        if (!name) setName(file.name.replace('.xlsx', ''))
      } else {
        alert('Por favor, envie apenas arquivos .xlsx')
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setFile(file)
      if (!name) setName(file.name.replace('.xlsx', ''))
    }
  }

  const handleUpload = async () => {
    if (!file || !name || !user) {
      alert('Preencha todos os campos obrigatórios')
      return
    }

    try {
      setUploading(true)

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

      if (uploadError) throw uploadError

      // Salvar metadata no banco de dados
      const { error: dbError } = await supabase.from('excel_templates').insert({
        name,
        description: description || null,
        category,
        storage_path: uploadData.path,
        storage_bucket: 'excel-templates',
        created_by: user.id,
        is_active: true,
        metadata: null, // Será configurado manualmente depois
      })

      if (dbError) throw dbError

      alert('Template enviado com sucesso!')
      onSuccess()
    } catch (error: any) {
      console.error('Erro ao enviar template:', error)
      alert(`Erro ao enviar template: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-white dark:bg-navy-900 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-navy-800 dark:text-gold-100">
              Novo Template Excel
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-navy-800 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center transition-colors ${
              dragActive
                ? 'border-gold-500 bg-gold-500/10'
                : 'border-gray-300 dark:border-navy-700'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-green-500" />
                <div className="text-left">
                  <p className="font-medium text-navy-800 dark:text-gold-100">{file.name}</p>
                  <p className="text-sm text-gray-500">
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
                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  Arraste o arquivo Excel aqui ou
                </p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  Selecionar Arquivo
                </Button>
                <p className="text-xs text-gray-500 mt-2">Apenas arquivos .xlsx (máx 10MB)</p>
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

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nome do Template *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-navy-700 rounded-lg focus:ring-2 focus:ring-gold-500 dark:bg-navy-800"
                placeholder="Ex: Relatório de Usuários IPETEC"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Descrição
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-navy-700 rounded-lg focus:ring-2 focus:ring-gold-500 dark:bg-navy-800"
                placeholder="Descreva o propósito deste template..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Categoria *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-navy-700 rounded-lg focus:ring-2 focus:ring-gold-500 dark:bg-navy-800"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={uploading}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              className="flex-1"
              disabled={!file || !name || uploading}
            >
              {uploading ? 'Enviando...' : 'Enviar Template'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
