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

interface DocxTemplatesSectionProps {
  onRefresh?: number
}

export default function DocxTemplatesSection({ onRefresh }: DocxTemplatesSectionProps) {
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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-neutral-700">Filtrar por tipo:</label>
        <select
          value={filterKind}
          onChange={(e) => setFilterKind(e.target.value as CertificateKind)}
          className="px-3 py-1.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="all">Todos os tipos</option>
          <option value="technical">Técnico</option>
          <option value="lato-sensu">Lato Sensu</option>
        </select>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <Card className="p-8">
          <div className="text-center text-neutral-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-neutral-400" />
            <p className="font-medium">Nenhum template DOCX encontrado</p>
            <p className="text-sm mt-1">
              Clique em "Novo Template DOCX" para criar um
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-neutral-900 truncate">
                        {template.name}
                      </h3>
                      {template.description && (
                        <p className="text-sm text-neutral-500 line-clamp-2 mt-1">
                          {template.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Tipo:</span>
                    <span className="font-medium text-neutral-700">
                      {getCertificateKindLabel(template.certificate_kind)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Placeholders:</span>
                    <span className="font-medium text-neutral-700">
                      {template.placeholders?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Status:</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-medium ${
                        template.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {template.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>

                {/* Warnings */}
                {template.validation_warnings && template.validation_warnings.length > 0 && (
                  <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-yellow-700">
                        <p className="font-medium">Avisos:</p>
                        <ul className="mt-1 space-y-0.5">
                          {template.validation_warnings.slice(0, 2).map((warning, i) => (
                            <li key={i}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-neutral-200">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(template)}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleActive(template)}
                    className={template.is_active ? 'text-yellow-600' : 'text-green-600'}
                  >
                    <Power className="w-4 h-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(template)}
                    disabled={deletingId === template.id}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
