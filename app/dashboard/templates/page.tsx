'use client'

import { useState } from 'react'
import { FileSpreadsheet, FileText } from 'lucide-react'
import ExcelTemplatesTab from './components/ExcelTemplatesTab'
import CertificateTemplatesTab from './components/CertificateTemplatesTab'
import { ClassicRule } from '../../components/ui/RenaissanceSvgs'

const INK = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'

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
    <div className="flex flex-col w-full">
      {/* ── Cabeçalho Principal ── */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 w-full border-b border-[#1e130c]/10 pb-6">
        <div className="flex-1">
          <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: 700, color: INK, lineHeight: 1.1 }}>
            Gestão de Templates
          </h1>
          <p style={{ fontFamily: 'var(--font-lora)', fontSize: '1rem', fontStyle: 'italic', color: MUTED, marginTop: '0.25rem' }}>
            Modelos de relatórios Excel e certificados digitais
          </p>
          <div className="mt-4 w-full max-w-xs">
            <ClassicRule color={INK} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#1e130c]/10 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group inline-flex items-center gap-2 border-b-2 py-4 px-1 text-sm font-semibold transition-all duration-300
                  ${isActive
                    ? 'border-[#8b6d22] text-[#1e130c]'
                    : 'border-transparent text-[#7a6350] hover:text-[#1e130c] hover:border-[#1e130c]/20'
                  }
                `}
                style={{ fontFamily: 'var(--font-lora)', textTransform: 'uppercase', letterSpacing: '0.1em' }}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-[#8b6d22]' : 'text-[#7a6350]'}`} />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-2">
        {activeTab === 'excel' && <ExcelTemplatesTab />}
        {activeTab === 'certificates' && <CertificateTemplatesTab />}
      </div>
    </div>
  )
}
