'use client'

import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, Clock, BookOpen, FileText, ChevronLeft, ChevronRight, X } from 'lucide-react'
import Spinner from '../../components/ui/Spinner'
import { ClassicRule } from '../../components/ui/RenaissanceSvgs'
import { Database } from '@/lib/database.types'
import { useRouter } from 'next/navigation'
import { getCalendarData } from '@/lib/actions/browse-enroll'

const INK = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'
const PARCH = '#faf6ee'
const BORDER = 'rgba(30,19,12,0.14)'

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

  useEffect(() => {
    fetchCalendarData()
  }, [])

  const fetchCalendarData = async () => {
    try {
      const data = await getCalendarData()

      if (!data) {
        router.push('/')
        return
      }

      const { enrollments, tests } = data

      if (enrollments) {
        const coursesWithEnrollment = enrollments
          .filter((e: any) => e.course)
          .map((e: any) => ({ ...e.course, enrollment: e } as Course & { enrollment: Enrollment }))
        setEnrolledCourses(coursesWithEnrollment)

        const calendarEvents: CalendarEvent[] = []
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

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

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
    <div className="flex flex-col w-full">

      {/* ── Cabeçalho ── */}
      <div className="text-center flex flex-col items-center mb-12">
        <h1
          style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: 700,
            color: INK,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            marginBottom: '0.5rem'
          }}
        >
          Calendário Acadêmico
        </h1>
        <p
          style={{
            fontFamily: 'var(--var(--font-lora))',
            fontSize: '1.1rem',
            fontStyle: 'italic',
            color: MUTED,
            marginBottom: '2rem'
          }}
        >
          Acompanhe suas aulas, testes e prazos importantes
        </p>
        <ClassicRule style={{ width: '100%', maxWidth: '300px', color: INK }} />
      </div>

      {/* ── Filtros ── */}
      <div className="flex gap-3 flex-wrap mb-8">
        {[
          { key: 'all', label: 'Todos' },
          { key: 'live_class', label: 'Aulas', icon: BookOpen },
          { key: 'test', label: 'Testes', icon: FileText },
          { key: 'deadline', label: 'Prazos', icon: Clock },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            className="px-4 py-2 rounded-sm text-sm font-medium transition-all"
            style={{
              fontFamily: 'var(--font-lora)',
              backgroundColor: filter === key ? ACCENT : 'transparent',
              color: filter === key ? PARCH : MUTED,
              border: `1px solid ${filter === key ? ACCENT : BORDER}`,
              cursor: 'pointer',
            }}
          >
            <span className="flex items-center gap-2">
              {Icon && <Icon size={14} />}
              {label}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Calendário ── */}
        <div className="lg:col-span-2">
          <div className="p-6 rounded-lg" style={{ backgroundColor: PARCH, border: `1px solid ${BORDER}`, boxShadow: '0 2px 8px rgba(30,19,12,0.06)' }}>

            {/* Navegação do Mês */}
            <div className="flex items-center justify-between mb-6">
              <h2
                style={{
                  fontFamily: 'var(--font-playfair)',
                  fontSize: '1.3rem',
                  fontWeight: 600,
                  color: INK,
                }}
              >
                {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-2 rounded-sm transition-all hover:bg-black/5"
                  style={{ color: MUTED, border: `1px solid ${BORDER}`, backgroundColor: 'transparent', cursor: 'pointer' }}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date())}
                  className="px-3 py-2 rounded-sm text-sm transition-all hover:bg-black/5"
                  style={{
                    fontFamily: 'var(--font-lora)',
                    color: MUTED,
                    border: `1px solid ${BORDER}`,
                    backgroundColor: 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  Hoje
                </button>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-2 rounded-sm transition-all hover:bg-black/5"
                  style={{ color: MUTED, border: `1px solid ${BORDER}`, backgroundColor: 'transparent', cursor: 'pointer' }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Dias da Semana */}
            <div className="grid grid-cols-7 gap-2 mb-3">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="text-center py-2"
                  style={{
                    fontFamily: 'var(--font-lora)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: MUTED,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                  }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Dias do Mês */}
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
                    className="aspect-square p-2 rounded-sm border transition-all"
                    style={{
                      borderColor: isToday(date) ? ACCENT : BORDER,
                      backgroundColor: isSelected(date) ? `${ACCENT}15` : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-playfair)',
                        fontSize: '0.95rem',
                        fontWeight: isToday(date) ? 700 : 400,
                        color: isToday(date) ? ACCENT : INK,
                      }}
                    >
                      {date.getDate()}
                    </span>
                    {hasEvents && (
                      <div className="flex justify-center gap-1 mt-1">
                        {dayEvents.slice(0, 3).map((event, i) => (
                          <div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: event.color }}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Eventos do Dia Selecionado */}
            {selectedDate && (
              <div className="mt-6 pt-6 border-t" style={{ borderColor: BORDER }}>
                <h3
                  style={{
                    fontFamily: 'var(--font-playfair)',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    color: INK,
                    marginBottom: '1rem'
                  }}
                >
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
                        className="flex items-start gap-3 p-3 rounded-sm cursor-pointer transition-all"
                        style={{ backgroundColor: `${INK}/5`, border: `1px solid ${BORDER}` }}
                        onClick={() => setSelectedEvent(event)}
                      >
                        <div
                          className="p-2 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: `${event.color}20` }}
                        >
                          {event.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p style={{ fontFamily: 'var(--font-lora)', fontSize: '0.95rem', color: INK, fontWeight: 500 }}>
                            {event.title}
                          </p>
                          {event.courseName && (
                            <p style={{ fontFamily: 'var(--font-lora)', fontSize: '0.8rem', color: MUTED }}>
                              {event.courseName}
                            </p>
                          )}
                          {event.time && (
                            <p style={{ fontFamily: 'var(--font-lora)', fontSize: '0.8rem', color: ACCENT, marginTop: '0.25rem' }}>
                              {event.time} {event.duration && `(${event.duration} min)`}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={{ fontFamily: 'var(--font-lora)', fontSize: '0.95rem', color: MUTED, fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>
                      Nenhum evento neste dia
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-6">

          {/* Próximos Eventos */}
          <div className="p-5 rounded-lg" style={{ backgroundColor: PARCH, border: `1px solid ${BORDER}`, boxShadow: '0 2px 8px rgba(30,19,12,0.06)' }}>
            <h3
              style={{
                fontFamily: 'var(--font-playfair)',
                fontSize: '1.1rem',
                fontWeight: 600,
                color: INK,
                marginBottom: '0.25rem'
              }}
            >
              Próximos Eventos
            </h3>
            <p style={{ fontFamily: 'var(--font-lora)', fontSize: '0.8rem', color: MUTED, marginBottom: '1rem' }}>
              Nos próximos 30 dias
            </p>
            <ClassicRule style={{ marginBottom: '1rem', color: BORDER }} />

            <div className="space-y-3">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event: any) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 rounded-sm cursor-pointer transition-all"
                    style={{ backgroundColor: `${INK}/3` }}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div
                      className="p-2 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: `${event.color}20` }}
                    >
                      {event.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        style={{
                          fontFamily: 'var(--font-lora)',
                          fontSize: '0.9rem',
                          color: INK,
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {event.title}
                      </p>
                      <p style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', color: MUTED, marginTop: '0.25rem' }}>
                        {event.date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                        {event.time && ` - ${event.time}`}
                      </p>
                      {event.courseName && (
                        <p style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', color: ACCENT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {event.courseName}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ fontFamily: 'var(--font-lora)', fontSize: '0.9rem', color: MUTED, fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>
                  Nenhum evento próximo
                </p>
              )}
            </div>
          </div>

          {/* Resumo do Mês */}
          <div className="p-5 rounded-lg" style={{ backgroundColor: PARCH, border: `1px solid ${BORDER}`, boxShadow: '0 2px 8px rgba(30,19,12,0.06)' }}>
            <h3
              style={{
                fontFamily: 'var(--font-playfair)',
                fontSize: '1.1rem',
                fontWeight: 600,
                color: INK,
                marginBottom: '1rem'
              }}
            >
              Resumo do Mês
            </h3>
            <ClassicRule style={{ marginBottom: '1rem', color: BORDER }} />

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span style={{ fontFamily: 'var(--font-lora)', fontSize: '0.9rem', color: MUTED }}>Total de Eventos</span>
                <span style={{ fontFamily: 'var(--font-playfair)', fontSize: '1rem', fontWeight: 700, color: INK }}>{filteredEvents.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ fontFamily: 'var(--font-lora)', fontSize: '0.9rem', color: MUTED }}>Aulas Agendadas</span>
                <span style={{ fontFamily: 'var(--font-playfair)', fontSize: '1rem', fontWeight: 700, color: INK }}>
                  {filteredEvents.filter((e: any) => e.type === 'live_class').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ fontFamily: 'var(--font-lora)', fontSize: '0.9rem', color: MUTED }}>Testes</span>
                <span style={{ fontFamily: 'var(--font-playfair)', fontSize: '1rem', fontWeight: 700, color: INK }}>
                  {filteredEvents.filter((e: any) => e.type === 'test').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ fontFamily: 'var(--font-lora)', fontSize: '0.9rem', color: MUTED }}>Prazos</span>
                <span style={{ fontFamily: 'var(--font-playfair)', fontSize: '1rem', fontWeight: 700, color: INK }}>
                  {filteredEvents.filter((e: any) => e.type === 'deadline').length}
                </span>
              </div>
            </div>
          </div>

          {/* Legenda */}
          <div className="p-5 rounded-lg" style={{ backgroundColor: PARCH, border: `1px solid ${BORDER}`, boxShadow: '0 2px 8px rgba(30,19,12,0.06)' }}>
            <h3
              style={{
                fontFamily: 'var(--font-playfair)',
                fontSize: '1.1rem',
                fontWeight: 600,
                color: INK,
                marginBottom: '1rem'
              }}
            >
              Legenda
            </h3>
            <ClassicRule style={{ marginBottom: '1rem', color: BORDER }} />

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#2563eb' }} />
                <span style={{ fontFamily: 'var(--font-lora)', fontSize: '0.85rem', color: MUTED }}>Aulas ao Vivo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#7c3aed' }} />
                <span style={{ fontFamily: 'var(--font-lora)', fontSize: '0.85rem', color: MUTED }}>Testes</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ca8a04' }} />
                <span style={{ fontFamily: 'var(--font-lora)', fontSize: '0.85rem', color: MUTED }}>Prazos</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal de Detalhes ── */}
      {selectedEvent && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(30,19,12,0.6)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="max-w-md w-full p-6 rounded-lg"
            style={{ backgroundColor: PARCH, border: `1px solid ${BORDER}`, boxShadow: '0 8px 32px rgba(30,19,12,0.2)' }}
          >
            <div className="flex justify-between items-start mb-4">
              <h3
                style={{
                  fontFamily: 'var(--font-playfair)',
                  fontSize: '1.3rem',
                  fontWeight: 600,
                  color: INK,
                }}
              >
                {selectedEvent.title}
              </h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-sm transition-all hover:bg-black/5"
                style={{ color: MUTED, cursor: 'pointer', backgroundColor: 'transparent', border: 'none' }}
              >
                <X size={20} />
              </button>
            </div>

            {selectedEvent.description && (
              <p style={{ fontFamily: 'var(--font-lora)', fontSize: '0.95rem', color: MUTED, marginBottom: '1rem' }}>
                {selectedEvent.description}
              </p>
            )}

            <div className="space-y-2">
              {selectedEvent.courseName && (
                <div className="flex items-center gap-2">
                  <BookOpen size={16} style={{ color: ACCENT }} />
                  <span style={{ fontFamily: 'var(--font-lora)', fontSize: '0.9rem', color: INK }}>{selectedEvent.courseName}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <CalendarIcon size={16} style={{ color: ACCENT }} />
                <span style={{ fontFamily: 'var(--font-lora)', fontSize: '0.9rem', color: INK }}>
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
                  <Clock size={16} style={{ color: ACCENT }} />
                  <span style={{ fontFamily: 'var(--font-lora)', fontSize: '0.9rem', color: INK }}>
                    {selectedEvent.time}
                    {selectedEvent.duration && ` - Duração: ${selectedEvent.duration} minutos`}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-5 py-2 rounded-sm text-sm font-medium transition-all"
                style={{
                  fontFamily: 'var(--font-lora)',
                  backgroundColor: ACCENT,
                  color: PARCH,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
