'use client'

import { useState, useEffect } from 'react'
import { Search, MoreVertical, Users, Edit, Trash2, BookOpen, X, CheckCircle, XCircle, BookMarked, FolderInput } from 'lucide-react'
import Spinner from '../../components/ui/Spinner'
import { useTranslation } from '../../contexts/LanguageContext'
import CourseStructureManager from '../../components/CourseStructureManager'
import { useAuth } from '../../providers/AuthProvider'
import { useDriveImport } from '../../contexts/DriveImportContext'
import {
  getCoursesData,
  getEnrolledStudents,
  createCourse as createCourseAction,
  updateCourse as updateCourseAction,
  deleteCourse as deleteCourseAction,
  toggleCoursePublishStatus,
  unenrollStudent as unenrollStudentAction
} from '@/lib/actions/admin-courses'
import { ClassicRule, CornerBracket } from '../../components/ui/RenaissanceSvgs'

interface Course {
  id: string
  slug: string
  code: string | null
  title: string
  description: string | null
  summary: string | null
  instructor_id: string | null
  category: string
  difficulty: string
  duration_hours: number
  price: number | null
  is_published: boolean | null
  is_featured: boolean | null
  created_at: string | null
  instructor?: { full_name: string | null; email: string } | null
  _count?: { enrollments: number; modules: number; subjects: number; lessons: number; tests: number }
}

interface NewCourseForm {
  title: string
  code: string
  description: string
  summary: string
  category: string
  difficulty: string
  duration_hours: number
  price: number
  is_featured: boolean
}

const INK = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'
const PARCH = '#faf6ee'
const BORDER = 'rgba(30,19,12,0.14)'

function abbreviateName(fullName: string | null | undefined): string {
  if (!fullName) return '—'
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  const initials = parts.slice(1).map(p => p[0].toUpperCase() + '.').join(' ')
  return `${parts[0]} ${initials}`
}

export default function CoursesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewCourseModal, setShowNewCourseModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [dropdownCourse, setDropdownCourse] = useState<Course | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top?: number, bottom?: number, left: number, isUp?: boolean } | null>(null)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5
  const [showSubjectsModal, setShowSubjectsModal] = useState(false)
  const [showManageStudentsModal, setShowManageStudentsModal] = useState(false)
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([])
  const [loadingEnrolledStudents, setLoadingEnrolledStudents] = useState(false)
  const { openImport } = useDriveImport()
  const { session, isLoading: authLoading, refreshSession } = useAuth()
  const { t } = useTranslation()

  const [newCourseForm, setNewCourseForm] = useState<NewCourseForm>({
    title: '', code: '', description: '', summary: '', category: 'engineering', difficulty: 'beginner', duration_hours: 40, price: 0, is_featured: false
  })

  const [editForm, setEditForm] = useState<NewCourseForm>({
    title: '', code: '', description: '', summary: '', category: 'engineering', difficulty: 'beginner', duration_hours: 40, price: 0, is_featured: false
  })

  useEffect(() => {
    if (session && !authLoading) fetchCourses()
  }, [session, authLoading])

  const fetchCourses = async () => {
    try {
      const result = await getCoursesData()
      if (!result) throw new Error('Failed to fetch courses')
      setCourses(result.courses || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const createCourse = async () => {
    setCreating(true); setError(null);
    try {
      const result = await createCourseAction(newCourseForm)
      if (!result.success) throw new Error(result.error || 'Erro ao criar')
      setShowNewCourseModal(false); fetchCourses();
    } catch (err: any) { setError(err.message) } finally { setCreating(false) }
  }

  const updateCourse = async () => {
    if (!selectedCourse) return
    setUpdating(true); setError(null);
    try {
      const result = await updateCourseAction(selectedCourse.id, editForm)
      if (!result.success) throw new Error(result.error || 'Erro ao atualizar')
      setShowEditModal(false); fetchCourses();
    } catch (err: any) { setError(err.message) } finally { setUpdating(false) }
  }

  const deleteCourse = async () => {
    if (!selectedCourse) return
    setUpdating(true); setError(null);
    try {
      const result = await deleteCourseAction(selectedCourse.id)
      if (!result.success) throw new Error(result.error || 'Erro ao deletar')
      setShowDeleteModal(false); fetchCourses();
    } catch (err: any) { setError(err.message) } finally { setUpdating(false) }
  }

  const togglePublishStatus = async (course: Course) => {
    try {
      const result = await toggleCoursePublishStatus(course.id, course.is_published || false)
      if (result.success) setCourses(courses.map(c => c.id === course.id ? { ...c, is_published: result.newStatus } : c))
    } catch (err) { console.error(err) }
  }

  const openManageStudentsModal = async (course: Course) => {
    if (!session) await refreshSession()
    setSelectedCourse(course); setShowManageStudentsModal(true); setOpenDropdown(null);
    setLoadingEnrolledStudents(true)
    try {
      const result = await getEnrolledStudents(course.id)
      if (result.success) setEnrolledStudents(result.students || [])
    } catch (err) { console.error(err) } finally { setLoadingEnrolledStudents(false) }
  }

  const unenrollStudent = async (enrollmentId: string, name: string) => {
    if (!confirm(`Desmatricular ${name}?`)) return
    try {
      const result = await unenrollStudentAction(enrollmentId)
      if (result.success && selectedCourse) {
        const res = await getEnrolledStudents(selectedCourse.id)
        setEnrolledStudents(res.students || [])
        fetchCourses()
      }
    } catch (err) { console.error(err) }
  }

  const filteredCourses = courses.filter(c => {
    const mSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || (c.code?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
    const mCat = selectedCategory === 'all' || c.category === selectedCategory
    return mSearch && mCat
  })

  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage)
  const paginatedCourses = filteredCourses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const openEditModal = (course: Course) => {
    setSelectedCourse(course)
    setEditForm({
      title: course.title,
      code: course.code || '',
      description: course.description || '',
      summary: course.summary || '',
      category: course.category,
      difficulty: course.difficulty,
      duration_hours: course.duration_hours,
      price: course.price || 0,
      is_featured: course.is_featured || false
    })
    setShowEditModal(true)
    setOpenDropdown(null)
  }

  return (
    <div className="flex flex-col w-full">
      {/* ── Cabeçalho Principal Alinhado ── */}
      <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 w-full border-b border-[#1e130c]/10 pb-8">
        <div className="flex-1">
          <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontWeight: 700, color: INK, lineHeight: 1 }}>
            Gestão de Cursos
          </h1>
          <p style={{ fontFamily: 'var(--font-lora)', fontSize: '1.1rem', fontStyle: 'italic', color: MUTED, marginTop: '0.5rem' }}>
            Administração do catálogo acadêmico e ementas
          </p>
          <div className="mt-6 w-full max-w-md">
            <ClassicRule color={INK} />
          </div>
        </div>
        <button
          onClick={() => setShowNewCourseModal(true)}
          style={{ padding: '1rem 3rem', backgroundColor: INK, color: PARCH, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-lora)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        >
          Novo Curso
        </button>
      </div>

      {/* ── Filtros e Métricas Alinhados ── */}
      <div className="flex flex-col lg:flex-row gap-8 mb-12 items-stretch">
        <div className="flex-1 flex flex-col md:flex-row gap-4">
          <div className="flex-[2] relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7a6350]" />
            <input
              type="text"
              placeholder="Buscar título ou código..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, color: INK, fontFamily: 'var(--font-lora)', fontSize: '1rem' }}
            />
          </div>
          <div className="flex-1 relative">
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', padding: '1rem', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, color: INK, fontFamily: 'var(--font-lora)', cursor: 'pointer', appearance: 'none' }}
            >
              <option value="all">Todas Categorias</option>
              <option value="engineering">Engenharia</option>
              <option value="safety">Segurança</option>
              <option value="operations">Operações</option>
              <option value="maintenance">Manutenção</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 text-xs">▼</div>
          </div>
        </div>
        
        <div className="w-full lg:w-64 border border-[#1e130c]/10 bg-[#1e130c]/[0.02] flex items-center px-6 py-4 justify-between">
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total</span>
          <span style={{ fontFamily: 'var(--font-playfair)', fontSize: '2rem', fontWeight: 700, color: INK, lineHeight: 1 }}>{courses.length}</span>
        </div>
      </div>

      {/* ── Tabela com Larguras Fixas para Melhor Alinhamento ── */}
      {loading ? (
        <Spinner fullPage size="xl" />
      ) : (
        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse min-w-[800px]">
            <thead>
              <tr style={{ borderBottom: `2px solid ${INK}` }}>
                <th className="px-4 py-4 text-left w-24" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Código</th>
                <th className="px-4 py-4 text-left" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Título e Detalhes Acadêmicos</th>
                <th className="px-4 py-4 text-left w-32" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Alunos</th>
                <th className="px-4 py-4 text-left w-40" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Situação</th>
                <th className="px-4 py-4 text-center w-20" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCourses.map((c) => (
                <tr key={c.id} style={{ borderBottom: `1px dashed ${BORDER}` }} className="hover:bg-[#1e130c]/[0.02] transition-colors group">
                  <td className="px-4 py-6 align-top" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.9rem', color: ACCENT, fontWeight: 600 }}>{c.code || '—'}</td>
                  <td className="px-4 py-6 align-top">
                    <div>
                      <span style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.25rem', fontWeight: 600, color: INK, display: 'block', marginBottom: '0.25rem' }}>{c.title}</span>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm italic text-[#7a6350]">
                        <span>{c.category}</span>
                        <span className="opacity-30">•</span>
                        <span>{c.duration_hours} horas</span>
                        <span className="opacity-30">•</span>
                        <span>Docente: {abbreviateName(c.instructor?.full_name)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-6 align-top" style={{ fontFamily: 'var(--font-lora)', fontSize: '1rem', color: INK }}>{c._count?.enrollments || 0}</td>
                  <td className="px-4 py-6 align-top">
                    <span style={{ 
                      display: 'inline-block',
                      fontSize: '0.65rem', 
                      fontWeight: 700, 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.05em',
                      color: c.is_published ? INK : MUTED,
                      backgroundColor: c.is_published ? 'rgba(30,19,12,0.05)' : 'transparent',
                      padding: '0.35rem 0.75rem',
                      border: `1px solid ${c.is_published ? INK : MUTED}`
                    }}>
                      {c.is_published ? 'Publicado' : 'Rascunho'}
                    </span>
                  </td>
                  <td className="px-4 py-6 text-center align-top">
                    <button
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const isUp = window.innerHeight - rect.bottom < 250
                        setDropdownPosition({ 
                          top: isUp ? undefined : rect.bottom, 
                          bottom: isUp ? window.innerHeight - rect.top : undefined,
                          left: rect.right - 240,
                          isUp
                        })
                        setDropdownCourse(c); setOpenDropdown(c.id);
                      }}
                      className="text-[#8b6d22] hover:text-[#1e130c] p-2 transition-transform active:scale-90"
                    >
                      <MoreVertical size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filteredCourses.length === 0 && (
            <div className="py-24 text-center italic text-[#7a6350] border border-dashed border-[#1e130c]/10 mt-4">Nenhum registro acadêmico localizado para os filtros informados.</div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-between items-center py-4 mt-4 border-t border-[#1e130c]/10">
              <span className="text-sm text-[#7a6350] italic">
                Página {currentPage} de {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-transparent border border-[#1e130c]/20 text-[#1e130c] text-sm hover:bg-[#1e130c]/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-transparent border border-[#1e130c]/20 text-[#1e130c] text-sm hover:bg-[#1e130c]/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Próximo
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Dropdown Portal Corrigido ── */}
      {openDropdown && dropdownCourse && dropdownPosition && (
        <>
          <div className="fixed inset-0 z-[11000] bg-transparent" onClick={() => { setOpenDropdown(null); setDropdownCourse(null); }} />
          <div
            className="fixed w-60 bg-[#faf6ee] border border-[#1e130c]/20 shadow-2xl z-[11001] py-3 font-[family-name:var(--font-lora)]"
            style={{ top: dropdownPosition.top ? `${dropdownPosition.top + 8}px` : undefined, bottom: dropdownPosition.bottom ? `${dropdownPosition.bottom + 8}px` : undefined, left: `${dropdownPosition.left}px` }}
          >
            <div className={`absolute ${dropdownPosition.isUp ? "-bottom-2 border-b border-r" : "-top-2 border-l border-t"} right-4 w-4 h-4 bg-[#faf6ee] border-[#1e130c]/20 rotate-45`} />
            {[
              { label: 'Editar Dados', icon: Edit, action: () => openEditModal(dropdownCourse) },
              { label: dropdownCourse.is_published ? 'Retirar de Pauta' : 'Publicar Título', icon: dropdownCourse.is_published ? XCircle : CheckCircle, action: () => togglePublishStatus(dropdownCourse) },
              { label: 'Alunos Matriculados', icon: Users, action: () => openManageStudentsModal(dropdownCourse) },
              { label: 'Estrutura da Ementa', icon: BookMarked, action: () => { setSelectedCourse(dropdownCourse); setShowSubjectsModal(true); setOpenDropdown(null); } },
              { label: 'Importar Conteúdo', icon: FolderInput, action: () => { openImport(dropdownCourse.id, dropdownCourse.title); setOpenDropdown(null); } }
            ].map((opt, i) => (
              <button key={i} onClick={opt.action} className="w-full px-5 py-3 text-left hover:bg-[#1e130c]/5 flex items-center justify-start gap-4 transition-colors">
                <opt.icon size={16} style={{ color: ACCENT }} />
                <span style={{ fontSize: '0.95rem', color: INK, fontWeight: 500 }}>{opt.label}</span>
              </button>
            ))}
            <div className="border-t border-[#1e130c]/10 mt-3 pt-3">
              <button 
                onClick={() => { setSelectedCourse(dropdownCourse); setShowDeleteModal(true); setOpenDropdown(null); }}
                className="w-full px-5 py-3 text-left hover:bg-[#7a6350]/10 flex items-center justify-start gap-4 transition-colors"
              >
                <Trash2 size={16} className="text-[#7a6350] italic" />
                <span style={{ fontSize: '0.95rem', color: '#7a6350', fontWeight: 600 }}>Deletar Registro</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modais (Mantendo a lógica mas garantindo alinhamento interno) */}
      {(showNewCourseModal || (showEditModal && selectedCourse)) && (
        <div className="fixed inset-0 bg-[#1e130c]/40 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] overflow-y-auto custom-scrollbar">
          <div className="relative bg-[#faf6ee] w-full max-w-2xl p-8 md:p-10 shadow-2xl border border-[#1e130c]/20 my-8">
            <div className="flex items-center justify-between mb-8 relative z-10">
              <h2 className="font-[family-name:var(--font-playfair)] text-2xl md:text-3xl font-bold text-[#1e130c] border-b-2 border-[#8b6d22] pb-2 pr-8">
                {showNewCourseModal ? 'Novo Curso' : 'Editar Curso'}
              </h2>
              <button
                onClick={() => { setShowNewCourseModal(false); setShowEditModal(false); }}
                className="text-[#8b6d22] hover:text-[#1e130c] transition-colors"
                aria-label="Fechar"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); showNewCourseModal ? createCourse() : updateCourse(); }} className="space-y-6 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                    Título Oficial <span className="text-[#8b6d22]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={showNewCourseModal ? newCourseForm.title : editForm.title}
                    onChange={(e) => showNewCourseModal ? setNewCourseForm({...newCourseForm, title: e.target.value}) : setEditForm({...editForm, title: e.target.value})}
                    className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none"
                    placeholder="Ex: Introdução à Engenharia"
                  />
                </div>
                <div>
                  <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                    Código <span className="text-[#8b6d22]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={showNewCourseModal ? newCourseForm.code : editForm.code}
                    onChange={(e) => { const val = e.target.value.toUpperCase(); showNewCourseModal ? setNewCourseForm({...newCourseForm, code: val}) : setEditForm({...editForm, code: val}) }}
                    className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none font-mono"
                    placeholder="Ex: ENG101"
                  />
                </div>
              </div>

              <div>
                <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                  Resumo da Ementa
                </label>
                <textarea
                  value={showNewCourseModal ? newCourseForm.summary : editForm.summary}
                  onChange={(e) => showNewCourseModal ? setNewCourseForm({...newCourseForm, summary: e.target.value}) : setEditForm({...editForm, summary: e.target.value})}
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none min-h-[100px] resize-y"
                  placeholder="Breve descrição do curso"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                    Categoria
                  </label>
                  <select
                    value={showNewCourseModal ? newCourseForm.category : editForm.category}
                    onChange={(e) => showNewCourseModal ? setNewCourseForm({...newCourseForm, category: e.target.value}) : setEditForm({...editForm, category: e.target.value})}
                    className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none"
                  >
                    <option value="engineering">Engenharia</option>
                    <option value="safety">Segurança</option>
                    <option value="operations">Operações</option>
                    <option value="maintenance">Manutenção</option>
                  </select>
                </div>
                <div>
                  <label className="block font-[family-name:var(--font-playfair)] text-lg text-[#1e130c] mb-2">
                    Carga Horária (h) <span className="text-[#8b6d22]">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={showNewCourseModal ? newCourseForm.duration_hours : editForm.duration_hours}
                    onChange={(e) => { const val = parseInt(e.target.value) || 0; showNewCourseModal ? setNewCourseForm({...newCourseForm, duration_hours: val}) : setEditForm({...editForm, duration_hours: val}) }}
                    className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/50 focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-8 border-t border-[#1e130c]/15">
                <button
                  type="button"
                  onClick={() => { setShowNewCourseModal(false); setShowEditModal(false); }}
                  disabled={creating || updating}
                  className="flex-1 py-3 px-4 border border-[#1e130c]/20 text-[#1e130c] hover:bg-[#1e130c]/5 transition-colors font-medium text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating || updating}
                  className="flex-1 py-3 px-4 bg-[#1e130c] text-[#faf6ee] hover:bg-[#8b6d22] transition-colors font-medium text-center flex items-center justify-center gap-2"
                >
                  {(creating || updating) ? (
                    <><Spinner size="sm" /> Gravando...</>
                  ) : (
                    'Salvar Curso'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal Alinhado */}
      {showDeleteModal && selectedCourse && (
        <div className="fixed inset-0 bg-[#1e130c]/80 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
          <div className="bg-[#faf6ee] w-full max-w-md relative border border-[#7a6350] p-12 text-center font-[family-name:var(--font-lora)] shadow-2xl">
            <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '2rem', color: '#7a6350', marginBottom: '1.5rem', fontWeight: 700 }}>Expurgar Título</h2>
            <p style={{ color: INK, fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '2.5rem' }}>Deseja remover permanentemente<br/><strong className="text-xl">"{selectedCourse.title}"</strong><br/>do acervo acadêmico?</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button onClick={() => setShowDeleteModal(false)} style={{ flex: 1, padding: '1rem', background: 'none', border: `1px solid ${INK}`, color: INK, cursor: 'pointer', fontWeight: 600, textTransform: 'uppercase' }}>Manter</button>
              <button onClick={deleteCourse} style={{ flex: 1, padding: '1rem', backgroundColor: '#7a6350', color: PARCH, border: 'none', cursor: 'pointer', fontWeight: 600, textTransform: 'uppercase' }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Students Modal */}
      {showManageStudentsModal && selectedCourse && (
        <div className="fixed inset-0 bg-[#1e130c]/70 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
          <div className="bg-[#faf6ee] w-full max-w-3xl relative border border-[#1e130c] shadow-2xl p-12 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-10 border-b border-[#1e130c]/10 pb-6">
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '2rem', color: INK, fontWeight: 700 }}>Registros de Matrícula</h2>
              <button onClick={() => setShowManageStudentsModal(false)} className="text-[#1e130c]/40 hover:text-[#1e130c] transition-colors"><X size={32} /></button>
            </div>
            
            {loadingEnrolledStudents ? (
              <div className="py-20 text-center"><Spinner size="lg" /></div>
            ) : (
              <div className="space-y-6">
                {enrolledStudents.map(s => (
                  <div key={s.id} className="flex justify-between items-center p-6 border border-[#1e130c]/10 hover:bg-[#1e130c]/[0.02] transition-colors bg-white/20">
                    <div>
                      <p style={{ fontFamily: 'var(--font-lora)', fontSize: '1.1rem', fontWeight: 600, color: INK }}>{s.user?.full_name}</p>
                      <p style={{ fontSize: '0.85rem', color: MUTED }}>{s.user?.email} • Progresso: <span className="text-black font-bold">{s.progress_percentage}%</span></p>
                    </div>
                    <button 
                      onClick={() => unenrollStudent(s.id, s.user?.full_name)}
                      style={{ padding: '0.6rem 1.2rem', background: 'none', border: '1px solid #7a6350', color: '#7a6350', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s' }}
                      className="hover:bg-[#7a6350]/10"
                    >
                      Remover
                    </button>
                  </div>
                ))}
                {enrolledStudents.length === 0 && <p className="py-20 text-center italic text-[#7a6350] border border-dashed border-[#1e130c]/10">Nenhum aluno matriculado até o momento.</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Structure Manager Modal Alinhado */}
      {showSubjectsModal && selectedCourse && (
        <div className="fixed inset-0 bg-[#1e130c]/70 backdrop-blur-md flex items-center justify-center z-[10000] p-4">
          <div className="bg-[#faf6ee] w-full max-w-6xl relative border border-[#1e130c] shadow-2xl p-10 md:p-16 max-h-[95vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-10 border-b border-[#1e130c]/10 pb-6">
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '2.2rem', color: INK, fontWeight: 700 }}>Estrutura de Ementa: {selectedCourse.title}</h2>
              <button onClick={() => setShowSubjectsModal(false)} className="text-[#1e130c]/40 hover:text-[#1e130c] transition-colors"><X size={32} /></button>
            </div>
            <div className="bg-white/30 p-2 border border-[#1e130c]/5">
              <CourseStructureManager courseId={selectedCourse.id} courseName={selectedCourse.title} canManage={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
