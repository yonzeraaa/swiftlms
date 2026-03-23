const fs = require('fs');
const file = 'app/dashboard/lessons/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("import Card from '../../components/Card'", "import { ClassicRule, CornerBracket } from '../../components/ui/RenaissanceSvgs'");

const newReturn = `return (
    <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8 bg-[#faf6ee] min-h-screen font-[family-name:var(--font-lora)] text-[#1e130c]">
      <Breadcrumbs className="mb-2" />
      
      {/* Header */}
      <div className="text-center sm:text-left mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-playfair)] text-3xl sm:text-4xl md:text-5xl font-bold text-[#1e130c] flex items-center justify-center sm:justify-start gap-3">
              <PlayCircle className="w-8 h-8 text-[#8b6d22]" />
              Gestão de Aulas
            </h1>
            <p className="text-[#7a6350] mt-2 italic">Gerencie as lições e conteúdos das academias.</p>
          </div>
          <Button onClick={openCreateModal} icon={<Plus className="w-4 h-4 flex-shrink-0" />}>
            Nova Aula
          </Button>
        </div>
        <ClassicRule className="mt-6 w-full" />
      </div>

      {/* Message */}
      {message && (
        <div className="border border-[#1e130c]/20 bg-[#faf6ee] p-4 rounded shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3 relative z-10">
            {message.type === 'success' ? (
              <AlertCircle className="w-5 h-5 text-[#8b6d22]" />
            ) : message.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-700" />
            ) : (
              <Spinner size="sm" className="text-[#8b6d22]" />
            )}
            <p className={
              message.type === 'success' ? 'text-[#1e130c] font-medium' :
              message.type === 'error' ? 'text-red-800 font-medium' :
              'text-[#1e130c] font-medium'
            }>
              {message.text}
            </p>
          </div>
        </div>
      )}

      {selectedLessonIds.length > 0 && (
        <div className="border border-[#8b6d22]/50 bg-[#8b6d22]/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner">
          <span className="text-[#1e130c] font-medium">
            {selectedLessonIds.length} {selectedLessonIds.length === 1 ? 'preleção assinalada' : 'preleções assinaladas'}
          </span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                setSelectedLessonIds([])
                setSelectAllLessons(false)
              }}
              className="text-[#8b6d22] hover:text-[#1e130c] text-sm underline italic transition-colors"
            >
              Desmarcar todas
            </button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleBulkDeleteSelectedLessons}
              disabled={bulkDeletingLessons}
              icon={<Trash2 className="w-4 h-4" />}
            >
              {bulkDeletingLessons ? 'Expurgando...' : 'Expurgar selecionadas'}
            </Button>
          </div>
        </div>
      )}

      {/* Stats Area */}
      <div className="border-b border-t border-[#1e130c]/20 py-4 mb-8 flex flex-wrap justify-between gap-6 bg-[#faf6ee]/50 text-center sm:text-left">
        <div className="flex-1 min-w-[150px]">
          <p className="text-[#7a6350] text-sm uppercase tracking-widest font-[family-name:var(--font-playfair)] mb-1">Total de Preleções</p>
          <p className="text-2xl font-bold text-[#1e130c]">{lessons.length}</p>
        </div>
        <div className="flex-1 min-w-[150px]">
          <p className="text-[#7a6350] text-sm uppercase tracking-widest font-[family-name:var(--font-playfair)] mb-1">Demonstrações (Preview)</p>
          <p className="text-2xl font-bold text-[#1e130c]">{previewLessons}</p>
        </div>
        <div className="flex-1 min-w-[150px]">
          <p className="text-[#7a6350] text-sm uppercase tracking-widest font-[family-name:var(--font-playfair)] mb-1">Duração Total</p>
          <p className="text-2xl font-bold text-[#1e130c]">
            {Math.floor(totalDuration / 60)}h {totalDuration % 60}m
          </p>
        </div>
        <div className="flex-1 min-w-[150px]">
          <p className="text-[#7a6350] text-sm uppercase tracking-widest font-[family-name:var(--font-playfair)] mb-1">Taxa de Conclusão</p>
          <p className="text-2xl font-bold text-[#1e130c]">{completionRate}%</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 mb-8">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="relative w-full md:w-48 shrink-0">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8b6d22]" />
            <input
              type="text"
              placeholder="Cifra (Ex: TEO101)"
              value={codeFilter}
              onChange={(e) => setCodeFilter(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none font-mono"
            />
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8b6d22]" />
            <input
              type="text"
              placeholder="Pesquisar por título ou sumário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Filter className="w-4 h-4 text-[#8b6d22] flex-shrink-0" />
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none cursor-pointer"
            >
              <option value="todos">Todos os cursos</option>
              {allCourses.map(course => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none cursor-pointer"
            >
              <option value="todas">Todas as disciplinas</option>
              <option value="sem-disciplina">Sem disciplina vinculada</option>
              {availableSubjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.code ? \`\${subject.code} - \${subject.name}\` : subject.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm pt-2">
          <span className="text-[#7a6350] font-medium font-[family-name:var(--font-playfair)]">Ordenação:</span>
          <button
            type="button"
            onClick={() => setLessonSortMode('code')}
            className={\`px-3 py-1 border-b-2 transition-colors \${
              lessonSortMode === 'code'
                ? 'border-[#8b6d22] text-[#1e130c] font-medium'
                : 'border-transparent text-[#7a6350] hover:text-[#1e130c]'
            }\`}
          >
            Cifra da Disciplina
          </button>
          <button
            type="button"
            onClick={() => setLessonSortMode('title')}
            className={\`px-3 py-1 border-b-2 transition-colors \${
              lessonSortMode === 'title'
                ? 'border-[#8b6d22] text-[#1e130c] font-medium'
                : 'border-transparent text-[#7a6350] hover:text-[#1e130c]'
            }\`}
          >
            Título da Preleção
          </button>
        </div>

        {lessons.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-[#7a6350] mt-2 italic">
            <button
              type="button"
              onClick={handleSelectAllLessons}
              disabled={sortedLessons.length === 0}
              aria-pressed={selectAllLessons && sortedLessons.length > 0}
              className={\`text-[#8b6d22] hover:text-[#1e130c] transition-colors \${
                sortedLessons.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }\`}
            >
              {selectAllLessons && sortedLessons.length > 0 ? (
                <CheckSquare className="w-5 h-5" />
              ) : (
                <Square className="w-5 h-5" />
              )}
            </button>
            <span>
              {selectAllLessons && sortedLessons.length > 0
                ? 'Resultados filtrados selecionados'
                : 'Selecionar resultados filtrados'}
            </span>
          </div>
        )}
      </div>

      {(codeFilter || selectedCourseId !== 'todos' || selectedSubjectId !== 'todas' || searchTerm) && (
        <p className="text-sm text-[#7a6350] mb-4 italic">
          A exibir {filteredLessons.length} de {lessons.length} preleções.
        </p>
      )}

      {/* Lessons Directory List */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm sm:text-base border-collapse">
          <thead className="bg-transparent sticky top-0 z-10 border-b-2 border-[#1e130c]/30">
            <tr>
              <th className="text-center py-3 px-4 text-[#7a6350] font-medium w-12">
                <button
                  onClick={handleSelectAllLessons}
                  className="text-[#8b6d22] hover:text-[#1e130c] transition-colors"
                >
                  {selectAllLessons && sortedLessons.length > 0 ? (
                    <CheckSquare className="w-5 h-5" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
              </th>
              <th scope="col" className="text-left py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">Código</th>
              <th scope="col" className="text-left py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">Título</th>
              <th scope="col" className="text-left py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">Descrição</th>
              <th scope="col" className="text-left py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">
                <button
                  type="button"
                  onClick={() => setLessonSortMode(prev => prev === 'code' ? 'title' : 'code')}
                  className="flex items-center gap-2 text-[#1e130c] hover:text-[#8b6d22] transition-colors"
                >
                  Disciplina
                  {lessonSortMode === 'code' ? (
                    <ArrowDownAZ className="w-4 h-4" />
                  ) : (
                    <ArrowUpAZ className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th scope="col" className="text-center py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">Tipo</th>
              <th scope="col" className="text-center py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">Duração</th>
              <th scope="col" className="text-center py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">Preview</th>
              <th scope="col" className="text-center py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {sortedLessons.length > 0 ? (
              sortedLessons.map((lesson) => {
                const progress = lessonProgress[lesson.id] || { completed: 0, total: 0 }
                return (
                  <tr key={lesson.id} className="border-b border-dashed border-[#1e130c]/20 hover:bg-[#1e130c]/5 transition-colors">
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleToggleLessonSelection(lesson.id)}
                        className="text-[#8b6d22] hover:text-[#1e130c] transition-colors"
                      >
                        {selectedLessonIds.includes(lesson.id) ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-[#8b6d22] font-mono text-sm">{lesson.code || '-'}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-[#1e130c] font-medium truncate max-w-[220px] md:max-w-[300px] block" title={lesson.title}>
                        {lesson.title}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-[#7a6350] italic text-sm">{lesson.description || '-'}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-[#7a6350] text-sm">
                        {(lesson as any).subject_lessons?.[0]?.subjects ? (
                          <span
                            className="text-[#1e130c] truncate max-w-[200px] md:max-w-[240px] block"
                            title={(lesson as any).subject_lessons[0].subjects.name}
                          >
                            {(lesson as any).subject_lessons[0].subjects.name}
                          </span>
                        ) : (
                          <span className="text-[#8b6d22] italic">-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-[#7a6350]">
                        {getTypeIcon(lesson.content_type)}
                        <span className="text-sm tracking-widest uppercase">{getTypeLabel(lesson.content_type)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-[#1e130c] font-medium">
                        {lesson.duration_minutes ? \`\${lesson.duration_minutes} min\` : '-'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={async () => {
                          try {
                            const result = await toggleLessonPreview(lesson.id, lesson.is_preview || false)

                            if (!result.success) {
                              throw new Error(result.error || 'Erro ao atualizar preview')
                            }

                            setMessage({
                              type: 'success',
                              text: \`Aula \${result.newStatus ? 'marcada como' : 'removida de'} preview\`
                            })
                            await fetchData()
                          } catch (error: any) {
                            setMessage({
                              type: 'error',
                              text: error.message || 'Erro ao atualizar status de preview'
                            })
                          }
                        }}
                        className={\`inline-flex items-center gap-1 px-3 py-1 border text-xs font-medium transition-all hover:scale-105 \${
                          lesson.is_preview
                            ? 'border-[#8b6d22] bg-[#8b6d22]/10 text-[#8b6d22]'
                            : 'border-[#1e130c]/20 bg-transparent text-[#7a6350]'
                        }\`}
                        aria-label={lesson.is_preview ? 'Marcar como privada' : 'Marcar como preview'}
                      >
                        {lesson.is_preview ? (
                          <><Eye className="w-3 h-3" /> Exposta</>
                        ) : (
                          <><EyeOff className="w-3 h-3" /> Oculta</>
                        )}
                      </button>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <Button 
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            if (lesson.course_modules?.courses?.id) {
                              router.push(\`/student-dashboard/course/\${lesson.course_modules.courses.id}?lesson=\${lesson.id}\`)
                            } else {
                              alert('Esta aula não está associada a um curso')
                            }
                          }}
                          title="Visualizar como Discente"
                          icon={<Eye className="w-4 h-4" />}
                        />
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => handleEdit(lesson)}
                          title="Inscrever Alterações"
                          icon={<Edit className="w-4 h-4" />}
                        />
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => handleDelete(lesson)}
                          title="Expurgar Registro"
                          icon={<Trash2 className="w-4 h-4" />}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={9} className="py-12 text-center">
                  <BookOpen className="w-12 h-12 text-[#8b6d22]/30 mx-auto mb-3" />
                  <p className="text-[#7a6350] italic">
                    {searchTerm ? 'Nenhuma preleção encontrada nos registros' : 'O livro de registros encontra-se vazio'}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#1e130c]/40 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] overflow-y-auto">
          <div className="relative bg-[#faf6ee] w-full max-w-2xl p-8 md:p-10 shadow-2xl border border-[#1e130c]/20 my-8">
            <CornerBracket className="absolute top-2 left-2 w-8 h-8 text-[#1e130c]/20" />
            <CornerBracket className="absolute top-2 right-2 w-8 h-8 text-[#1e130c]/20 rotate-90" />
            <CornerBracket className="absolute bottom-2 right-2 w-8 h-8 text-[#1e130c]/20 rotate-180" />
            <CornerBracket className="absolute bottom-2 left-2 w-8 h-8 text-[#1e130c]/20 -rotate-90" />

            <div className="flex items-center justify-between mb-8 relative z-10">
              <h2 className="font-[family-name:var(--font-playfair)] text-2xl md:text-3xl font-bold text-[#1e130c] border-b-2 border-[#8b6d22] pb-2 pr-8">
                {editingLesson ? 'Editar Registro de Preleção' : 'Novo Registro de Preleção'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#8b6d22] hover:text-[#1e130c] transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <div>
                <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                  Título da Preleção <span className="text-[#8b6d22]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none"
                  placeholder="Ex: Introdução ao Módulo"
                />
              </div>

              <div>
                <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                  Sumário (Descrição)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none resize-none"
                  placeholder="Breve descrição da preleção..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                    Natureza do Conteúdo <span className="text-[#8b6d22]">*</span>
                  </label>
                  <select
                    required
                    value={formData.content_type}
                    onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
                    className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none cursor-pointer"
                  >
                    <option value="video">Cinematografia (Vídeo)</option>
                    <option value="text">Manuscrito (Texto)</option>
                    <option value="quiz">Exame (Quiz)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                    Duração (Minutos)
                  </label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                    className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none"
                    placeholder="Ex: 30"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                  Endereço do Acervo (URL)
                </label>
                <input
                  type="url"
                  value={formData.content_url}
                  onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                  Conteúdo Textual
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none resize-none"
                  placeholder="Conteúdo da aula (se aplicável)..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
                <div>
                  <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                    Posição Sequencial
                  </label>
                  <input
                    type="number"
                    value={formData.order_index}
                    onChange={(e) => setFormData({ ...formData, order_index: e.target.value })}
                    className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div className="flex items-center pb-2">
                  <label className="flex items-center cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={formData.is_preview}
                        onChange={(e) => setFormData({ ...formData, is_preview: e.target.checked })}
                        className="peer sr-only"
                      />
                      <div className="w-5 h-5 border-2 border-[#1e130c]/30 rounded-none peer-checked:bg-[#8b6d22] peer-checked:border-[#8b6d22] transition-colors flex items-center justify-center">
                        <Check className="w-4 h-4 text-[#faf6ee] opacity-0 peer-checked:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div className="ml-3">
                      <span className="block text-[#1e130c] font-medium group-hover:text-[#8b6d22] transition-colors">Exposição Pública (Preview)</span>
                      <span className="block text-xs text-[#7a6350] mt-0.5 italic">
                        Visível como demonstração aos não-iniciados
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex gap-4 pt-8 border-t border-[#1e130c]/15">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="flex-1 py-3 px-4 border border-[#1e130c]/20 text-[#1e130c] hover:bg-[#1e130c]/5 transition-colors font-medium text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 px-4 bg-[#1e130c] text-[#faf6ee] hover:bg-[#8b6d22] transition-colors font-medium text-center flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <><Spinner size="sm" /> Lavrando...</>
                  ) : (
                    editingLesson ? 'Inscrever Alterações' : 'Lavrar Registro'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Preview da Aula */}
      {showPreviewModal && previewLesson && (
        <div className="fixed inset-0 bg-[#1e130c]/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 overflow-y-auto">
          <div className="relative bg-[#faf6ee] w-full max-w-6xl shadow-2xl border border-[#1e130c]/20 my-8">
            <CornerBracket className="absolute top-2 left-2 w-8 h-8 text-[#1e130c]/20 z-20" />
            <CornerBracket className="absolute top-2 right-2 w-8 h-8 text-[#1e130c]/20 rotate-90 z-20" />
            <CornerBracket className="absolute bottom-2 right-2 w-8 h-8 text-[#1e130c]/20 rotate-180 z-20" />
            <CornerBracket className="absolute bottom-2 left-2 w-8 h-8 text-[#1e130c]/20 -rotate-90 z-20" />

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#1e130c]/15 relative z-10">
              <div>
                <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1e130c] mb-2">
                  {previewLesson.title}
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-sm text-[#8b6d22] tracking-widest uppercase font-medium">
                  <span className="flex items-center gap-2">
                    {previewLesson.content_type === 'video' && <Video className="w-4 h-4" />}
                    {previewLesson.content_type === 'document' && <FileText className="w-4 h-4" />}
                    {previewLesson.content_type === 'text' && <BookOpen className="w-4 h-4" />}
                    {previewLesson.content_type === 'quiz' && <FileQuestion className="w-4 h-4" />}
                    {previewLesson.content_type}
                  </span>
                  {previewLesson.duration_minutes && (
                    <span className="flex items-center gap-1 before:content-['•'] before:mr-4 before:text-[#1e130c]/20">
                      <Clock className="w-4 h-4" />
                      {previewLesson.duration_minutes} min
                    </span>
                  )}
                  {previewLesson.is_preview && (
                    <span className="flex items-center gap-1 text-[#8b6d22] before:content-['•'] before:mr-4 before:text-[#1e130c]/20">
                      <Eye className="w-4 h-4" />
                      Exposição Pública
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPreviewModal(false)
                  setPreviewLesson(null)
                }}
                className="text-[#8b6d22] hover:text-[#1e130c] transition-colors p-2"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar relative z-10">
              {previewLesson.description && (
                <div className="mb-8">
                  <h3 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1e130c] mb-3">Ementa</h3>
                  <p className="text-[#7a6350] leading-relaxed italic">{previewLesson.description}</p>
                  <ClassicRule className="mt-6 w-1/3" />
                </div>
              )}

              {/* Video Player */}
              {previewLesson.content_type === 'video' && previewLesson.content_url && (
                <div className="border-4 border-[#1e130c] p-2 bg-[#1e130c] rounded-none overflow-hidden shadow-xl">
                  <VideoPlayer
                    url={previewLesson.content_url}
                    title={previewLesson.title}
                  />
                </div>
              )}

              {/* Document Viewer */}
              {previewLesson.content_type === 'document' && previewLesson.content_url && (
                <div className="border border-[#1e130c]/20 overflow-hidden bg-[#faf6ee] h-[600px] shadow-inner">
                  <DocumentViewer
                    url={previewLesson.content_url}
                    title={previewLesson.title}
                  />
                </div>
              )}

              {/* Text Content */}
              {previewLesson.content_type === 'text' && previewLesson.content && (
                <div className="prose prose-stone max-w-none font-[family-name:var(--font-lora)] text-[#1e130c] bg-[#faf6ee] p-6 border border-[#1e130c]/15 shadow-inner">
                  <div dangerouslySetInnerHTML={{ __html: previewLesson.content }} />
                </div>
              )}

              {/* Quiz Placeholder */}
              {previewLesson.content_type === 'quiz' && (
                <div className="text-center py-16 border border-dashed border-[#1e130c]/20 bg-[#faf6ee]/50">
                  <FileQuestion className="w-16 h-16 text-[#8b6d22]/50 mx-auto mb-4" />
                  <p className="text-[#1e130c] font-[family-name:var(--font-playfair)] text-xl">O Exame encontra-se selado</p>
                  <p className="text-[#7a6350] mt-2 italic">
                    A visualização dos questionários ocorre estritamente na interface de avaliações.
                  </p>
                </div>
              )}

              {/* No Content Message */}
              {!previewLesson.content_url && !previewLesson.content && (
                <div className="text-center py-16 border border-dashed border-[#1e130c]/20 bg-[#faf6ee]/50">
                  <AlertCircle className="w-16 h-16 text-[#8b6d22]/30 mx-auto mb-4" />
                  <p className="text-[#1e130c] font-[family-name:var(--font-playfair)] text-xl">Acervo em Branco</p>
                  <p className="text-[#7a6350] mt-2 italic">Não constam manuscritos ou conteúdos para esta preleção.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-4 p-6 border-t border-[#1e130c]/15 bg-[#faf6ee] relative z-10">
              <button
                type="button"
                onClick={() => {
                  setShowPreviewModal(false)
                  setPreviewLesson(null)
                }}
                className="py-2 px-8 border border-[#1e130c]/20 text-[#1e130c] hover:bg-[#1e130c]/5 transition-colors font-medium text-center"
              >
                Cerrar Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
`;

let finalStr = content.substring(0, content.indexOf('  return (\n    <div className="space-y-6">')) + newReturn;
fs.writeFileSync(file, finalStr, 'utf8');
