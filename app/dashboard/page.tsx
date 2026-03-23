'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '../contexts/LanguageContext'
import { getAdminDashboardData } from '@/lib/actions/admin-dashboard'
import { ClassicRule } from '../components/ui/RenaissanceSvgs'
import Spinner from '../components/ui/Spinner'

const INK = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'
const BORDER = 'rgba(30,19,12,0.14)'

interface Stats {
  totalStudents: number
  totalInstructors: number
  totalCourses: number
  publishedCourses: number
  totalEnrollments: number
  completedEnrollments: number
  completionRate: number
  activeUsers: number
}

interface RecentActivity {
  userId: string
  userName: string
  action: string
  entityName?: string
  timestamp: string
  icon: 'user' | 'course' | 'enrollment' | 'award'
}

interface PopularCourse {
  id: string
  name: string
  students: number
  percentage: number
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0, totalInstructors: 0, totalCourses: 0,
    publishedCourses: 0, totalEnrollments: 0, completedEnrollments: 0,
    completionRate: 0, activeUsers: 0,
  })
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [popularCourses, setPopularCourses] = useState<PopularCourse[]>([])

  useEffect(() => { fetchDashboardData() }, [])

  const fetchDashboardData = async () => {
    try {
      const result = await getAdminDashboardData()
      if (!result) { console.error('Error fetching dashboard data'); return }
      if ('unauthorized' in result && result.unauthorized) { router.push(result.redirectTo || '/'); return }

      const activities: RecentActivity[] = (result.activities || []).map((activity: any) => {
        const date = new Date(activity.timestamp)
        const now = new Date()
        const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000)

        let timeAgo = ''
        if (diffMin < 60)         timeAgo = `${diffMin} ${t('dashboard.minutesAgo')}`
        else if (diffMin < 1440)  timeAgo = `${Math.floor(diffMin / 60)} ${t('dashboard.hoursAgo')}`
        else                      timeAgo = `${Math.floor(diffMin / 1440)} ${t('dashboard.daysAgo')}`

        const actionMap: Record<string, string> = {
          user_created: t('dashboard.userJoined'), user_deleted: t('dashboard.userDeleted'),
          user_permanently_deleted: t('dashboard.userPermanentlyDeleted'),
          course_created: t('dashboard.createdCourse'), course_published: t('dashboard.publishedCourse'),
          enrolled_in_course: t('dashboard.enrolledInCourse'), student_enrolled: t('dashboard.newStudentEnrolled'),
          enroll_students: t('dashboard.enrolledStudents'), completed_course: t('dashboard.completedCourse'),
          lesson_completed: t('dashboard.lessonCompleted'), certificate_requested: t('dashboard.certificateRequested'),
          certificate_auto_requested: t('dashboard.certificateAutoRequested'),
          certificate_approved: t('dashboard.certificateApproved'), certificate_rejected: t('dashboard.certificateRejected'),
        }

        return {
          userId: activity.userId, userName: activity.userName,
          action: actionMap[activity.action] ?? activity.action,
          entityName: activity.entityName, timestamp: timeAgo,
          icon: activity.icon as RecentActivity['icon'],
        }
      })

      setRecentActivities(activities)
      setPopularCourses(result.coursePopularity || [])
      if (result.stats) setStats(result.stats)
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Spinner fullPage size="xl" />
  }

  return (
    <div className="flex flex-col w-full">
      
      {/* ── Cabeçalho do Painel ── */}
      <div className="text-center flex flex-col items-center mb-16">
        <h1
          style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: 'clamp(2.5rem, 6vw, 4rem)',
            fontWeight: 700,
            color: INK,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            marginBottom: '0.75rem'
          }}
        >
          {t('dashboard.title')}
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-lora)',
            fontSize: '1.25rem',
            fontStyle: 'italic',
            color: MUTED,
            marginBottom: '2.5rem'
          }}
        >
          {t('dashboard.subtitle')}
        </p>
        <p
          style={{
            fontFamily: 'var(--font-lora)',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: INK,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            opacity: 0.8
          }}
        >
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        
        <ClassicRule style={{ width: '100%', maxWidth: '400px', marginTop: '3rem', color: INK }} />
      </div>

      {/* ── Métricas de Registro ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-12 mb-20 px-4">
        {[
          { label: t('dashboard.totalStudents'), value: stats.totalStudents, sub: `${stats.activeUsers} ${t('dashboard.active')}` },
          { label: t('dashboard.activeCourses'), value: stats.publishedCourses, sub: `${stats.totalCourses} ${t('dashboard.total')}` },
          { label: t('dashboard.completionRate'), value: `${stats.completionRate}%`, sub: `${stats.completedEnrollments} ${t('dashboard.completed')}` },
          { label: t('dashboard.enrollments'), value: stats.totalEnrollments, sub: t('dashboard.totalEnrollments') },
        ].map((stat, idx) => (
          <div key={idx} className="flex flex-col items-center text-center relative">
            <span
              style={{
                fontFamily: 'var(--font-lora)',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: MUTED,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                marginBottom: '1.25rem'
              }}
            >
              {stat.label}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-playfair)',
                fontSize: '3.5rem',
                fontWeight: 700,
                color: INK,
                lineHeight: 1,
                marginBottom: '1rem'
              }}
            >
              {stat.value}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-lora)',
                fontSize: '0.9rem',
                fontStyle: 'italic',
                color: ACCENT,
              }}
            >
              {stat.sub}
            </span>
            
            {idx !== 3 && (
              <div className="hidden md:block absolute right-[-2rem] top-[15%] bottom-[15%] w-px opacity-20" style={{ backgroundColor: INK }} />
            )}
          </div>
        ))}
      </div>

      <ClassicRule style={{ width: '100%', marginBottom: '4rem', color: INK, opacity: 0.3 }} />

      {/* ── Registros e Popularidade ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
        
        {/* Atividades Recentes */}
        <div className="flex flex-col">
          <h2
            style={{
              fontFamily: 'var(--font-playfair)',
              fontSize: '2rem',
              fontWeight: 600,
              color: INK,
              marginBottom: '2rem',
              borderLeft: `4px solid ${ACCENT}`,
              paddingLeft: '1.5rem'
            }}
          >
            {t('dashboard.recentActivities')}
          </h2>

          {recentActivities.length > 0 ? (
            <div className="space-y-0">
              {recentActivities.slice(0, 6).map((activity, idx) => (
                <div 
                  key={idx} 
                  className="py-5 transition-colors hover:bg-[#1e130c]/[0.02] px-2"
                  style={{ borderBottom: `1px dashed ${BORDER}` }}
                >
                  <p 
                    style={{ 
                      fontFamily: 'var(--font-lora)', 
                      fontSize: '1.05rem', 
                      color: INK,
                      lineHeight: 1.6
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>{activity.userName}</span>{' '}
                    <span style={{ color: MUTED }}>{activity.action}</span>
                  </p>
                  
                  <div className="flex justify-between items-center mt-2">
                    <p style={{ fontFamily: 'var(--font-lora)', fontSize: '0.9rem', color: ACCENT, fontStyle: 'italic' }}>
                      {activity.entityName || ''}
                    </p>
                    <p style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', color: MUTED, letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>
                      {activity.timestamp}
                    </p>
                  </div>
                </div>
              ))}
              
              <div className="pt-8">
                <button
                  onClick={() => router.push('/dashboard/activities')}
                  className="inline-flex items-center gap-2 pb-1 transition-all hover:gap-4 group"
                  style={{
                    fontFamily: 'var(--font-lora)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: INK,
                    textTransform: 'uppercase',
                    letterSpacing: '0.2em',
                    borderBottom: `2px solid ${INK}`,
                    background: 'none',
                    border: 'none',
                    borderBottomStyle: 'solid',
                    cursor: 'pointer'
                  }}
                >
                  {t('dashboard.viewAll')} →
                </button>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center border border-dashed border-[#1e130c]/10">
              <p style={{ fontFamily: 'var(--font-lora)', fontStyle: 'italic', color: MUTED }}>
                {t('dashboard.noRecentActivity')}
              </p>
            </div>
          )}
        </div>

        {/* Popularidade dos Compêndios */}
        <div className="flex flex-col">
          <h2
            style={{
              fontFamily: 'var(--font-playfair)',
              fontSize: '2rem',
              fontWeight: 600,
              color: INK,
              marginBottom: '2rem',
              borderLeft: `4px solid ${ACCENT}`,
              paddingLeft: '1.5rem'
            }}
          >
            {t('dashboard.popularCourses')}
          </h2>

          {popularCourses.length > 0 ? (
            <div className="space-y-8 mt-2">
              {popularCourses.map((course, idx) => (
                <div key={idx} className="relative group">
                  <div className="flex justify-between items-baseline mb-3">
                    <span style={{ fontFamily: 'var(--font-lora)', fontSize: '1.1rem', color: INK, fontWeight: 600 }}>
                      {idx + 1}. {course.name}
                    </span>
                    <span style={{ fontFamily: 'var(--font-lora)', fontSize: '0.9rem', color: MUTED, fontStyle: 'italic', flexShrink: 0 }}>
                      {course.students} {t('dashboard.students')}
                    </span>
                  </div>
                  
                  {/* Régua de Graduação */}
                  <div className="relative w-full h-[4px]" style={{ backgroundColor: 'rgba(30,19,12,0.05)' }}>
                    <div
                      className="absolute top-0 left-0 h-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${course.percentage}%`,
                        backgroundColor: ACCENT,
                        boxShadow: '0 0 10px rgba(139,109,34,0.2)'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center border border-dashed border-[#1e130c]/10">
              <p style={{ fontFamily: 'var(--font-lora)', fontStyle: 'italic', color: MUTED }}>
                {t('dashboard.noCoursesYet')}
              </p>
            </div>
          )}
        </div>
      </div>
      
    </div>
  )
}
