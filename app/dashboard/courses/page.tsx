'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Filter, Plus, MoreVertical, Users, Clock, Award, Edit, Trash2, Eye, BookOpen, X, AlertCircle, CheckCircle, XCircle, BookMarked, UserMinus, FolderInput } from 'lucide-react'
import Card from '../../components/Card'
import Button from '../../components/Button'
import Breadcrumbs from '../../components/ui/Breadcrumbs'
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
  is_featured: boolean | null
  is_published: boolean | null
  created_at: string | null
  instructor?: {
    full_name: string | null
    email: string
  } | null
  _count?: {
    enrollments: number
    modules: number
    subjects: number
    lessons: number
    tests: number
  }
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

// "João Carlos Silva" → "João C. S."
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
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null)
  const dropdownRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [instructors, setInstructors] = useState<any[]>([])
  const [showViewModal, setShowViewModal] = useState(false)
  const [showSubjectsModal, setShowSubjectsModal] = useState(false)
  const [showManageStudentsModal, setShowManageStudentsModal] = useState(false)
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([])
  const [loadingEnrolledStudents, setLoadingEnrolledStudents] = useState(false)
  const { openImport } = useDriveImport()

  const { session, user, isLoading: authLoading, refreshSession } = useAuth()
  const { t } = useTranslation()

  const [newCourseForm, setNewCourseForm] = useState<NewCourseForm>({
    title: '',
    code: '',
    description: '',
    summary: '',
    category: 'engineering',
    difficulty: 'beginner',
    duration_hours: 40,
    price: 0,
    is_featured: false
  })

  const [editForm, setEditForm] = useState<NewCourseForm>({
    title: '',
    code: '',
    description: '',
    summary: '',
    category: 'engineering',
    difficulty: 'beginner',
    duration_hours: 40,
    price: 0,
    is_featured: false
  })

  useEffect(() => {
    if (session && !authLoading) {
      fetchCourses()
    }
  }, [session, authLoading])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown && !(event.target as Element).closest('.dropdown-menu')) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openDropdown])

  const fetchCourses = async () => {
    try {
      const result = await getCoursesData()
      if (!result) throw new Error('Failed to fetch courses')
      setCourses(result.courses || [])
      setInstructors(result.instructors || [])
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const createCourse = async () => {
    setCreating(true)
    setError(null)
    try {
      const result = await createCourseAction(newCourseForm)
      if (!result.success) throw new Error(result.error || t('courses.createError'))
      setNewCourseForm({
        title: '', code: '', description: '', summary: '', category: 'engineering',
        difficulty: 'beginner', duration_hours: 40, price: 0, is_featured: false
      })
      setShowNewCourseModal(false)
      fetchCourses()
    } catch (error: any) {
      setError(error.message || t('courses.createError'))
    } finally {
      setCreating(false)
    }
  }

  const updateCourse = async () => {
    if (!selectedCourse) return
    setUpdating(true)
    setError(null)
    try {
      const result = await updateCourseAction(selectedCourse.id, editForm)
      if (!result.success) throw new Error(result.error || t('courses.updateError'))
      setShowEditModal(false)
      setSelectedCourse(null)
      fetchCourses()
    } catch (error: any) {
      setError(error.message || t('courses.updateError'))
    } finally {
      setUpdating(false)
    }
  }

  const deleteCourse = async () => {
    if (!selectedCourse) return
    setUpdating(true)
    setError(null)
    try {
      const result = await deleteCourseAction(selectedCourse.id)
      if (!result.success) throw new Error(result.error || t('courses.deleteError'))
      setShowDeleteModal(false)
      setSelectedCourse(null)
      fetchCourses()
    } catch (error: any) {
      setError(error.message || t('courses.deleteError'))
    } finally {
      setUpdating(false)
    }
  }

  const togglePublishStatus = async (course: Course) => {
    try {
      const result = await toggleCoursePublishStatus(course.id, course.is_published || false)
      if (!result.success || result.newStatus === null) throw new Error(result.error)
      setCourses(courses.map(c =>
        c.id === course.id ? { ...c, is_published: result.newStatus } : c
      ))
      setOpenDropdown(null)
    } catch (error) {
      console.error('Error toggling publish status:', error)
    }
  }

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

  const openDeleteModal = (course: Course) => {
    setSelectedCourse(course)
    setShowDeleteModal(true)
    setOpenDropdown(null)
  }

  const openViewModal = (course: Course) => {
    setSelectedCourse(course)
    setShowViewModal(true)
  }

  const openManageStudentsModal = async (course: Course) => {
    if (!session) {
      await refreshSession()
      await new Promise(resolve => setTimeout(resolve, 100))
      if (!session) {
        alert('Sua sessão expirou. Por favor, faça login novamente.')
        window.location.href = '/'
        return
      }
    }
    setSelectedCourse(course)
    setShowManageStudentsModal(true)
    setOpenDropdown(null)
    await fetchEnrolledStudents(course.id)
  }

  const fetchEnrolledStudents = async (courseId: string) => {
    setLoadingEnrolledStudents(true)
    try {
      const result = await getEnrolledStudents(courseId)
      if (!result || !result.success) throw new Error(result?.error || 'Failed to fetch enrolled students')
      setEnrolledStudents(result.students || [])
    } catch (error) {
      console.error('Error fetching enrolled students:', error)
      setEnrolledStudents([])
    } finally {
      setLoadingEnrolledStudents(false)
    }
  }

  const unenrollStudent = async (enrollmentId: string, studentName: string) => {
    if (!confirm(`Tem certeza que deseja desmatricular ${studentName} deste curso?`)) return
    try {
      const result = await unenrollStudentAction(enrollmentId)
      if (!result.success) throw new Error(result.error)
      if (selectedCourse) await fetchEnrolledStudents(selectedCourse.id)
      await fetchCourses()
      alert(`Aluno ${studentName} foi desmatriculado com sucesso!`)
    } catch (error: any) {
      console.error('Error unenrolling student:', error)
      alert('Erro ao desmatricular aluno: ' + error.message)
    }
  }

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
    const matchesCategory = selectedCategory === 'all' || course.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getLevelColor = (level: string) => {
    switch(level.toLowerCase()) {
      case 'beginner': case 'iniciante': return 'bg-green-500/20 text-green-400'
      case 'intermediate': case 'intermediário': return 'bg-yellow-500/20 text-yellow-400'
      case 'advanced': case 'avançado': return 'bg-red-500/20 text-red-400'
      default: return 'bg-gold-500/20 text-gold-400'
    }
  }

  const getDifficultyLabel = (difficulty: string) => {
    switch(difficulty.toLowerCase()) {
      case 'beginner': return t('courses.beginner')
      case 'intermediate': return t('courses.intermediate')
      case 'advanced': return t('courses.advanced')
      default: return difficulty
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs className="mb-2" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gold flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-gold-400" />
            {t('courses.title')}
          </h1>
          <p className="text-gold-300 mt-1">{t('courses.subtitle')}</p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-5 h-5" />}
          onClick={() => setShowNewCourseModal(true)}
        >
          {t('courses.newCourse')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-400 text-sm">{t('courses.totalCourses')}</p>
              <p className="text-2xl font-bold text-gold mt-1">{courses.length}</p>
            </div>
            <Award className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-400 text-sm">{t('courses.enrolledStudents')}</p>
              <p className="text-2xl font-bold text-gold mt-1">
                {courses.reduce((acc, course) => acc + (course._count?.enrollments || 0), 0)}
              </p>
            </div>
            <Users className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-400 text-sm">{t('courses.featuredCourses')}</p>
              <p className="text-2xl font-bold text-gold mt-1">
                {courses.filter(course => course.is_featured).length}
              </p>
            </div>
            <Award className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
            <input
              type="text"
              placeholder={t('courses.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gold-400 flex-shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              <option value="all">{t('courses.allCategories')}</option>
              <option value="engineering">{t('courses.engineering')}</option>
              <option value="safety">{t('courses.safety')}</option>
              <option value="operations">{t('courses.operations')}</option>
              <option value="maintenance">{t('courses.maintenance')}</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Courses Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="xl" />
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full table-density density-compact">
              <thead className="bg-navy-800/80 backdrop-blur-sm sticky top-0 z-10">
                <tr className="border-b border-gold-500/20">
                  <th scope="col" className="text-left py-4 px-4 text-gold-200 font-medium">Código</th>
                  <th scope="col" className="text-left py-4 px-4 text-gold-200 font-medium">{t('courses.courseTitle')}</th>
                  <th scope="col" className="text-left py-4 px-4 text-gold-200 font-medium">{t('courses.category')}</th>
                  <th scope="col" className="text-left py-4 px-4 text-gold-200 font-medium">{t('courses.level')}</th>
                  <th scope="col" className="text-left py-4 px-4 text-gold-200 font-medium">{t('courses.instructor')}</th>
                  <th scope="col" className="text-right py-4 px-4 text-gold-200 font-medium">{t('courses.students')}</th>
                  <th scope="col" className="text-right py-4 px-4 text-gold-200 font-medium">Módulos</th>
                  <th scope="col" className="text-right py-4 px-4 text-gold-200 font-medium">Disciplinas</th>
                  <th scope="col" className="text-right py-4 px-4 text-gold-200 font-medium">Aulas</th>
                  <th scope="col" className="text-right py-4 px-4 text-gold-200 font-medium">Testes</th>
                  <th scope="col" className="text-right py-4 px-4 text-gold-200 font-medium">{t('courses.duration')}</th>
                  <th scope="col" className="text-left py-4 px-4 text-gold-200 font-medium">Status</th>
                  <th scope="col" className="text-center py-4 px-4 text-gold-200 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.length > 0 ? (
                  filteredCourses.map((course) => (
                    <tr key={course.id} className="border-b border-gold-500/10 hover:bg-navy-800/30">
                      <td className="py-4 px-4">
                        <span className="text-gold-400 font-mono text-sm">{course.code || '-'}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="w-44 min-w-0">
                          <span className="text-gold-100 font-medium block truncate">{course.title}</span>
                          {course.description && (
                            <p className="text-gold-400 text-xs mt-0.5 truncate">{course.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-gold-300 text-sm">{course.category}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getLevelColor(course.difficulty)}`}>
                          {getDifficultyLabel(course.difficulty)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="w-28 min-w-0">
                          <span className="text-gold-300 text-sm block truncate">
                            {abbreviateName(course.instructor?.full_name) !== '—'
                              ? abbreviateName(course.instructor?.full_name)
                              : t('courses.noInstructor')}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-gold-200">{course._count?.enrollments || 0}</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-gold-200">{course._count?.modules || 0}</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-gold-200">{course._count?.subjects || 0}</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-gold-200">{course._count?.lessons || 0}</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-gold-200">{course._count?.tests || 0}</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-gold-200">{course.duration_hours}h</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`text-sm font-medium ${
                          course.is_published ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                          {course.is_published ? t('courses.published') : t('courses.draft')}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center">
                          <button
                            ref={(el) => { dropdownRefs.current[course.id] = el }}
                            className="text-gold-400 hover:text-gold-200 transition-colors p-1"
                            aria-label="Abrir menu de ações do curso"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (openDropdown === course.id) {
                                setOpenDropdown(null)
                                setDropdownCourse(null)
                                setDropdownPosition(null)
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect()
                                // ~380px = altura estimada do menu (8 itens × 48px)
                                const DROPDOWN_HEIGHT = 380
                                const spaceBelow = window.innerHeight - rect.bottom
                                const openAbove = spaceBelow < DROPDOWN_HEIGHT
                                setDropdownPosition({
                                  top: openAbove
                                    ? rect.top + window.scrollY - DROPDOWN_HEIGHT
                                    : rect.bottom + window.scrollY,
                                  left: rect.right - 224 + window.scrollX
                                })
                                setOpenDropdown(course.id)
                                setDropdownCourse(course)
                              }
                            }}
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={13} className="py-12 text-center">
                      <BookOpen className="w-12 h-12 text-gold-500/30 mx-auto mb-3" />
                      <p className="text-gold-300">
                        {searchTerm ? 'Nenhum curso encontrado' : 'Nenhum curso cadastrado'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create Course Modal */}
      {showNewCourseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gold flex items-center gap-2">
                <BookOpen className="w-6 h-6" />
                {t('courses.createCourse')}
              </h2>
              <button
                onClick={() => setShowNewCourseModal(false)}
                className="text-gold-400 hover:text-gold-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); createCourse(); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gold-200 mb-2">
                    {t('courses.courseTitle')}
                  </label>
                  <input
                    type="text"
                    value={newCourseForm.title}
                    onChange={(e) => setNewCourseForm({ ...newCourseForm, title: e.target.value })}
                    className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gold-200 mb-2">
                    Código
                  </label>
                  <input
                    type="text"
                    value={newCourseForm.code}
                    onChange={(e) => setNewCourseForm({ ...newCourseForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 font-mono"
                    placeholder="Ex: ENG1"
                    maxLength={10}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  {t('courses.summary')}
                </label>
                <input
                  type="text"
                  value={newCourseForm.summary}
                  onChange={(e) => setNewCourseForm({ ...newCourseForm, summary: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder={t('courses.briefSummary')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  {t('courses.description')}
                </label>
                <textarea
                  value={newCourseForm.description}
                  onChange={(e) => setNewCourseForm({ ...newCourseForm, description: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gold-200 mb-2">
                    {t('courses.category')}
                  </label>
                  <select
                    value={newCourseForm.category}
                    onChange={(e) => setNewCourseForm({ ...newCourseForm, category: e.target.value })}
                    className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
                  >
                    <option value="engineering">{t('courses.engineering')}</option>
                    <option value="safety">{t('courses.safety')}</option>
                    <option value="operations">{t('courses.operations')}</option>
                    <option value="maintenance">{t('courses.maintenance')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gold-200 mb-2">
                    {t('courses.level')}
                  </label>
                  <select
                    value={newCourseForm.difficulty}
                    onChange={(e) => setNewCourseForm({ ...newCourseForm, difficulty: e.target.value })}
                    className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
                  >
                    <option value="beginner">{t('courses.beginner')}</option>
                    <option value="intermediate">{t('courses.intermediate')}</option>
                    <option value="advanced">{t('courses.advanced')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gold-200 mb-2">
                    {t('courses.duration')} ({t('common.hours')})
                  </label>
                  <input
                    type="number"
                    value={newCourseForm.duration_hours}
                    onChange={(e) => setNewCourseForm({ ...newCourseForm, duration_hours: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gold-200 mb-2">
                    {t('courses.price')} (R$)
                  </label>
                  <input
                    type="number"
                    value={newCourseForm.price}
                    onChange={(e) => setNewCourseForm({ ...newCourseForm, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="featured"
                  checked={newCourseForm.is_featured}
                  onChange={(e) => setNewCourseForm({ ...newCourseForm, is_featured: e.target.checked })}
                  className="w-4 h-4 bg-navy-900/50 border-navy-600 rounded text-gold-500 focus:ring-gold-500"
                />
                <label htmlFor="featured" className="text-sm text-gold-200">
                  {t('courses.markAsFeatured')}
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowNewCourseModal(false)}
                  className="flex-1"
                >
                  {t('button.cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={creating}
                  className="flex-1"
                >
                  {creating ? t('courses.creating') : t('courses.createCourse')}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Edit Course Modal */}
      {showEditModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gold flex items-center gap-2">
                <Edit className="w-6 h-6" />
                {t('courses.editCourse')}
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gold-400 hover:text-gold-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); updateCourse(); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gold-200 mb-2">
                    {t('courses.courseTitle')}
                  </label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gold-200 mb-2">
                    Código
                  </label>
                  <input
                    type="text"
                    value={editForm.code}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 font-mono"
                    placeholder="Ex: ENG1"
                    maxLength={10}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  {t('courses.summary')}
                </label>
                <input
                  type="text"
                  value={editForm.summary}
                  onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  {t('courses.description')}
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gold-200 mb-2">
                    {t('courses.category')}
                  </label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
                  >
                    <option value="engineering">{t('courses.engineering')}</option>
                    <option value="safety">{t('courses.safety')}</option>
                    <option value="operations">{t('courses.operations')}</option>
                    <option value="maintenance">{t('courses.maintenance')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gold-200 mb-2">
                    {t('courses.level')}
                  </label>
                  <select
                    value={editForm.difficulty}
                    onChange={(e) => setEditForm({ ...editForm, difficulty: e.target.value })}
                    className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
                  >
                    <option value="beginner">{t('courses.beginner')}</option>
                    <option value="intermediate">{t('courses.intermediate')}</option>
                    <option value="advanced">{t('courses.advanced')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gold-200 mb-2">
                    {t('courses.duration')} ({t('common.hours')})
                  </label>
                  <input
                    type="number"
                    value={editForm.duration_hours}
                    onChange={(e) => setEditForm({ ...editForm, duration_hours: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gold-200 mb-2">
                    {t('courses.price')} (R$)
                  </label>
                  <input
                    type="number"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="featured-edit"
                  checked={editForm.is_featured}
                  onChange={(e) => setEditForm({ ...editForm, is_featured: e.target.checked })}
                  className="w-4 h-4 bg-navy-900/50 border-navy-600 rounded text-gold-500 focus:ring-gold-500"
                />
                <label htmlFor="featured-edit" className="text-sm text-gold-200">
                  {t('courses.markAsFeatured')}
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1"
                >
                  {t('button.cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={updating}
                  className="flex-1"
                >
                  {updating ? t('courses.updating') : t('button.save')}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Course Modal */}
      {showDeleteModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
          <Card className="w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-red-400 flex items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                {t('courses.deleteCourse')}
              </h2>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gold-400 hover:text-gold-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="mb-6">
              <p className="text-gold-200 mb-2">{t('courses.confirmDelete')}</p>
              <div className="bg-navy-900/50 p-3 rounded-lg">
                <p className="text-gold font-medium">{selectedCourse.title}</p>
                <p className="text-gold-300 text-sm">{selectedCourse.category} - {getDifficultyLabel(selectedCourse.difficulty)}</p>
              </div>
              <p className="text-red-400 text-sm mt-3">⚠️ {t('courses.deleteWarning')}</p>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1"
              >
                {t('button.cancel')}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={deleteCourse}
                disabled={updating}
                className="flex-1 bg-red-500 hover:bg-red-600"
              >
                {updating ? t('courses.deleting') : t('courses.deleteCourse')}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* View Course Modal */}
      {showViewModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gold flex items-center gap-2">
                <BookOpen className="w-7 h-7" />
                {selectedCourse.title}
              </h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gold-400 hover:text-gold-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gold-400 mb-2">{t('courses.instructor')}</h3>
                  <p className="text-gold-200">{selectedCourse.instructor?.full_name || t('courses.noInstructor')}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gold-400 mb-2">{t('courses.category')}</h3>
                  <p className="text-gold-200">{selectedCourse.category}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gold-400 mb-2">{t('courses.level')}</h3>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(selectedCourse.difficulty)}`}>
                    {getDifficultyLabel(selectedCourse.difficulty)}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gold-400 mb-2">{t('courses.duration')}</h3>
                  <p className="text-gold-200">{selectedCourse.duration_hours} {t('common.hours')}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gold-400 mb-2">{t('courses.price')}</h3>
                  <p className="text-gold-200 font-semibold">
                    {selectedCourse.price === 0 ? t('courses.free') : `R$ ${selectedCourse.price?.toFixed(2)}`}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gold-400 mb-2">{t('courses.students')}</h3>
                  <p className="text-gold-200">{selectedCourse._count?.enrollments || 0} {t('courses.enrolled')}</p>
                </div>
              </div>

              {selectedCourse.summary && (
                <div>
                  <h3 className="text-lg font-semibold text-gold mb-2">{t('courses.summary')}</h3>
                  <p className="text-gold-300">{selectedCourse.summary}</p>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold text-gold mb-2">{t('courses.description')}</h3>
                <p className="text-gold-300 whitespace-pre-wrap">
                  {selectedCourse.description || t('courses.noDescription')}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  selectedCourse.is_published ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {selectedCourse.is_published ? (
                    <><CheckCircle className="w-4 h-4" />{t('courses.published')}</>
                  ) : (
                    <><XCircle className="w-4 h-4" />{t('courses.draft')}</>
                  )}
                </span>
                {selectedCourse.is_featured && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-gold-500/20 text-gold-400">
                    <Award className="w-4 h-4" />
                    {t('courses.featured')}
                  </span>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gold-500/20">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowViewModal(false)
                    openEditModal(selectedCourse)
                  }}
                >
                  {t('courses.edit')}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Manage Students Modal */}
      {showManageStudentsModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gold flex items-center gap-2">
                <Users className="w-6 h-6" />
                Gerenciar Alunos - {selectedCourse.title}
              </h2>
              <button
                onClick={() => setShowManageStudentsModal(false)}
                className="text-gold-400 hover:text-gold-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-navy-900/50 rounded-lg">
              <p className="text-gold-300 text-sm">
                Total de alunos matriculados: <span className="font-bold text-gold">{enrolledStudents.length}</span>
              </p>
            </div>

            {loadingEnrolledStudents ? (
              <div className="flex justify-center py-8">
                <Spinner size="lg" />
              </div>
            ) : enrolledStudents.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gold-500/30 mx-auto mb-3" />
                <p className="text-gold-300">Nenhum aluno matriculado neste curso</p>
              </div>
            ) : (
              <div className="space-y-2">
                {enrolledStudents.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="flex items-center justify-between p-4 bg-navy-900/50 rounded-lg hover:bg-navy-900/70 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="text-gold-200 font-medium">
                        {enrollment.user?.full_name || enrollment.user?.email || 'Aluno'}
                      </p>
                      <p className="text-gold-400 text-sm">{enrollment.user?.email}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-gold-300">
                          Matriculado em: {new Date(enrollment.enrolled_at).toLocaleDateString('pt-BR')}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          enrollment.status === 'active' ? 'bg-green-500/20 text-green-400' :
                          enrollment.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {enrollment.status === 'active' ? 'Ativo' :
                           enrollment.status === 'completed' ? 'Concluído' : 'Pausado'}
                        </span>
                        {enrollment.progress_percentage > 0 && (
                          <span className="text-xs text-gold-300">
                            Progresso: {enrollment.progress_percentage}%
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => unenrollStudent(
                        enrollment.id,
                        enrollment.user?.full_name || enrollment.user?.email || 'este aluno'
                      )}
                      icon={<UserMinus className="w-4 h-4" />}
                    >
                      Desmatricular
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gold-500/20">
              <Button variant="secondary" onClick={() => setShowManageStudentsModal(false)}>
                Fechar
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Course Structure Manager Modal */}
      {showSubjectsModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
          <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gold flex items-center gap-2">
                <BookMarked className="w-6 h-6" />
                Gerenciar Estrutura do Curso
              </h2>
              <button
                onClick={() => setShowSubjectsModal(false)}
                className="text-gold-400 hover:text-gold-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <CourseStructureManager
              courseId={selectedCourse.id}
              courseName={selectedCourse.title}
              canManage={true}
            />

            <div className="flex justify-end mt-6 pt-4 border-t border-gold-500/20">
              <Button variant="secondary" onClick={() => setShowSubjectsModal(false)}>
                Fechar
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Dropdown Portal */}
      {dropdownCourse && dropdownPosition && (
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => {
              setOpenDropdown(null)
              setDropdownCourse(null)
              setDropdownPosition(null)
            }}
          />
          <div
            className="fixed w-56 bg-navy-800 border border-gold-500/20 rounded-lg shadow-xl z-[9999]"
            style={{ top: `${dropdownPosition.top}px`, left: `${dropdownPosition.left}px` }}
          >
            <button
              type="button"
              onClick={() => {
                openEditModal(dropdownCourse)
                setOpenDropdown(null)
                setDropdownCourse(null)
                setDropdownPosition(null)
              }}
              className="w-full px-4 py-3 text-left hover:bg-navy-700/50 transition-colors block"
            >
              <div className="flex items-center gap-3 text-left">
                <Edit className="w-4 h-4 text-gold-400 flex-shrink-0" />
                <span className="text-gold-200 text-left flex-1">{t('courses.edit')}</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                togglePublishStatus(dropdownCourse)
                setOpenDropdown(null)
                setDropdownCourse(null)
                setDropdownPosition(null)
              }}
              className="w-full px-4 py-3 text-left hover:bg-navy-700/50 transition-colors block"
            >
              <div className="flex items-center gap-3 text-left">
                {dropdownCourse.is_published ? (
                  <><XCircle className="w-4 h-4 text-gold-400 flex-shrink-0" /><span className="text-gold-200 text-left flex-1">{t('courses.unpublish')}</span></>
                ) : (
                  <><CheckCircle className="w-4 h-4 text-gold-400 flex-shrink-0" /><span className="text-gold-200 text-left flex-1">{t('courses.publish')}</span></>
                )}
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                openManageStudentsModal(dropdownCourse)
                setOpenDropdown(null)
                setDropdownCourse(null)
                setDropdownPosition(null)
              }}
              className="w-full px-4 py-3 text-left hover:bg-navy-700/50 transition-colors block"
            >
              <div className="flex items-center gap-3 text-left">
                <Users className="w-4 h-4 text-gold-400 flex-shrink-0" />
                <span className="text-gold-200 text-left flex-1">Gerenciar Alunos</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedCourse(dropdownCourse)
                setShowSubjectsModal(true)
                setOpenDropdown(null)
                setDropdownCourse(null)
                setDropdownPosition(null)
              }}
              className="w-full px-4 py-3 text-left hover:bg-navy-700/50 transition-colors block"
            >
              <div className="flex items-center gap-3 text-left">
                <BookMarked className="w-4 h-4 text-gold-400 flex-shrink-0" />
                <span className="text-gold-200 text-left flex-1">Gerenciar Disciplinas</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedCourse(dropdownCourse)
                openImport(dropdownCourse?.id ?? '', dropdownCourse?.title ?? '')
                setOpenDropdown(null)
                setDropdownCourse(null)
                setDropdownPosition(null)
              }}
              className="w-full px-4 py-3 text-left hover:bg-navy-700/50 transition-colors block"
            >
              <div className="flex items-center gap-3 text-left">
                <FolderInput className="w-4 h-4 text-gold-400 flex-shrink-0" />
                <span className="text-gold-200 text-left flex-1">Importar do Google Drive</span>
              </div>
            </button>
            <div className="border-t border-gold-500/20 mt-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  openDeleteModal(dropdownCourse)
                  setOpenDropdown(null)
                  setDropdownCourse(null)
                  setDropdownPosition(null)
                }}
                className="w-full px-4 py-3 text-left hover:bg-red-900/20 transition-colors block"
              >
                <div className="flex items-center gap-3 text-left">
                  <Trash2 className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="text-red-400 text-left flex-1">{t('courses.delete')}</span>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
