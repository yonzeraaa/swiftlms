'use client'

import { useState, useEffect } from 'react'
import { Search, BookOpen, Clock, Users, Star, Eye, Lock, BookMarked, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getBrowsableCourses, getCoursePreview } from '@/lib/actions/browse-enroll'
import { ClassicRule, CornerBracket } from '../../components/ui/RenaissanceSvgs'
import Spinner from '../../components/ui/Spinner'

const INK = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'
const PARCH = '#faf6ee'
const BORDER = 'rgba(30,19,12,0.14)'

interface CourseWithDetails {
  id: string
  title: string
  description: string | null
  summary: string | null
  category: string | null
  difficulty: string
  duration_hours: number | null
  price: number | null
  instructor?: { full_name: string | null; email: string; avatar_url: string | null; bio: string | null }
  enrollmentCount?: number
  averageRating?: number
  isEnrolled?: boolean
  learning_objectives?: string[]
  prerequisites?: string[]
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

export default function ExploreCourses() {
  const [courses, setCourses] = useState<CourseWithDetails[]>([])
  const [filteredCourses, setFilteredCourses] = useState<CourseWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedCourse, setSelectedCourse] = useState<CourseWithDetails | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewModules, setPreviewModules] = useState<any[]>([])
  const [loadingPreview, setLoadingPreview] = useState(false)

  const router = useRouter()

  const categories = [
    { value: 'all', label: 'Todas as Categorias' },
    { value: 'engineering', label: 'Engenharia' },
    { value: 'safety', label: 'Segurança' },
    { value: 'operations', label: 'Operações' },
    { value: 'maintenance', label: 'Manutenção' }
  ]

  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(() => {
    let filtered = [...courses]
    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.summary?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(c => c.category === selectedCategory)
    }
    setFilteredCourses(filtered)
  }, [courses, searchTerm, selectedCategory])

  const fetchCourses = async () => {
    try {
      const data = await getBrowsableCourses()
      if (!data || !('courses' in data)) return

      const processed: CourseWithDetails[] = (data.courses || []).map((course: any) => {
        const instructor = data.instructors?.find((i: any) => i.id === course.instructor_id)
        const courseReviews = data.reviews?.filter((r: any) => r.course_id === course.id) || []
        const avg = courseReviews.length > 0 ? courseReviews.reduce((s: any, r: any) => s + r.rating, 0) / courseReviews.length : 0
        return { ...course, instructor, averageRating: avg, enrollmentCount: 0 }
      })
      setCourses(processed)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleViewPreview = async (course: CourseWithDetails) => {
    setSelectedCourse(course)
    setShowPreviewModal(true)
    setLoadingPreview(true)
    try {
      const modules = await getCoursePreview(course.id)
      setPreviewModules(modules || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingPreview(false)
    }
  }

  const formatPrice = (price: number | null) => (!price || price === 0 ? 'Gratuito' : `R$ ${price.toFixed(2).replace('.', ',')}`)

  if (loading) {
    return <Spinner fullPage size="xl" />
  }

  return (
    <div className="flex flex-col">
      <div className="text-center flex flex-col items-center mb-12">
        <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: '2.5rem', fontWeight: 700, color: INK, marginBottom: '0.5rem' }}>
          Catálogo de Cursos
        </h1>
        <p style={{ fontFamily: 'var(--font-lora)', fontSize: '1.1rem', fontStyle: 'italic', color: MUTED }}>
          Explore nossa biblioteca de conhecimento e forje seu futuro
        </p>
        <ClassicRule style={{ width: '100%', maxWidth: '300px', marginTop: '2.5rem', color: INK }} />
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-12">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a6350]" />
          <input
            type="text"
            placeholder="Buscar nos registros..."
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
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: 'transparent',
            border: `1px solid ${BORDER}`,
            fontFamily: 'var(--font-lora)',
            color: INK,
            cursor: 'pointer'
          }}
        >
          {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredCourses.map((course) => (
          <div
            key={course.id}
            onClick={() => { setSelectedCourse(course); setShowDetailsModal(true); }}
            style={{
              backgroundColor: PARCH,
              border: `1px solid ${BORDER}`,
              padding: '2rem',
              cursor: 'pointer',
              position: 'relative',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            className="hover:shadow-xl hover:-translate-y-1"
          >
            <div className="absolute top-2 left-2 w-6 h-6"><CornerBracket size={24} /></div>
            
            <h3 style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.25rem', fontWeight: 600, color: INK, marginBottom: '0.5rem' }}>
              {course.title}
            </h3>
            <p style={{ fontFamily: 'var(--font-lora)', fontSize: '0.85rem', color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
              {course.category}
            </p>
            <div style={{ marginBottom: '1.5rem' }}><ClassicRule /></div>
            
            <p style={{ fontFamily: 'var(--font-lora)', fontSize: '0.95rem', color: MUTED, marginBottom: '1.5rem', lineClamp: 3, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {course.summary}
            </p>

            <div className="flex justify-between items-center pt-4 border-t border-[#1e130c]/10">
              <span style={{ fontFamily: 'var(--font-playfair)', fontWeight: 700, color: INK }}>
                {formatPrice(course.price)}
              </span>
              <div className="flex gap-4 text-[#7a6350]">
                <span className="flex items-center gap-1 text-xs"><Clock size={14} /> {course.duration_hours}h</span>
                <span className="flex items-center gap-1 text-xs"><Users size={14} /> {course.enrollmentCount}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedCourse && (
        <div className="fixed inset-0 bg-[#1e130c]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#faf6ee] w-full max-w-2xl relative border border-[#1e130c] shadow-2xl p-8 md:p-12 font-[family-name:var(--font-lora)] overflow-y-auto max-h-[90vh]">
            <CornerBracket className="absolute top-4 left-4 w-10 h-10 text-[#1e130c]/40" />
            <CornerBracket className="absolute top-4 right-4 w-10 h-10 text-[#1e130c]/40 rotate-90" />
            
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '2rem', color: INK }}>{selectedCourse.title}</h2>
                <p style={{ color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.8rem' }}>{selectedCourse.category}</p>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="text-[#1e130c]/40 hover:text-[#1e130c]"><X size={24} /></button>
            </div>

            <div className="mb-8" style={{ borderLeft: `3px solid ${ACCENT}`, paddingLeft: '1.5rem' }}>
              <p style={{ color: INK, lineHeight: 1.6, fontSize: '1.1rem' }}>{selectedCourse.description || selectedCourse.summary}</p>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-10">
              <div>
                <h4 style={{ fontFamily: 'var(--font-playfair)', fontWeight: 700, color: INK, marginBottom: '0.5rem' }}>Detalhes</h4>
                <p className="text-sm text-[#7a6350]">Duração: {selectedCourse.duration_hours} horas</p>
                <p className="text-sm text-[#7a6350]">Nível: {selectedCourse.difficulty}</p>
              </div>
              <div>
                <h4 style={{ fontFamily: 'var(--font-playfair)', fontWeight: 700, color: INK, marginBottom: '0.5rem' }}>Instrutor</h4>
                <p className="text-sm text-[#7a6350]">{selectedCourse.instructor?.full_name || selectedCourse.instructor?.email}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-[#1e130c]/10">
              <button
                onClick={() => handleViewPreview(selectedCourse)}
                style={{ flex: 1, padding: '1rem', border: `1px solid ${INK}`, color: INK, backgroundColor: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-lora)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}
              >
                Conteúdo Programático
              </button>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: INK, color: PARCH, padding: '1rem', cursor: 'default', fontFamily: 'var(--font-lora)', fontSize: '0.85rem', textAlign: 'center' }}>
                <Lock size={16} className="mr-2" /> Matrícula via Administração
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedCourse && (
        <div className="fixed inset-0 bg-[#1e130c]/80 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-[#faf6ee] w-full max-w-3xl relative border-2 border-[#1e130c] shadow-2xl p-8 md:p-12 font-[family-name:var(--font-lora)] overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-8 border-b border-[#1e130c]/10 pb-4">
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.75rem', color: INK }}>Conteúdo do Curso</h2>
              <button onClick={() => setShowPreviewModal(false)} className="text-[#1e130c]/40 hover:text-[#1e130c]"><X size={24} /></button>
            </div>

            {loadingPreview ? (
              <div className="py-20 text-center"><p style={{ color: MUTED, fontStyle: 'italic' }}>Consultando arquivos...</p></div>
            ) : (
              <div className="space-y-8">
                {previewModules.length > 0 ? previewModules.map((m, i) => (
                  <div key={m.id}>
                    <h3 style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.25rem', color: INK, marginBottom: '1rem' }}>{i + 1}. {m.name}</h3>
                    <div className="pl-6 space-y-3">
                      {m.module_subjects?.map((ms: any) => (
                        <div key={ms.id} style={{ padding: '0.75rem', border: `1px dashed ${BORDER}`, fontSize: '0.9rem', color: MUTED }}>
                          {ms.subjects?.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )) : <p className="text-center italic text-[#7a6350]">Nenhum módulo registrado publicamente.</p>}
              </div>
            )}
            
            <div className="mt-12 text-center pt-8 border-t border-[#1e130c]/10">
              <button onClick={() => setShowPreviewModal(false)} style={{ padding: '0.75rem 2.5rem', backgroundColor: INK, color: PARCH, border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
