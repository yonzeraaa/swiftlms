'use client'

import { useState } from 'react'
import StudentGradesReport from '@/app/components/StudentGradesReport'
import { Calendar, FileText } from 'lucide-react'
import Card from '@/app/components/Card'

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gold flex items-center gap-2">
            <FileText className="w-8 h-8 text-gold-400" />
            Minhas Notas
          </h1>
          <p className="text-gold-300 mt-1">Acompanhe seu desempenho acadêmico</p>
        </div>

        {/* Filtro de Data */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gold-400" />
              <span className="text-gold-300 text-sm">Período:</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="px-3 py-1 bg-navy-900/50 border border-gold-500/30 rounded-lg text-gold-100 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              <span className="text-gold-400">até</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-3 py-1 bg-navy-900/50 border border-gold-500/30 rounded-lg text-gold-100 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
          </div>
        </Card>
      </div>

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
