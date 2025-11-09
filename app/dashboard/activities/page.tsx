'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Clock, UserPlus, BookPlus, Activity, Award, Calendar, Filter, Search } from 'lucide-react'
import Card from '../../components/Card'
import Breadcrumbs from '../../components/ui/Breadcrumbs'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/Button'
import { Database } from '@/lib/database.types'
import { useTranslation } from '../../contexts/LanguageContext'
import { getActivitiesData } from '@/lib/actions/admin-activities'

type ActivityLog = Database['public']['Tables']['activity_logs']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

interface ActivityWithUser extends ActivityLog {
  user?: Profile
}

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

    // Filter by search query
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

    // Filter by action type
    if (selectedAction !== 'all') {
      filtered = filtered.filter(activity => activity.action === selectedAction)
    }

    setFilteredActivities(filtered)
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'user_created':
        return <UserPlus className="w-5 h-5" />
      case 'course_created':
      case 'course_published':
        return <BookPlus className="w-5 h-5" />
      case 'enrolled_in_course':
      case 'student_enrolled':
        return <Activity className="w-5 h-5" />
      case 'completed_course':
        return <Award className="w-5 h-5" />
      default:
        return <Activity className="w-5 h-5" />
    }
  }

  const getActionText = (action: string) => {
    switch (action) {
      case 'user_created':
        return t('dashboard.userJoined')
      case 'course_created':
        return t('dashboard.createdCourse')
      case 'course_published':
        return t('dashboard.publishedCourse')
      case 'enrolled_in_course':
        return t('dashboard.enrolledInCourse')
      case 'student_enrolled':
        return t('dashboard.newStudentEnrolled')
      case 'completed_course':
        return t('dashboard.completedCourse')
      default:
        return action
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'user_created':
        return 'bg-blue-500/20 text-blue-400'
      case 'course_created':
      case 'course_published':
        return 'bg-green-500/20 text-green-400'
      case 'enrolled_in_course':
      case 'student_enrolled':
        return 'bg-purple-500/20 text-purple-400'
      case 'completed_course':
        return 'bg-gold-500/20 text-gold-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} ${t('dashboard.minutesAgo')}`
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} ${t('dashboard.hoursAgo')}`
    } else if (diffInMinutes < 10080) { // Less than 7 days
      return `${Math.floor(diffInMinutes / 1440)} ${t('dashboard.daysAgo')}`
    } else {
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  const actionTypes = [
    { value: 'all', label: t('common.all') },
    { value: 'user_created', label: t('activities.newUsers') },
    { value: 'course_created', label: t('activities.coursesCreated') },
    { value: 'course_published', label: t('activities.coursesPublished') },
    { value: 'enrolled_in_course', label: t('activities.enrollments') },
    { value: 'completed_course', label: t('activities.completions') }
  ]

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs className="mb-2" />
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gold">{t('activities.title')}</h1>
        <p className="text-gold-300 mt-1">{t('activities.subtitle')}</p>
      </div>

      {/* Filters */}
      <Card>
        <div className="space-y-4">
          {/* Search and Action Filter */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gold-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder={t('activities.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>
            </div>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              {actionTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-gold-400" />
            <div className="flex items-center gap-2 flex-1">
              <label className="text-gold-300">{t('reports.dateRange')}:</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="px-3 py-1 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              <span className="text-gold-300">{t('reports.to')}</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-3 py-1 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Activities List */}
      <Card title={`${t('activities.recentActivities')} (${filteredActivities.length})`}>
        <div className="space-y-4">
          {filteredActivities.length > 0 ? (
            filteredActivities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 pb-4 border-b border-gold-500/20 last:border-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getActionColor(activity.action)}`}>
                  {getActionIcon(activity.action)}
                </div>
                <div className="flex-1">
                  <p className="text-gold-200">
                    <span className="font-semibold text-gold">
                      {activity.user?.full_name || activity.user?.email || 'Unknown User'}
                    </span>{' '}
                    {getActionText(activity.action)}
                  </p>
                  {activity.entity_name && (
                    <p className="text-gold-400 text-sm mt-1">{activity.entity_name}</p>
                  )}
                  <p className="text-gold-500/60 text-xs mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {activity.created_at ? formatDate(activity.created_at) : '-'}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gold-300">{t('activities.noActivities')}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <div className="text-center">
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gold">{filteredActivities.length}</p>
            <p className="text-gold-300 mt-1">{t('activities.totalActivities')}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gold">
              {filteredActivities.filter(a => a.action === 'user_created').length}
            </p>
            <p className="text-gold-300 mt-1">{t('activities.newUsers')}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gold">
              {filteredActivities.filter(a => a.action === 'enrolled_in_course' || a.action === 'student_enrolled').length}
            </p>
            <p className="text-gold-300 mt-1">{t('activities.enrollments')}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gold">
              {filteredActivities.filter(a => a.action === 'completed_course').length}
            </p>
            <p className="text-gold-300 mt-1">{t('activities.completions')}</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
