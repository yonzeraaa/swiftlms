'use client'

import { useState } from 'react'
import { FileSpreadsheet, FileText } from 'lucide-react'
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

      {/* Header */}
      <div>
        <h1 className="font-[family-name:var(--font-playfair)] text-2xl sm:text-3xl md:text-4xl font-bold text-[#1e130c] flex items-center gap-2">
          <FileSpreadsheet className="w-8 h-8 text-[#8b6d22]" />
          Templates
        </h1>
        <p className="text-[#7a6350] mt-1">
          Gerencie seus templates personalizados
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#1e130c]/15">
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
                    ? 'border-[#8b6d22] text-[#7a6350]'
                    : 'border-transparent text-[#8b6d22] hover:border-[#8b6d22]/40 hover:text-[#1e130c]-300'
                  }
                `}
              >
                <Icon className={`h-5 w-5 ${activeTab === tab.id ? 'text-[#8b6d22]' : 'text-[#8b6d22] group-hover:text-[#8b6d22]'}`} />
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
