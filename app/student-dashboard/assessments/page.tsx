'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  FileCheck,
  Clock,
  BookOpen,
  Users,
  Trophy,
  Play,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Filter,
  Search,
  TrendingUp,
  Target,
  Award,
  Sparkles
} from 'lucide-react'
import Card from '../../components/Card'
import Button from '../../components/Button'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import { motion } from 'framer-motion'
import ProgressRing from '../../components/ui/ProgressRing'
import { StaggerTransition, StaggerItem, FadeTransition } from '../../components/ui/PageTransition'
import ProgressChart from '../../components/ProgressChart'

type Test = Database['public']['Tables']['tests']['Row']
type Course = Database['public']['Tables']['courses']['Row']
type Enrollment = Database['public']['Tables']['enrollments']['Row']

interface TestWithDetails extends Test {
  course?: Course
  enrollment?: Enrollment
  userAttempt?: {
    id: string
    score?: number
    status: 'in_progress' | 'completed' | 'not_started'
    started_at?: string
    completed_at?: string
    time_spent?: number
  }
  questions_count: number
}

interface AssessmentStats {
  total: number
  completed: number
  inProgress: number
  notStarted: number
  averageScore: number
}

export default function AssessmentsPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [tests, setTests] = useState<TestWithDetails[]>([])
  const [filteredTests, setFilteredTests] = useState<TestWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'completed' | 'in_progress'>('all')
  const [stats, setStats] = useState<AssessmentStats>({
    total: 0,
    completed: 0,
    inProgress: 0,
    notStarted: 0,
    averageScore: 0
  })

  useEffect(() => {
    fetchAssessments()
  }, [])

  useEffect(() => {
    filterTests()
  }, [tests, searchTerm, statusFilter])

  const fetchAssessments = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/')
        return
      }

      // Buscar matrículas do usuário
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('*')
        .eq('user_id', user.id)

      if (!enrollments || enrollments.length === 0) {
        setLoading(false)
        return
      }

      const courseIds = enrollments.map(e => e.course_id)

      // Buscar testes dos cursos matriculados
      const { data: testsData } = await supabase
        .from('tests')
        .select(`
          *,
          course:courses(*)
        `)
        .in('course_id', courseIds)
        .eq('is_published', true)

      if (testsData) {
        const testsWithDetails: TestWithDetails[] = []

        for (const test of testsData) {
          // Contar questões do teste
          const { count: questionsCount } = await supabase
            .from('test_questions')
            .select('*', { count: 'exact' })
            .eq('test_id', test.id)

          // Buscar tentativa do usuário
          const { data: attempt } = await supabase
            .from('test_attempts')
            .select('*')
            .eq('test_id', test.id)
            .eq('user_id', user.id)
            .order('started_at', { ascending: false })
            .limit(1)
            .single()

          let userAttempt = undefined
          if (attempt) {
            userAttempt = {
              id: attempt.id,
              score: attempt.score || undefined,
              status: attempt.submitted_at ? ('completed' as const) : ('in_progress' as const),
              started_at: attempt.started_at || undefined,
              completed_at: attempt.submitted_at || undefined,
              time_spent: attempt.time_spent_minutes || undefined
            }
          } else {
            userAttempt = {
              id: '',
              status: 'not_started' as const
            }
          }

          const enrollment = enrollments.find(e => e.course_id === test.course_id)

          testsWithDetails.push({
            ...test,
            course: (test as any).course,
            enrollment,
            userAttempt,
            questions_count: questionsCount || 0
          })
        }

        setTests(testsWithDetails)
        calculateStats(testsWithDetails)
      }

    } catch (error) {
      console.error('Error fetching assessments:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (testsData: TestWithDetails[]) => {
    const total = testsData.length
    const completed = testsData.filter(t => t.userAttempt?.status === 'completed').length
    const inProgress = testsData.filter(t => t.userAttempt?.status === 'in_progress').length
    const notStarted = testsData.filter(t => t.userAttempt?.status === 'not_started').length
    
    const completedTests = testsData.filter(t => t.userAttempt?.status === 'completed' && t.userAttempt?.score !== null)
    const averageScore = completedTests.length > 0 
      ? completedTests.reduce((sum, t) => sum + (t.userAttempt?.score || 0), 0) / completedTests.length 
      : 0

    setStats({
      total,
      completed,
      inProgress,
      notStarted,
      averageScore: Math.round(averageScore)
    })
  }

  const filterTests = () => {
    let filtered = tests

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(test =>
        test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        test.course?.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(test => {
        switch (statusFilter) {
          case 'available':
            return test.userAttempt?.status === 'not_started'
          case 'completed':
            return test.userAttempt?.status === 'completed'
          case 'in_progress':
            return test.userAttempt?.status === 'in_progress'
          default:
            return true
        }
      })
    }

    setFilteredTests(filtered)
  }

  const startTest = async (testId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check if there's already an incomplete attempt
      const { data: existingAttempt } = await supabase
        .from('test_attempts')
        .select('*')
        .eq('test_id', testId)
        .eq('user_id', user.id)
        .is('submitted_at', null)
        .single()

      if (!existingAttempt) {
        // Create new attempt only if none exists
        const { error } = await supabase
          .from('test_attempts')
          .insert({
            test_id: testId,
            user_id: user.id,
            started_at: new Date().toISOString(),
            status: 'in_progress'
          })

        if (error) throw error
      }

      router.push(`/student-dashboard/assessments/${testId}`)
    } catch (error) {
      console.error('Error starting test:', error)
    }
  }

  const continueTest = (testId: string) => {
    router.push(`/student-dashboard/assessments/${testId}`)
  }

  const viewResults = (testId: string) => {
    router.push(`/student-dashboard/assessments/${testId}/results`)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
            <CheckCircle2 className="w-3 h-3" />
            Concluído
          </span>
        )
      case 'in_progress':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
            <Clock className="w-3 h-3" />
            Em andamento
          </span>
        )
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">
            <Play className="w-3 h-3" />
            Disponível
          </span>
        )
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'text-green-400'
      case 'medium':
        return 'text-yellow-400'
      case 'hard':
        return 'text-red-400'
      default:
        return 'text-gold-400'
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="rounded-full h-12 w-12 border-b-2 border-gold-500"
        />
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-gold-300 text-sm"
        >
          Carregando avaliações...
        </motion.p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <FadeTransition>
        <div className="flex justify-between items-start">
          <div>
            <motion.h1 
              className="text-3xl font-bold text-gold flex items-center gap-2"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              Avaliações
              <Sparkles className="w-6 h-6 text-gold-400 animate-pulse" />
            </motion.h1>
            <motion.p 
              className="text-gold-300 mt-1"
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Faça quizzes, testes e provas dos seus cursos
            </motion.p>
          </div>
        </div>
      </FadeTransition>

      {/* Stats Cards */}
      <StaggerTransition staggerDelay={0.1}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StaggerItem>
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gold-300 text-sm">Total de Avaliações</p>
                    <p className="text-2xl font-bold text-gold mt-1">{stats.total}</p>
                  </div>
                  <FileCheck className="w-8 h-8 text-gold-500/30" />
                </div>
              </Card>
            </motion.div>
          </StaggerItem>
          
          <StaggerItem>
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gold-300 text-sm">Concluídas</p>
                    <p className="text-2xl font-bold text-gold mt-1">{stats.completed}</p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-green-500/30" />
                </div>
              </Card>
            </motion.div>
          </StaggerItem>
          
          <StaggerItem>
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gold-300 text-sm">Em Andamento</p>
                    <p className="text-2xl font-bold text-gold mt-1">{stats.inProgress}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500/30" />
                </div>
              </Card>
            </motion.div>
          </StaggerItem>
          
          <StaggerItem>
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gold-300 text-sm">Nota Média</p>
                    <p className="text-2xl font-bold text-gold mt-1">{stats.averageScore}%</p>
                  </div>
                  <ProgressChart 
                    progress={stats.averageScore} 
                    size={60}
                    strokeWidth={4}
                    labelSize="sm"
                  />
                </div>
              </Card>
            </motion.div>
          </StaggerItem>
        </div>
      </StaggerTransition>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
            <input
              type="text"
              placeholder="Buscar avaliações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'all' ? 'primary' : 'secondary'}
              onClick={() => setStatusFilter('all')}
              size="sm"
            >
              Todas
            </Button>
            <Button
              variant={statusFilter === 'available' ? 'primary' : 'secondary'}
              onClick={() => setStatusFilter('available')}
              size="sm"
            >
              Disponíveis
            </Button>
            <Button
              variant={statusFilter === 'in_progress' ? 'primary' : 'secondary'}
              onClick={() => setStatusFilter('in_progress')}
              size="sm"
            >
              Em Andamento
            </Button>
            <Button
              variant={statusFilter === 'completed' ? 'primary' : 'secondary'}
              onClick={() => setStatusFilter('completed')}
              size="sm"
            >
              Concluídas
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Tests Grid */}
      <StaggerTransition staggerDelay={0.15}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTests.length > 0 ? (
            filteredTests.map((test, index) => (
              <StaggerItem key={test.id}>
                <motion.div
                  whileHover={{ y: -8, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Card className="h-full hover:shadow-xl hover:shadow-gold-500/10 transition-all">
                <div className="space-y-4">
                  {/* Test Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gold mb-2">{test.title}</h3>
                      {test.description && (
                        <p className="text-gold-300/70 text-sm mb-3">{test.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gold-300">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          {test.course?.title}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileCheck className="w-4 h-4" />
                          {test.questions_count} questões
                        </span>
                        {test.duration_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {test.duration_minutes} min
                          </span>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(test.userAttempt?.status || 'not_started')}
                  </div>

                  {/* Test Details */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      {test.passing_score && (
                        <span className="text-gold-300/70">
                          Nota mínima: {test.passing_score}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score Display */}
                  {test.userAttempt?.status === 'completed' && test.userAttempt?.score !== null && (
                    <div className="p-3 bg-navy-800/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gold-300">Sua nota:</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${
                            (test.userAttempt?.score || 0) >= (test.passing_score || 60) 
                              ? 'text-green-400' 
                              : 'text-red-400'
                          }`}>
                            {test.userAttempt?.score || 0}%
                          </span>
                          {(test.userAttempt?.score || 0) >= (test.passing_score || 60) && (
                            <Trophy className="w-4 h-4 text-gold-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    {test.userAttempt?.status === 'not_started' && (
                      <Button 
                        className="flex-1"
                        onClick={() => startTest(test.id)}
                        icon={<Play className="w-4 h-4" />}
                      >
                        Iniciar Avaliação
                      </Button>
                    )}
                    
                    {test.userAttempt?.status === 'in_progress' && (
                      <Button 
                        className="flex-1"
                        onClick={() => continueTest(test.id)}
                        icon={<TrendingUp className="w-4 h-4" />}
                      >
                        Continuar
                      </Button>
                    )}
                    
                    {test.userAttempt?.status === 'completed' && (
                      <Button 
                        className="flex-1"
                        variant="secondary"
                        onClick={() => viewResults(test.id)}
                        icon={<Award className="w-4 h-4" />}
                      >
                        Ver Resultados
                      </Button>
                    )}
                  </div>
                    </div>
                  </Card>
                </motion.div>
              </StaggerItem>
            ))
          ) : (
          <div className="col-span-2 flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <FileCheck className="w-16 h-16 text-gold-500/30 mx-auto mb-4" />
              <p className="text-gold-300 text-lg mb-2">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Nenhuma avaliação encontrada' 
                  : 'Nenhuma avaliação disponível'
                }
              </p>
              <p className="text-gold-300/70">
                {searchTerm || statusFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'As avaliações aparecerão aqui conforme você se matricular nos cursos'
                }
              </p>
            </div>
          </div>
        )}
        </div>
      </StaggerTransition>
    </div>
  )
}