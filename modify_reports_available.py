import re

with open('app/dashboard/reports/page.tsx', 'r') as f:
    content = f.read()

# Available Reports replacement
available_replacement = """
      {/* ── Relatórios Disponíveis ── */}
      <div className="flex flex-col mb-20">
        <h2
          style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: '2rem',
            fontWeight: 600,
            color: INK,
            marginBottom: '0.5rem',
            borderLeft: `4px solid ${ACCENT}`,
            paddingLeft: '1.5rem'
          }}
        >
          {t('reports.availableReports')}
        </h2>
        <p style={{ fontFamily: 'var(--font-lora)', fontSize: '1.1rem', fontStyle: 'italic', color: MUTED, marginBottom: '2.5rem', paddingLeft: '2rem' }}>
          {t('reports.selectReport')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-2">
          {reports.map((report, index) => {
            const Icon = report.icon
            const isGenerating = generatingReport === report.type

            return (
              <div
                key={index}
                className="group relative flex flex-col justify-between py-6 px-8 transition-colors hover:bg-[#1e130c]/[0.02] border border-[#1e130c]/10"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}
              >
                <div>
                  <div className="flex items-start justify-between mb-6">
                    <div style={{ color: ACCENT }}>
                      <Icon size={32} strokeWidth={1.5} />
                    </div>
                    {isGenerating && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: INK, backgroundColor: 'rgba(30,19,12,0.05)', padding: '0.35rem 0.75rem', border: `1px solid ${INK}` }}>
                        Gerando
                      </span>
                    )}
                  </div>

                  <h4 style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.5rem', fontWeight: 600, color: INK, marginBottom: '0.75rem', lineHeight: 1.2 }}>
                    {report.title}
                  </h4>
                  <p style={{ fontFamily: 'var(--font-lora)', fontSize: '0.95rem', color: MUTED, lineHeight: 1.6, marginBottom: '2rem' }}>
                    {report.description}
                  </p>
                </div>

                <div className="mt-auto">
                  <button
                    onClick={() => generateReport(report.type)}
                    disabled={isGenerating}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      background: 'none',
                      border: `1px solid ${INK}`,
                      color: INK,
                      cursor: isGenerating ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font-lora)',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      transition: 'background-color 0.2s',
                      opacity: isGenerating ? 0.5 : 1
                    }}
                    className="hover:bg-[#1e130c] hover:text-[#faf6ee]"
                  >
                    {isGenerating ? 'Processando...' : t('reports.generateReport')}
                  </button>

                  <div className="flex items-center justify-center gap-4 mt-4 text-[#7a6350] opacity-70">
                    <FileSpreadsheet size={14} />
                    <span style={{ fontSize: '0.75rem' }}>•</span>
                    <FileText size={14} />
                    <span style={{ fontSize: '0.75rem' }}>•</span>
                    <Table size={14} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <ClassicRule style={{ width: '100%', marginBottom: '4rem', color: INK, opacity: 0.3 }} />
"""

available_pattern = r'\{\/\*\s*Available Reports\s*\*\/\}.*?(?=\{\/\*\s*Data Summary\s*\*\/\})'
content = re.sub(available_pattern, available_replacement, content, flags=re.DOTALL)

with open('app/dashboard/reports/page.tsx', 'w') as f:
    f.write(content)
