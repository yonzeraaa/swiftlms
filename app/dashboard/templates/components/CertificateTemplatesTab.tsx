'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Star, StarOff, AlertCircle, Check, X, FileText, Code, Info } from 'lucide-react'
import Card from '../../../components/Card'
import Spinner from '../../../components/ui/Spinner'
import Button from '../../../components/Button'
import { CertificateTemplate, TEMPLATE_VARIABLES, DEFAULT_CERTIFICATE_HTML } from '@/types/certificates'
import { CertificateDocxTemplate } from '@/types/certificate-docx'
import {
  getCertificateTemplates,
  createCertificateTemplate,
  updateCertificateTemplate,
  deleteCertificateTemplate,
  setDefaultTemplate
} from '@/lib/actions/certificate-templates'
import { validateTemplate } from '@/lib/utils/template-renderer'
import DocxTemplatesSection from './DocxTemplatesSection'
import DocxTemplateUploadModal from './DocxTemplateUploadModal'

const INK = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'
const PARCH = '#faf6ee'
const BORDER = 'rgba(30,19,12,0.14)'

type TemplateFormat = 'html' | 'docx'

export default function CertificateTemplatesTab() {
  const [templateFormat, setTemplateFormat] = useState<TemplateFormat>('html')
  const [templates, setTemplates] = useState<CertificateTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDocxModal, setShowDocxModal] = useState(false)
  const [docxRefresh, setDocxRefresh] = useState(0)
  const [editingTemplate, setEditingTemplate] = useState<CertificateTemplate | null>(null)
  const [editingDocxTemplate, setEditingDocxTemplate] = useState<CertificateDocxTemplate | undefined>(undefined)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    certificate_type: 'all' as 'technical' | 'lato-sensu' | 'all',
    html_content: DEFAULT_CERTIFICATE_HTML,
    css_content: '',
    is_default: false
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showVariablesHelp, setShowVariablesHelp] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    setLoading(true)
    const data = await getCertificateTemplates()
    if (data) {
      setTemplates(data.templates)
    }
    setLoading(false)
  }

  const openCreateModal = () => {
    setEditingTemplate(null)
    setFormData({
      name: '',
      description: '',
      certificate_type: 'all',
      html_content: DEFAULT_CERTIFICATE_HTML,
      css_content: '',
      is_default: false
    })
    setValidationErrors([])
    setShowModal(true)
  }

  const openEditModal = (template: CertificateTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      description: template.description || '',
      certificate_type: template.certificate_type as 'technical' | 'lato-sensu' | 'all',
      html_content: template.html_content,
      css_content: template.css_content || '',
      is_default: template.is_default
    })
    setValidationErrors([])
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validar template
    const validation = validateTemplate(formData.html_content)
    if (!validation.valid) {
      setValidationErrors(validation.errors)
      return
    }

    setSubmitting(true)

    try {
      if (editingTemplate) {
        const result = await updateCertificateTemplate(editingTemplate.id, formData)
        if (!result.success) {
          throw new Error(result.error)
        }
        setMessage({ type: 'success', text: 'Template atualizado com sucesso!' })
      } else {
        const result = await createCertificateTemplate(formData)
        if (!result.success) {
          throw new Error(result.error)
        }
        setMessage({ type: 'success', text: 'Template criado com sucesso!' })
      }

      setShowModal(false)
      await fetchTemplates()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao salvar template' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return

    const result = await deleteCertificateTemplate(id)
    if (result.success) {
      setMessage({ type: 'success', text: 'Template excluído com sucesso!' })
      await fetchTemplates()
    } else {
      setMessage({ type: 'error', text: result.error || 'Erro ao excluir template' })
    }
  }

  const handleSetDefault = async (id: string) => {
    const result = await setDefaultTemplate(id)
    if (result.success) {
      setMessage({ type: 'success', text: 'Template definido como padrão!' })
      await fetchTemplates()
    } else {
      setMessage({ type: 'error', text: result.error || 'Erro ao definir template padrão' })
    }
  }

  return (
    <div className="space-y-6 flex flex-col w-full">
      {/* Format Switcher & Action Button */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex gap-2 p-1 bg-transparent border border-[#1e130c]/15 self-start">
          <button
            onClick={() => setTemplateFormat('html')}
            className={`flex items-center gap-2 px-4 py-1.5 transition-all duration-300 ${
              templateFormat === 'html'
                ? 'bg-[#1e130c] text-[#faf6ee]'
                : 'text-[#7a6350] hover:text-[#1e130c]'
            }`}
            style={{ fontFamily: 'var(--font-lora)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            <Code className="w-3.5 h-3.5" />
            Templates HTML
          </button>
          <button
            onClick={() => setTemplateFormat('docx')}
            className={`flex items-center gap-2 px-4 py-1.5 transition-all duration-300 ${
              templateFormat === 'docx'
                ? 'bg-[#1e130c] text-[#faf6ee]'
                : 'text-[#7a6350] hover:text-[#1e130c]'
            }`}
            style={{ fontFamily: 'var(--font-lora)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            <FileText className="w-3.5 h-3.5" />
            Templates DOCX
          </button>
        </div>

        <button
          onClick={templateFormat === 'html' ? openCreateModal : () => setShowDocxModal(true)}
          style={{ padding: '0.75rem 2rem', backgroundColor: INK, color: PARCH, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-lora)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontSize: '0.85rem' }}
        >
          {templateFormat === 'html' ? 'Novo Template HTML' : 'Novo Template DOCX'}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-3 flex items-center gap-3 border ${
          message.type === 'success'
            ? 'bg-[#1e130c]/[0.02] text-[#1e130c] border-[#1e130c]/10'
            : 'bg-[#7a6350]/[0.05] text-[#7a6350] italic border-[#7a6350]/20'
        }`} style={{ fontFamily: 'var(--font-lora)', fontSize: '0.9rem' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 opacity-50" />
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Templates List */}
      {loading ? (
        <Spinner fullPage size="xl" />
      ) : templateFormat === 'html' ? (
        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse min-w-[800px]">
            <thead>
              <tr style={{ borderBottom: `2px solid ${INK}` }}>
                <th className="px-4 py-3 text-left" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Nome do Modelo</th>
                <th className="px-4 py-3 text-left w-40" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Tipo</th>
                <th className="px-4 py-3 text-center w-24" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Padrão</th>
                <th className="px-4 py-3 text-center w-24" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Status</th>
                <th className="px-4 py-3 text-right w-32" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center italic text-[#7a6350] border border-dashed border-[#1e130c]/10">
                    Nenhum template cadastrado no acervo.
                  </td>
                </tr>
              ) : (
                templates.map(template => (
                  <tr key={template.id} style={{ borderBottom: `1px dashed ${BORDER}` }} className="hover:bg-[#1e130c]/[0.02] transition-colors group">
                    <td className="px-4 py-4 align-top">
                      <div>
                        <p style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.15rem', fontWeight: 600, color: INK, display: 'block' }}>{template.name}</p>
                        {template.description && (
                          <p style={{ fontFamily: 'var(--font-lora)', fontSize: '0.85rem', fontStyle: 'italic', color: ACCENT, mt: '0.25rem' }}>{template.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-6 align-top">
                      <span style={{ 
                        display: 'inline-block',
                        fontSize: '0.65rem', 
                        fontWeight: 700, 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.05em',
                        color: INK,
                        backgroundColor: 'rgba(30,19,12,0.05)',
                        padding: '0.35rem 0.75rem',
                        border: `1px solid ${INK}`
                      }}>
                        {template.certificate_type === 'technical' ? 'Técnico' :
                         template.certificate_type === 'lato-sensu' ? 'Lato Sensu' : 'Todos'}
                      </span>
                    </td>
                    <td className="px-4 py-6 text-center align-top">
                      {template.is_default ? (
                        <Star className="w-5 h-5 text-[#8b6d22] inline fill-[#8b6d22]" />
                      ) : (
                        <button
                          onClick={() => handleSetDefault(template.id)}
                          className="text-[#7a6350]/30 hover:text-[#8b6d22] transition-colors"
                          title="Definir como padrão"
                        >
                          <StarOff className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-6 text-center align-top">
                      {template.is_active ? (
                        <span className="text-[#1e130c] font-bold text-xs uppercase tracking-widest">Ativo</span>
                      ) : (
                        <span className="text-[#7a6350] italic text-xs uppercase tracking-widest opacity-50">Inativo</span>
                      )}
                    </td>
                    <td className="px-4 py-6 text-right align-top">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(template)}
                          className="p-2 text-[#8b6d22] hover:text-[#1e130c] transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(template.id)}
                          className="p-2 text-[#7a6350] hover:text-red-800 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <DocxTemplatesSection 
          onRefresh={docxRefresh} 
          onEdit={(template) => {
            setEditingDocxTemplate(template)
            setShowDocxModal(true)
          }}
        />
      )}

      {/* DOCX Upload Modal */}
      {showDocxModal && (
        <DocxTemplateUploadModal
          editingTemplate={editingDocxTemplate}
          onClose={() => {
            setShowDocxModal(false)
            setEditingDocxTemplate(undefined)
          }}
          onSuccess={() => {
            setShowDocxModal(false)
            setEditingDocxTemplate(undefined)
            setDocxRefresh(prev => prev + 1)
          }}
        />
      )}

      {/* Modal Create/Edit HTML */}
      {showModal && (
        <div className="fixed inset-0 bg-[#1e130c]/40 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] overflow-y-auto">
          <div className="relative bg-[#faf6ee] w-full max-w-4xl p-8 md:p-10 shadow-2xl border border-[#1e130c]/20 my-8">
            <div className="flex items-center justify-between mb-10 border-b border-[#1e130c]/10 pb-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 border border-[#1e130c]/10 bg-[#faf6ee] flex items-center justify-center">
                  <Code className="w-6 h-6 text-[#8b6d22]" />
                </div>
                <div>
                  <h2 className="font-[family-name:var(--font-playfair)] text-2xl md:text-3xl font-bold text-[#1e130c] leading-tight">
                    {editingTemplate ? 'Vincular Template HTML' : 'Novo Template HTML'}
                  </h2>
                  <p className="text-[0.65rem] text-[#8b6d22] font-bold uppercase tracking-widest mt-1">Configuração de Certificado Digital</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#7a6350] hover:text-[#1e130c] transition-colors p-2"
                aria-label="Fechar"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 relative z-10 font-[family-name:var(--font-lora)]">
              {validationErrors.length > 0 && (
                <div className="p-6 bg-red-900/5 border border-red-900/20">
                  <div className="flex items-center gap-3 text-red-900 mb-3">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-[0.7rem] font-bold uppercase tracking-widest">Inconsistências no Código HTML</span>
                  </div>
                  <ul className="list-disc list-inside text-[#7a6350] italic text-sm space-y-1 ml-4">
                    {validationErrors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-1">
                  <label className="block text-[0.7rem] font-bold uppercase text-[#7a6350] tracking-[0.2em] mb-2">Nome do Modelo <span className="text-[#8b6d22]">*</span></label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/30 focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none text-lg font-medium"
                    required
                    placeholder="Ex: Certificado IPETEC 2024"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-[0.7rem] font-bold uppercase text-[#7a6350] tracking-[0.2em] mb-2">Segmento Acadêmico <span className="text-[#8b6d22]">*</span></label>
                  <select
                    value={formData.certificate_type}
                    onChange={(e) => setFormData({ ...formData, certificate_type: e.target.value as any })}
                    className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none cursor-pointer font-bold italic text-sm"
                    required
                  >
                    <option value="all" className="bg-[#faf6ee] not-italic">Todos os tipos</option>
                    <option value="technical" className="bg-[#faf6ee] not-italic">Ensino Técnico</option>
                    <option value="lato-sensu" className="bg-[#faf6ee] not-italic">Lato Sensu (Pós)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[0.7rem] font-bold uppercase text-[#7a6350] tracking-[0.2em] mb-2">Breve Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/30 focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none resize-none italic text-sm"
                  rows={2}
                  placeholder="Notas internas sobre este modelo..."
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#1e130c]/10 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[0.7rem] font-bold uppercase text-[#1e130c] tracking-[0.2em]">Estrutura HTML</span>
                    <span className="text-[0.6rem] text-[#8b6d22] font-bold uppercase bg-[#8b6d22]/5 px-2 py-0.5 border border-[#8b6d22]/10 tracking-widest">Dimensões: 1100x850px</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowVariablesHelp(!showVariablesHelp)}
                    className="text-[0.6rem] uppercase font-bold tracking-[0.15em] text-[#8b6d22] hover:text-[#1e130c] transition-colors flex items-center gap-2"
                  >
                    <Info className="w-3 h-3" />
                    {showVariablesHelp ? 'Ocultar Dicionário' : 'Ver Dicionário de Variáveis'}
                  </button>
                </div>

                {showVariablesHelp && (
                  <div className="p-6 bg-white/40 border border-[#1e130c]/10 animate-in fade-in slide-in-from-top-2 duration-300">
                    <p className="text-[0.65rem] text-[#1e130c] font-bold mb-4 uppercase tracking-[0.2em] opacity-60">Variáveis Dinâmicas Disponíveis:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Object.entries(TEMPLATE_VARIABLES).map(([key, value]) => (
                        <div key={key} className="flex flex-col gap-1.5">
                          <code className="text-[#8b6d22] font-bold text-xs bg-[#8b6d22]/5 px-1.5 py-0.5 self-start">{value.placeholder}</code>
                          <span className="text-[0.65rem] text-[#7a6350] italic leading-tight uppercase tracking-tighter">{value.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="relative group">
                  <textarea
                    value={formData.html_content}
                    onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                    className="w-full px-6 py-6 bg-white/20 border border-[#1e130c]/10 text-[#1e130c] focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none font-mono text-[0.8rem] resize-y leading-relaxed"
                    rows={12}
                    required
                    placeholder="Cole aqui o código estrutural HTML..."
                  />
                  <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-[#8b6d22]/20 to-transparent pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[0.7rem] font-bold uppercase text-[#7a6350] tracking-[0.2em] mb-3">Estilos CSS Complementares</label>
                <textarea
                  value={formData.css_content}
                  onChange={(e) => setFormData({ ...formData, css_content: e.target.value })}
                  className="w-full px-6 py-4 bg-white/20 border border-[#1e130c]/10 text-[#1e130c] focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none font-mono text-[0.8rem] resize-y"
                  rows={4}
                  placeholder="Defina aqui os estilos CSS específicos para este template..."
                />
              </div>

              <div className="flex items-center gap-4 py-4 p-6 bg-white/20 border border-[#1e130c]/5">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="w-5 h-5 text-[#8b6d22] bg-transparent border-[#1e130c]/30 rounded-none focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                </div>
                <label htmlFor="is_default" className="text-[#1e130c] text-[0.7rem] font-bold uppercase tracking-[0.15em] cursor-pointer">
                  Definir como Matriz Padrão para emissão de novos certificados
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-10 border-t border-[#1e130c]/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="flex-1 py-4 border border-[#1e130c]/20 text-[#1e130c] font-bold uppercase tracking-[0.2em] text-[0.65rem] hover:bg-[#1e130c]/5 transition-colors disabled:opacity-30"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-2 py-4 bg-[#1e130c] text-[#faf6ee] font-bold uppercase tracking-[0.2em] text-[0.65rem] hover:bg-[#8b6d22] transition-all flex items-center justify-center gap-3 px-10 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-3 h-3 border-2 border-[#faf6ee]/20 border-t-[#faf6ee] rounded-full animate-spin" />
                      <span>Gravando...</span>
                    </>
                  ) : (
                    <span>{editingTemplate ? 'Efetivar Alterações' : 'Publicar Template HTML'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
