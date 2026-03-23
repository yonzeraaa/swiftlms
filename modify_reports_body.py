import re

with open('app/dashboard/reports/page.tsx', 'r') as f:
    content = f.read()

# Make the wrapper div flex col w-full
content = re.sub(
    r'return \(\s*<div className="space-y-6">',
    'return (\n    <div className="flex flex-col w-full">',
    content, count=1
)

# Header styles
header_replacement = """
      {/* ── Cabeçalho Principal Alinhado ── */}
      <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 w-full border-b border-[#1e130c]/10 pb-8">
        <div className="flex-1">
          <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontWeight: 700, color: INK, lineHeight: 1 }}>
            {t('reports.title')}
          </h1>
          <p style={{ fontFamily: 'var(--font-lora)', fontSize: '1.1rem', fontStyle: 'italic', color: MUTED, marginTop: '0.5rem' }}>
            {t('reports.subtitle')}
          </p>
          <div className="mt-6 w-full max-w-md">
            <ClassicRule color={INK} />
          </div>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              title="Mostrar/ocultar opções avançadas"
              style={{ padding: '1rem 1.5rem', background: 'none', border: `1px solid ${INK}`, color: INK, cursor: 'pointer', fontFamily: 'var(--font-lora)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}
            >
              <Filter className="w-5 h-5 inline-block mr-2" />
              Opções Avançadas
            </button>
            <button
              onClick={exportToExcel}
              title="Exportar para Excel com tabelas dinâmicas"
              style={{ padding: '1rem 2rem', backgroundColor: INK, color: PARCH, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-lora)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            >
              <Table className="w-5 h-5 inline-block mr-2" />
              {t('reports.export')} Excel
            </button>
          </div>

          {showAdvancedOptions && (
            <div className="mt-4 p-4 border border-[#1e130c]/15 bg-[#faf6ee] shadow-md relative w-full font-[family-name:var(--font-lora)]">
              <p className="text-[#7a6350] text-sm mb-3 italic">
                ℹ️ Por padrão, o sistema usa automaticamente o template ativo mais recente para cada tipo de relatório. Use esta opção apenas se quiser forçar um template específico.
              </p>
              <div className="flex gap-4 items-center">
                <label className="text-[#1e130c] text-sm font-bold uppercase tracking-widest">Template Excel:</label>
                <select
                  value={selectedTemplate || ''}
                  onChange={(e) => setSelectedTemplate(e.target.value || null)}
                  style={{ flex: 1, padding: '0.75rem', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, color: INK, fontSize: '1rem', cursor: 'pointer' }}
                >
                  <option value="">🔄 Automático (usa template ativo)</option>
                  <option disabled>─────────────</option>
                  {templates.length > 0 ? (
                    <>
                      {['users', 'grades', 'enrollments', 'access', 'student-history'].map(category => {
                        const categoryTemplates = templates.filter(t => t.category === category)
                        if (categoryTemplates.length === 0) return null
                        const categoryNames: Record<string, string> = {
                          users: 'Usuários',
                          grades: 'Notas',
                          enrollments: 'Matrículas',
                          access: 'Acessos',
                          'student-history': 'Histórico do Aluno'
                        }
                        return (
                          <optgroup key={category} label={categoryNames[category] || category}>
                            {categoryTemplates.map((template) => (
                              <option key={template.id} value={template.id}>
                                {template.name} {template.is_active ? '✓' : ''}
                              </option>
                            ))}
                          </optgroup>
                        )
                      })}
                    </>
                  ) : (
                    <option disabled>Nenhum template disponível</option>
                  )}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
"""

# Replace existing Header
header_pattern = r'\{\/\*\s*Header\s*\*\/\}.*?(?=\{\/\*\s*Date Filter\s*\*\/\})'
content = re.sub(header_pattern, header_replacement, content, flags=re.DOTALL)

with open('app/dashboard/reports/page.tsx', 'w') as f:
    f.write(content)
