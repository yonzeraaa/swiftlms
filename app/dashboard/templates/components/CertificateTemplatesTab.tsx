'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Star, StarOff, AlertCircle, Check, X } from 'lucide-react'
import Card from '../../../components/Card'
import Spinner from '../../../components/ui/Spinner'
import Button from '../../../components/Button'
import { CertificateTemplate, TEMPLATE_VARIABLES, DEFAULT_CERTIFICATE_HTML } from '@/types/certificates'
import {
  getCertificateTemplates,
  createCertificateTemplate,
  updateCertificateTemplate,
  deleteCertificateTemplate,
  setDefaultTemplate
} from '@/lib/actions/certificate-templates'
import { validateTemplate } from '@/lib/utils/template-renderer'

export default function CertificateTemplatesTab() {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<CertificateTemplate | null>(null)
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Action Button */}
      <div className="flex justify-end">
        <Button
          onClick={openCreateModal}
          icon={<Plus className="w-4 h-4" />}
        >
          Novo Template de Certificado
        </Button>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-green-500/20 text-green-400 border border-green-500/20'
            : 'bg-red-500/20 text-red-400 border border-red-500/20'
        }`}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {message.text}
        </div>
      )}

      {/* Templates List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-navy-800/80">
              <tr className="border-b border-gold-500/20">
                <th className="text-left py-4 px-4 text-gold-200 font-medium">Nome</th>
                <th className="text-left py-4 px-4 text-gold-200 font-medium">Tipo</th>
                <th className="text-center py-4 px-4 text-gold-200 font-medium">Padrão</th>
                <th className="text-center py-4 px-4 text-gold-200 font-medium">Ativo</th>
                <th className="text-center py-4 px-4 text-gold-200 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gold-400">
                    Nenhum template cadastrado
                  </td>
                </tr>
              ) : (
                templates.map(template => (
                  <tr key={template.id} className="border-b border-gold-500/10 hover:bg-navy-800/50">
                    <td className="py-4 px-4">
                      <div>
                        <p className="text-gold-100 font-medium">{template.name}</p>
                        {template.description && (
                          <p className="text-gold-400 text-sm">{template.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        template.certificate_type === 'technical'
                          ? 'bg-green-500/20 text-green-300'
                          : template.certificate_type === 'lato-sensu'
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {template.certificate_type === 'technical' ? 'Técnico' :
                         template.certificate_type === 'lato-sensu' ? 'Lato Sensu' : 'Todos'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {template.is_default ? (
                        <Star className="w-5 h-5 text-yellow-400 inline" />
                      ) : (
                        <button
                          onClick={() => handleSetDefault(template.id)}
                          className="text-gold-400 hover:text-yellow-400"
                          title="Definir como padrão"
                        >
                          <StarOff className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {template.is_active ? (
                        <Check className="w-5 h-5 text-green-400 inline" />
                      ) : (
                        <X className="w-5 h-5 text-red-400 inline" />
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(template)}
                          className="p-2 text-blue-400 hover:bg-blue-500/20 rounded transition"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(template.id)}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded transition"
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
      </Card>

      {/* Modal Create/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-navy-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gold-500/20">
              <h2 className="text-2xl font-bold text-gold">
                {editingTemplate ? 'Editar Template' : 'Novo Template'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {validationErrors.length > 0 && (
                <div className="p-4 bg-red-500/20 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 font-medium mb-2">Erros de validação:</p>
                  <ul className="list-disc list-inside text-red-300 text-sm space-y-1">
                    {validationErrors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <label className="block text-gold-200 mb-2">Nome *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-900 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
                  required
                />
              </div>

              <div>
                <label className="block text-gold-200 mb-2">Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-900 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-gold-200 mb-2">Tipo de Certificado *</label>
                <select
                  value={formData.certificate_type}
                  onChange={(e) => setFormData({ ...formData, certificate_type: e.target.value as any })}
                  className="w-full px-4 py-2 bg-navy-900 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
                  required
                >
                  <option value="all">Todos os tipos</option>
                  <option value="technical">Técnico</option>
                  <option value="lato-sensu">Lato Sensu</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-gold-200">HTML do Template *</label>
                  <button
                    type="button"
                    onClick={() => setShowVariablesHelp(!showVariablesHelp)}
                    className="text-sm text-gold-400 hover:text-gold-200"
                  >
                    {showVariablesHelp ? 'Ocultar' : 'Ver'} Variáveis Disponíveis
                  </button>
                </div>

                {showVariablesHelp && (
                  <div className="mb-4 p-4 bg-navy-900 border border-gold-500/20 rounded-lg text-sm">
                    <p className="text-gold-200 font-medium mb-2">Variáveis disponíveis:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(TEMPLATE_VARIABLES).map(([key, value]) => (
                        <div key={key} className="text-gold-400">
                          <code className="bg-navy-800 px-2 py-1 rounded">{value.placeholder}</code>
                          <span className="text-xs ml-2 text-gold-300">{value.description}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-gold-300 text-xs mt-3">
                      Use <code className="bg-navy-800 px-1 rounded">{'{{#if variable}}...{{/if}}'}</code> para conteúdo condicional
                    </p>
                  </div>
                )}

                <textarea
                  value={formData.html_content}
                  onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-900 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500 font-mono text-sm"
                  rows={12}
                  required
                  placeholder="Cole seu HTML aqui..."
                />
                <p className="text-xs text-gold-400 mt-1">
                  Dimensões obrigatórias: 1100px x 850px
                </p>
              </div>

              <div>
                <label className="block text-gold-200 mb-2">CSS Adicional (opcional)</label>
                <textarea
                  value={formData.css_content}
                  onChange={(e) => setFormData({ ...formData, css_content: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-900 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500 font-mono text-sm"
                  rows={4}
                  placeholder=".my-class { color: #FFD700; }"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="is_default" className="text-gold-200">
                  Definir como template padrão
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Spinner size="sm" /> : editingTemplate ? 'Atualizar' : 'Criar'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
