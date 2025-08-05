'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Edit, Trash2, Database, FileQuestion, Tag, MoreVertical, Copy, Archive } from 'lucide-react'
import Card from '../../components/Card'
import Button from '../../components/Button'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '../../contexts/LanguageContext'

export default function QuestionBankPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const { t } = useTranslation()
  const supabase = createClient()

  useEffect(() => {
    fetchQuestions()
  }, [])

  const fetchQuestions = async () => {
    try {
      // Por enquanto, vamos simular dados
      setTimeout(() => {
        setLoading(false)
      }, 1000)
    } catch (error) {
      console.error('Error fetching questions:', error)
      setLoading(false)
    }
  }

  // Dados simulados de questões
  const questions = [
    {
      id: 1,
      question: 'Qual é o princípio fundamental da flutuação de um navio?',
      type: 'multiple_choice',
      category: 'Hidrostática',
      difficulty: 'easy',
      subject: 'Engenharia Naval Básica',
      uses: 12,
      tags: ['flutuação', 'princípios básicos'],
      createdBy: 'Dr. João Silva',
      createdAt: '2024-01-15'
    },
    {
      id: 2,
      question: 'Calcule o calado de um navio com as seguintes características...',
      type: 'calculation',
      category: 'Estabilidade',
      difficulty: 'hard',
      subject: 'Engenharia Naval Básica',
      uses: 8,
      tags: ['cálculo', 'calado', 'estabilidade'],
      createdBy: 'Dr. João Silva',
      createdAt: '2024-01-20'
    },
    {
      id: 3,
      question: 'Identifique os componentes principais de um motor diesel marítimo',
      type: 'multiple_choice',
      category: 'Propulsão',
      difficulty: 'medium',
      subject: 'Sistemas de Propulsão Marítima',
      uses: 15,
      tags: ['motor diesel', 'componentes'],
      createdBy: 'Eng. Maria Santos',
      createdAt: '2024-02-05'
    },
    {
      id: 4,
      question: 'Quais são os requisitos da convenção SOLAS para equipamentos salva-vidas?',
      type: 'essay',
      category: 'Segurança',
      difficulty: 'medium',
      subject: 'Segurança Marítima e SOLAS',
      uses: 20,
      tags: ['SOLAS', 'salva-vidas', 'regulamentação'],
      createdBy: 'Cap. Pedro Oliveira',
      createdAt: '2024-02-10'
    },
    {
      id: 5,
      question: 'Verdadeiro ou Falso: A estabilidade transversal é mais crítica que a longitudinal',
      type: 'true_false',
      category: 'Estabilidade',
      difficulty: 'easy',
      subject: 'Engenharia Naval Básica',
      uses: 25,
      tags: ['estabilidade', 'conceitos'],
      createdBy: 'Dr. João Silva',
      createdAt: '2024-02-15'
    }
  ]

  const categories = ['all', 'Hidrostática', 'Estabilidade', 'Propulsão', 'Segurança']

  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         question.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         question.subject.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || question.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'multiple_choice':
        return 'Múltipla Escolha'
      case 'true_false':
        return 'V ou F'
      case 'essay':
        return 'Dissertativa'
      case 'calculation':
        return 'Cálculo'
      default:
        return type
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'multiple_choice':
        return 'bg-blue-500/20 text-blue-400'
      case 'true_false':
        return 'bg-green-500/20 text-green-400'
      case 'essay':
        return 'bg-purple-500/20 text-purple-400'
      case 'calculation':
        return 'bg-orange-500/20 text-orange-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-500/20 text-green-400'
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400'
      case 'hard':
        return 'bg-red-500/20 text-red-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'Fácil'
      case 'medium':
        return 'Médio'
      case 'hard':
        return 'Difícil'
      default:
        return difficulty
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
          <h1 className="text-3xl font-bold text-gold">Banco de Questões</h1>
          <p className="text-gold-300 mt-1">Gerencie e organize questões para testes e avaliações</p>
        </div>
        <Button icon={<Plus className="w-5 h-5" />}>
          Nova Questão
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
          <input
            type="text"
            placeholder="Buscar questões, tags ou disciplinas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
        >
          <option value="all">Todas as Categorias</option>
          {categories.slice(1).map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <Button variant="secondary" icon={<Filter className="w-5 h-5" />}>
          Filtros
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Total de Questões</p>
              <p className="text-2xl font-bold text-gold mt-1">{questions.length}</p>
            </div>
            <Database className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Categorias</p>
              <p className="text-2xl font-bold text-gold mt-1">{categories.length - 1}</p>
            </div>
            <Tag className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Uso Médio</p>
              <p className="text-2xl font-bold text-gold mt-1">
                {Math.round(questions.reduce((acc, q) => acc + q.uses, 0) / questions.length)}
              </p>
            </div>
            <FileQuestion className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Questões Ativas</p>
              <p className="text-2xl font-bold text-gold mt-1">{questions.length}</p>
            </div>
            <Archive className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
      </div>

      {/* Questions List */}
      <Card>
        <div className="space-y-4">
          {filteredQuestions.map((question) => (
            <div key={question.id} className="p-4 bg-navy-900/30 rounded-lg border border-gold-500/10 hover:border-gold-500/30 transition-colors">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <p className="text-gold-100 font-medium mb-2">{question.question}</p>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(question.type)}`}>
                      {getTypeLabel(question.type)}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                      {getDifficultyLabel(question.difficulty)}
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-navy-700/50 text-gold-300">
                      {question.category}
                    </span>
                    <span className="text-gold-400 text-xs">• {question.subject}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gold-400">
                    <span>Criado por: {question.createdBy}</span>
                    <span>•</span>
                    <span>{question.createdAt}</span>
                    <span>•</span>
                    <span>Usada {question.uses} vezes</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {question.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-navy-800/50 text-gold-300 text-xs rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gold-400 hover:text-gold-200 hover:bg-navy-700/50 rounded-lg transition-colors" title="Duplicar">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gold-400 hover:text-gold-200 hover:bg-navy-700/50 rounded-lg transition-colors" title="Editar">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gold-400 hover:text-gold-200 hover:bg-navy-700/50 rounded-lg transition-colors" title="Arquivar">
                    <Archive className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gold-400 hover:text-gold-200 hover:bg-navy-700/50 rounded-lg transition-colors" title="Mais opções">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}