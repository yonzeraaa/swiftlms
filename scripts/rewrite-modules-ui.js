const fs = require('fs');
const file = 'app/dashboard/modules/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("import Card from '../../components/Card'", "import { ClassicRule, CornerBracket } from '../../components/ui/RenaissanceSvgs'");

const returnRegex = /const tableHeader = \(showGrip: boolean\) => \([\s\S]*\}\n\)\n\}/;

const newReturn = `const tableHeader = (showGrip: boolean) => (
    <thead className="bg-transparent backdrop-blur-sm sticky top-0 z-10 border-b-2 border-[#1e130c]/30">
      <tr>
        {showGrip && <th className="w-8 py-4 px-2" />}
        <th className="w-10 py-4 px-4 text-center">
          <button
            onClick={selectedModules.size === sortedModules.length ? deselectAllModules : selectAllModules}
            className="text-[#8b6d22] hover:text-[#1e130c] transition-colors"
          >
            {selectedModules.size === sortedModules.length && sortedModules.length > 0
              ? <CheckSquare className="w-5 h-5" />
              : <Square className="w-5 h-5" />}
          </button>
        </th>
        <th scope="col" className="text-left py-4 px-4 text-[#7a6350] font-medium font-[family-name:var(--font-playfair)]">Código</th>
        <th scope="col" className="text-left py-4 px-4 text-[#7a6350] font-medium font-[family-name:var(--font-playfair)]">Título</th>
        <th scope="col" className="text-left py-4 px-4 text-[#7a6350] font-medium font-[family-name:var(--font-playfair)]">Curso</th>
        <th scope="col" className="text-right py-4 px-4 text-[#7a6350] font-medium font-[family-name:var(--font-playfair)]">Disciplinas</th>
        <th scope="col" className="text-right py-4 px-4 text-[#7a6350] font-medium font-[family-name:var(--font-playfair)]">Horas</th>
        <th scope="col" className="text-left py-4 px-4 text-[#7a6350] font-medium font-[family-name:var(--font-playfair)]">Tipo</th>
        <th scope="col" className="text-right py-4 px-4 text-[#7a6350] font-medium font-[family-name:var(--font-playfair)]">Ordem</th>
        <th scope="col" className="text-center py-4 px-4 text-[#7a6350] font-medium font-[family-name:var(--font-playfair)]">Ações</th>
      </tr>
    </thead>
  )

  const emptyRow = (colSpan: number) => (
    <tr>
      <td colSpan={colSpan} className="py-12 text-center">
        <Folder className="w-12 h-12 text-[#8b6d22]/30 mx-auto mb-3" />
        <p className="text-[#7a6350] font-style: italic">
          {searchTerm ? 'Nenhum registro encontrado' : 'O livro de registros encontra-se vazio'}
        </p>
      </td>
    </tr>
  )

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8 bg-[#faf6ee] min-h-screen font-[family-name:var(--font-lora)] text-[#1e130c]">
      <Breadcrumbs className="mb-2" />

      {/* Header */}
      <div className="text-center sm:text-left mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-playfair)] text-3xl sm:text-4xl md:text-5xl font-bold text-[#1e130c] flex items-center justify-center sm:justify-start gap-3">
              <Folder className="w-8 h-8 text-[#8b6d22]" />
              Livro de Módulos
            </h1>
            <p className="text-[#7a6350] mt-2 italic">
              Registros e ordenação estrutural dos módulos acadêmicos.
            </p>
          </div>
          <Button onClick={openCreateModal} icon={<Plus className="w-4 h-4" />}>
            Novo Registro
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

      {/* Selection Actions Bar */}
      {selectedModules.size > 0 && (
        <div className="border border-[#8b6d22]/50 bg-[#8b6d22]/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner">
          <div className="flex items-center gap-4">
            <span className="text-[#1e130c] font-medium">
              {selectedModules.size} {selectedModules.size === 1 ? 'registro selecionado' : 'registros selecionados'}
            </span>
            <button
              onClick={deselectAllModules}
              className="text-[#8b6d22] hover:text-[#1e130c] text-sm underline italic transition-colors"
            >
              Desmarcar todos
            </button>
          </div>
          <Button
            variant="danger"
            size="sm"
            icon={<Trash className="w-4 h-4" />}
            onClick={handleBulkDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Expurgando...' : 'Expurgar Selecionados'}
          </Button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="space-y-4 mb-8">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex-1 relative">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8b6d22]" />
            <input
              type="text"
              placeholder="Pesquisar nos registros..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none"
            />
          </div>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full sm:w-auto px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none cursor-pointer"
          >
            <option value="all">Todos os Cursos</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>{course.title}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm pt-2">
          <span className="text-[#7a6350] font-medium font-[family-name:var(--font-playfair)]">Ordenação:</span>
          <button
            type="button"
            onClick={() => setSortMode('code')}
            className={\`px-3 py-1 border-b-2 transition-colors \${
              sortMode === 'code'
                ? 'border-[#8b6d22] text-[#1e130c] font-medium'
                : 'border-transparent text-[#7a6350] hover:text-[#1e130c]'
            }\`}
          >
            Alfabética (Código)
          </button>
          <button
            type="button"
            onClick={() => setSortMode('structure')}
            className={\`px-3 py-1 border-b-2 transition-colors \${
              sortMode === 'structure'
                ? 'border-[#8b6d22] text-[#1e130c] font-medium'
                : 'border-transparent text-[#7a6350] hover:text-[#1e130c]'
            }\`}
          >
            Estrutural (Manual)
          </button>
        </div>
      </div>

      {/* Modules Table */}
      <div className="relative">
        {sortMode === 'structure' && isSaving && (
          <div className="absolute inset-0 bg-[#faf6ee]/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="px-6 py-3 border border-[#8b6d22] bg-[#faf6ee] shadow-xl text-[#8b6d22] font-medium italic flex items-center gap-3">
              <Spinner size="sm" />
              Inscrevendo nova ordem...
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          {sortMode === 'structure' ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedModules.map(m => m.id)}
                strategy={verticalListSortingStrategy}
              >
                <table className="w-full text-sm sm:text-base border-collapse">
                  {tableHeader(true)}
                  <tbody>
                    {sortedModules.length > 0 ? (
                      sortedModules.map((module) => (
                        <SortableModuleRow
                          key={module.id}
                          module={module}
                          course={coursesById.get(module.course_id)}
                          stats={moduleStats[module.id] || { subjects: 0 }}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          isSelected={selectedModules.has(module.id)}
                          onToggleSelect={toggleSelectModule}
                        />
                      ))
                    ) : (
                      emptyRow(11)
                    )}
                  </tbody>
                </table>
              </SortableContext>

              <DragOverlay>
                {activeModule ? (
                  <div className="bg-[#faf6ee] border border-[#8b6d22] px-6 py-4 shadow-2xl flex items-center gap-4 rotate-2 scale-105">
                    <GripVertical className="w-5 h-5 text-[#8b6d22]" />
                    <div>
                      <p className="text-[#1e130c] font-[family-name:var(--font-playfair)] text-lg">{activeModule.title}</p>
                      <p className="text-[#8b6d22] text-xs italic">Acomodando registro...</p>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <table className="w-full text-sm sm:text-base border-collapse">
              {tableHeader(false)}
              <tbody>
                {sortedModules.length > 0 ? (
                  sortedModules.map((module) => (
                    <ModuleRow
                      key={module.id}
                      module={module}
                      course={coursesById.get(module.course_id)}
                      stats={moduleStats[module.id] || { subjects: 0 }}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      isSelected={selectedModules.has(module.id)}
                      onToggleSelect={toggleSelectModule}
                    />
                  ))
                ) : (
                  emptyRow(10)
                )}
              </tbody>
            </table>
          )}
        </div>
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
                {editingModule ? 'Editar Registro do Módulo' : 'Novo Registro de Módulo'}
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
                  Título do Módulo <span className="text-[#8b6d22]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none"
                  placeholder="Ex: Fundamentos da Teologia"
                />
              </div>

              <div>
                <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                  Curso Vinculado <span className="text-[#8b6d22]">*</span>
                </label>
                <select
                  required
                  value={formData.course_id}
                  onChange={(e) => {
                    const courseId = e.target.value
                    const courseModules = modules.filter(m => m.course_id === courseId)
                    const maxOrderIndex = courseModules.length > 0
                      ? Math.max(...courseModules.map(m => m.order_index || 0)) + 1
                      : 0
                    setFormData({ ...formData, course_id: courseId, order_index: maxOrderIndex.toString() })
                  }}
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none cursor-pointer"
                >
                  <option value="" disabled>Selecione a academia...</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                    step="1"
                  />
                  <p className="text-xs text-[#7a6350] mt-2 italic">Posição no arranjo do curso (autocompleta).</p>
                </div>

                <div>
                  <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-3">
                    Natureza da Matéria
                  </label>
                  <div className="flex gap-6 mt-2">
                    <label className="flex items-center cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input
                          type="radio"
                          name="is_required"
                          checked={formData.is_required === true}
                          onChange={() => setFormData({ ...formData, is_required: true })}
                          className="peer sr-only"
                        />
                        <div className="w-5 h-5 border-2 border-[#1e130c]/30 rounded-full peer-checked:border-[#8b6d22] peer-checked:bg-[#8b6d22] transition-colors"></div>
                        <div className="absolute w-2 h-2 bg-[#faf6ee] rounded-full opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                      </div>
                      <span className="ml-3 text-[#1e130c] group-hover:text-[#8b6d22] transition-colors">Obrigatória</span>
                    </label>
                    <label className="flex items-center cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input
                          type="radio"
                          name="is_required"
                          checked={formData.is_required === false}
                          onChange={() => setFormData({ ...formData, is_required: false })}
                          className="peer sr-only"
                        />
                        <div className="w-5 h-5 border-2 border-[#1e130c]/30 rounded-full peer-checked:border-[#8b6d22] peer-checked:bg-[#8b6d22] transition-colors"></div>
                        <div className="absolute w-2 h-2 bg-[#faf6ee] rounded-full opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                      </div>
                      <span className="ml-3 text-[#1e130c] group-hover:text-[#8b6d22] transition-colors">Opcional</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                  Ementa (Descrição)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[color:var(--color-focus)] transition-colors rounded-none resize-none"
                  placeholder="Sumário das disciplinas a serem abordadas..."
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
                    editingModule ? 'Inscrever Alterações' : 'Lavrar Registro'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
\`;

content = content.replace(returnRegex, newReturn);
fs.writeFileSync(file, content, 'utf8');
