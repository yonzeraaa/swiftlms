import re

with open('app/dashboard/reports/page.tsx', 'r') as f:
    content = f.read()

# Modal replacement
modal_replacement = """
      {/* ── Modal de Seleção de Aluno e Curso para Histórico ── */}
      {showStudentHistoryModal && (
        <div className="fixed inset-0 bg-[#1e130c]/70 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
          <div className="bg-[#faf6ee] w-full max-w-2xl relative border border-[#1e130c] shadow-2xl p-10 md:p-16 max-h-[90vh] overflow-y-auto">
            <div className="absolute top-6 left-6 w-12 h-12 text-[#1e130c]/10"><CornerBracket size={48} /></div>
            <div className="absolute top-6 right-6 w-12 h-12 text-[#1e130c]/10 rotate-90"><CornerBracket size={48} /></div>

            <div className="flex justify-between items-center mb-10">
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '2.5rem', color: INK, fontWeight: 700 }}>
                {modalStep === 'student' ? 'Selecionar Aluno' : 'Selecionar Curso'}
              </h2>
              <button
                onClick={() => {
                  setShowStudentHistoryModal(false)
                  setSelectedStudent(null)
                  setSelectedCourse(null)
                  setSearchQuery('')
                  setModalStep('student')
                  setStudentCourses([])
                }}
                className="text-[#1e130c]/40 hover:text-[#1e130c] transition-colors"
              >
                <X size={32} />
              </button>
            </div>

            <div className="space-y-8 font-[family-name:var(--font-lora)]">
              {modalStep === 'student' ? (
                <>
                  <p className="text-[#7a6350] text-sm italic">
                    Selecione um aluno para gerar o histórico acadêmico
                  </p>

                  <div className="relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7a6350]" />
                    <input
                      type="text"
                      placeholder="Buscar aluno por nome ou email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, color: INK, fontSize: '1rem' }}
                    />
                  </div>

                  <div className="max-h-96 overflow-y-auto space-y-2 border border-[#1e130c]/10 p-2 custom-scrollbar">
                    {students
                      .filter(
                        (student) =>
                          student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          student.email?.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((student) => (
                        <button
                          key={student.id}
                          onClick={() => setSelectedStudent(student)}
                          className={`w-full p-4 border text-left transition-colors ${
                            selectedStudent?.id === student.id
                              ? `bg-[${INK}]/5 border-[${INK}]`
                              : `bg-transparent border-transparent hover:bg-[${INK}]/5 hover:border-[${INK}]/20`
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p style={{ fontFamily: 'var(--font-lora)', fontSize: '1.1rem', fontWeight: 600, color: INK }}>
                                {student.full_name || 'Usuário desconhecido'}
                              </p>
                              <p style={{ fontSize: '0.85rem', color: MUTED }}>
                                {student.email}
                              </p>
                            </div>
                            {selectedStudent?.id === student.id && (
                              <div className="ml-3 flex-shrink-0 text-[#8b6d22]">
                                <CheckCircle size={24} />
                              </div>
                            )}
                          </div>
                        </button>
                      ))}

                    {students.filter(
                      (student) =>
                        student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        student.email?.toLowerCase().includes(searchQuery.toLowerCase())
                    ).length === 0 && (
                      <p className="text-center text-[#7a6350] italic py-8 border border-dashed border-[#1e130c]/10">
                        Nenhum aluno localizado
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-6 pt-10 border-t border-[#1e130c]/10">
                    <button
                      onClick={() => {
                        setShowStudentHistoryModal(false)
                        setSelectedStudent(null)
                        setSearchQuery('')
                        setModalStep('student')
                      }}
                      style={{ padding: '1rem 2.5rem', background: 'none', border: `1px solid ${INK}`, color: INK, cursor: 'pointer', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={async () => {
                        if (selectedStudent) {
                          await fetchStudentCoursesWrapper(selectedStudent.id)
                          setModalStep('course')
                        }
                      }}
                      disabled={!selectedStudent}
                      style={{ padding: '1rem 4rem', backgroundColor: INK, color: PARCH, border: 'none', cursor: selectedStudent ? 'pointer' : 'not-allowed', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: selectedStudent ? 1 : 0.5 }}
                    >
                      Próximo
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[#7a6350] text-sm italic">
                    Selecione o curso para gerar o relatório de <span style={{ fontWeight: 700, color: INK }}>{selectedStudent?.full_name}</span>
                  </p>

                  <div className="max-h-96 overflow-y-auto space-y-2 border border-[#1e130c]/10 p-2 custom-scrollbar">
                    {studentCourses.length === 0 ? (
                      <p className="text-center text-[#7a6350] italic py-8 border border-dashed border-[#1e130c]/10">
                        Este aluno não possui matrículas ativas
                      </p>
                    ) : (
                      studentCourses.map((course) => (
                        <button
                          key={course.enrollment_id}
                          onClick={() => setSelectedCourse(course.course_id)}
                          className={`w-full p-4 border text-left transition-colors ${
                            selectedCourse === course.course_id
                              ? `bg-[${INK}]/5 border-[${INK}]`
                              : `bg-transparent border-transparent hover:bg-[${INK}]/5 hover:border-[${INK}]/20`
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p style={{ fontFamily: 'var(--font-lora)', fontSize: '1.1rem', fontWeight: 600, color: INK }}>
                                {course.course_title}
                              </p>
                            </div>
                            {selectedCourse === course.course_id && (
                              <div className="ml-3 flex-shrink-0 text-[#8b6d22]">
                                <CheckCircle size={24} />
                              </div>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="flex justify-end gap-6 pt-10 border-t border-[#1e130c]/10">
                    <button
                      onClick={() => {
                        setModalStep('student')
                        setSelectedCourse(null)
                        setStudentCourses([])
                      }}
                      style={{ padding: '1rem 2.5rem', background: 'none', border: `1px solid ${INK}`, color: INK, cursor: 'pointer', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                    >
                      Voltar
                    </button>
                    <button
                      onClick={async () => {
                        if (selectedStudent && selectedCourse) {
                          setShowStudentHistoryModal(false)
                          setGeneratingReport('student-history')
                          await generateStudentHistoryReport(
                            selectedStudent.id,
                            selectedStudent.full_name || 'Aluno',
                            selectedCourse
                          )
                          setGeneratingReport(null)
                          setSelectedStudent(null)
                          setSelectedCourse(null)
                          setSearchQuery('')
                          setModalStep('student')
                          setStudentCourses([])
                        }
                      }}
                      disabled={!selectedCourse}
                      style={{ padding: '1rem 4rem', backgroundColor: INK, color: PARCH, border: 'none', cursor: selectedCourse ? 'pointer' : 'not-allowed', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: selectedCourse ? 1 : 0.5 }}
                    >
                      Gerar Relatório
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
"""

modal_pattern = r'\{\/\*\s*Modal de Seleção.*?\}'
content = re.sub(modal_pattern, modal_replacement, content, flags=re.DOTALL)

with open('app/dashboard/reports/page.tsx', 'w') as f:
    f.write(content)
