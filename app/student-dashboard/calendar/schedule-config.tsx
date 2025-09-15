'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Clock, MapPin, Plus, Trash2, Save } from 'lucide-react'
import Card from '@/app/components/Card'
import Button from '@/app/components/Button'
import toast from 'react-hot-toast'

interface StudentSchedule {
  id: string
  subject_id: string
  weekday: number
  start_time: string
  end_time: string
  location: string | null
  subject?: {
    name: string
    code: string
  }
}

interface Subject {
  id: string
  name: string
  code: string
}

const WEEKDAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' }
]

export default function ScheduleConfig() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [schedules, setSchedules] = useState<StudentSchedule[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [newSchedule, setNewSchedule] = useState({
    subject_id: '',
    weekday: 1,
    start_time: '',
    end_time: '',
    location: ''
  })

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Buscar horários existentes
      const { data: schedulesData } = await supabase
        .from('student_schedules')
        .select(`
          *,
          subject:subjects(name, code)
        `)
        .eq('user_id', user.id)
        .order('weekday')
        .order('start_time')

      if (schedulesData) {
        setSchedules(schedulesData as any)
      }

      // Buscar disciplinas disponíveis
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('*')
        .order('name')

      if (subjectsData) {
        setSubjects(subjectsData)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddSchedule = async () => {
    if (!newSchedule.subject_id || !newSchedule.start_time || !newSchedule.end_time) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if (newSchedule.start_time >= newSchedule.end_time) {
      toast.error('O horário de término deve ser maior que o de início')
      return
    }

    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('student_schedules')
        .insert({
          user_id: user.id,
          subject_id: newSchedule.subject_id,
          weekday: newSchedule.weekday,
          start_time: newSchedule.start_time,
          end_time: newSchedule.end_time,
          location: newSchedule.location || null
        })

      if (error) {
        if (error.message.includes('duplicate key')) {
          toast.error('Já existe um horário cadastrado para esta disciplina neste dia e horário')
        } else {
          throw error
        }
      } else {
        toast.success('Horário adicionado com sucesso!')

        // Limpar formulário
        setNewSchedule({
          subject_id: '',
          weekday: 1,
          start_time: '',
          end_time: '',
          location: ''
        })

        // Recarregar dados
        await fetchData()
      }
    } catch (error) {
      console.error('Erro ao adicionar horário:', error)
      toast.error('Erro ao adicionar horário')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Tem certeza que deseja remover este horário?')) return

    try {
      const { error } = await supabase
        .from('student_schedules')
        .delete()
        .eq('id', scheduleId)

      if (error) throw error

      toast.success('Horário removido com sucesso!')
      await fetchData()
    } catch (error) {
      console.error('Erro ao remover horário:', error)
      toast.error('Erro ao remover horário')
    }
  }

  const getSchedulesByDay = (weekday: number) => {
    return schedules
      .filter(s => s.weekday === weekday)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Formulário para Adicionar Horário */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-gold-400" />
          Adicionar Horário de Aula
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Disciplina */}
          <div>
            <label className="block text-gold-300 text-sm font-medium mb-2">
              Disciplina <span className="text-red-400">*</span>
            </label>
            <select
              value={newSchedule.subject_id}
              onChange={(e) => setNewSchedule({ ...newSchedule, subject_id: e.target.value })}
              className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/30 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              <option value="">Selecione...</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} {subject.code && `(${subject.code})`}
                </option>
              ))}
            </select>
          </div>

          {/* Dia da Semana */}
          <div>
            <label className="block text-gold-300 text-sm font-medium mb-2">
              Dia da Semana <span className="text-red-400">*</span>
            </label>
            <select
              value={newSchedule.weekday}
              onChange={(e) => setNewSchedule({ ...newSchedule, weekday: parseInt(e.target.value) })}
              className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/30 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              {WEEKDAYS.map(day => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>

          {/* Horários */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-gold-300 text-sm font-medium mb-2">
                Início <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                value={newSchedule.start_time}
                onChange={(e) => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
                className="w-full px-3 py-2 bg-navy-900/50 border border-gold-500/30 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
            <div>
              <label className="block text-gold-300 text-sm font-medium mb-2">
                Fim <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                value={newSchedule.end_time}
                onChange={(e) => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
                className="w-full px-3 py-2 bg-navy-900/50 border border-gold-500/30 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
          </div>

          {/* Local */}
          <div>
            <label className="block text-gold-300 text-sm font-medium mb-2">
              Local/Sala
            </label>
            <input
              type="text"
              value={newSchedule.location}
              onChange={(e) => setNewSchedule({ ...newSchedule, location: e.target.value })}
              className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/30 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
              placeholder="Ex: Sala 201, Lab 3"
            />
          </div>

          {/* Botão Adicionar */}
          <div className="flex items-end">
            <Button
              onClick={handleAddSchedule}
              variant="primary"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-navy-900"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Adicionar
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Grade Horária */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gold-400" />
          Minha Grade Horária
        </h3>

        {schedules.length === 0 ? (
          <p className="text-center text-gold-400 py-8">
            Você ainda não configurou seus horários de aula
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {WEEKDAYS.filter(day => getSchedulesByDay(day.value).length > 0).map(day => {
              const daySchedules = getSchedulesByDay(day.value)

              return (
                <div key={day.value} className="bg-navy-800/30 rounded-lg p-4">
                  <h4 className="font-semibold text-gold mb-3 text-center">
                    {day.label}
                  </h4>

                  <div className="space-y-2">
                    {daySchedules.map(schedule => (
                      <div
                        key={schedule.id}
                        className="p-3 bg-navy-900/50 rounded-lg border border-gold-500/20 hover:border-gold-500/40 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gold-100 text-sm">
                              {schedule.subject?.name}
                            </p>
                            {schedule.subject?.code && (
                              <p className="text-xs text-gold-400">
                                {schedule.subject.code}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2 text-xs text-gold-300">
                              <Clock className="w-3 h-3" />
                              <span>
                                {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                              </span>
                            </div>
                            {schedule.location && (
                              <div className="flex items-center gap-2 mt-1 text-xs text-gold-300">
                                <MapPin className="w-3 h-3" />
                                <span>{schedule.location}</span>
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="p-1 text-red-400 hover:text-red-300 transition-colors"
                            title="Remover horário"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}