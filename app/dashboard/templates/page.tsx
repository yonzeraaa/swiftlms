'use client'

import { useState } from 'react'
import { FileSpreadsheet, FileText } from 'lucide-react'
import Breadcrumbs from '../../components/ui/Breadcrumbs'
import ExcelTemplatesTab from './components/ExcelTemplatesTab'
import CertificateTemplatesTab from './components/CertificateTemplatesTab'

type TabType = 'excel' | 'certificates'

export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('excel')

  const tabs = [
    {
      id: 'excel' as TabType,
      label: 'Templates Excel',
      icon: FileSpreadsheet,
      description: 'Gerencie templates personalizados para relatórios'
    },
    {
      id: 'certificates' as TabType,
      label: 'Templates de Certificados',
      icon: FileText,
      description: 'Gerencie templates HTML para certificados'
    }
  ]

  return (
    <div className="space-y-6">
      <Breadcrumbs className="mb-2" />

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gold flex items-center gap-2">
          <FileSpreadsheet className="w-8 h-8 text-gold-400" />
          Templates
        </h1>
        <p className="text-gold-300 mt-1">
          Gerencie seus templates personalizados
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gold-500/20">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group inline-flex items-center gap-2 border-b-2 py-4 px-1 text-sm font-medium transition-colors
                  ${activeTab === tab.id
                    ? 'border-gold-500 text-gold-300'
                    : 'border-transparent text-gold-400 hover:border-gold-500/50 hover:text-gold-300'
                  }
                `}
              >
                <Icon className={`h-5 w-5 ${activeTab === tab.id ? 'text-gold-400' : 'text-gold-500 group-hover:text-gold-400'}`} />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'excel' && <ExcelTemplatesTab />}
        {activeTab === 'certificates' && <CertificateTemplatesTab />}
      </div>
    </div>
  )
}
