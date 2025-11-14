'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, FileSpreadsheet, Trash2, Eye, MoreVertical, Download, Copy, Edit3 } from 'lucide-react'
import { useAuth } from '../../providers/AuthProvider'
import TemplateUploadModal from './components/TemplateUploadModal'
import Card from '../../components/Card'
import Button from '../../components/Button'
import Breadcrumbs from '../../components/ui/Breadcrumbs'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { DEFAULT_TEMPLATE_ICON, TEMPLATE_CATEGORIES } from './constants'
import {
  getTemplates,
  deleteTemplate,
  getTemplatePreviewUrl,
  duplicateTemplate
} from '@/lib/actions/admin-templates'

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
  const { showToast } = useToast()
  const [templates, setTemplates] = useState<ExcelTemplate[]>([])
  const [allTemplates, setAllTemplates] = useState<ExcelTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<ExcelTemplate | null>(null)
  const [templateToDelete, setTemplateToDelete] = useState<ExcelTemplate | null>(null)
  const [deletingTemplate, setDeletingTemplate] = useState(false)

  const categories = useMemo(
    () => [
      { value: 'all', label: 'Todos', icon: DEFAULT_TEMPLATE_ICON },
      ...TEMPLATE_CATEGORIES,
    ],
    []
  )

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.value === category)
    return cat?.icon || DEFAULT_TEMPLATE_ICON
  }

  const getCategoryLabel = (category: string) => {
    const cat = categories.find(c => c.value === category)
    return cat?.label || 'Templates'
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      users: { bg: 'from-blue-500/20 to-blue-600/10', text: 'text-blue-400', border: 'border-blue-500/30', badge: 'from-blue-500/30 to-blue-600/20' },
      grades: { bg: 'from-green-500/20 to-green-600/10', text: 'text-green-400', border: 'border-green-500/30', badge: 'from-green-500/30 to-green-600/20' },
      enrollments: { bg: 'from-amber-500/20 to-amber-600/10', text: 'text-amber-400', border: 'border-amber-500/30', badge: 'from-amber-500/30 to-amber-600/20' },
      access: { bg: 'from-purple-500/20 to-purple-600/10', text: 'text-purple-400', border: 'border-purple-500/30', badge: 'from-purple-500/30 to-purple-600/20' },
      'student-history': { bg: 'from-emerald-500/20 to-emerald-600/10', text: 'text-emerald-400', border: 'border-emerald-500/30', badge: 'from-emerald-500/30 to-emerald-600/20' },
    }
    return colors[category as keyof typeof colors] || colors.users
  }

  const getTemplatesByCategory = (category: string) => {
    if (category === 'all') return allTemplates.length
    return allTemplates.filter(t => t.category === category).length
  }

  const filterTemplates = useCallback(
    (list: ExcelTemplate[], category: string) => {
      if (category === 'all') return list
      return list.filter(template => template.category === category)
    },
    []
  )

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true)
      const list = await getTemplates()
      setAllTemplates(list)
      setTemplates(filterTemplates(list, selectedCategory))
    } catch (error) {
      console.error('Erro ao carregar templates:', error)
      showToast('Erro ao carregar templates')
    } finally {
      setLoading(false)
    }
  }, [filterTemplates, selectedCategory, showToast])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  useEffect(() => {
    setTemplates(filterTemplates(allTemplates, selectedCategory))
  }, [allTemplates, filterTemplates, selectedCategory])

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return
    try {
      setDeletingTemplate(true)
      await deleteTemplate(templateToDelete.id)
      showToast('Template deletado com sucesso!')
      setTemplateToDelete(null)
      fetchTemplates()
    } catch (error: any) {
      console.error('Erro ao deletar template:', error)
      showToast(`Erro ao deletar template: ${error.message}`)
    } finally {
      setDeletingTemplate(false)
    }
  }

  const handleDownloadTemplate = async (template: ExcelTemplate) => {
    try {
      showToast('Iniciando download...')
      window.open(`/api/templates/${template.id}/download`, '_blank')
    } catch (error: any) {
      console.error('Erro ao baixar template:', error)
      showToast(`Erro ao baixar template: ${error.message}`)
    }
  }

  const handlePreviewTemplate = async (template: ExcelTemplate) => {
    try {
      const signedUrl = await getTemplatePreviewUrl(template.id)
      window.open(signedUrl, '_blank', 'noopener,noreferrer')
      showToast('Visualizando template em nova aba')
    } catch (error: any) {
      console.error('Erro ao visualizar template:', error)
      showToast(`Erro ao visualizar template: ${error.message}`)
    }
  }

  const handleDuplicateTemplate = async (template: ExcelTemplate) => {
    try {
      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      await duplicateTemplate(template.id, user.id)
      showToast('Template duplicado com sucesso!')
      fetchTemplates()
    } catch (error: any) {
      console.error('Erro ao duplicar template:', error)
      showToast(`Erro ao duplicar template: ${error.message}`)
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs className="mb-2" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gold flex items-center gap-2">
            <FileSpreadsheet className="w-8 h-8 text-gold-400" />
            Templates Excel
          </h1>
          <p className="text-gold-300 mt-1">
            Gerencie templates personalizados para relatórios
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-5 h-5" />}
          onClick={() => setShowUploadModal(true)}
        >
          Novo Template
        </Button>
      </div>

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
            {selectedCategory === 'all'
              ? 'Nenhum template encontrado'
              : `Nenhum template de ${getCategoryLabel(selectedCategory)} encontrado`}
          </h3>
          <p className="text-gold-300/70 mb-8 max-w-md mx-auto">
            {selectedCategory === 'all'
              ? 'Faça upload de um template Excel personalizado para começar a gerar relatórios profissionais com sua marca'
              : `Faça upload de um template Excel para relatórios de ${getCategoryLabel(selectedCategory)}`}
          </p>
          <Button
            onClick={() => setShowUploadModal(true)}
            variant="primary"
            className="gap-2"
          >
            <Plus className="h-5 w-5" />
            {selectedCategory === 'all' ? 'Criar Primeiro Template' : `Criar Template de ${getCategoryLabel(selectedCategory)}`}
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => {
            const CategoryIcon = getCategoryIcon(template.category)
            const colors = getCategoryColor(template.category)
            return (
              <Card
                key={template.id}
                variant="default"
                hoverable
                depth={3}
                className={`p-6 group relative border-l-4 ${colors.border}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 bg-gradient-to-br ${colors.bg} rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <FileSpreadsheet className={`h-7 w-7 ${colors.text}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1.5 text-xs bg-gradient-to-r ${colors.badge} ${colors.text} rounded-full border ${colors.border} flex items-center gap-1`}>
                      <CategoryIcon className="h-3 w-3" />
                      {getCategoryLabel(template.category)}
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
                              handlePreviewTemplate(template)
                              setOpenDropdown(null)
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm text-gold-300 hover:bg-gold-500/10 flex items-center gap-2 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                            Visualizar
                          </button>
                          <button
                            onClick={() => {
                              handleDuplicateTemplate(template)
                              setOpenDropdown(null)
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm text-gold-300 hover:bg-gold-500/10 flex items-center gap-2 transition-colors"
                          >
                            <Copy className="h-4 w-4" />
                            Duplicar
                          </button>
                          <button
                            onClick={() => {
                              setEditingTemplate(template)
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
                              setTemplateToDelete(template)
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
      {(showUploadModal || editingTemplate) && (
        <TemplateUploadModal
          onClose={() => {
            setShowUploadModal(false)
            setEditingTemplate(null)
          }}
          onSuccess={() => {
            setShowUploadModal(false)
            setEditingTemplate(null)
            fetchTemplates()
          }}
          defaultCategory={selectedCategory !== 'all' ? selectedCategory : 'users'}
          template={editingTemplate || undefined}
          onUpdate={() => {
            setEditingTemplate(null)
            fetchTemplates()
          }}
        />
      )}

      <Modal
        isOpen={!!templateToDelete}
        onClose={() => {
          if (!deletingTemplate) {
            setTemplateToDelete(null)
          }
        }}
        title="Confirmar exclusão"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setTemplateToDelete(null)}
              disabled={deletingTemplate}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteTemplate}
              loading={deletingTemplate}
            >
              Confirmar exclusão
            </Button>
          </div>
        }
      >
        <p className="text-gold-200">
          Tem certeza de que deseja remover o template{' '}
          <span className="font-semibold text-gold-300">{templateToDelete?.name}</span>?
          Essa ação excluirá o arquivo do armazenamento e não poderá ser desfeita.
        </p>
      </Modal>
    </div>
  )
}
