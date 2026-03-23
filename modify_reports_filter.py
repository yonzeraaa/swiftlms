import re

with open('app/dashboard/reports/page.tsx', 'r') as f:
    content = f.read()

# Date Filter styles
date_filter_replacement = """
      {/* ── Filtros de Data Alinhados ── */}
      <div className="flex flex-col lg:flex-row gap-8 mb-12 items-stretch">
        <div className="flex-1 flex flex-col md:flex-row gap-4 items-center w-full">
          <div className="flex-1 relative flex items-center">
            <Filter size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7a6350]" />
            <span style={{ position: 'absolute', left: '2.5rem', fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED, letterSpacing: '0.1em' }}>{t('reports.dateRange')}:</span>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              style={{ padding: '1rem 1rem 1rem 10rem', backgroundColor: 'transparent', border: `1px solid ${dateError ? 'red' : BORDER}`, color: INK, fontFamily: 'var(--font-lora)', fontSize: '1rem', flex: 1 }}
            />
          </div>
          <span style={{ fontFamily: 'var(--font-lora)', fontStyle: 'italic', color: MUTED }}>{t('reports.to')}</span>
          <div className="flex-1 relative">
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              style={{ width: '100%', padding: '1rem', backgroundColor: 'transparent', border: `1px solid ${dateError ? 'red' : BORDER}`, color: INK, fontFamily: 'var(--font-lora)', fontSize: '1rem' }}
            />
          </div>
        </div>

        <div className="w-full lg:w-auto flex gap-2">
          <button
            onClick={() => {
              const today = new Date().toISOString().split('T')[0]
              setDateRange({ start: today, end: today })
            }}
            style={{ padding: '1rem 1.5rem', background: 'none', border: `1px solid ${BORDER}`, color: INK, cursor: 'pointer', fontFamily: 'var(--font-lora)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', transition: 'background-color 0.2s' }}
            className="hover:bg-[#1e130c]/5"
          >
            Hoje
          </button>
          <button
            onClick={() => {
              const end = new Date().toISOString().split('T')[0]
              const start = new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]
              setDateRange({ start, end })
            }}
            style={{ padding: '1rem 1.5rem', background: 'none', border: `1px solid ${BORDER}`, color: INK, cursor: 'pointer', fontFamily: 'var(--font-lora)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', transition: 'background-color 0.2s' }}
            className="hover:bg-[#1e130c]/5"
          >
            7 dias
          </button>
          <button
            onClick={() => {
              const end = new Date().toISOString().split('T')[0]
              const start = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]
              setDateRange({ start, end })
            }}
            style={{ padding: '1rem 1.5rem', background: 'none', border: `1px solid ${BORDER}`, color: INK, cursor: 'pointer', fontFamily: 'var(--font-lora)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', transition: 'background-color 0.2s' }}
            className="hover:bg-[#1e130c]/5"
          >
            30 dias
          </button>
        </div>
      </div>
      {dateError && (
        <div className="flex items-center gap-2 mb-12 text-[#7a6350] italic text-sm" style={{ fontFamily: 'var(--font-lora)' }}>
          <span>⚠️</span>
          <span>{dateError}</span>
        </div>
      )}
"""

date_filter_pattern = r'\{\/\*\s*Date Filter\s*\*\/\}.*?(?=\{\/\*\s*Quick Stats\s*\*\/\})'
content = re.sub(date_filter_pattern, date_filter_replacement, content, flags=re.DOTALL)

with open('app/dashboard/reports/page.tsx', 'w') as f:
    f.write(content)
