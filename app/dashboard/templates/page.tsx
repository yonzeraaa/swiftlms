'use client'

import { useState, useEffect } from 'react'
import { Plus, FileSpreadsheet, Trash2, Eye, Users, Award, BookOpen, Activity, MoreVertical, Sparkles, Download, Copy, Edit3 } from 'lucide-react'
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
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const supabase = createClient()

  const categories = [
    { value: 'all', label: 'Todos', icon: FileSpreadsheet },
    { value: 'users', label: 'Usuários', icon: Users },
    { value: 'grades', label: 'Notas', icon: Award },
    { value: 'enrollments', label: 'Matrículas', icon: BookOpen },
    { value: 'access', label: 'Acessos', icon: Activity },
  ]

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.value === category)
    return cat?.icon || FileSpreadsheet
  }

  const getTemplatesByCategory = (category: string) => {
    if (category === 'all') return templates.length
    return templates.filter(t => t.category === category).length
  }

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

      {/* Banner Welcome/Hero */}
      <Card variant="gradient" className="relative overflow-hidden" depth={4}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gold-500/20 rounded-xl backdrop-blur-sm">
              <FileSpreadsheet className="w-10 h-10 text-gold-400 animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gold-100 flex items-center gap-2">
                Templates Excel
                <Sparkles className="w-6 h-6 text-gold-400 animate-pulse" />
              </h1>
              <p className="text-gold-300/80 mt-1">
                Gerencie e personalize seus templates de relatórios
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-2xl font-bold text-gold-200">{templates.length}</span>
            <span className="text-gold-400/60 text-sm">templates ativos</span>
          </div>
        </div>
        <Button
          onClick={() => setShowUploadModal(true)}
          variant="secondary"
          className="mt-4 gap-2"
          glow
        >
          <Plus className="h-4 w-4" />
          Novo Template
        </Button>
      </Card>

      {/* Filtros por categoria com ícones */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => {
          const Icon = cat.icon
          const count = getTemplatesByCategory(cat.value)
          return (
            <Button
              key={cat.value}
              variant={selectedCategory === cat.value ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedCategory(cat.value)}
              className="gap-2 transition-all duration-300"
            >
              <Icon className="h-4 w-4" />
              {cat.label}
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-gold-500/20 text-gold-300">
                {count}
              </span>
            </Button>
          )
        })}
      </div>

      {/* Lista de Templates */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
        </div>
      ) : templates.length === 0 ? (
        <Card variant="elevated" className="p-16 text-center" depth={3}>
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-gold-500/20 to-green-500/20 rounded-full blur-2xl"></div>
            <FileSpreadsheet className="relative h-24 w-24 mx-auto text-gold-400 animate-pulse" />
          </div>
          <h3 className="text-2xl font-bold text-gold-100 mb-3">
            Nenhum template encontrado
          </h3>
          <p className="text-gold-300/70 mb-8 max-w-md mx-auto">
            Faça upload de um template Excel personalizado para começar a gerar relatórios profissionais com sua marca
          </p>
          <Button
            onClick={() => setShowUploadModal(true)}
            variant="gradient"
            glow
            className="gap-2"
          >
            <Plus className="h-5 w-5" />
            Criar Primeiro Template
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => {
            const CategoryIcon = getCategoryIcon(template.category)
            return (
              <Card
                key={template.id}
                variant="interactive"
                hoverable
                depth={3}
                className="p-6 group relative"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <FileSpreadsheet className="h-7 w-7 text-green-400" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 text-xs bg-gradient-to-r from-navy-500/30 to-gold-500/20 text-gold-300 rounded-full border border-gold-500/30 flex items-center gap-1">
                      <CategoryIcon className="h-3 w-3" />
                      {template.category}
                    </span>
                    <div className="relative">
                      <button
                        onClick={() => setOpenDropdown(openDropdown === template.id ? null : template.id)}
                        className="p-2 hover:bg-gold-500/10 rounded-lg transition-colors"
                      >
                        <MoreVertical className="h-4 w-4 text-gold-400" />
                      </button>
                      {openDropdown === template.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-navy-800 border border-gold-500/20 rounded-lg shadow-xl z-10 overflow-hidden">
                          <button
                            onClick={() => {
                              handleDownloadTemplate(template)
                              setOpenDropdown(null)
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm text-gold-300 hover:bg-gold-500/10 flex items-center gap-2 transition-colors"
                          >
                            <Download className="h-4 w-4" />
                            Baixar Template
                          </button>
                          <button
                            onClick={() => {
                              handleDownloadTemplate(template)
                              setOpenDropdown(null)
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm text-gold-300 hover:bg-gold-500/10 flex items-center gap-2 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                            Visualizar
                          </button>
                          <button
                            onClick={() => {
                              setOpenDropdown(null)
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm text-gold-300 hover:bg-gold-500/10 flex items-center gap-2 transition-colors"
                          >
                            <Copy className="h-4 w-4" />
                            Duplicar
                          </button>
                          <button
                            onClick={() => {
                              setOpenDropdown(null)
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm text-gold-300 hover:bg-gold-500/10 flex items-center gap-2 transition-colors"
                          >
                            <Edit3 className="h-4 w-4" />
                            Editar Info
                          </button>
                          <div className="h-px bg-gold-500/20 my-1"></div>
                          <button
                            onClick={() => {
                              handleDeleteTemplate(template.id, template.storage_path)
                              setOpenDropdown(null)
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                            Deletar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <h3 className="font-semibold text-lg text-gold-100 mb-2 group-hover:text-gold-200 transition-colors">
                  {template.name}
                </h3>

                {template.description && (
                  <p className="text-sm text-gold-300/70 mb-4 line-clamp-2">
                    {template.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gold-500/10">
                  <span className="text-xs text-gold-400/60">
                    {new Date(template.created_at).toLocaleDateString('pt-BR')}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownloadTemplate(template)}
                    className="gap-1 text-gold-400 hover:text-gold-300"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Baixar
                  </Button>
                </div>
              </Card>
            )
          })}
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
