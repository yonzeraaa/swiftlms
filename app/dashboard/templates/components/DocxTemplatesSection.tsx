'use client'

import { useState, useEffect } from 'react'
import { FileText, Download, Trash2, Power, Settings, AlertTriangle } from 'lucide-react'
import Button from '../../../components/Button'
import Card from '../../../components/Card'
import {
  getCertificateDocxTemplates,
  downloadCertificateDocxTemplate,
  toggleTemplateActive,
} from '@/lib/actions/certificate-docx-templates'
import { deleteTemplate } from '@/lib/actions/admin-templates'
import { CertificateDocxTemplate, CertificateKind } from '@/types/certificate-docx'
import toast from 'react-hot-toast'
import Spinner from '../../../components/ui/Spinner'

const INK = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'
const PARCH = '#faf6ee'
const BORDER = 'rgba(30,19,12,0.14)'

interface DocxTemplatesSectionProps {
  onRefresh?: number
  onEdit?: (template: CertificateDocxTemplate) => void
}

export default function DocxTemplatesSection({ onRefresh, onEdit }: DocxTemplatesSectionProps) {
  const [templates, setTemplates] = useState<CertificateDocxTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [filterKind, setFilterKind] = useState<CertificateKind>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [filterKind, onRefresh])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const data = await getCertificateDocxTemplates(filterKind === 'all' ? undefined : filterKind)
      setTemplates(data)
    } catch (error) {
      console.error('Erro ao carregar templates:', error)
      toast.error('Erro ao carregar templates')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (template: CertificateDocxTemplate) => {
    try {
      const { blob, name } = await downloadCertificateDocxTemplate(template.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Download iniciado')
    } catch (error) {
      console.error('Erro ao baixar template:', error)
      toast.error('Erro ao baixar template')
    }
  }

  const handleToggleActive = async (template: CertificateDocxTemplate) => {
    try {
      await toggleTemplateActive(template.id, !template.is_active)
      toast.success(template.is_active ? 'Template desativado' : 'Template ativado')
      loadTemplates()
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      toast.error('Erro ao alterar status do template')
    }
  }

  const handleDelete = async (template: CertificateDocxTemplate) => {
    const confirmed = confirm(
      `Tem certeza que deseja excluir o template "${template.name}"?`
    )
    if (!confirmed) return

    setDeletingId(template.id)
    try {
      await deleteTemplate(template.id)
      toast.success('Template excluído com sucesso')
      loadTemplates()
    } catch (error) {
      console.error('Erro ao excluir template:', error)
      toast.error('Erro ao excluir template')
    } finally {
      setDeletingId(null)
    }
  }

  const getCertificateKindLabel = (kind: string | null) => {
    switch (kind) {
      case 'technical':
        return 'Técnico'
      case 'lato-sensu':
        return 'Lato Sensu'
      case 'all':
        return 'Todos'
      default:
        return 'N/A'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 w-full">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 border-b border-[#1e130c]/10 pb-4">
        <label className="text-[0.6rem] font-bold uppercase tracking-[0.15em] text-[#7a6350]">Acervo por Categoria:</label>
        <select
          value={filterKind}
          onChange={(e) => setFilterKind(e.target.value as CertificateKind)}
          className="px-0 py-1.5 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none cursor-pointer font-[family-name:var(--font-lora)] text-[0.85rem] italic"
        >
          <option value="all" className="bg-[#faf6ee] not-italic">Todos os tipos acadêmicos</option>
          <option value="technical" className="bg-[#faf6ee] not-italic">Ensino Técnico</option>
          <option value="lato-sensu" className="bg-[#faf6ee] not-italic">Lato Sensu (Pós-Graduação)</option>
        </select>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-[#1e130c]/20 bg-white/10 w-full">
          <FileText className="w-12 h-12 mx-auto mb-4 text-[#1e130c] opacity-20" />
          <h3 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1e130c] mb-2 uppercase tracking-tight">Nenhum template DOCX</h3>
          <p className="text-sm text-[#7a6350] italic font-[family-name:var(--font-lora)] opacity-70">
            Realize o upload para iniciar a gestão do acervo.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div key={template.id} className="bg-white/40 border border-[#1e130c]/10 p-5 flex flex-col justify-between hover:border-[#8b6d22]/40 transition-all duration-300 group">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 border border-[#1e130c]/10 bg-[#faf6ee] flex items-center justify-center flex-shrink-0 group-hover:bg-[#8b6d22]/5 transition-colors">
                    <FileText className="w-5 h-5 text-[#8b6d22]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-[family-name:var(--font-playfair)] text-[1.05rem] font-bold text-[#1e130c] truncate group-hover:text-[#8b6d22] transition-colors leading-tight">
                      {template.name}
                    </h3>
                    <p className="text-[0.55rem] text-[#7a6350] uppercase tracking-[0.1em] font-bold mt-0.5">
                      {getCertificateKindLabel(template.certificate_kind)}
                    </p>
                  </div>
                </div>

                {template.description && (
                  <p className="text-[0.8rem] text-[#7a6350] font-[family-name:var(--font-lora)] italic line-clamp-2 leading-snug opacity-80">
                    {template.description}
                  </p>
                )}

                {/* Info List */}
                <div className="space-y-1.5 pt-3 border-t border-[#1e130c]/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.55rem] font-bold uppercase tracking-widest text-[#7a6350] opacity-60">Atributos:</span>
                    <span className="text-[0.65rem] font-bold text-[#1e130c]">
                      {template.placeholders?.length || 0} Variáveis
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[0.55rem] font-bold uppercase tracking-widest text-[#7a6350] opacity-60">Status:</span>
                    <span
                      className={`text-[0.6rem] font-bold uppercase tracking-widest ${
                        template.is_active
                          ? 'text-[#1e130c]'
                          : 'text-[#7a6350] italic opacity-40'
                      }`}
                    >
                      {template.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>

                {/* Warnings */}
                {template.validation_warnings && template.validation_warnings.length > 0 && (
                  <div className="p-3 bg-[#8b6d22]/5 border border-[#8b6d22]/20">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#8b6d22] flex-shrink-0 mt-0.5" />
                      <div className="text-[0.65rem] text-[#1e130c] italic leading-tight">
                        <p className="font-bold uppercase tracking-widest text-[0.6rem] mb-1">Inconsistências:</p>
                        <ul className="space-y-1">
                          {template.validation_warnings.slice(0, 2).map((warning, i) => (
                            <li key={i}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Grid */}
              <div className="grid grid-cols-4 gap-2 pt-6 mt-6 border-t border-[#1e130c]/5">
                <button
                  onClick={() => handleDownload(template)}
                  className="flex items-center justify-center p-2 border border-[#1e130c]/10 text-[#7a6350] hover:text-[#1e130c] hover:bg-[#1e130c]/5 transition-colors"
                  title="Download da Matriz"
                >
                  <Download className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleToggleActive(template)}
                  className={`flex items-center justify-center p-2 border border-[#1e130c]/10 transition-colors ${
                    template.is_active ? 'text-[#8b6d22] hover:bg-[#8b6d22]/5' : 'text-[#1e130c] hover:bg-[#1e130c]/5'
                  }`}
                  title={template.is_active ? "Desativar" : "Ativar"}
                >
                  <Power className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onEdit?.(template)}
                  className="flex items-center justify-center p-2 border border-[#1e130c]/10 text-[#7a6350] hover:text-[#1e130c] hover:bg-[#1e130c]/5 transition-colors"
                  title="Configurar Metadados"
                >
                  <Settings className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDelete(template)}
                  disabled={deletingId === template.id}
                  className="flex items-center justify-center p-2 border border-[#1e130c]/10 text-[#7a6350] hover:text-red-800 hover:bg-red-50/50 transition-colors disabled:opacity-30"
                  title="Expurgar do Acervo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
