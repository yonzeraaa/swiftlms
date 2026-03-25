'use client'

import { useState } from 'react'
import StudentGradesReport from '@/app/components/StudentGradesReport'
import { Calendar } from 'lucide-react'
import { ClassicRule } from '../../components/ui/RenaissanceSvgs'

const INK = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'
const PARCH = '#faf6ee'
const BORDER = 'rgba(30,19,12,0.14)'

interface GradesPageClientProps {
  userId: string
  userName: string
}

export default function GradesPageClient({ userId, userName }: GradesPageClientProps) {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  return (
    <>
      {/* Header com Filtros */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: 700,
            color: INK,
            lineHeight: 1,
            marginBottom: '0.5rem'
          }}>
            Minhas Notas
          </h1>
          <p style={{
            fontFamily: 'var(--font-lora)',
            fontSize: '1rem',
            fontStyle: 'italic',
            color: MUTED,
          }}>
            Acompanhe seu desempenho acadêmico
          </p>
        </div>

        {/* Filtro de Data */}
        <div
          className="flex items-center gap-4 p-4 rounded-lg"
          style={{
            backgroundColor: PARCH,
            border: `1px solid ${BORDER}`,
            boxShadow: '0 2px 8px rgba(30,19,12,0.06)'
          }}
        >
          <div className="flex items-center gap-2">
            <Calendar size={18} style={{ color: ACCENT }} />
            <span style={{
              fontFamily: 'var(--font-lora)',
              fontSize: '0.85rem',
              color: MUTED,
            }}>
              Período:
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              style={{
                padding: '0.5rem 0.75rem',
                backgroundColor: 'transparent',
                border: `1px solid ${BORDER}`,
                color: INK,
                fontFamily: 'var(--font-lora)',
                fontSize: '0.85rem',
                outline: 'none',
                borderRadius: '4px',
              }}
            />
            <span style={{ fontFamily: 'var(--font-lora)', fontSize: '0.85rem', color: MUTED }}>até</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              style={{
                padding: '0.5rem 0.75rem',
                backgroundColor: 'transparent',
                border: `1px solid ${BORDER}`,
                color: INK,
                fontFamily: 'var(--font-lora)',
                fontSize: '0.85rem',
                outline: 'none',
                borderRadius: '4px',
              }}
            />
          </div>
        </div>
      </div>

      <ClassicRule style={{ marginBottom: '2rem', color: BORDER }} />

      {/* Componente de Relatório de Notas */}
      <StudentGradesReport
        userId={userId}
        userName={userName}
        showHeader={false}
        allowExport={true}
        dateRange={dateRange}
      />
    </>
  )
}
