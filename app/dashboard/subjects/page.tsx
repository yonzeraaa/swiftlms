'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Edit, Trash2, BookOpen, Clock, Users, MoreVertical } from 'lucide-react'
import Card from '../../components/Card'
import Button from '../../components/Button'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '../../contexts/LanguageContext'

export default function SubjectsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()
  const supabase = createClient()

  useEffect(() => {
    fetchSubjects()
  }, [])

  const fetchSubjects = async () => {
    try {
      // Por enquanto, vamos simular dados
      setTimeout(() => {
        setLoading(false)
      }, 1000)
    } catch (error) {
      console.error('Error fetching subjects:', error)
      setLoading(false)
    }
  }

  // Dados simulados de disciplinas
  const subjects = [
    {
      id: 1,
      name: 'Engenharia Naval Básica',
      code: 'EN101',
      description: 'Fundamentos de engenharia naval, incluindo hidrostática e estabilidade',
      courses: 3,
      totalHours: 120,
      students: 45,
      instructor: 'Dr. João Silva'
    },
    {
      id: 2,
      name: 'Sistemas de Propulsão Marítima',
      code: 'SP201',
      description: 'Estudo de motores marítimos e sistemas de propulsão',
      courses: 2,
      totalHours: 80,
      students: 32,
      instructor: 'Eng. Maria Santos'
    },
    {
      id: 3,
      name: 'Segurança Marítima e SOLAS',
      code: 'SM301',
      description: 'Normas internacionais de segurança marítima e convenção SOLAS',
      courses: 4,
      totalHours: 160,
      students: 58,
      instructor: 'Cap. Pedro Oliveira'
    }
  ]

  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subject.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subject.instructor.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
          <h1 className="text-3xl font-bold text-gold">Disciplinas</h1>
          <p className="text-gold-300 mt-1">Gerencie as disciplinas da plataforma</p>
        </div>
        <Button icon={<Plus className="w-5 h-5" />}>
          Nova Disciplina
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
          <input
            type="text"
            placeholder="Buscar disciplinas..."
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
              <p className="text-gold-300 text-sm">Total de Disciplinas</p>
              <p className="text-2xl font-bold text-gold mt-1">{subjects.length}</p>
            </div>
            <BookOpen className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Total de Cursos</p>
              <p className="text-2xl font-bold text-gold mt-1">
                {subjects.reduce((acc, subj) => acc + subj.courses, 0)}
              </p>
            </div>
            <BookOpen className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Horas Totais</p>
              <p className="text-2xl font-bold text-gold mt-1">
                {subjects.reduce((acc, subj) => acc + subj.totalHours, 0)}
              </p>
            </div>
            <Clock className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Alunos Matriculados</p>
              <p className="text-2xl font-bold text-gold mt-1">
                {subjects.reduce((acc, subj) => acc + subj.students, 0)}
              </p>
            </div>
            <Users className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
      </div>

      {/* Subjects List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gold-500/20">
                <th className="text-left py-3 px-4 text-gold-300 font-medium">Código</th>
                <th className="text-left py-3 px-4 text-gold-300 font-medium">Disciplina</th>
                <th className="text-left py-3 px-4 text-gold-300 font-medium">Instrutor</th>
                <th className="text-center py-3 px-4 text-gold-300 font-medium">Cursos</th>
                <th className="text-center py-3 px-4 text-gold-300 font-medium">Alunos</th>
                <th className="text-center py-3 px-4 text-gold-300 font-medium">Carga Horária</th>
                <th className="text-right py-3 px-4 text-gold-300 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.map((subject) => (
                <tr key={subject.id} className="border-b border-gold-500/10 hover:bg-navy-800/30 transition-colors">
                  <td className="py-4 px-4">
                    <span className="text-gold font-medium">{subject.code}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <p className="text-gold-100 font-medium">{subject.name}</p>
                      <p className="text-gold-400 text-sm mt-1">{subject.description}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-gold-200">{subject.instructor}</p>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-gold-200">{subject.courses}</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-gold-200">{subject.students}</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-gold-200">{subject.totalHours}h</span>
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