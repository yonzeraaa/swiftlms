'use client'

import { useState, useEffect } from 'react'
import { 
  Search,
  Sparkles,
  History,
  GraduationCap,
  BookOpenCheck,
  UserRoundPlus,
  Clock,
  Filter
} from 'lucide-react'
import Spinner from '../../components/ui/Spinner'
import { ClassicRule } from '../../components/ui/RenaissanceSvgs'
import { Database } from '@/lib/database.types'
import { useTranslation } from '../../contexts/LanguageContext'
import { getActivitiesData } from '@/lib/actions/admin-activities'

type ActivityLog = Database['public']['Tables']['activity_logs']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

interface ActivityWithUser extends ActivityLog {
  user?: Profile
}

const INK = '#1e130c'
const PAPER = '#fdfaf6'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'
const BORDER_LIGHT = 'rgba(30,19,12,0.15)'

export default function ActivitiesPage() {
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()
  const [activities, setActivities] = useState<ActivityWithUser[]>([])
  const [filteredActivities, setFilteredActivities] = useState<ActivityWithUser[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAction, setSelectedAction] = useState('all')
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchActivities()
  }, [dateRange])

  useEffect(() => {
    filterActivities()
  }, [activities, searchQuery, selectedAction])

  const fetchActivities = async () => {
    try {
      setLoading(true)
      const result = await getActivitiesData(dateRange.start, dateRange.end)

      if (result.success) {
        setActivities(result.activities)
      } else {
        console.error('Error fetching activities:', result.error)
        setActivities([])
      }
    } catch (error) {
      console.error('Error fetching activities:', error)
      setActivities([])
    } finally {
      setLoading(false)
    }
  }

  const filterActivities = () => {
    let filtered = [...activities]

    if (searchQuery) {
      filtered = filtered.filter(activity => {
        const userName = activity.user?.full_name || activity.user?.email || ''
        const entityName = activity.entity_name || ''
        const action = activity.action || ''
        
        return userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
               entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
               action.toLowerCase().includes(searchQuery.toLowerCase())
      })
    }

    if (selectedAction !== 'all') {
      filtered = filtered.filter(activity => {
        if (selectedAction === 'enrolled_in_course') {
          return ['enrolled_in_course', 'student_enrolled', 'enroll_students'].includes(activity.action)
        }

        return activity.action === selectedAction
      })
    }

    setFilteredActivities(filtered)
  }

  const getActionConfig = (action: string) => {
    switch (action) {
      case 'user_created':
        return { 
          icon: <UserRoundPlus className="w-6 h-6" />, 
          text: t('dashboard.userJoined') || 'entrou no sistema',
          color: INK 
        }
      case 'course_created':
      case 'course_published':
        return { 
          icon: <BookOpenCheck className="w-6 h-6" />, 
          text: action === 'course_created' ? (t('dashboard.createdCourse') || 'criou o curso') : (t('dashboard.publishedCourse') || 'publicou o curso'),
          color: ACCENT 
        }
      case 'enrolled_in_course':
      case 'student_enrolled':
      case 'enroll_students':
        return { 
          icon: <Sparkles className="w-6 h-6" />, 
          text:
            action === 'enrolled_in_course'
              ? (t('dashboard.enrolledInCourse') || 'matriculou-se no curso')
              : action === 'student_enrolled'
                ? (t('dashboard.newStudentEnrolled') || 'novo aluno matriculado em')
                : (t('dashboard.enrolledStudents') || 'matriculou alunos em'),
          color: INK 
        }
      case 'completed_course':
        return { 
          icon: <GraduationCap className="w-6 h-6" />, 
          text: t('dashboard.completedCourse') || 'concluiu o curso',
          color: ACCENT 
        }
      default:
        return { 
          icon: <History className="w-6 h-6" />, 
          text: action,
          color: MUTED 
        }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} ${t('dashboard.minutesAgo') || 'min atrás'}`
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} ${t('dashboard.hoursAgo') || 'horas atrás'}`
    } else if (diffInMinutes < 10080) {
      return `${Math.floor(diffInMinutes / 1440)} ${t('dashboard.daysAgo') || 'dias atrás'}`
    } else {
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    }
  }

  const actionTypes = [
    { value: 'all', label: t('common.all') || 'Todas as Atividades' },
    { value: 'user_created', label: t('activities.newUsers') || 'Novos Usuários' },
    { value: 'course_created', label: t('activities.coursesCreated') || 'Cursos Criados' },
    { value: 'course_published', label: t('activities.coursesPublished') || 'Cursos Publicados' },
    { value: 'enrolled_in_course', label: t('activities.enrollments') || 'Matrículas' },
    { value: 'completed_course', label: t('activities.completions') || 'Conclusões' }
  ]

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="xl" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-5xl mx-auto py-12 px-4 sm:px-6">
      {/* Header Clássico */}
      <div className="text-center mb-10">
        <h1 
          style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: '2.5rem',
            fontWeight: 600,
            color: INK,
            marginBottom: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem'
          }}
        >
          {t('activities.title') || 'Atividades Recentes'}
        </h1>
        <p style={{ fontFamily: 'var(--font-lora)', fontStyle: 'italic', color: MUTED, fontSize: '1.1rem' }}>
          {t('activities.subtitle') || 'O registro histórico de ações na plataforma'}
        </p>
      </div>

      <ClassicRule style={{ width: '100%', color: INK, opacity: 0.3, marginBottom: '3rem' }} />

      {/* Painel de Controles e Filtros */}
      <div 
        className="mb-10 p-6 sm:p-8"
        style={{ 
          backgroundColor: PAPER,
          border: `1px solid ${BORDER_LIGHT}`,
        }}
      >
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <label style={{ fontFamily: 'var(--font-lora)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: INK, display: 'block', marginBottom: '0.5rem' }}>
              {t('common.search') || 'Pesquisar'}
            </label>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: MUTED }} />
              <input
                type="text"
                placeholder={t('activities.searchPlaceholder') || 'Buscar...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: `1px dashed ${BORDER_LIGHT}`,
                  color: INK,
                  fontFamily: 'var(--font-lora)',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => e.target.style.borderBottom = `1px solid ${ACCENT}`}
                onBlur={(e) => e.target.style.borderBottom = `1px dashed ${BORDER_LIGHT}`}
              />
            </div>
          </div>
          
          <div className="w-full lg:w-64">
            <label style={{ fontFamily: 'var(--font-lora)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: INK, display: 'block', marginBottom: '0.5rem' }}>
              {t('common.filter') || 'Classificação'}
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: MUTED }} />
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: `1px dashed ${BORDER_LIGHT}`,
                  color: INK,
                  fontFamily: 'var(--font-lora)',
                  fontSize: '1rem',
                  appearance: 'none',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => e.target.style.borderBottom = `1px solid ${ACCENT}`}
                onBlur={(e) => e.target.style.borderBottom = `1px dashed ${BORDER_LIGHT}`}
              >
                {actionTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="w-full lg:w-auto">
            <label style={{ fontFamily: 'var(--font-lora)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: INK, display: 'block', marginBottom: '0.5rem' }}>
              {t('reports.dateRange') || 'Período'}
            </label>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 hidden sm:block" style={{ color: MUTED }} />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                style={{
                  padding: '0.5rem 0',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: `1px dashed ${BORDER_LIGHT}`,
                  color: INK,
                  fontFamily: 'var(--font-lora)',
                  outline: 'none',
                  cursor: 'pointer'
                }}
                onFocus={(e) => e.target.style.borderBottom = `1px solid ${ACCENT}`}
                onBlur={(e) => e.target.style.borderBottom = `1px dashed ${BORDER_LIGHT}`}
              />
              <span style={{ color: MUTED, fontFamily: 'var(--font-lora)', fontStyle: 'italic' }}>{t('reports.to') || 'até'}</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                style={{
                  padding: '0.5rem 0',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: `1px dashed ${BORDER_LIGHT}`,
                  color: INK,
                  fontFamily: 'var(--font-lora)',
                  outline: 'none',
                  cursor: 'pointer'
                }}
                onFocus={(e) => e.target.style.borderBottom = `1px solid ${ACCENT}`}
                onBlur={(e) => e.target.style.borderBottom = `1px dashed ${BORDER_LIGHT}`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid com Tabela e Estatísticas */}
      <div className="flex flex-col lg:flex-row gap-12">
        
        {/* Lista de Atividades */}
        <div className="flex-1">
          <h2
            style={{
              fontFamily: 'var(--font-playfair)',
              fontSize: '1.75rem',
              fontWeight: 600,
              color: INK,
              marginBottom: '1.5rem',
              borderLeft: `3px solid ${ACCENT}`,
              paddingLeft: '1rem'
            }}
          >
            {t('activities.recentActivities')} <span style={{ color: MUTED, fontSize: '1.25rem', fontWeight: 400, fontStyle: 'italic' }}>({filteredActivities.length})</span>
          </h2>

          <div 
            style={{ 
              backgroundColor: PAPER,
              border: `1px solid ${BORDER_LIGHT}`,
              padding: '1.5rem 2rem'
            }}
          >
            {filteredActivities.length > 0 ? (
              <div className="flex flex-col">
                {filteredActivities.map((activity, index) => {
                  const config = getActionConfig(activity.action)
                  return (
                    <div 
                      key={activity.id} 
                      className="py-6 flex items-start gap-6 group"
                      style={{ 
                        borderTop: index > 0 ? `1px dashed rgba(30,19,12,0.15)` : 'none' 
                      }}
                    >
                      <div 
                        className="flex-shrink-0 mt-1 opacity-80 group-hover:opacity-100 transition-opacity"
                        style={{ color: config.color }}
                      >
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p 
                          style={{ 
                            fontFamily: 'var(--font-lora)', 
                            fontSize: '1.15rem', 
                            color: INK,
                            lineHeight: 1.6
                          }}
                        >
                          <span style={{ fontWeight: 700 }}>
                            {activity.user?.full_name || activity.user?.email || 'Usuário Desconhecido'}
                          </span>{' '}
                          <span style={{ color: MUTED }}>{config.text}</span>
                        </p>
                        
                        {activity.entity_name && (
                          <p 
                            className="mt-1"
                            style={{ 
                              fontFamily: 'var(--font-lora)', 
                              fontSize: '1rem', 
                              color: ACCENT, 
                              fontStyle: 'italic'
                            }}
                          >
                            {activity.entity_name}
                          </p>
                        )}
                        
                        <p 
                          className="mt-2"
                          style={{ 
                            fontFamily: 'var(--font-lora)', 
                            fontSize: '0.85rem', 
                            color: MUTED, 
                            letterSpacing: '0.05em', 
                            textTransform: 'uppercase', 
                            fontWeight: 600 
                          }}
                        >
                          {activity.created_at ? formatDate(activity.created_at) : '-'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <History className="w-10 h-10 mb-4" style={{ color: MUTED, opacity: 0.5 }} />
                <p style={{ fontFamily: 'var(--font-lora)', fontStyle: 'italic', color: MUTED, fontSize: '1.1rem' }}>
                  {t('activities.noActivities') || 'O registro encontra-se vazio no momento.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Resumo de Estatísticas */}
        <div className="w-full lg:w-72 flex flex-col gap-6">
          <h3
            style={{
              fontFamily: 'var(--font-playfair)',
              fontSize: '1.5rem',
              fontWeight: 600,
              color: INK,
              marginBottom: '0.5rem'
            }}
          >
            Resumo
          </h3>
          {[
            { 
              value: filteredActivities.length, 
              label: t('activities.totalActivities') || 'Total', 
              color: INK
            },
            { 
              value: filteredActivities.filter(a => a.action === 'user_created').length, 
              label: t('activities.newUsers') || 'Novos Alunos', 
              color: INK
            },
            { 
              value: filteredActivities.filter(a => a.action === 'enrolled_in_course' || a.action === 'student_enrolled').length, 
              label: t('activities.enrollments') || 'Matrículas', 
              color: ACCENT
            },
            { 
              value: filteredActivities.filter(a => a.action === 'completed_course').length, 
              label: t('activities.completions') || 'Conclusões', 
              color: ACCENT
            }
          ].map((stat, idx) => (
            <div 
              key={idx}
              className="flex flex-col items-center justify-center p-6 text-center"
              style={{ 
                backgroundColor: PAPER,
                border: `1px solid ${BORDER_LIGHT}`
              }}
            >
              <span 
                style={{
                  fontFamily: 'var(--font-playfair)',
                  fontSize: '2.5rem',
                  fontWeight: 600,
                  color: stat.color,
                  lineHeight: 1
                }}
              >
                {stat.value}
              </span>
              <div 
                className="mt-4 mb-3 w-8" 
                style={{ height: '1px', backgroundColor: INK, opacity: 0.2 }} 
              />
              <span 
                style={{
                  fontFamily: 'var(--font-lora)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: MUTED,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
