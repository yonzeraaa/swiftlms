'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Search, Filter, BookOpen, Clock, Users, Star, DollarSign, Tag, TrendingUp, X, Check, AlertCircle, User, Sparkles, Eye, Lock, BookMarked } from 'lucide-react'
import Spinner from '../../components/ui/Spinner'
import Card from '../../components/Card'
import Breadcrumbs from '../../components/ui/Breadcrumbs'
import Button from '../../components/Button'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { StaggerTransition, StaggerItem, FadeTransition } from '../../components/ui/PageTransition'

type Course = Database['public']['Tables']['courses']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']
type Enrollment = Database['public']['Tables']['enrollments']['Row']

interface CourseWithDetails extends Course {
  instructor?: Profile
  enrollmentCount?: number
  averageRating?: number
  isEnrolled?: boolean
  enrollment?: Enrollment
}

export default function ExploreCourses() {
  const [courses, setCourses] = useState<CourseWithDetails[]>([])
  const [filteredCourses, setFilteredCourses] = useState<CourseWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedLevel, setSelectedLevel] = useState<string>('all')
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all')
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'rating'>('popular')
  const [selectedCourse, setSelectedCourse] = useState<CourseWithDetails | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showFiltersModal, setShowFiltersModal] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Advanced filters
  const [minRating, setMinRating] = useState<number>(0)
  const [maxDuration, setMaxDuration] = useState<number>(100)
  const [instructor, setInstructor] = useState<string>('all')
  
  const router = useRouter()
  const supabase = createClient()

  const categories = [
    { value: 'all', label: 'Todas as Categorias' },
    { value: 'engineering', label: 'Engenharia' },
    { value: 'safety', label: 'Segurança' },
    { value: 'operations', label: 'Operações' },
    { value: 'maintenance', label: 'Manutenção' }
  ]

  const levels = [
    { value: 'all', label: 'Todos os Níveis' },
    { value: 'beginner', label: 'Iniciante' },
    { value: 'intermediate', label: 'Intermediário' },
    { value: 'advanced', label: 'Avançado' }
  ]

  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(() => {
    filterAndSortCourses()
  }, [courses, searchTerm, selectedCategory, selectedLevel, priceFilter, sortBy])

  const fetchCourses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      // Fetch published courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .eq('is_published', true)

      if (coursesError) throw coursesError

      // Fetch instructors
      const instructorIds = [...new Set(coursesData?.map((c: any) => c.instructor_id).filter((id: any): id is string => id !== null) || [])]
      const { data: instructors } = await supabase
        .from('profiles')
        .select('*')
        .in('id', instructorIds)

      // Fetch all enrollments for counting
      const { data: allEnrollments } = await supabase
        .from('enrollments')
        .select('course_id, status')
        .in('status', ['active', 'completed'])

      // Fetch user's enrollments
      const { data: userEnrollments } = await supabase
        .from('enrollments')
        .select('*')
        .eq('user_id', user.id)

      // Fetch course ratings
      const { data: reviews } = await supabase
        .from('course_reviews')
        .select('course_id, rating')

      // Process courses with additional data
      const coursesWithDetails: CourseWithDetails[] = (coursesData || []).map((course: any) => {
        const instructor = instructors?.find((i: any) => i.id === course.instructor_id)
        const courseEnrollments = allEnrollments?.filter((e: any) => e.course_id === course.id) || []
        const courseReviews = reviews?.filter((r: any) => r.course_id === course.id) || []
        const userEnrollment = userEnrollments?.find((e: any) => e.course_id === course.id)
        
        const averageRating = courseReviews.length > 0
          ? courseReviews.reduce((sum: any, r: any) => sum + r.rating, 0) / courseReviews.length
          : 0

        return {
          ...course,
          instructor,
          enrollmentCount: courseEnrollments.length,
          averageRating,
          isEnrolled: !!userEnrollment,
          enrollment: userEnrollment
        }
      })

      setCourses(coursesWithDetails)
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortCourses = () => {
    let filtered = [...courses]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((course: any) =>
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.summary?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((course: any) => course.category === selectedCategory)
    }

    // Level filter
    if (selectedLevel !== 'all') {
      filtered = filtered.filter((course: any) => course.difficulty === selectedLevel)
    }

    // Price filter
    if (priceFilter === 'free') {
      filtered = filtered.filter((course: any) => !course.price || course.price === 0)
    } else if (priceFilter === 'paid') {
      filtered = filtered.filter((course: any) => course.price && course.price > 0)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return (b.enrollmentCount || 0) - (a.enrollmentCount || 0)
        case 'newest':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        case 'rating':
          return (b.averageRating || 0) - (a.averageRating || 0)
        default:
          return 0
      }
    })

    setFilteredCourses(filtered)
  }

  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewModules, setPreviewModules] = useState<any[]>([])
  const [loadingPreview, setLoadingPreview] = useState(false)

  const handleViewPreview = async (course: CourseWithDetails) => {
    setSelectedCourse(course)
    setShowPreviewModal(true)
    setLoadingPreview(true)

    try {
      // Buscar módulos do curso com aulas marcadas como preview
      const { data: modules } = await supabase
        .from('course_modules')
        .select(`
          *,
          module_subjects!inner(
            *,
            subjects(
              *,
              subject_lessons(
                *,
                lessons!inner(
                  *
                )
              )
            )
          )
        `)
        .eq('course_id', course.id)
        .order('order_index')

      // Filtrar apenas aulas marcadas como preview
      if (modules) {
        const modulesWithPreview = modules.map((module: any) => ({
          ...module,
          module_subjects: module.module_subjects?.map((ms: any) => ({
            ...ms,
            subjects: {
              ...ms.subjects,
              subject_lessons: ms.subjects?.subject_lessons?.filter((sl: any) => 
                sl.lessons?.is_preview === true
              ) || []
            }
          })).filter((ms: any) => ms.subjects?.subject_lessons?.length > 0)
        })).filter((m: any) => m.module_subjects?.length > 0)

        setPreviewModules(modulesWithPreview)
      } else {
        setPreviewModules([])
      }
    } catch (error) {
      console.error('Erro ao carregar preview:', error)
      setPreviewModules([])
    } finally {
      setLoadingPreview(false)
    }
  }

  const openCourseDetails = (course: CourseWithDetails) => {
    setSelectedCourse(course)
    setShowDetailsModal(true)
  }

  const formatPrice = (price: number | null) => {
    if (!price || price === 0) return 'Gratuito'
    return `R$ ${price.toFixed(2).replace('.', ',')}`
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'text-green-400 bg-green-500/20'
      case 'intermediate': return 'text-yellow-400 bg-yellow-500/20'
      case 'advanced': return 'text-red-400 bg-red-500/20'
      default: return 'text-gold-400 bg-gold-500/20'
    }
  }

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'beginner': return 'Iniciante'
      case 'intermediate': return 'Intermediário'
      case 'advanced': return 'Avançado'
      default: return level
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4">
        <Spinner size="xl" />
        <p className="text-gold-300 text-sm">Carregando cursos disponíveis...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs className="mb-2" />
      {/* Header */}
      <FadeTransition>
        <div>
          <motion.h1 
            className="text-3xl font-bold text-gold flex items-center gap-2"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            Catálogo de Cursos
            <Sparkles className="w-6 h-6 text-gold-400" />
          </motion.h1>
          <motion.p 
            className="text-gold-300 mt-1"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Explore nossos cursos disponíveis e veja o conteúdo programático
          </motion.p>
        </div>
      </FadeTransition>

      {/* Stats */}
      <StaggerTransition staggerDelay={0.1}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StaggerItem>
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gold-300 text-sm">Cursos Disponíveis</p>
                    <p className="text-2xl font-bold text-gold">{courses.length}</p>
                  </div>
                  <BookOpen className="w-8 h-8 text-gold-500/30" />
                </div>
              </Card>
            </motion.div>
          </StaggerItem>
        
          <StaggerItem>
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gold-300 text-sm">Cursos Gratuitos</p>
                    <p className="text-2xl font-bold text-gold">
                      {courses.filter((c: any) => !c.price || c.price === 0).length}
                    </p>
                  </div>
                  <Tag className="w-8 h-8 text-green-500/30" />
                </div>
              </Card>
            </motion.div>
          </StaggerItem>
        
          <StaggerItem>
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gold-300 text-sm">Total de Alunos</p>
                    <p className="text-2xl font-bold text-gold">
                      {courses.reduce((sum, c) => sum + (c.enrollmentCount || 0), 0)}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500/30" />
                </div>
              </Card>
            </motion.div>
          </StaggerItem>
        
          <StaggerItem>
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gold-300 text-sm">Avaliação Média</p>
                    <p className="text-2xl font-bold text-gold">
                      {courses.length > 0 
                        ? (courses.reduce((sum, c) => sum + (c.averageRating || 0), 0) / courses.length).toFixed(1)
                        : '0.0'}
                    </p>
                  </div>
                  <Star className="w-8 h-8 text-yellow-500/30" />
                </div>
              </Card>
            </motion.div>
          </StaggerItem>
        </div>
      </StaggerTransition>

      {/* Filters */}
      <Card>
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
            <input
              type="text"
              placeholder="Buscar cursos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
            />
          </div>

          {/* Filter Options */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              {categories.map((cat: any) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>

            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              {levels.map((level: any) => (
                <option key={level.value} value={level.value}>{level.label}</option>
              ))}
            </select>

            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value as any)}
              className="px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              <option value="all">Todos os Preços</option>
              <option value="free">Gratuitos</option>
              <option value="paid">Pagos</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              <option value="popular">Mais Populares</option>
              <option value="newest">Mais Recentes</option>
              <option value="rating">Melhor Avaliados</option>
            </select>

            <button 
              onClick={() => setShowFiltersModal(true)}
              className="px-4 py-2 bg-navy-700/50 hover:bg-navy-600/50 border border-gold-500/30 hover:border-gold-500/50 rounded-lg text-gold-200 hover:text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-navy-800 flex items-center gap-2 transition-all duration-300 ease-out transform hover:transform hover:-translate-y-0.5 hover:shadow-md hover:shadow-gold-500/10 active:scale-[0.98] font-semibold relative overflow-hidden before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100 before:bg-gradient-to-r before:from-gold-500/10 before:to-transparent backdrop-blur-sm">
              <Filter className="w-4 h-4 relative z-10" />
              <span className="relative z-10">Mais Filtros</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-500/20 text-green-400 border border-green-500/20' 
            : 'bg-red-500/20 text-red-400 border border-red-500/20'
        }`}>
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.length > 0 ? (
          filteredCourses.map((course) => (
            <div key={course.id} onClick={() => openCourseDetails(course)} className="cursor-pointer">
              <Card className="hover:shadow-xl transition-shadow">
                <div className="space-y-4">
                {/* Course Header */}
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-semibold text-gold line-clamp-2">{course.title}</h3>
                    {course.is_featured && (
                      <span className="px-2 py-1 bg-gold-500/20 text-gold text-xs rounded-full">
                        Destaque
                      </span>
                    )}
                  </div>
                  <p className="text-gold-300 text-sm">{course.category}</p>
                </div>

                {/* Course Description */}
                {course.summary && (
                  <p className="text-gold-300 text-sm line-clamp-3">{course.summary}</p>
                )}

                {/* Course Info */}
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className={`px-2 py-1 rounded-full ${getLevelColor(course.difficulty)}`}>
                    {getLevelLabel(course.difficulty)}
                  </span>
                  <span className="flex items-center gap-1 text-gold-300">
                    <Clock className="w-4 h-4" />
                    {course.duration_hours}h
                  </span>
                  <span className="inline-flex items-center gap-1 text-gold-300">
                    <Users className="w-4 h-4" />
                    <span>{course.enrollmentCount || 0}</span>
                  </span>
                  {course.averageRating && course.averageRating > 0 && (
                    <span className="flex items-center gap-1 text-yellow-400">
                      <Star className="w-4 h-4 fill-current" />
                      {course.averageRating.toFixed(1)}
                    </span>
                  )}
                </div>

                {/* Instructor */}
                {course.instructor && (
                  <div className="flex items-center gap-2 text-sm text-gold-300">
                    <User className="w-4 h-4" />
                    <span>{course.instructor.full_name || course.instructor.email}</span>
                  </div>
                )}

                {/* Price and Action */}
                <div className="flex items-center justify-between pt-4 border-t border-gold-500/20">
                  <span className="text-lg font-bold text-gold">
                    {formatPrice(course.price)}
                  </span>
                  <Button 
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation()
                      openCourseDetails(course)
                    }}
                    icon={<Eye className="w-4 h-4" />}
                  >
                    Visualizar
                  </Button>
                </div>
              </div>
              </Card>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <BookOpen className="w-16 h-16 text-gold-500/30 mx-auto mb-4" />
            <p className="text-gold-300 text-lg">Nenhum curso encontrado com os filtros aplicados</p>
          </div>
        )}
      </div>

      {/* Course Details Modal */}
      {showDetailsModal && selectedCourse && (
        <div className="fixed inset-0 bg-navy-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-navy-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gold-500/20">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-gold-500/20 to-gold-600/20 p-6 border-b border-gold-500/20">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gold mb-2">{selectedCourse.title}</h2>
                  <div className="flex items-center gap-4 text-sm text-gold-300">
                    <span>{selectedCourse.category}</span>
                    <span className={`px-2 py-1 rounded-full ${getLevelColor(selectedCourse.difficulty)}`}>
                      {getLevelLabel(selectedCourse.difficulty)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {selectedCourse.duration_hours}h
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gold-400 hover:text-gold-200 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="space-y-6">
                {/* Description */}
                <div>
                  <h3 className="text-lg font-semibold text-gold mb-3">Sobre o Curso</h3>
                  <p className="text-gold-300 whitespace-pre-wrap">
                    {selectedCourse.description || selectedCourse.summary || 'Sem descrição disponível.'}
                  </p>
                </div>

                {/* Learning Objectives */}
                {selectedCourse.learning_objectives && selectedCourse.learning_objectives.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gold mb-3">O que você vai aprender</h3>
                    <ul className="space-y-2">
                      {selectedCourse.learning_objectives.map((objective, index) => (
                        <li key={index} className="flex items-start gap-2 text-gold-300">
                          <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                          <span>{objective}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Prerequisites */}
                {selectedCourse.prerequisites && selectedCourse.prerequisites.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gold mb-3">Pré-requisitos</h3>
                    <ul className="space-y-2">
                      {selectedCourse.prerequisites.map((prereq, index) => (
                        <li key={index} className="flex items-start gap-2 text-gold-300">
                          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                          <span>{prereq}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Course Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-navy-900/50 rounded-lg p-4 text-center">
                    <Users className="w-8 h-8 text-gold-500/50 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gold">{selectedCourse.enrollmentCount || 0}</p>
                    <p className="text-sm text-gold-300">Alunos Matriculados</p>
                  </div>
                  <div className="bg-navy-900/50 rounded-lg p-4 text-center">
                    <Clock className="w-8 h-8 text-gold-500/50 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gold">{selectedCourse.duration_hours}h</p>
                    <p className="text-sm text-gold-300">Duração Total</p>
                  </div>
                  <div className="bg-navy-900/50 rounded-lg p-4 text-center">
                    <Star className="w-8 h-8 text-gold-500/50 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gold">
                      {selectedCourse.averageRating ? selectedCourse.averageRating.toFixed(1) : 'N/A'}
                    </p>
                    <p className="text-sm text-gold-300">Avaliação Média</p>
                  </div>
                  <div className="bg-navy-900/50 rounded-lg p-4 text-center">
                    <DollarSign className="w-8 h-8 text-gold-500/50 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gold">{formatPrice(selectedCourse.price)}</p>
                    <p className="text-sm text-gold-300">Investimento</p>
                  </div>
                </div>

                {/* Instructor Info */}
                {selectedCourse.instructor && (
                  <div className="bg-navy-900/50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gold mb-3">Instrutor</h3>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gold-500/20 flex items-center justify-center">
                        {selectedCourse.instructor.avatar_url ? (
                          <img 
                            src={selectedCourse.instructor.avatar_url} 
                            alt={selectedCourse.instructor.full_name || ''}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-8 h-8 text-gold" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gold">
                          {selectedCourse.instructor.full_name || selectedCourse.instructor.email}
                        </p>
                        {selectedCourse.instructor.bio && (
                          <p className="text-sm text-gold-300 mt-1">{selectedCourse.instructor.bio}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-navy-900/50 p-6 border-t border-gold-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-gold-300">
                    <Lock className="w-5 h-5" />
                    <p className="text-sm">Matrículas realizadas apenas pela administração</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
                    Fechar
                  </Button>
                  <Button 
                    onClick={() => handleViewPreview(selectedCourse)}
                    icon={<BookMarked className="w-4 h-4" />}
                  >
                    Ver Conteúdo Programático
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedCourse && (
        <div className="fixed inset-0 bg-navy-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-navy-800 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden border border-gold-500/20">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-gold-500/20 to-gold-600/20 p-6 border-b border-gold-500/20">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gold mb-2">Conteúdo Programático</h2>
                  <p className="text-gold-300">{selectedCourse.title}</p>
                </div>
                <button
                  onClick={() => {
                    setShowPreviewModal(false)
                    setPreviewModules([])
                  }}
                  className="text-gold-400 hover:text-gold-200 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {loadingPreview ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Spinner size="lg" className="mb-4" />
                  <p className="text-gold-300">Carregando conteúdo...</p>
                </div>
              ) : previewModules.length > 0 ? (
                <div className="space-y-6">
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
                    <Eye className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-blue-400 font-semibold">Aulas de Demonstração</p>
                      <p className="text-blue-300 text-sm mt-1">
                        Estas são as aulas disponíveis para preview. Para acesso completo ao curso, 
                        entre em contato com a administração para solicitar sua matrícula.
                      </p>
                    </div>
                  </div>

                  {previewModules.map((module, moduleIndex) => (
                    <div key={module.id} className="bg-navy-900/50 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-gold-500/20 rounded-full flex items-center justify-center">
                          <span className="text-gold font-bold">{moduleIndex + 1}</span>
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-gold">{module.name}</h3>
                          {module.description && (
                            <p className="text-gold-300 text-sm mt-1">{module.description}</p>
                          )}
                        </div>
                      </div>

                      {module.module_subjects && module.module_subjects.length > 0 && (
                        <div className="ml-12 space-y-3">
                          {module.module_subjects.map((moduleSubject: any, subjectIndex: number) => (
                            <div key={moduleSubject.id} className="bg-navy-800/50 rounded-lg p-4">
                              <div className="flex items-start gap-3">
                                <BookOpen className="w-5 h-5 text-gold-400 mt-0.5" />
                                <div className="flex-1">
                                  <h4 className="font-medium text-gold-200">
                                    {moduleSubject.subjects?.name || 'Disciplina'}
                                  </h4>
                                  {moduleSubject.subjects?.description && (
                                    <p className="text-gold-300/70 text-sm mt-1">
                                      {moduleSubject.subjects.description}
                                    </p>
                                  )}
                                  {moduleSubject.subjects?.subject_lessons && moduleSubject.subjects.subject_lessons.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                      <p className="text-gold-300 text-sm font-medium">Aulas:</p>
                                      <ul className="space-y-1">
                                        {moduleSubject.subjects.subject_lessons.map((subjectLesson: any) => (
                                          <li key={subjectLesson.id} className="flex items-center gap-2 text-gold-300/60 text-sm">
                                            <Eye className="w-3 h-3 text-blue-400" />
                                            <span className="flex-1">{subjectLesson.lessons?.title || 'Aula'}</span>
                                            {subjectLesson.lessons?.duration_minutes && (
                                              <span className="text-gold-400 text-xs">
                                                {subjectLesson.lessons.duration_minutes} min
                                              </span>
                                            )}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="bg-navy-900/30 rounded-lg p-6 text-center">
                    <Lock className="w-12 h-12 text-gold-500/30 mx-auto mb-3" />
                    <p className="text-gold-300 mb-2">Conteúdo completo disponível apenas para alunos matriculados</p>
                    <p className="text-gold-400 text-sm">
                      Entre em contato com a administração para solicitar sua matrícula
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gold-500/30 mx-auto mb-4" />
                  <p className="text-gold-300 mb-2">Nenhuma aula de preview disponível para este curso</p>
                  <p className="text-gold-400 text-sm">
                    O administrador ainda não configurou aulas de demonstração para este curso.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-navy-900/50 p-6 border-t border-gold-500/20">
              <div className="flex justify-between items-center">
                <p className="text-gold-300 text-sm">
                  Para matrícula, contate a administração
                </p>
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    setShowPreviewModal(false)
                    setPreviewModules([])
                  }}
                >
                  Fechar Preview
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Filters Modal */}
      {showFiltersModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-navy-800 border border-gold-500/30 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gold-500/20">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gold">Filtros Avançados</h2>
                <button
                  onClick={() => setShowFiltersModal(false)}
                  className="p-2 hover:bg-navy-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gold-400" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Rating Filter */}
              <div>
                <label className="block text-gold-300 mb-2">Avaliação Mínima</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.5"
                    value={minRating}
                    onChange={(e) => setMinRating(Number(e.target.value))}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-gold-500" />
                    <span className="text-gold font-medium w-12">{minRating}</span>
                  </div>
                </div>
              </div>

              {/* Duration Filter */}
              <div>
                <label className="block text-gold-300 mb-2">Duração Máxima (horas)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={maxDuration}
                    onChange={(e) => setMaxDuration(Number(e.target.value))}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-gold-500" />
                    <span className="text-gold font-medium w-16">{maxDuration}h</span>
                  </div>
                </div>
              </div>

              {/* Instructor Filter */}
              <div>
                <label className="block text-gold-300 mb-2">Instrutor</label>
                <select
                  value={instructor}
                  onChange={(e) => setInstructor(e.target.value)}
                  className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
                >
                  <option value="all">Todos os Instrutores</option>
                  {/* Add instructor options dynamically */}
                </select>
              </div>

              {/* Features Filter */}
              <div>
                <label className="block text-gold-300 mb-2">Recursos</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-gold-500/30 text-gold-500 focus:ring-gold-500" />
                    <span className="text-gold-200">Com Certificado</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-gold-500/30 text-gold-500 focus:ring-gold-500" />
                    <span className="text-gold-200">Cursos em Destaque</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-gold-500/30 text-gold-500 focus:ring-gold-500" />
                    <span className="text-gold-200">Com Suporte ao Vivo</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    // Reset filters
                    setMinRating(0)
                    setMaxDuration(100)
                    setInstructor('all')
                  }}
                >
                  Limpar Filtros
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => {
                    // Apply filters
                    setShowFiltersModal(false)
                    // Add filter logic here
                  }}
                >
                  Aplicar Filtros
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
