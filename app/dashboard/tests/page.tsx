'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Edit, Trash2, FileCheck, Clock, Users, MoreVertical, AlertCircle, CheckCircle2, Eye, Copy, Download } from 'lucide-react'
import Card from '../../components/Card'
import Button from '../../components/Button'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '../../contexts/LanguageContext'
import { useRouter } from 'next/navigation'

export default function TestsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [testToDelete, setTestToDelete] = useState<any>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const { t } = useTranslation()
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchTests()
  }, [])

  const fetchTests = async () => {
    try {
      // Por enquanto, vamos simular dados
      setTimeout(() => {
        setLoading(false)
      }, 1000)
    } catch (error) {
      console.error('Error fetching tests:', error)
      setLoading(false)
    }
  }

  // Dados simulados de testes
  const tests = [
    {
      id: 1,
      title: 'Avaliação de Hidrostática',
      subject: 'Engenharia Naval Básica',
      course: 'Fundamentos de Engenharia Naval',
      questions: 20,
      duration: 60,
      attempts: 45,
      avgScore: 78,
      status: 'active',
      type: 'quiz'
    },
    {
      id: 2,
      title: 'Prova Final - Propulsão Naval',
      subject: 'Sistemas de Propulsão Marítima',
      course: 'Propulsão Naval',
      questions: 30,
      duration: 120,
      attempts: 25,
      avgScore: 82,
      status: 'active',
      type: 'exam'
    },
    {
      id: 3,
      title: 'Teste de SOLAS - Módulo 1',
      subject: 'Segurança Marítima e SOLAS',
      course: 'Normas de Segurança',
      questions: 15,
      duration: 45,
      attempts: 38,
      avgScore: 91,
      status: 'active',
      type: 'quiz'
    },
    {
      id: 4,
      title: 'Simulado de Estabilidade',
      subject: 'Engenharia Naval Básica',
      course: 'Fundamentos de Engenharia Naval',
      questions: 25,
      duration: 90,
      attempts: 0,
      avgScore: 0,
      status: 'draft',
      type: 'simulation'
    }
  ]

  const filteredTests = tests.filter(test => {
    const matchesSearch = test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.course.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === 'all' || test.type === filterType
    const matchesStatus = filterStatus === 'all' || test.status === filterStatus
    
    return matchesSearch && matchesType && matchesStatus
  })

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'quiz':
        return 'Quiz'
      case 'exam':
        return 'Prova'
      case 'simulation':
        return 'Simulado'
      default:
        return type
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'quiz':
        return 'bg-blue-500/20 text-blue-400'
      case 'exam':
        return 'bg-purple-500/20 text-purple-400'
      case 'simulation':
        return 'bg-orange-500/20 text-orange-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    return 'text-red-400'
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
          <h1 className="text-3xl font-bold text-gold">Testes</h1>
          <p className="text-gold-300 mt-1">Gerencie as avaliações e testes</p>
        </div>
        <Button 
          icon={<Plus className="w-5 h-5" />}
          onClick={() => handleCreateTest()}
        >
          Novo Teste
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
          <input
            type="text"
            placeholder="Buscar testes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
          />
        </div>
        <Button 
          variant="secondary" 
          icon={<Filter className="w-5 h-5" />}
          onClick={() => setShowFilters(!showFilters)}
        >
          Filtros
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gold-300 mb-2">Tipo</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              >
                <option value="all">Todos</option>
                <option value="quiz">Quiz</option>
                <option value="exam">Prova</option>
                <option value="simulation">Simulado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gold-300 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              >
                <option value="all">Todos</option>
                <option value="active">Ativo</option>
                <option value="draft">Rascunho</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setFilterType('all')
                  setFilterStatus('all')
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Total de Testes</p>
              <p className="text-2xl font-bold text-gold mt-1">{tests.length}</p>
            </div>
            <FileCheck className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Testes Ativos</p>
              <p className="text-2xl font-bold text-gold mt-1">
                {tests.filter(t => t.status === 'active').length}
              </p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Total de Questões</p>
              <p className="text-2xl font-bold text-gold mt-1">
                {tests.reduce((acc, t) => acc + t.questions, 0)}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Média Geral</p>
              <p className="text-2xl font-bold text-gold mt-1">
                {Math.round(
                  tests.filter(t => t.attempts > 0).reduce((acc, t) => acc + t.avgScore, 0) / 
                  tests.filter(t => t.attempts > 0).length
                )}%
              </p>
            </div>
            <Users className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
      </div>

      {/* Tests List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gold-500/20">
                <th className="text-left py-3 px-4 text-gold-300 font-medium">Teste</th>
                <th className="text-left py-3 px-4 text-gold-300 font-medium">Curso / Disciplina</th>
                <th className="text-center py-3 px-4 text-gold-300 font-medium">Tipo</th>
                <th className="text-center py-3 px-4 text-gold-300 font-medium">Questões</th>
                <th className="text-center py-3 px-4 text-gold-300 font-medium">Duração</th>
                <th className="text-center py-3 px-4 text-gold-300 font-medium">Tentativas</th>
                <th className="text-center py-3 px-4 text-gold-300 font-medium">Média</th>
                <th className="text-center py-3 px-4 text-gold-300 font-medium">Status</th>
                <th className="text-right py-3 px-4 text-gold-300 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTests.map((test) => (
                <tr key={test.id} className="border-b border-gold-500/10 hover:bg-navy-800/30 transition-colors">
                  <td className="py-4 px-4">
                    <p className="text-gold-100 font-medium">{test.title}</p>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <p className="text-gold-200 text-sm">{test.course}</p>
                      <p className="text-gold-400 text-xs mt-1">{test.subject}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(test.type)}`}>
                      {getTypeLabel(test.type)}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-gold-200">{test.questions}</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-gold-200">{test.duration} min</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-gold-200">{test.attempts}</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    {test.attempts > 0 ? (
                      <span className={`font-medium ${getScoreColor(test.avgScore)}`}>
                        {test.avgScore}%
                      </span>
                    ) : (
                      <span className="text-gold-500">-</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      test.status === 'active' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {test.status === 'active' ? 'Ativo' : 'Rascunho'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        className="p-2 text-gold-400 hover:text-gold-200 hover:bg-navy-700/50 rounded-lg transition-colors"
                        onClick={() => handleViewTest(test)}
                        title="Visualizar"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        className="p-2 text-gold-400 hover:text-gold-200 hover:bg-navy-700/50 rounded-lg transition-colors"
                        onClick={() => handleEditTest(test)}
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        className="p-2 text-gold-400 hover:text-gold-200 hover:bg-navy-700/50 rounded-lg transition-colors"
                        onClick={() => handleDuplicateTest(test)}
                        title="Duplicar"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button 
                        className="p-2 text-red-400 hover:text-red-200 hover:bg-navy-700/50 rounded-lg transition-colors"
                        onClick={() => handleDeleteTest(test)}
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && testToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-navy-800 border border-gold-500/20 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gold mb-4">Confirmar Exclusão</h3>
            <p className="text-gold-200 mb-6">
              Tem certeza que deseja excluir o teste "{testToDelete.title}"? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false)
                  setTestToDelete(null)
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={() => confirmDelete()}
              >
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Handler functions
  function handleCreateTest() {
    console.log('Criar novo teste')
    // TODO: Navegar para página de criação ou abrir modal
    alert('Funcionalidade de criar teste será implementada em breve')
  }

  function handleViewTest(test: any) {
    console.log('Visualizar teste:', test)
    // TODO: Navegar para página de visualização
    alert(`Visualizando teste: ${test.title}`)
  }

  function handleEditTest(test: any) {
    console.log('Editar teste:', test)
    // TODO: Navegar para página de edição ou abrir modal
    alert(`Editando teste: ${test.title}`)
  }

  function handleDuplicateTest(test: any) {
    console.log('Duplicar teste:', test)
    // TODO: Implementar lógica de duplicação
    alert(`Teste "${test.title}" duplicado com sucesso!`)
  }

  function handleDeleteTest(test: any) {
    setTestToDelete(test)
    setShowDeleteModal(true)
  }

  function confirmDelete() {
    if (testToDelete) {
      console.log('Excluindo teste:', testToDelete)
      // TODO: Implementar lógica de exclusão no banco
      alert(`Teste "${testToDelete.title}" excluído com sucesso!`)
      setShowDeleteModal(false)
      setTestToDelete(null)
      // Recarregar lista de testes
      fetchTests()
    }
  }
}