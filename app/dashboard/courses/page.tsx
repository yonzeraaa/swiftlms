'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Plus, MoreVertical, Users, Clock, Award, Edit, Trash2, Eye, BookOpen, DollarSign, X, AlertCircle, CheckCircle, XCircle, UserPlus, BookMarked, UserMinus } from 'lucide-react'
import Card from '../../components/Card'
import Button from '../../components/Button'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '../../contexts/LanguageContext'
import CourseStructureManager from '../../components/CourseStructureManager'

interface Course {
  id: string
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
  }
}

interface NewCourseForm {
  title: string
  description: string
  summary: string
  category: string
  difficulty: string
  duration_hours: number
  price: number
  is_featured: boolean
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
  const [showFilters, setShowFilters] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [instructors, setInstructors] = useState<any[]>([])
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [students, setStudents] = useState<any[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [enrolling, setEnrolling] = useState(false)
  const [showSubjectsModal, setShowSubjectsModal] = useState(false)
  const [showManageStudentsModal, setShowManageStudentsModal] = useState(false)
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([])
  const [loadingEnrolledStudents, setLoadingEnrolledStudents] = useState(false)
  const supabase = createClient()
  const { t } = useTranslation()
  
  const [newCourseForm, setNewCourseForm] = useState<NewCourseForm>({
    title: '',
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
    description: '',
    summary: '',
    category: 'engineering',
    difficulty: 'beginner',
    duration_hours: 40,
    price: 0,
    is_featured: false
  })

  useEffect(() => {
    fetchCourses()
    fetchInstructors()
    fetchStudents()
  }, [])
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown && !(event.target as Element).closest('.dropdown-menu')) {
        setOpenDropdown(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openDropdown])

  const fetchInstructors = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'instructor')
        .order('full_name')
        
      if (error) throw error
      setInstructors(data || [])
    } catch (error) {
      console.error('Error fetching instructors:', error)
    }
  }
  
  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'student')
        .eq('status', 'active')
        .order('full_name')
        
      if (error) throw error
      setStudents(data || [])
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }
  
  const fetchCourses = async () => {
    try {
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select(`
          *,
          instructor:profiles!courses_instructor_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false })

      if (coursesError) throw coursesError

      // Fetch enrollment counts separately
      const courseIds = coursesData?.map(course => course.id) || []
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('course_id, status')
        .in('course_id', courseIds)
        .in('status', ['active', 'completed'])

      if (enrollmentError) throw enrollmentError

      // Count enrollments per course
      const enrollmentCounts = enrollmentData?.reduce((acc, enrollment) => {
        acc[enrollment.course_id] = (acc[enrollment.course_id] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      // Transform data to include enrollment count
      const transformedData = coursesData?.map(course => ({
        ...course,
        _count: {
          enrollments: enrollmentCounts[course.id] || 0
        }
      })) || []

      setCourses(transformedData)
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
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')
      
      const { data, error } = await supabase
        .from('courses')
        .insert({
          ...newCourseForm,
          instructor_id: user.id,
          is_published: false,
          slug: newCourseForm.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        })
        .select()
        
      if (error) throw error
      
      // Reset form and close modal
      setNewCourseForm({
        title: '',
        description: '',
        summary: '',
        category: 'engineering',
        difficulty: 'beginner',
        duration_hours: 40,
        price: 0,
        is_featured: false
      })
      setShowNewCourseModal(false)
      
      // Refresh courses
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
      const { error } = await supabase
        .from('courses')
        .update(editForm)
        .eq('id', selectedCourse.id)
        
      if (error) throw error
      
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
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', selectedCourse.id)
        
      if (error) throw error
      
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
      const { error } = await supabase
        .from('courses')
        .update({ is_published: !course.is_published })
        .eq('id', course.id)
        
      if (error) throw error
      
      // Update local state
      setCourses(courses.map(c => 
        c.id === course.id ? { ...c, is_published: !c.is_published } : c
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
  
  const openEnrollModal = (course: Course) => {
    setSelectedCourse(course)
    setSelectedStudents([])
    setShowEnrollModal(true)
    setOpenDropdown(null)
  }
  
  const openViewModal = (course: Course) => {
    setSelectedCourse(course)
    setShowViewModal(true)
  }
  
  const openManageStudentsModal = async (course: Course) => {
    setSelectedCourse(course)
    setShowManageStudentsModal(true)
    setOpenDropdown(null)
    await fetchEnrolledStudents(course.id)
  }
  
  const fetchEnrolledStudents = async (courseId: string) => {
    setLoadingEnrolledStudents(true)
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          user:profiles!enrollments_user_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq('course_id', courseId)
        .in('status', ['active', 'completed', 'paused'])
        .order('enrolled_at', { ascending: false })
      
      if (error) throw error
      setEnrolledStudents(data || [])
    } catch (error) {
      console.error('Error fetching enrolled students:', error)
      setEnrolledStudents([])
    } finally {
      setLoadingEnrolledStudents(false)
    }
  }
  
  const unenrollStudent = async (enrollmentId: string, studentName: string) => {
    if (!confirm(`Tem certeza que deseja desmatricular ${studentName} deste curso?`)) {
      return
    }
    
    try {
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('id', enrollmentId)
      
      if (error) throw error
      
      // Refresh enrolled students list
      if (selectedCourse) {
        await fetchEnrolledStudents(selectedCourse.id)
      }
      
      // Refresh courses to update enrollment count
      await fetchCourses()
      
      alert(`Aluno ${studentName} foi desmatriculado com sucesso!`)
    } catch (error: any) {
      console.error('Error unenrolling student:', error)
      alert('Erro ao desmatricular aluno: ' + error.message)
    }
  }
  
  const enrollStudents = async () => {
    if (!selectedCourse || selectedStudents.length === 0) return
    setEnrolling(true)
    setError(null)
    
    try {
      // Get current user to check permissions
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')
      
      // Get user profile to check role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
        
      if (!profile) throw new Error('User profile not found')
      
      // Check if user is admin or the instructor of this course
      const isAdmin = profile.role === 'admin'
      const isInstructor = selectedCourse.instructor_id === user.id
      
      if (!isAdmin && !isInstructor) {
        throw new Error('Only admins and course instructors can enroll students')
      }
      
      // Create enrollment records for each selected student
      const enrollments = selectedStudents.map(studentId => ({
        user_id: studentId,
        course_id: selectedCourse.id,
        status: 'active',
        enrolled_at: new Date().toISOString()
      }))
      
      const { error } = await supabase
        .from('enrollments')
        .insert(enrollments)
        
      if (error) throw error
      
      setShowEnrollModal(false)
      setSelectedCourse(null)
      setSelectedStudents([])
      
      // Show success message
      alert(`${selectedStudents.length} ${t('courses.enrolled')}!`)
      
      fetchCourses() // Refresh to update enrollment counts
    } catch (error: any) {
      setError(error.message || t('courses.enrollError'))
    } finally {
      setEnrolling(false)
    }
  }
  
  const filteredCourses = courses
    .filter(course => {
      const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (course.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
      const matchesCategory = selectedCategory === 'all' || course.category === selectedCategory
      return matchesSearch && matchesCategory
    })

  const getLevelColor = (level: string) => {
    switch(level.toLowerCase()) {
      case 'beginner': 
      case 'iniciante': 
        return 'bg-green-500/20 text-green-400'
      case 'intermediate':
      case 'intermediário': 
        return 'bg-yellow-500/20 text-yellow-400'
      case 'advanced':
      case 'avançado': 
        return 'bg-red-500/20 text-red-400'
      default: 
        return 'bg-gold-500/20 text-gold-400'
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gold">{t('courses.title')}</h1>
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

      {/* Filters and Search */}
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
          <Button 
            variant="secondary" 
            icon={<Filter className="w-5 h-5" />}
            onClick={() => setShowFilters(!showFilters)}
          >
            {t('courses.filters')}
          </Button>
        </div>
      </Card>
      
      {/* Filter Panel */}
      {showFilters && (
        <Card>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gold-200 mb-2">
                {t('courses.category')}
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
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
      )}

      {/* Courses Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCourses.map((course) => (
            <Card key={course.id} className="hover:shadow-2xl transition-shadow overflow-visible">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gold mb-2">{course.title}</h3>
                  <p className="text-gold-300 text-sm line-clamp-2">{course.description || course.summary}</p>
                </div>
                <div className="relative">
                  <button 
                    className="text-gold-400 hover:text-gold-200 transition-colors ml-4 p-1"
                    onClick={() => setOpenDropdown(openDropdown === course.id ? null : course.id)}
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  
                  {openDropdown === course.id && (
                    <div className="dropdown-menu absolute right-0 mt-2 w-56 bg-navy-800 border border-gold-500/20 rounded-lg shadow-xl z-[9998] overflow-visible">
                      <button 
                        onClick={() => openEditModal(course)}
                        className="w-full px-4 py-2 text-left text-gold-200 hover:bg-navy-700 flex items-center gap-2 rounded-t-lg"
                      >
                        <Edit className="w-4 h-4" />
                        {t('courses.edit')}
                      </button>
                      <button 
                        onClick={() => togglePublishStatus(course)}
                        className="w-full px-4 py-2 text-left text-gold-200 hover:bg-navy-700 flex items-center gap-2"
                      >
                        {course.is_published ? (
                          <>
                            <XCircle className="w-4 h-4" />
                            {t('courses.unpublish')}
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            {t('courses.publish')}
                          </>
                        )}
                      </button>
                      <button 
                        onClick={() => openEnrollModal(course)}
                        className="w-full px-4 py-2 text-left text-gold-200 hover:bg-navy-700 flex items-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        {t('courses.enrollStudents')}
                      </button>
                      <button 
                        onClick={() => openManageStudentsModal(course)}
                        className="w-full px-4 py-2 text-left text-gold-200 hover:bg-navy-700 flex items-center gap-2"
                      >
                        <Users className="w-4 h-4" />
                        Gerenciar Alunos
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedCourse(course);
                          setShowSubjectsModal(true);
                          setOpenDropdown(null);
                        }}
                        className="w-full px-4 py-2 text-left text-gold-200 hover:bg-navy-700 flex items-center gap-2"
                      >
                        <BookMarked className="w-4 h-4" />
                        Gerenciar Disciplinas
                      </button>
                      <button 
                        onClick={() => openDeleteModal(course)}
                        className="w-full px-4 py-2 text-left text-red-400 hover:bg-navy-700 flex items-center gap-2 rounded-b-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                        {t('courses.delete')}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gold-400">{t('courses.instructor')}</span>
                  <span className="text-gold-200">{course.instructor?.full_name || t('courses.noInstructor')}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-gold-300">
                      <Users className="w-4 h-4" />
                      {course._count?.enrollments || 0} {t('courses.students')}
                    </span>
                    <span className="flex items-center gap-1 text-gold-300">
                      <Clock className="w-4 h-4" />
                      {course.duration_hours} {t('common.hours')}
                    </span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(course.difficulty)}`}>
                    {getDifficultyLabel(course.difficulty)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gold-400">{t('courses.category')}</span>
                  <span className="text-gold-200">{course.category}</span>
                </div>

                {course.price !== null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gold-400">{t('courses.price')}</span>
                    <span className="text-gold-200 font-semibold">
                      {course.price === 0 ? t('courses.free') : `R$ ${course.price.toFixed(2)}`}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t border-gold-500/20">
                  <span className={`text-sm font-medium ${
                    course.is_published ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {course.is_published ? t('courses.published') : t('courses.draft')}
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => openEditModal(course)}
                    >
                      {t('courses.edit')}
                    </Button>
                    <Button 
                      variant="primary" 
                      size="sm"
                      onClick={() => openViewModal(course)}
                    >
                      {t('courses.view')}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      
      {/* Create Course Modal */}
      {showNewCourseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
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
              <div>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
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
              <div>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
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
              <p className="text-gold-200 mb-2">
                {t('courses.confirmDelete')}
              </p>
              <div className="bg-navy-900/50 p-3 rounded-lg">
                <p className="text-gold font-medium">{selectedCourse.title}</p>
                <p className="text-gold-300 text-sm">{selectedCourse.category} - {getDifficultyLabel(selectedCourse.difficulty)}</p>
              </div>
              <p className="text-red-400 text-sm mt-3">
                ⚠️ {t('courses.deleteWarning')}
              </p>
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
      
      {/* Enroll Students Modal */}
      {showEnrollModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gold flex items-center gap-2">
                <UserPlus className="w-6 h-6" />
                {t('courses.enrollStudents')}
              </h2>
              <button
                onClick={() => setShowEnrollModal(false)}
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
            
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gold mb-2">{selectedCourse.title}</h3>
              <p className="text-gold-300 text-sm">
                {t('courses.selectStudentsToEnroll')}
              </p>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {students.map((student) => (
                <label
                  key={student.id}
                  className="flex items-center gap-3 p-3 bg-navy-900/50 rounded-lg hover:bg-navy-900/70 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStudents([...selectedStudents, student.id])
                      } else {
                        setSelectedStudents(selectedStudents.filter(id => id !== student.id))
                      }
                    }}
                    className="w-4 h-4 bg-navy-900/50 border-navy-600 rounded text-gold-500 focus:ring-gold-500"
                  />
                  <div className="flex-1">
                    <p className="text-gold-200 font-medium">
                      {student.full_name || student.email}
                    </p>
                    <p className="text-gold-400 text-sm">{student.email}</p>
                  </div>
                </label>
              ))}
            </div>
            
            <div className="mt-6 flex justify-between items-center">
              <p className="text-gold-300 text-sm">
                {selectedStudents.length} {t('courses.selected')}
              </p>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowEnrollModal(false)}
                >
                  {t('button.cancel')}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={enrollStudents}
                  disabled={enrolling || selectedStudents.length === 0}
                >
                  {enrolling ? t('courses.enrolling') : t('courses.enrollSelected')}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
      
      {/* View Course Modal */}
      {showViewModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
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
              {/* Course Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gold-400 mb-2">{t('courses.instructor')}</h3>
                  <p className="text-gold-200">
                    {selectedCourse.instructor?.full_name || t('courses.noInstructor')}
                  </p>
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
                  <p className="text-gold-200">
                    {selectedCourse._count?.enrollments || 0} {t('courses.enrolled')}
                  </p>
                </div>
              </div>
              
              {/* Summary */}
              {selectedCourse.summary && (
                <div>
                  <h3 className="text-lg font-semibold text-gold mb-2">{t('courses.summary')}</h3>
                  <p className="text-gold-300">{selectedCourse.summary}</p>
                </div>
              )}
              
              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-gold mb-2">{t('courses.description')}</h3>
                <p className="text-gold-300 whitespace-pre-wrap">
                  {selectedCourse.description || t('courses.noDescription')}
                </p>
              </div>
              
              {/* Status */}
              <div className="flex items-center gap-4">
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  selectedCourse.is_published ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {selectedCourse.is_published ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      {t('courses.published')}
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      {t('courses.draft')}
                    </>
                  )}
                </span>
                
                {selectedCourse.is_featured && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-gold-500/20 text-gold-400">
                    <Award className="w-4 h-4" />
                    {t('courses.featured')}
                  </span>
                )}
              </div>
              
              {/* Action Buttons */}
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
                <Button
                  variant="primary"
                  onClick={() => {
                    setShowViewModal(false)
                    openEnrollModal(selectedCourse)
                  }}
                >
                  {t('courses.enrollStudents')}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
      
      {/* Manage Students Modal */}
      {showManageStudentsModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500"></div>
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
              <Button
                variant="primary"
                onClick={() => openEnrollModal(selectedCourse)}
                icon={<UserPlus className="w-4 h-4" />}
              >
                Matricular Novos Alunos
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowManageStudentsModal(false)}
              >
                Fechar
              </Button>
            </div>
          </Card>
        </div>
      )}
      
      {/* Course Structure Manager Modal */}
      {showSubjectsModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
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
              <Button
                variant="secondary"
                onClick={() => setShowSubjectsModal(false)}
              >
                Fechar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}