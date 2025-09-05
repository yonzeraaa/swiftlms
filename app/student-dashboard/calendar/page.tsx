'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, Clock, BookOpen, FileText, Award, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react'
import Spinner from '../../components/ui/Spinner'
import Card from '../../components/Card'
import Breadcrumbs from '../../components/ui/Breadcrumbs'
import Button from '../../components/Button'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import { useRouter } from 'next/navigation'

type Test = Database['public']['Tables']['tests']['Row']
type Course = Database['public']['Tables']['courses']['Row']
type Enrollment = Database['public']['Tables']['enrollments']['Row']

interface CalendarEvent {
  id: string
  title: string
  description?: string
  date: Date
  type: 'test' | 'lesson' | 'deadline' | 'live_class'
  courseId?: string
  courseName?: string
  color: string
  icon: React.ReactNode
  time?: string
  duration?: number
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export default function CalendarPage() {
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [filter, setFilter] = useState<'all' | 'test' | 'lesson' | 'deadline' | 'live_class'>('all')
  const [enrolledCourses, setEnrolledCourses] = useState<Array<Course & { enrollment: Enrollment }>>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchCalendarData()
  }, [])

  const fetchCalendarData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      // Fetch enrolled courses
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
          *,
          course:courses(*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')

      if (enrollments) {
        const coursesWithEnrollment = enrollments
          .filter((e: any) => e.course)
          .map((e: any) => ({ ...e.course, enrollment: e } as Course & { enrollment: Enrollment }))
        setEnrolledCourses(coursesWithEnrollment)

        // Fetch tests for enrolled courses
        const courseIds = coursesWithEnrollment.map((c: any) => c.id)
        const { data: tests } = await supabase
          .from('tests')
          .select('*')
          .in('course_id', courseIds)
          .eq('is_published', true)

        const calendarEvents: CalendarEvent[] = []

        // Tests have been removed from the system
        // Test events are no longer available

        // Note: Real lesson scheduling would require adding scheduled_for field to lessons table
        // For now, calendar shows only test events and deadlines

        setEvents(calendarEvents)
      }
    } catch (error) {
      console.error('Error fetching calendar data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    
    return days
  }

  const getEventsForDate = (date: Date) => {
    return events.filter((event: any) => {
      const eventDate = new Date(event.date)
      return eventDate.getDate() === date.getDate() &&
             eventDate.getMonth() === date.getMonth() &&
             eventDate.getFullYear() === date.getFullYear() &&
             (filter === 'all' || event.type === filter)
    })
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth)
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1)
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1)
    }
    setCurrentMonth(newMonth)
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear()
  }

  const isSelected = (date: Date) => {
    return date.getDate() === selectedDate.getDate() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getFullYear() === selectedDate.getFullYear()
  }

  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter((e: any) => e.type === filter)

  const upcomingEvents = filteredEvents
    .filter((e: any) => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5)

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
        <h1 className="text-3xl font-bold text-gold flex items-center gap-2">
          <CalendarIcon className="w-8 h-8 text-gold-400" />
          Calendário Acadêmico
        </h1>
        <p className="text-gold-300 mt-1">Acompanhe suas aulas, testes e prazos importantes</p>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filter === 'all' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          Todos
        </Button>
        <Button
          variant={filter === 'live_class' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilter('live_class')}
          icon={<BookOpen className="w-4 h-4" />}
        >
          Aulas
        </Button>
        <Button
          variant={filter === 'test' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilter('test')}
          icon={<FileText className="w-4 h-4" />}
        >
          Testes
        </Button>
        <Button
          variant={filter === 'deadline' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilter('deadline')}
          icon={<Clock className="w-4 h-4" />}
        >
          Prazos
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card>
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gold">
                {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentMonth(new Date())}
                >
                  Hoje
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth('next')}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {WEEKDAYS.map((day: any) => (
                <div key={day} className="text-center text-sm font-semibold text-gold-400 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {getDaysInMonth(currentMonth).map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="aspect-square" />
                }

                const dayEvents = getEventsForDate(date)
                const hasEvents = dayEvents.length > 0

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    className={`
                      aspect-square p-2 rounded-lg border transition-all
                      ${isToday(date) 
                        ? 'border-gold-500 bg-gold-500/10' 
                        : 'border-gold-500/20 hover:border-gold-500/40'
                      }
                      ${isSelected(date) 
                        ? 'bg-navy-700 border-gold-400' 
                        : 'bg-navy-800/50 hover:bg-navy-800'
                      }
                    `}
                  >
                    <div className="h-full flex flex-col">
                      <span className={`text-sm ${isToday(date) ? 'text-gold font-bold' : 'text-gold-300'}`}>
                        {date.getDate()}
                      </span>
                      {hasEvents && (
                        <div className="flex-1 flex flex-col justify-end gap-1 mt-1">
                          {dayEvents.slice(0, 3).map((event, i) => (
                            <div
                              key={i}
                              className={`h-1 rounded-full ${event.color}`}
                              title={event.title}
                            />
                          ))}
                          {dayEvents.length > 3 && (
                            <span className="text-xs text-gold-400">+{dayEvents.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Selected Date Events */}
            {selectedDate && (
              <div className="mt-6 pt-6 border-t border-gold-500/20">
                <h3 className="text-lg font-semibold text-gold mb-4">
                  Eventos em {selectedDate.toLocaleDateString('pt-BR', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </h3>
                <div className="space-y-2">
                  {getEventsForDate(selectedDate).length > 0 ? (
                    getEventsForDate(selectedDate).map((event: any) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 p-3 bg-navy-900/50 rounded-lg hover:bg-navy-900/70 transition-colors cursor-pointer"
                        onClick={() => setSelectedEvent(event)}
                      >
                        <div className={`p-2 rounded-lg ${event.color}/20`}>
                          {event.icon}
                        </div>
                        <div className="flex-1">
                          <p className="text-gold-200 font-medium">{event.title}</p>
                          {event.courseName && (
                            <p className="text-gold-400 text-sm">{event.courseName}</p>
                          )}
                          {event.time && (
                            <p className="text-gold-500 text-sm mt-1">
                              {event.time} {event.duration && `(${event.duration} min)`}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gold-400 text-center py-4">Nenhum evento neste dia</p>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Upcoming Events Sidebar */}
        <div className="space-y-6">
          <Card title="Próximos Eventos" subtitle="Nos próximos 30 dias">
            <div className="space-y-3">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event: any) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 bg-navy-900/50 rounded-lg hover:bg-navy-900/70 transition-colors cursor-pointer"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className={`p-2 rounded-lg ${event.color}/20 flex-shrink-0`}>
                      {event.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gold-200 font-medium text-sm truncate">{event.title}</p>
                      <p className="text-gold-400 text-xs mt-1">
                        {event.date.toLocaleDateString('pt-BR', { 
                          day: 'numeric', 
                          month: 'short' 
                        })}
                        {event.time && ` - ${event.time}`}
                      </p>
                      {event.courseName && (
                        <p className="text-gold-500 text-xs truncate">{event.courseName}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gold-400 text-center py-4">Nenhum evento próximo</p>
              )}
            </div>
          </Card>

          {/* Stats */}
          <Card title="Resumo do Mês">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gold-300">Total de Eventos</span>
                <span className="text-gold font-bold">{filteredEvents.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gold-300">Aulas Agendadas</span>
                <span className="text-gold font-bold">
                  {filteredEvents.filter((e: any) => e.type === 'live_class').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gold-300">Testes</span>
                <span className="text-gold font-bold">
                  {filteredEvents.filter((e: any) => e.type === 'test').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gold-300">Prazos</span>
                <span className="text-gold font-bold">
                  {filteredEvents.filter((e: any) => e.type === 'deadline').length}
                </span>
              </div>
            </div>
          </Card>

          {/* Legend */}
          <Card title="Legenda">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-gold-300 text-sm">Aulas ao Vivo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-gold-300 text-sm">Testes</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-gold-300 text-sm">Prazos</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gold">{selectedEvent.title}</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gold-400 hover:text-gold-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {selectedEvent.description && (
              <p className="text-gold-300 mb-4">{selectedEvent.description}</p>
            )}
            
            <div className="space-y-2">
              {selectedEvent.courseName && (
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-gold-500" />
                  <span className="text-gold-200">{selectedEvent.courseName}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-gold-500" />
                <span className="text-gold-200">
                  {selectedEvent.date.toLocaleDateString('pt-BR', { 
                    weekday: 'long',
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </span>
              </div>
              {selectedEvent.time && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gold-500" />
                  <span className="text-gold-200">
                    {selectedEvent.time}
                    {selectedEvent.duration && ` - Duração: ${selectedEvent.duration} minutos`}
                  </span>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedEvent(null)}
                className="flex-1"
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
