const fs = require('fs');
const file = 'app/dashboard/subjects/page.tsx';
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
              <GraduationCap className="w-8 h-8 text-[#8b6d22]" />
              Gestão de Disciplinas
            </h1>
            <p className="text-[#7a6350] mt-2 italic">Gerencie as disciplinas disponíveis na academia.</p>
          </div>
          <Button onClick={openCreateModal} icon={<Plus className="w-4 h-4 flex-shrink-0" />}>
            Nova Disciplina
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

      {/* Stats Area (Instead of Cards, use classic summary text) */}
      <div className="border-b border-t border-[#1e130c]/20 py-4 mb-8 flex flex-wrap justify-between gap-6 bg-[#faf6ee]/50 text-center sm:text-left">
        <div className="flex-1 min-w-[150px]">
          <p className="text-[#7a6350] text-sm uppercase tracking-widest font-[family-name:var(--font-playfair)] mb-1">Total de Registros</p>
          <p className="text-2xl font-bold text-[#1e130c]">{subjects.length}</p>
        </div>
        <div className="flex-1 min-w-[150px]">
          <p className="text-[#7a6350] text-sm uppercase tracking-widest font-[family-name:var(--font-playfair)] mb-1">Cursos Relacionados</p>
          <p className="text-2xl font-bold text-[#1e130c]">{Object.keys(courseCount).length}</p>
        </div>
        <div className="flex-1 min-w-[150px]">
          <p className="text-[#7a6350] text-sm uppercase tracking-widest font-[family-name:var(--font-playfair)] mb-1">Total de Vínculos</p>
          <p className="text-2xl font-bold text-[#1e130c]">{totalCourses}</p>
        </div>
        <div className="flex-1 min-w-[150px]">
          <p className="text-[#7a6350] text-sm uppercase tracking-widest font-[family-name:var(--font-playfair)] mb-1">Carga Horária (Total)</p>
          <p className="text-2xl font-bold text-[#1e130c]">{totalHours}h</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 mb-8">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 relative">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8b6d22]" />
            <input
              type="text"
              placeholder="Buscar por nome, código ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none"
            />
          </div>
          {selectedSubjects.length > 0 && (
          <Button
            variant="secondary"
            icon={deletingMultiple ? <Spinner size="sm" /> : <Trash className="w-4 h-4" />}
            onClick={handleDeleteMultiple}
            disabled={deletingMultiple}
          >
            {deletingMultiple ? 'Expurgando...' : \`Expurgar \${selectedSubjects.length} selecionado(s)\`}
          </Button>
          )}
          <div className="flex items-center gap-4">
            <Filter className="w-4 h-4 text-[#8b6d22] flex-shrink-0" />
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none cursor-pointer min-w-[180px]"
            >
              <option value="todos">Todos os cursos</option>
              {allCourses.map(course => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
            <select
              value={selectedModuleId}
              onChange={(e) => setSelectedModuleId(e.target.value)}
              className="px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none cursor-pointer min-w-[180px]"
            >
              <option value="todos">Todos os módulos</option>
              <option value="sem-modulo">Sem módulo</option>
              {availableModules.map(module => (
                <option key={module.id} value={module.id}>
                  {module.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 text-sm pt-2">
          <span className="text-[#7a6350] font-medium font-[family-name:var(--font-playfair)]">Ordenação:</span>
          <button
            type="button"
            onClick={() => setSubjectSortMode('code')}
            className={\`px-3 py-1 border-b-2 transition-colors \${
              subjectSortMode === 'code'
                ? 'border-[#8b6d22] text-[#1e130c] font-medium'
                : 'border-transparent text-[#7a6350] hover:text-[#1e130c]'
            }\`}
          >
            Código (A-Z)
          </button>
          <button
            type="button"
            onClick={() => setSubjectSortMode('name')}
            className={\`px-3 py-1 border-b-2 transition-colors \${
              subjectSortMode === 'name'
                ? 'border-[#8b6d22] text-[#1e130c] font-medium'
                : 'border-transparent text-[#7a6350] hover:text-[#1e130c]'
            }\`}
          >
            Nome (A-Z)
          </button>
        </div>

        {subjects.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-[#7a6350] mt-2 italic">
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={sortedSubjects.length === 0}
              aria-pressed={selectAll && sortedSubjects.length > 0}
              className={\`text-[#8b6d22] hover:text-[#1e130c] transition-colors \${
                sortedSubjects.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }\`}
            >
              {selectAll && sortedSubjects.length > 0 ? (
                <CheckSquare className="w-5 h-5" />
              ) : (
                <Square className="w-5 h-5" />
              )}
            </button>
            <span>
              {selectAll && sortedSubjects.length > 0
                ? 'Resultados filtrados selecionados'
                : 'Selecionar resultados filtrados'}
            </span>
          </div>
        )}
      </div>

      {(selectedCourseId !== 'todos' || selectedModuleId !== 'todos' || searchTerm) && (
        <p className="text-sm text-[#7a6350] mb-4 italic">
          A exibir {filteredSubjects.length} de {subjects.length} registros.
        </p>
      )}

      {/* Subjects Directory List */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm sm:text-base border-collapse">
          <thead className="bg-transparent sticky top-0 z-10 border-b-2 border-[#1e130c]/30">
            <tr>
              <th className="text-center py-4 px-4 text-[#7a6350] font-medium w-12">
                <button
                  onClick={handleSelectAll}
                  className="text-[#8b6d22] hover:text-[#1e130c] transition-colors"
                >
                  {selectAll ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                </button>
              </th>
              <th scope="col" className="text-left py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">Código</th>
              <th scope="col" className="text-left py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">Nome</th>
              <th scope="col" className="text-left py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">Descrição</th>
              <th scope="col" className="text-right py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">Horas</th>
              <th scope="col" className="text-right py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">Aulas</th>
              <th scope="col" className="text-right py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">Cursos</th>
              <th scope="col" className="text-left py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">Lavrado em</th>
              <th scope="col" className="text-center py-3 px-4 text-[#7a6350] font-[family-name:var(--font-playfair)] font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {sortedSubjects.length > 0 ? (
              sortedSubjects.map((subject) => (
                <tr key={subject.id} className="border-b border-dashed border-[#1e130c]/20 hover:bg-[#1e130c]/5 transition-colors">
                  <td className="py-4 px-4 text-center">
                    <button
                      onClick={() => handleSelectSubject(subject.id)}
                      className="text-[#8b6d22] hover:text-[#1e130c] transition-colors"
                    >
                      {selectedSubjects.includes(subject.id) ? 
                        <CheckSquare className="w-5 h-5" /> : 
                        <Square className="w-5 h-5" />
                      }
                    </button>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-[#8b6d22] font-mono text-sm">{subject.code || '-'}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-[#1e130c] font-medium">{subject.name}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-[#7a6350] italic text-sm">{subject.description || '-'}</span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-[#1e130c] font-medium">{subject.hours ? \`\${subject.hours}h\` : '-'}</span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-[#1e130c]">{lessonCount[subject.id] || 0}</span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-[#1e130c]">{courseCount[subject.id] || 0}</span>
                  </td>
                  <td className="py-4 px-4 text-left">
                    <span className="text-[#7a6350] text-sm">
                      {new Date(subject.created_at || '').toLocaleDateString('pt-BR')}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => openLessonsModal(subject)}
                        title="Vincular Aulas"
                        icon={<Link2 className="w-4 h-4 flex-shrink-0" />}
                      />
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => handleEdit(subject)}
                        title="Inscrever Alterações"
                        icon={<Edit className="w-4 h-4 flex-shrink-0" />}
                      />
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => handleDelete(subject)}
                        title="Expurgar Registro"
                        icon={<Trash2 className="w-4 h-4 flex-shrink-0" />}
                      />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="py-12 text-center">
                  <BookOpen className="w-12 h-12 text-[#8b6d22]/30 mx-auto mb-3" />
                  <p className="text-[#7a6350] italic">
                    {searchTerm ? 'Nenhuma disciplina encontrada nos registros' : 'O livro de registros encontra-se vazio'}
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
          <div className="relative bg-[#faf6ee] w-full max-w-xl p-8 md:p-10 shadow-2xl border border-[#1e130c]/20 my-8">
            <CornerBracket className="absolute top-2 left-2 w-8 h-8 text-[#1e130c]/20" />
            <CornerBracket className="absolute top-2 right-2 w-8 h-8 text-[#1e130c]/20 rotate-90" />
            <CornerBracket className="absolute bottom-2 right-2 w-8 h-8 text-[#1e130c]/20 rotate-180" />
            <CornerBracket className="absolute bottom-2 left-2 w-8 h-8 text-[#1e130c]/20 -rotate-90" />

            <div className="flex items-center justify-between mb-8 relative z-10">
              <h2 className="font-[family-name:var(--font-playfair)] text-2xl md:text-3xl font-bold text-[#1e130c] border-b-2 border-[#8b6d22] pb-2 pr-8">
                {editingSubject ? 'Editar Registro de Disciplina' : 'Novo Registro de Disciplina'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#8b6d22] hover:text-[#1e130c] transition-colors"
                aria-label="Fechar"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <div>
                <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                  Nome da Disciplina <span className="text-[#8b6d22]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none"
                  placeholder="Ex: Teologia Sistemática I"
                />
              </div>

              <div>
                <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                  Código (Cifra)
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none font-mono"
                  placeholder="Ex: TEO101"
                />
              </div>

              <div>
                <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                  Carga Horária
                </label>
                <input
                  type="number"
                  value={formData.hours}
                  readOnly
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#7a6350] cursor-not-allowed rounded-none font-[family-name:var(--font-lora)] italic"
                  placeholder="Calculado automaticamente"
                />
                <p className="text-xs text-[#8b6d22] mt-2 italic">
                  * Deduzida da totalidade do curso ÷ módulos ÷ disciplinas
                </p>
              </div>

              {editingSubject && currentModuleOrder !== null && (
                <div>
                  <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                    Posição no Módulo
                  </label>
                  <input
                    type="number"
                    value={formData.moduleOrderIndex}
                    onChange={(e) => setFormData({ ...formData, moduleOrderIndex: e.target.value })}
                    className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none"
                    placeholder="Ex: 1"
                    min="0"
                    step="1"
                  />
                </div>
              )}

              <div>
                <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                  Ementa
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none resize-none"
                  placeholder="Breve sumário dos tópicos..."
                  rows={4}
                />
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
                    editingSubject ? 'Inscrever Alterações' : 'Lavrar Registro'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lessons Association Modal */}
      {showLessonsModal && selectedSubjectForLessons && (
        <div className="fixed inset-0 bg-[#1e130c]/40 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] overflow-y-auto">
          <div className="relative bg-[#faf6ee] w-full max-w-3xl p-8 md:p-10 shadow-2xl border border-[#1e130c]/20 my-8">
            <CornerBracket className="absolute top-2 left-2 w-8 h-8 text-[#1e130c]/20" />
            <CornerBracket className="absolute top-2 right-2 w-8 h-8 text-[#1e130c]/20 rotate-90" />
            <CornerBracket className="absolute bottom-2 right-2 w-8 h-8 text-[#1e130c]/20 rotate-180" />
            <CornerBracket className="absolute bottom-2 left-2 w-8 h-8 text-[#1e130c]/20 -rotate-90" />

            <div className="flex items-start justify-between mb-8 relative z-10">
              <div>
                <h2 className="font-[family-name:var(--font-playfair)] text-2xl md:text-3xl font-bold text-[#1e130c] border-b-2 border-[#8b6d22] pb-2 pr-8 flex items-center gap-2">
                  <Link2 className="w-6 h-6 text-[#8b6d22]" />
                  Vincular Preleções (Aulas)
                </h2>
                <p className="text-[#7a6350] mt-3 italic">
                  Disciplina: <span className="text-[#1e130c] font-medium not-italic">{selectedSubjectForLessons.name}</span>
                </p>
              </div>
              <button
                onClick={() => setShowLessonsModal(false)}
                className="text-[#8b6d22] hover:text-[#1e130c] transition-colors"
                aria-label="Fechar"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="relative z-10">
              {lessonsLoading ? (
                <div className="flex justify-center items-center py-16">
                  <Spinner size="lg" className="text-[#8b6d22]" />
                </div>
              ) : (
                <>
                  {lessonAssociationOptions.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-6 text-sm text-[#7a6350] border-b border-[#1e130c]/15 pb-4">
                      <p className="italic">
                        {showOnlyAvailableLessons
                          ? 'Revelando apenas preleções vagas.'
                          : 'Exibindo o índice completo.'}
                      </p>
                      <button
                        type="button"
                        onClick={toggleLessonFilterMode}
                        className="text-[#8b6d22] hover:text-[#1e130c] underline transition-colors"
                      >
                        {showOnlyAvailableLessons ? 'Ver índice completo' : 'Ocultar já vinculadas'}
                      </button>
                    </div>
                  )}

                  <div className="overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: '50vh' }}>
                    {lessonAvailableItems.length === 0 ? (
                      <div className="text-center py-12">
                        <AlertCircle className="w-12 h-12 text-[#8b6d22]/30 mx-auto mb-4" />
                        <p className="text-[#7a6350] italic text-lg">Nenhum registro de preleção disponível</p>
                        <p className="text-[#8b6d22] text-sm mt-2">
                          Registre novas aulas na seção correspondente antes de tentar vinculá-las.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {lessonAvailableItems.map((item) => {
                          const isDisabled = item.availability === 'current'
                          const isSelected = selectedLessonOptions.includes(item.id)
                          const contentLabel = item.contentType === 'video'
                            ? 'Cinematografia'
                            : item.contentType === 'text'
                            ? 'Manuscrito'
                            : item.contentType === 'quiz'
                            ? 'Exame'
                            : null

                          const labelClasses = \`flex items-start gap-4 p-4 border \${
                            isDisabled ? 'border-[#1e130c]/10 bg-[#1e130c]/5 opacity-60 cursor-not-allowed' : 
                            isSelected ? 'border-[#8b6d22] bg-[#8b6d22]/5 cursor-pointer' : 
                            'border-[#1e130c]/15 hover:border-[#8b6d22]/50 hover:bg-[#faf6ee] cursor-pointer'
                          } transition-all\`

                          const handleToggle = (checked) => {
                            setSelectedLessonOptions(prev => {
                              if (checked) {
                                return prev.includes(item.id) ? prev : [...prev, item.id]
                              }
                              return prev.filter(id => id !== item.id)
                            })
                          }

                          return (
                            <label key={item.id} className={labelClasses}>
                              <div className="pt-1">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => handleToggle(e.target.checked)}
                                  disabled={isDisabled}
                                  className="w-5 h-5 text-[#8b6d22] bg-transparent border-2 border-[#1e130c]/30 rounded-none focus:ring-[color:var(--color-focus)] focus:ring-2 disabled:opacity-50"
                                />
                              </div>
                              <div className="flex-1">
                                <p className="text-[#1e130c] font-medium font-[family-name:var(--font-playfair)] text-lg">{item.displayName}</p>
                                {item.description && (
                                  <p className="text-[#7a6350] text-sm mt-1 italic">{item.description}</p>
                                )}
                                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-[#8b6d22] mt-3">
                                  {contentLabel && <span className="uppercase tracking-widest">{contentLabel}</span>}
                                  {typeof item.durationMinutes === 'number' && (
                                    <span className="uppercase tracking-widest">{item.durationMinutes} min</span>
                                  )}
                                </div>
                                {item.statusText && (
                                  <p className={\`text-xs mt-2 italic \${
                                    item.availability === 'available' ? 'text-green-700' :
                                    item.availability === 'current' ? 'text-[#8b6d22]' : 'text-amber-700'
                                  }\`}>
                                    {item.statusText}
                                  </p>
                                )}
                              </div>
                              {isSelected && !isDisabled && <Check className="w-6 h-6 text-[#8b6d22] mt-1" />}
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="flex justify-between items-center pt-8 border-t border-[#1e130c]/15 mt-8">
                <p className="text-[#1e130c] font-medium">
                  {selectedLessonOptions.length} {selectedLessonOptions.length === 1 ? 'preleção assinalada' : 'preleções assinaladas'}
                </p>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowLessonsModal(false)}
                    disabled={submitting}
                    className="py-2 px-6 border border-[#1e130c]/20 text-[#1e130c] hover:bg-[#1e130c]/5 transition-colors font-medium text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={saveLessonAssociations}
                    disabled={selectedLessonOptions.length === 0 || submitting || lessonsLoading}
                    className="py-2 px-6 bg-[#1e130c] text-[#faf6ee] hover:bg-[#8b6d22] transition-colors font-medium text-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'A Lavrar...' : 'Confirmar Vínculos'}
                  </button>
                </div>
              </div>
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
