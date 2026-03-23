const fs = require('fs');
let content = fs.readFileSync('app/dashboard/tests/page.tsx', 'utf8');

const regex = /\{sortedTests\.length > 0 \? \([\s\S]*?\}\)\n          <\/div>\n        \) : \(/;

const newString = `{paginatedTests.length > 0 ? (
          <div className="w-full overflow-x-auto custom-scrollbar mt-4">
            <table className="w-full border-collapse min-w-[1000px]">
              <thead>
                <tr style={{ borderBottom: \`2px solid #1e130c\` }}>
                  <th className="px-4 py-4 text-center w-12" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#7a6350' }}>✓</th>
                  <th className="px-4 py-4 text-left" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#7a6350' }}>Título / Código</th>
                  <th className="px-4 py-4 text-left w-64" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#7a6350' }}>Disciplina</th>
                  <th className="px-4 py-4 text-right w-32" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#7a6350' }}>Duração</th>
                  <th className="px-4 py-4 text-right w-32" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#7a6350' }}>Aprovação</th>
                  <th className="px-4 py-4 text-center w-32" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#7a6350' }}>Gabarito</th>
                  <th className="px-4 py-4 text-center w-20" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#7a6350' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTests.map((test) => {
                  const subject = subjects.find(s => s.id === test.subject_id)
                  const isSelected = selectedTests.includes(test.id)

                  return (
                    <tr key={test.id} style={{ borderBottom: \`1px dashed rgba(30,19,12,0.2)\` }} className="hover:bg-[#1e130c]/[0.05] transition-colors group">
                      <td className="px-4 py-6 text-center align-top">
                        <button
                          onClick={() => toggleTestSelection(test.id)}
                          className="text-[#8b6d22] hover:text-[#1e130c] transition-colors mt-1"
                        >
                          {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                        </button>
                      </td>
                      <td className="px-4 py-6 align-top">
                        <div className="flex flex-col gap-1">
                          <span style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.1rem', fontWeight: 600, color: '#1e130c' }}>{test.title}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[#8b6d22] font-mono text-xs border border-[#8b6d22]/30 px-1">{test.code || 'S/C'}</span>
                            <span className={\`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full \${test.is_active ? 'bg-[#1e130c]/5 text-[#1e130c]' : 'bg-orange-100 text-orange-700'}\`}>
                              {test.is_active ? t('tests.active') : t('tests.inactive')}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-6 align-top">
                        <span style={{ fontFamily: 'var(--font-lora)', fontSize: '0.95rem', color: '#1e130c' }}>{subject ? subject.name : '-'}</span>
                      </td>
                      <td className="px-4 py-6 text-right align-top">
                        <span style={{ fontFamily: 'var(--font-lora)', fontSize: '0.95rem', color: '#1e130c' }}>{test.duration_minutes ? \`\${test.duration_minutes}m\` : '-'}</span>
                      </td>
                      <td className="px-4 py-6 text-right align-top">
                        <span style={{ fontFamily: 'var(--font-lora)', fontSize: '0.95rem', color: '#1e130c' }}>{test.passing_score != null ? \`\${test.passing_score}%\` : '-'}</span>
                      </td>
                      <td className="px-4 py-6 text-center align-top">
                        {test.answer_key_count !== undefined ? (
                          test.answer_key_count > 0 ? (
                            <span className="text-[#1e130c] font-bold font-[family-name:var(--font-lora)] text-sm">{test.answer_key_count} q.</span>
                          ) : (
                            <span className="text-[#7a6350] italic font-[family-name:var(--font-lora)] text-sm">Sem gab.</span>
                          )
                        ) : '-'}
                      </td>
                      <td className="px-4 py-6 text-center align-top">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const rect = e.currentTarget.getBoundingClientRect()
                            const isUp = window.innerHeight - rect.bottom < 250
                            setDropdownPosition({ 
                              top: isUp ? undefined : rect.bottom, 
                              bottom: isUp ? window.innerHeight - rect.top : undefined,
                              left: rect.right - 240,
                              isUp
                            })
                            setDropdownTest(test)
                            setOpenDropdown(test.id)
                          }}
                          className="text-[#8b6d22] hover:text-[#1e130c] p-2 transition-transform active:scale-90"
                          title="Ações"
                        >
                          <MoreVertical size={20} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (`;

if (regex.test(content)) {
  content = content.replace(regex, newString);
  fs.writeFileSync('app/dashboard/tests/page.tsx', content);
  console.log("Replaced successfully!");
} else {
  console.log("Regex did not match.");
}
