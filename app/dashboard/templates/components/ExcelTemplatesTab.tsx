'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, FileSpreadsheet, Trash2, Eye, MoreVertical, Download, Copy, Edit3, Search } from 'lucide-react'
import { useAuth } from '../../../providers/AuthProvider'
import TemplateUploadModal from './TemplateUploadModal'
import Card from '../../../components/Card'
import Button from '../../../components/Button'
import Modal from '../../../components/Modal'
import { useToast } from '../../../components/Toast'
import Spinner from '../../../components/ui/Spinner'
import { DEFAULT_TEMPLATE_ICON, TEMPLATE_CATEGORIES } from '../constants'
import {
  getTemplates,
  deleteTemplate,
  getTemplatePreviewUrl,
  duplicateTemplate
} from '@/lib/actions/admin-templates'

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

export default function ExcelTemplatesTab() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [templates, setTemplates] = useState<ExcelTemplate[]>([])
  const [allTemplates, setAllTemplates] = useState<ExcelTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top?: number; bottom?: number; left: number; isUp?: boolean } | null>(null)
  const [dropdownTemplate, setDropdownTemplate] = useState<ExcelTemplate | null>(null)
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

  const getTemplatesByCategory = (category: string) => {
    if (category === 'all') return allTemplates.length
    return allTemplates.filter(t => t.category === category).length
  }

  const filterTemplates = useCallback(
    (list: ExcelTemplate[], category: string, search: string) => {
      return list.filter(template => {
        const matchesCategory = category === 'all' || template.category === category
        const matchesSearch = template.name.toLowerCase().includes(search.toLowerCase()) || 
                             (template.description?.toLowerCase().includes(search.toLowerCase()) || false)
        return matchesCategory && matchesSearch
      })
    },
    []
  )

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true)
      const list = await getTemplates()
      setAllTemplates(list)
      setTemplates(filterTemplates(list, selectedCategory, searchTerm))
    } catch (error) {
      console.error('Erro ao carregar templates:', error)
      showToast('Erro ao carregar templates')
    } finally {
      setLoading(false)
    }
  }, [filterTemplates, selectedCategory, searchTerm, showToast])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  useEffect(() => {
    setTemplates(filterTemplates(allTemplates, selectedCategory, searchTerm))
  }, [allTemplates, filterTemplates, selectedCategory, searchTerm])

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
    <div className="flex flex-col w-full space-y-6">
      {/* ── Barra de Ações e Busca ── */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch gap-4">
        <div className="flex-1 flex flex-col md:flex-row gap-3">
          <div className="flex-[2] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a6350]" />
            <input
              type="text"
              placeholder="Buscar templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, color: INK, fontFamily: 'var(--font-lora)', fontSize: '0.95rem' }}
            />
          </div>
          <div className="flex-1 relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, color: INK, fontFamily: 'var(--font-lora)', cursor: 'pointer', appearance: 'none', fontSize: '0.95rem' }}
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 text-[10px]">▼</div>
          </div>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          style={{ padding: '0.75rem 2rem', backgroundColor: INK, color: PARCH, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-lora)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontSize: '0.85rem' }}
        >
          Novo Template
        </button>
      </div>

      {/* ── Lista de Templates ── */}
      {loading ? (
        <Spinner fullPage size="xl" />
      ) : templates.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-[#1e130c]/20 bg-transparent w-full">
          <div className="relative inline-block mb-4 opacity-30">
            <FileSpreadsheet className="h-16 w-16 mx-auto text-[#1e130c]" />
          </div>
          <h3 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1e130c] mb-2">
            Acervo Vazio
          </h3>
          <p className="text-[#7a6350]/70 mb-8 max-w-md mx-auto italic font-[family-name:var(--font-lora)]">
            {selectedCategory === 'all'
              ? 'Nenhum modelo de relatório Excel localizado.'
              : `Nenhum template para "${getCategoryLabel(selectedCategory)}" encontrado.`}
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            style={{ padding: '0.6rem 2rem', backgroundColor: INK, color: PARCH, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-lora)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem' }}
          >
            Realizar Upload
          </button>
        </div>
      ) : (
        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse min-w-[800px]">
            <thead>
              <tr style={{ borderBottom: `2px solid ${INK}` }}>
                <th className="px-4 py-3 text-left w-48" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Categoria</th>
                <th className="px-4 py-3 text-left" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Título e Descritivo</th>
                <th className="px-4 py-3 text-left w-40" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Criação</th>
                <th className="px-4 py-3 text-right w-20" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => {
                const CategoryIcon = getCategoryIcon(template.category)
                return (
                  <tr key={template.id} style={{ borderBottom: `1px dashed ${BORDER}` }} className="hover:bg-[#1e130c]/[0.02] transition-colors group">
                    <td className="px-4 py-4 align-top">
                      <span className="text-[0.6rem] tracking-[0.1em] uppercase border border-[#1e130c]/20 px-2 py-1 text-[#7a6350] font-bold inline-flex items-center gap-2 mt-1">
                        <CategoryIcon className="h-3 w-3" />
                        {getCategoryLabel(template.category)}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div>
                        <span style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.15rem', fontWeight: 600, color: INK, display: 'block' }}>{template.name}</span>
                        {template.description && (
                          <div className="text-xs italic text-[#7a6350] font-[family-name:var(--font-lora)] leading-relaxed max-w-xl mt-1">
                            {template.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.9rem', color: MUTED, paddingTop: '1.25rem' }}>
                      {new Date(template.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-4 text-right align-top">
                      <button
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect()
                          const isUp = window.innerHeight - rect.bottom < 250
                          setDropdownPosition({ 
                            top: isUp ? undefined : rect.bottom, 
                            bottom: isUp ? window.innerHeight - rect.top : undefined,
                            left: rect.right - 240,
                            isUp
                          })
                          setDropdownTemplate(template)
                          setOpenDropdown(template.id)
                        }}
                        className="text-[#8b6d22] hover:text-[#1e130c] p-1.5 transition-transform active:scale-90 mt-1"
                      >
                        <MoreVertical size={18} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Menu de Ações (Portal) ── */}
      {openDropdown && dropdownTemplate && dropdownPosition && (
        <>
          <div className="fixed inset-0 z-[11000] bg-transparent" onClick={() => { setOpenDropdown(null); setDropdownTemplate(null); }} />
          <div
            className="fixed w-60 bg-[#faf6ee] border border-[#1e130c]/20 shadow-2xl z-[11001] py-3 font-[family-name:var(--font-lora)] animate-in fade-in zoom-in-95 duration-200"
            style={{ 
              top: dropdownPosition.top ? `${dropdownPosition.top + 8}px` : undefined, 
              bottom: dropdownPosition.bottom ? `${dropdownPosition.bottom + 8}px` : undefined, 
              left: `${dropdownPosition.left}px` 
            }}
          >
            <div className={`absolute ${dropdownPosition.isUp ? "-bottom-2 border-b border-r" : "-top-2 border-l border-t"} right-4 w-4 h-4 bg-[#faf6ee] border-[#1e130c]/20 rotate-45`} />
            <div className="relative z-10 flex flex-col">
              {[
                { label: 'Baixar Template', icon: Download, action: () => handleDownloadTemplate(dropdownTemplate) },
                { label: 'Visualizar', icon: Eye, action: () => handlePreviewTemplate(dropdownTemplate) },
                { label: 'Duplicar', icon: Copy, action: () => handleDuplicateTemplate(dropdownTemplate) },
                { label: 'Editar Info', icon: Edit3, action: () => setEditingTemplate(dropdownTemplate) },
              ].map((opt, i) => (
                <button 
                  key={i} 
                  onClick={() => { opt.action(); setOpenDropdown(null); }} 
                  className="w-full px-5 py-3 text-left hover:bg-[#1e130c]/5 flex items-center justify-start gap-4 transition-colors"
                >
                  <opt.icon size={16} className="text-[#8b6d22]" />
                  <span style={{ fontSize: '0.95rem', color: INK, fontWeight: 500 }}>{opt.label}</span>
                </button>
              ))}
              
              <div className="border-t border-[#1e130c]/10 mt-3 pt-3">
                <button
                  onClick={() => { setTemplateToDelete(dropdownTemplate); setOpenDropdown(null); }}
                  className="w-full px-5 py-3 text-left hover:bg-[#7a6350]/10 flex items-center justify-start gap-4 transition-colors"
                >
                  <Trash2 size={16} className="text-[#7a6350] italic" />
                  <span style={{ fontSize: '0.95rem', color: '#7a6350', fontWeight: 600 }}>Expurgar Registro</span>
                </button>
              </div>
            </div>
          </div>
        </>
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

      {/* Delete Modal */}
      <Modal
        isOpen={!!templateToDelete}
        onClose={() => {
          if (!deletingTemplate) {
            setTemplateToDelete(null)
          }
        }}
        title="Expurgar Template"
      >
        <div className="font-[family-name:var(--font-lora)] text-center p-8">
          <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '2rem', color: '#7a6350', marginBottom: '1.5rem', fontWeight: 700 }}>Remover do Acervo</h2>
          <p style={{ color: INK, fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '2.5rem' }}>
            Deseja remover permanentemente o template<br/>
            <strong className="text-xl">"{templateToDelete?.name}"</strong>?<br/>
            Essa ação excluirá o arquivo do armazenamento e não poderá ser desfeita.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => setTemplateToDelete(null)}
              disabled={deletingTemplate}
              style={{ flex: 1, padding: '1rem', background: 'none', border: `1px solid ${INK}`, color: INK, cursor: 'pointer', fontWeight: 600, textTransform: 'uppercase' }}
            >
              Manter
            </button>
            <button
              onClick={handleDeleteTemplate}
              disabled={deletingTemplate}
              style={{ flex: 1, padding: '1rem', backgroundColor: '#7a6350', color: PARCH, border: 'none', cursor: 'pointer', fontWeight: 600, textTransform: 'uppercase' }}
            >
              {deletingTemplate ? 'Removendo...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
