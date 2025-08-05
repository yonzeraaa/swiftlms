'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Edit, Trash2, PlayCircle, FileText, Clock, Users, MoreVertical, CheckCircle } from 'lucide-react'
import Card from '../../components/Card'
import Button from '../../components/Button'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '../../contexts/LanguageContext'

export default function LessonsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()
  const supabase = createClient()

  useEffect(() => {
    fetchLessons()
  }, [])

  const fetchLessons = async () => {
    try {
      // Por enquanto, vamos simular dados
      setTimeout(() => {
        setLoading(false)
      }, 1000)
    } catch (error) {
      console.error('Error fetching lessons:', error)
      setLoading(false)
    }
  }

  // Dados simulados de aulas
  const lessons = [
    {
      id: 1,
      title: 'Introdução à Hidrostática',
      subject: 'Engenharia Naval Básica',
      course: 'Fundamentos de Engenharia Naval',
      type: 'video',
      duration: 45,
      students: 38,
      completions: 28,
      status: 'published'
    },
    {
      id: 2,
      title: 'Cálculo de Estabilidade',
      subject: 'Engenharia Naval Básica',
      course: 'Fundamentos de Engenharia Naval',
      type: 'text',
      duration: 30,
      students: 38,
      completions: 15,
      status: 'published'
    },
    {
      id: 3,
      title: 'Motores Diesel Marítimos',
      subject: 'Sistemas de Propulsão Marítima',
      course: 'Propulsão Naval',
      type: 'video',
      duration: 60,
      students: 25,
      completions: 20,
      status: 'published'
    },
    {
      id: 4,
      title: 'Convenção SOLAS - Capítulo 1',
      subject: 'Segurança Marítima e SOLAS',
      course: 'Normas de Segurança',
      type: 'video',
      duration: 90,
      students: 45,
      completions: 0,
      status: 'draft'
    }
  ]

  const filteredLessons = lessons.filter(lesson =>
    lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lesson.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lesson.course.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <PlayCircle className="w-4 h-4" />
      case 'text':
        return <FileText className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'video':
        return 'Vídeo'
      case 'text':
        return 'Texto'
      default:
        return type
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gold">Aulas</h1>
          <p className="text-gold-300 mt-1">Gerencie as aulas dos cursos</p>
        </div>
        <Button icon={<Plus className="w-5 h-5" />}>
          Nova Aula
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
          <input
            type="text"
            placeholder="Buscar aulas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
          />
        </div>
        <Button variant="secondary" icon={<Filter className="w-5 h-5" />}>
          Filtros
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Total de Aulas</p>
              <p className="text-2xl font-bold text-gold mt-1">{lessons.length}</p>
            </div>
            <PlayCircle className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Aulas Publicadas</p>
              <p className="text-2xl font-bold text-gold mt-1">
                {lessons.filter(l => l.status === 'published').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Tempo Total</p>
              <p className="text-2xl font-bold text-gold mt-1">
                {Math.floor(lessons.reduce((acc, l) => acc + l.duration, 0) / 60)}h
              </p>
            </div>
            <Clock className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Taxa de Conclusão</p>
              <p className="text-2xl font-bold text-gold mt-1">
                {Math.round(
                  lessons.reduce((acc, l) => acc + (l.students > 0 ? (l.completions / l.students) * 100 : 0), 0) / 
                  lessons.filter(l => l.students > 0).length
                )}%
              </p>
            </div>
            <Users className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
      </div>

      {/* Lessons List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gold-500/20">
                <th className="text-left py-3 px-4 text-gold-300 font-medium">Aula</th>
                <th className="text-left py-3 px-4 text-gold-300 font-medium">Curso / Disciplina</th>
                <th className="text-center py-3 px-4 text-gold-300 font-medium">Tipo</th>
                <th className="text-center py-3 px-4 text-gold-300 font-medium">Duração</th>
                <th className="text-center py-3 px-4 text-gold-300 font-medium">Alunos</th>
                <th className="text-center py-3 px-4 text-gold-300 font-medium">Conclusões</th>
                <th className="text-center py-3 px-4 text-gold-300 font-medium">Status</th>
                <th className="text-right py-3 px-4 text-gold-300 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredLessons.map((lesson) => (
                <tr key={lesson.id} className="border-b border-gold-500/10 hover:bg-navy-800/30 transition-colors">
                  <td className="py-4 px-4">
                    <p className="text-gold-100 font-medium">{lesson.title}</p>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <p className="text-gold-200 text-sm">{lesson.course}</p>
                      <p className="text-gold-400 text-xs mt-1">{lesson.subject}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-gold-300">
                      {getTypeIcon(lesson.type)}
                      <span className="text-sm">{getTypeLabel(lesson.type)}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-gold-200">{lesson.duration} min</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-gold-200">{lesson.students}</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-gold-200">{lesson.completions}</span>
                      <span className="text-gold-400 text-xs">
                        ({lesson.students > 0 ? Math.round((lesson.completions / lesson.students) * 100) : 0}%)
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      lesson.status === 'published' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {lesson.status === 'published' ? 'Publicada' : 'Rascunho'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 text-gold-400 hover:text-gold-200 hover:bg-navy-700/50 rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gold-400 hover:text-gold-200 hover:bg-navy-700/50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gold-400 hover:text-gold-200 hover:bg-navy-700/50 rounded-lg transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}