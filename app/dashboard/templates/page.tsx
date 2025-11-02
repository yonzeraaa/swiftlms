'use client'

import { useState, useEffect } from 'react'
import { Plus, FileSpreadsheet, Trash2, Eye } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '../../providers/AuthProvider'
import TemplateUploadModal from './components/TemplateUploadModal'
import Card from '../../components/Card'
import Button from '../../components/Button'
import Breadcrumbs from '../../components/ui/Breadcrumbs'

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

export default function TemplatesPage() {
  const { user } = useAuth()
  const [templates, setTemplates] = useState<ExcelTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const supabase = createClient()

  const categories = [
    { value: 'all', label: 'Todos' },
    { value: 'users', label: 'Usuários' },
    { value: 'grades', label: 'Notas' },
    { value: 'enrollments', label: 'Matrículas' },
    { value: 'access', label: 'Acessos' },
  ]

  useEffect(() => {
    fetchTemplates()
  }, [selectedCategory])

  const fetchTemplates = async () => {
    try {
      setLoading(true)

      let query = supabase.from('excel_templates').select('*').order('created_at', { ascending: false })

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory)
      }

      const { data, error } = await query

      if (error) throw error

      setTemplates(data || [])
    } catch (error) {
      console.error('Erro ao carregar templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTemplate = async (id: string, storagePath: string) => {
    if (!confirm('Tem certeza que deseja deletar este template?')) return

    try {
      // Deletar arquivo do storage
      const { error: storageError } = await supabase.storage
        .from('excel-templates')
        .remove([storagePath])

      if (storageError) throw storageError

      // Deletar registro do banco
      const { error: dbError } = await supabase.from('excel_templates').delete().eq('id', id)

      if (dbError) throw dbError

      alert('Template deletado com sucesso!')
      fetchTemplates()
    } catch (error: any) {
      console.error('Erro ao deletar template:', error)
      alert(`Erro ao deletar template: ${error.message}`)
    }
  }

  const handleDownloadTemplate = async (template: ExcelTemplate) => {
    try {
      const { data, error } = await supabase.storage
        .from(template.storage_bucket)
        .download(template.storage_path)

      if (error) throw error

      // Criar link de download
      const url = window.URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = `${template.name}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: any) {
      console.error('Erro ao baixar template:', error)
      alert(`Erro ao baixar template: ${error.message}`)
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Templates Excel', href: '/dashboard/templates' },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 dark:text-gold-100">
            Templates Excel
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Gerencie templates personalizados para relatórios
          </p>
        </div>

        <Button onClick={() => setShowUploadModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Template
        </Button>
      </div>

      {/* Filtros por categoria */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <Button
            key={cat.value}
            variant={selectedCategory === cat.value ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat.value)}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Lista de Templates */}
      {loading ? (
        <div className="text-center py-12">Carregando templates...</div>
      ) : templates.length === 0 ? (
        <Card className="p-12 text-center">
          <FileSpreadsheet className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Nenhum template encontrado
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Faça upload de um template Excel para começar
          </p>
          <Button onClick={() => setShowUploadModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeiro Template
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <FileSpreadsheet className="h-6 w-6 text-green-500" />
                </div>
                <span className="px-2 py-1 text-xs bg-navy-500/10 text-navy-700 dark:text-navy-300 rounded">
                  {template.category}
                </span>
              </div>

              <h3 className="font-semibold text-lg text-navy-800 dark:text-gold-100 mb-2">
                {template.name}
              </h3>

              {template.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {template.description}
                </p>
              )}

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadTemplate(template)}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Ver
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteTemplate(template.id, template.storage_path)}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                Criado em {new Date(template.created_at).toLocaleDateString('pt-BR')}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Upload */}
      {showUploadModal && (
        <TemplateUploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false)
            fetchTemplates()
          }}
        />
      )}
    </div>
  )
}
