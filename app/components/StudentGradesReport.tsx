'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ExcelExporter } from '@/lib/excel-export'
import Card from './Card'
import Button from './Button'
import { Download, TrendingUp, BookOpen, Target, Award, ChevronDown, ChevronUp, FileText } from 'lucide-react'
import { formatNumber } from '@/lib/reports/formatters'

interface StudentGradesReportProps {
  userId: string
  userName?: string
  showHeader?: boolean
  allowExport?: boolean
  dateRange?: {
    start: string
    end: string
  }
}

interface GradeBySubject {
  subjectId: string
  subjectName: string
  courseName: string
  totalTests: number
  testsCompleted: number
  testsMissed: number
  average: number
  highestScore: number
  lowestScore: number
  tests: Array<{
    id: string
    title: string
    score: number
    completed: boolean
    date?: string
  }>
}

export default function StudentGradesReport({
  userId,
  userName,
  showHeader = true,
  allowExport = true,
  dateRange
}: StudentGradesReportProps) {
  const [loading, setLoading] = useState(true)
  const [gradesBySubject, setGradesBySubject] = useState<GradeBySubject[]>([])
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set())
  const [overallAverage, setOverallAverage] = useState(0)
  const [totalTestsCount, setTotalTestsCount] = useState(0)
  const [completedTestsCount, setCompletedTestsCount] = useState(0)
  
  const supabase = createClient()

  useEffect(() => {
    if (userId) {
      fetchStudentGrades()
    }
  }, [userId, dateRange])

  const fetchStudentGrades = async () => {
    try {
      setLoading(true)
      
      // Buscar informações do aluno se não foi fornecido o nome
      let studentName = userName
      if (!studentName) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', userId as any)
          .single()
        
        studentName = profile?.full_name || profile?.email || 'Aluno'
      }
      
      // Buscar todos os testes ativos
      const { data: allTests, error: testsError } = await supabase
        .from('tests')
        .select('*, subjects(name), courses(title)')
        .eq('is_active', true)
      
      console.log('Tests Error:', testsError)
      
      // Buscar TODAS as tentativas do aluno (sem filtro de data)
      const { data: attempts, error: attemptsError } = await supabase
        .from('test_attempts')
        .select('*')
        .eq('user_id', userId)
      
      console.log('User ID:', userId)
      console.log('All Tests:', allTests?.length)
      console.log('Attempts:', attempts?.length)
      console.log('Attempts Error:', attemptsError)
      
      // Criar mapa de tentativas por teste
      const attemptsByTest = new Map<string, any>()
      attempts?.forEach(attempt => {
        if (!attempt.test_id) return
        const existing = attemptsByTest.get(attempt.test_id)
        if (!existing || (attempt.score || 0) > (existing.score || 0)) {
          attemptsByTest.set(attempt.test_id, attempt)
        }
      })
      
      // Agrupar testes por disciplina
      const subjectsMap = new Map<string, GradeBySubject>()
      
      console.log('Processing tests by subject...')
      
      // Contar testes sem subject_id
      const testsWithoutSubject = allTests?.filter(t => !t.subject_id) || []
      if (testsWithoutSubject.length > 0) {
        console.warn(`⚠️ ${testsWithoutSubject.length} testes sem subject_id:`, testsWithoutSubject)
      }
      
      allTests?.forEach(test => {
        console.log('Test:', test.id, test.title, 'Subject:', test.subject_id)
        
        // Se não tem subject_id, criar uma categoria "Sem Disciplina"
        const subjectKey = test.subject_id || 'no-subject'
        const attempt = attemptsByTest.get(test.id)
        const score = attempt ? (Number(attempt.score) || 0) : 0
        const completed = !!attempt
        
        if (!subjectsMap.has(subjectKey)) {
          const subjectName = test.subject_id 
            ? (test.subjects?.name || 'Disciplina não encontrada') 
            : 'Sem Disciplina Definida'
          
          subjectsMap.set(subjectKey, {
            subjectId: subjectKey,
            subjectName: subjectName,
            courseName: test.courses?.title || 'Sem curso',
            totalTests: 0,
            testsCompleted: 0,
            testsMissed: 0,
            average: 0,
            highestScore: 0,
            lowestScore: 100,
            tests: []
          })
        }
        
        const subject = subjectsMap.get(subjectKey)!
        subject.totalTests++
        
        if (completed) {
          subject.testsCompleted++
          if (score > subject.highestScore) subject.highestScore = score
          if (score < subject.lowestScore) subject.lowestScore = score
        } else {
          subject.testsMissed++
          subject.lowestScore = 0
        }
        
        subject.tests.push({
          id: test.id,
          title: test.title,
          score,
          completed,
          date: attempt?.submitted_at ? 
            new Date(attempt.submitted_at).toLocaleDateString('pt-BR') : 
            undefined
        })
      })
      
      // Calcular médias
      const subjectsArray = Array.from(subjectsMap.values())
      subjectsArray.forEach(subject => {
        const totalScore = subject.tests.reduce((sum, test) => sum + test.score, 0)
        subject.average = subject.totalTests > 0 ? totalScore / subject.totalTests : 0
      })
      
      // Calcular estatísticas gerais
      const totalTests = subjectsArray.reduce((sum, s) => sum + s.totalTests, 0)
      const completedTests = subjectsArray.reduce((sum, s) => sum + s.testsCompleted, 0)
      const avgSum = subjectsArray.reduce((sum, s) => sum + s.average, 0)
      const overall = subjectsArray.length > 0 ? avgSum / subjectsArray.length : 0
      
      setTotalTestsCount(totalTests)
      setCompletedTestsCount(completedTests)
      setOverallAverage(overall)
      setGradesBySubject(subjectsArray)
      
    } catch (error) {
      console.error('Erro ao buscar notas:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSubject = (subjectId: string) => {
    const newExpanded = new Set(expandedSubjects)
    if (newExpanded.has(subjectId)) {
      newExpanded.delete(subjectId)
    } else {
      newExpanded.add(subjectId)
    }
    setExpandedSubjects(newExpanded)
  }

  const exportToExcel = async () => {
    const exporter = new ExcelExporter()
    
    // Preparar dados para exportação
    const summaryData = gradesBySubject.map(subject => ({
      'Disciplina': subject.subjectName,
      'Curso': subject.courseName,
      'Total de Testes': subject.totalTests,
      'Testes Realizados': subject.testsCompleted,
      'Testes Não Realizados': subject.testsMissed,
      'Média': Number(subject.average.toFixed(1)),
      'Maior Nota': subject.highestScore,
      'Menor Nota': subject.lowestScore
    }))
    
    const detailsData: any[] = []
    gradesBySubject.forEach(subject => {
      subject.tests.forEach(test => {
        detailsData.push({
          'Disciplina': subject.subjectName,
          'Teste': test.title,
          'Nota': test.score,
          'Status': test.completed ? 'Realizado' : 'Não Realizado',
          'Data': test.date || '-'
        })
      })
    })
    
    // Adicionar aba de resumo
    exporter.addDataSheet('Resumo por Disciplina', {
      title: `Histórico de Notas - ${userName || 'Aluno'}`,
      headers: Object.keys(summaryData[0] || {}),
      data: summaryData.map(row => Object.values(row)),
      metadata: {
        date: new Date().toLocaleDateString('pt-BR'),
        user: userName || 'Aluno'
      },
      formatting: {
        conditionalFormatting: [
          {
            condition: (value) => typeof value === 'number' && value < 70,
            font: { bold: true, color: '#FF0000' }
          }
        ],
        columns: {
          5: { // Coluna de Média
            condition: (value) => typeof value === 'number' && value < 70,
            font: { bold: true, color: '#FF0000' }
          }
        }
      }
    })
    
    // Adicionar aba de detalhes
    exporter.addDataSheet('Detalhamento', {
      title: 'Detalhamento de Testes',
      headers: Object.keys(detailsData[0] || {}),
      data: detailsData.map(row => Object.values(row)),
      formatting: {
        conditionalFormatting: [
          {
            condition: (value) => typeof value === 'number' && value < 70,
            font: { bold: true, color: '#FF0000' }
          },
          {
            condition: (value) => value === 'Não Realizado',
            font: { color: '#808080' }
          }
        ]
      }
    })
    
    // Adicionar estatísticas
    exporter.addSummarySheet('Estatísticas', {
      title: 'Estatísticas Gerais',
      sections: [
        {
          sectionTitle: 'Resumo',
          metrics: [
            { label: 'Média Geral', value: overallAverage.toFixed(1) },
            { label: 'Total de Testes', value: totalTestsCount },
            { label: 'Testes Realizados', value: completedTestsCount },
            { label: 'Testes Não Realizados', value: totalTestsCount - completedTestsCount },
            { label: 'Taxa de Participação', value: `${((completedTestsCount / totalTestsCount) * 100).toFixed(1)}%` }
          ]
        }
      ]
    })
    
    const fileName = `notas_${userName?.replace(/\s+/g, '_').toLowerCase() || 'aluno'}_${new Date().toISOString().split('T')[0]}.xlsx`
    exporter.download(fileName)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-navy-800/50 rounded-xl animate-pulse" />
        <div className="h-24 bg-navy-800/50 rounded-xl animate-pulse" />
        <div className="h-24 bg-navy-800/50 rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gold flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Histórico de Notas
            </h2>
            {userName && (
              <p className="text-gold-300 mt-1">Aluno: {userName}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Botão de Exportar - sempre visível se allowExport for true */}
      {allowExport && !showHeader && (
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="sm"
            icon={<Download className="w-4 h-4" />}
            onClick={exportToExcel}
          >
            Exportar Excel
          </Button>
        </div>
      )}
      
      {/* Se showHeader e allowExport, mostrar botão junto com header */}
      {showHeader && allowExport && (
        <div className="flex justify-end -mt-12">
          <Button
            variant="primary"
            size="sm"
            icon={<Download className="w-4 h-4" />}
            onClick={exportToExcel}
          >
            Exportar Excel
          </Button>
        </div>
      )}
      
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-navy-800/50 to-navy-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-400 text-sm">Média Geral</p>
              <p className={`text-3xl font-bold ${overallAverage >= 70 ? 'text-gold' : 'text-red-500'}`}>
                {overallAverage.toFixed(1)}
              </p>
            </div>
            <TrendingUp className={`w-8 h-8 ${overallAverage >= 70 ? 'text-gold-500' : 'text-red-500'}`} />
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-navy-800/50 to-navy-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-400 text-sm">Total de Testes</p>
              <p className="text-3xl font-bold text-gold">{totalTestsCount}</p>
            </div>
            <BookOpen className="w-8 h-8 text-gold-500" />
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-navy-800/50 to-navy-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-400 text-sm">Realizados</p>
              <p className="text-3xl font-bold text-green-500">{completedTestsCount}</p>
            </div>
            <Target className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-navy-800/50 to-navy-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-400 text-sm">Taxa de Participação</p>
              <p className="text-3xl font-bold text-gold">
                {totalTestsCount > 0 ? Math.round((completedTestsCount / totalTestsCount) * 100) : 0}%
              </p>
            </div>
            <Award className="w-8 h-8 text-gold-500" />
          </div>
        </Card>
      </div>
      
      {/* Lista de Disciplinas */}
      <div className="space-y-4">
        {gradesBySubject.map(subject => (
          <Card key={subject.subjectId} className="overflow-hidden">
            <div 
              className="p-6 cursor-pointer hover:bg-navy-800/30 transition-colors"
              onClick={() => toggleSubject(subject.subjectId)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gold">{subject.subjectName}</h3>
                  <p className="text-sm text-gold-400 mt-1">{subject.courseName}</p>
                  
                  <div className="flex items-center gap-6 mt-3">
                    <div>
                      <span className="text-gold-500 text-sm">Média: </span>
                      <span className={`font-bold text-lg ${subject.average >= 70 ? 'text-gold' : 'text-red-500'}`}>
                        {subject.average.toFixed(1)}
                      </span>
                    </div>
                    
                    <div>
                      <span className="text-gold-500 text-sm">Progresso: </span>
                      <span className="text-gold-200">
                        {subject.testsCompleted}/{subject.totalTests} testes
                      </span>
                    </div>
                  </div>
                  
                  {/* Barra de Progresso */}
                  <div className="mt-3 bg-navy-900/50 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-gold-500 to-gold-600 transition-all duration-500"
                      style={{ width: `${(subject.testsCompleted / subject.totalTests) * 100}%` }}
                    />
                  </div>
                </div>
                
                <div className="ml-4">
                  {expandedSubjects.has(subject.subjectId) ? (
                    <ChevronUp className="w-5 h-5 text-gold-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gold-400" />
                  )}
                </div>
              </div>
            </div>
            
            {/* Detalhes Expandidos */}
            {expandedSubjects.has(subject.subjectId) && (
              <div className="border-t border-gold-500/20 p-6 bg-navy-900/30">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-gold-500 text-sm">Maior Nota</p>
                    <p className="text-2xl font-bold text-green-500">{subject.highestScore}</p>
                  </div>
                  <div>
                    <p className="text-gold-500 text-sm">Menor Nota</p>
                    <p className={`text-2xl font-bold ${subject.lowestScore >= 70 ? 'text-gold' : 'text-red-500'}`}>
                      {subject.lowestScore}
                    </p>
                  </div>
                  <div>
                    <p className="text-gold-500 text-sm">Não Realizados</p>
                    <p className="text-2xl font-bold text-orange-500">{subject.testsMissed}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-gold-400 font-medium mb-2">Detalhamento dos Testes:</p>
                  {subject.tests.map(test => (
                    <div 
                      key={test.id}
                      className={`flex justify-between items-center p-3 rounded-lg ${
                        test.completed ? 'bg-navy-800/50' : 'bg-navy-900/50'
                      }`}
                    >
                      <div className="flex-1">
                        <p className={`font-medium ${test.completed ? 'text-gold-200' : 'text-gold-600'}`}>
                          {test.title}
                        </p>
                        {test.date && (
                          <p className="text-xs text-gold-500 mt-1">Data: {test.date}</p>
                        )}
                      </div>
                      <div className="ml-4">
                        {test.completed ? (
                          <span className={`font-bold text-lg ${test.score >= 70 ? 'text-gold' : 'text-red-500'}`}>
                            {test.score}
                          </span>
                        ) : (
                          <span className="text-gold-600 text-sm">Não Realizado</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
      
      {gradesBySubject.length === 0 && (
        <Card className="text-center py-12">
          <p className="text-gold-400">Nenhum teste encontrado para este aluno.</p>
        </Card>
      )}
    </div>
  )
}