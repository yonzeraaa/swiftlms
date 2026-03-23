'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Clock, Award, Play, Search, TrendingUp } from 'lucide-react'
import { Database } from '@/lib/database.types'
import { useRouter } from 'next/navigation'
import { getMyEnrollments } from '@/lib/actions/browse-enroll'
import { ClassicRule, CornerBracket } from '../../components/ui/RenaissanceSvgs'
import Spinner from '../../components/ui/Spinner'

type Course = Database['public']['Tables']['courses']['Row']
type Enrollment = Database['public']['Tables']['enrollments']['Row']
type CourseModule = Database['public']['Tables']['course_modules']['Row']
type Lesson = Database['public']['Tables']['lessons']['Row']

const INK = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'
const PARCH = '#faf6ee'
const BORDER = 'rgba(30,19,12,0.14)'

interface EnrolledCourse extends Course {
  enrollment: Enrollment
  modules?: CourseModule[]
  totalLessons: number
  completedLessons: number
  nextLesson?: Lesson
}

function SkeletonBlock({ height = 20, width = '100%', style }: { height?: number; width?: string | number; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        height,
        width,
        backgroundColor: 'rgba(30,19,12,0.06)',
        borderRadius: 0,
        animation: 'pulse 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  )
}

export default function MyCoursesPage() {
  const [courses, setCourses] = useState<EnrolledCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all')
  const router = useRouter()

  useEffect(() => {
    fetchMyCourses()
  }, [])

  const fetchMyCourses = async () => {
    try {
      setLoading(true)
      const result = await getMyEnrollments()
      if (result.success) setCourses(result.data as EnrolledCourse[])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredCourses = courses.filter((course: any) => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' ||
                         (filterStatus === 'active' && course.enrollment.status === 'active') ||
                         (filterStatus === 'completed' && course.enrollment.status === 'completed')
    return matchesSearch && matchesFilter
  })

  if (loading) {
    return <Spinner fullPage size="xl" />
  }

  return (
    <div className="flex flex-col">
      <div className="text-center flex flex-col items-center mb-12">
        <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: '2.5rem', fontWeight: 700, color: INK, marginBottom: '0.5rem' }}>
          Meus Cursos
        </h1>
        <p style={{ fontFamily: 'var(--font-lora)', fontSize: '1.1rem', fontStyle: 'italic', color: MUTED }}>
          Seu registro pessoal de conhecimento e evolução
        </p>
        <ClassicRule style={{ width: '100%', maxWidth: '300px', marginTop: '2.5rem', color: INK }} />
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-12">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a6350]" />
          <input
            type="text"
            placeholder="Filtrar meus registros..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 2.5rem',
              backgroundColor: 'transparent',
              border: `1px solid ${BORDER}`,
              fontFamily: 'var(--font-lora)',
              color: INK
            }}
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'completed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status as any)}
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: filterStatus === status ? INK : 'transparent',
                color: filterStatus === status ? PARCH : INK,
                border: `1px solid ${INK}`,
                fontFamily: 'var(--font-lora)',
                fontSize: '0.85rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {status === 'all' ? 'Todos' : status === 'active' ? 'Em Andamento' : 'Concluídos'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {filteredCourses.length > 0 ? filteredCourses.map((course) => (
          <div
            key={course.id}
            style={{
              backgroundColor: PARCH,
              border: `1px solid ${BORDER}`,
              padding: '2.5rem',
              position: 'relative',
              boxShadow: '0 4px 20px rgba(30,19,12,0.04)'
            }}
          >
            <div className="absolute top-4 left-4 w-8 h-8"><CornerBracket size={32} /></div>
            
            <div className="flex justify-between items-start mb-4">
              <h3 style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.5rem', fontWeight: 600, color: INK, flex: 1 }}>
                {course.title}
              </h3>
              <span style={{ 
                fontFamily: 'var(--font-lora)', 
                fontSize: '0.75rem', 
                fontWeight: 700, 
                textTransform: 'uppercase', 
                letterSpacing: '0.1em',
                color: course.enrollment.status === 'completed' ? INK : ACCENT,
                backgroundColor: course.enrollment.status === 'completed' ? 'rgba(30,19,12,0.05)' : 'rgba(139,109,34,0.1)',
                padding: '0.25rem 0.75rem',
                border: `1px solid ${course.enrollment.status === 'completed' ? INK : ACCENT}`
              }}>
                {course.enrollment.status === 'completed' ? 'Concluído' : 'Em Andamento'}
              </span>

            </div>

            <p style={{ fontFamily: 'var(--font-lora)', fontSize: '0.9rem', color: MUTED, marginBottom: '1.5rem' }}>
              {course.category} • {course.duration_hours}h totais
            </p>

            <div style={{ marginBottom: '2rem' }}>
              <div className="flex justify-between items-center mb-2">
                <span style={{ fontFamily: 'var(--font-lora)', fontSize: '0.85rem', color: INK, fontWeight: 600 }}>
                  Progresso do Estudo
                </span>
                <span style={{ fontFamily: 'var(--font-lora)', fontSize: '0.85rem', color: MUTED, fontStyle: 'italic' }}>
                  {course.enrollment.progress_percentage || 0}%
                </span>
              </div>
              <div className="relative w-full h-[4px]" style={{ backgroundColor: 'rgba(30,19,12,0.06)' }}>
                <div
                  style={{
                    width: `${course.enrollment.progress_percentage || 0}%`,
                    height: '100%',
                    backgroundColor: ACCENT,
                    transition: 'width 1s ease'
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => router.push(`/student-dashboard/course/${course.id}`)}
                style={{ 
                  flex: 1, 
                  padding: '0.85rem', 
                  backgroundColor: INK, 
                  color: PARCH, 
                  border: 'none', 
                  cursor: 'pointer', 
                  fontFamily: 'var(--font-lora)', 
                  fontWeight: 600, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.1em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <Play size={16} /> {course.enrollment.status === 'completed' ? 'Revisar' : 'Continuar'}
              </button>
              {course.enrollment.status === 'completed' && (
                <button
                  onClick={() => router.push('/student-dashboard/certificates')}
                  style={{ 
                    flex: 1, 
                    padding: '0.85rem', 
                    backgroundColor: 'transparent', 
                    color: INK, 
                    border: `1px solid ${INK}`, 
                    cursor: 'pointer', 
                    fontFamily: 'var(--font-lora)', 
                    fontWeight: 600, 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.1em',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Award size={16} /> Certificado
                </button>
              )}
            </div>
          </div>
        )) : (
          <div className="col-span-full text-center py-20" style={{ border: `1px dashed ${BORDER}` }}>
            <BookOpen size={48} style={{ color: BORDER, marginBottom: '1.5rem' }} />
            <p style={{ fontFamily: 'var(--font-lora)', color: MUTED, fontStyle: 'italic', fontSize: '1.1rem' }}>
              Nenhum curso encontrado nos seus registros.
            </p>
            <button
              onClick={() => router.push('/student-dashboard/courses')}
              style={{ marginTop: '2rem', padding: '0.75rem 2rem', backgroundColor: 'transparent', color: INK, border: `1px solid ${INK}`, cursor: 'pointer', fontFamily: 'var(--font-lora)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}
            >
              Explorar Catálogo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
