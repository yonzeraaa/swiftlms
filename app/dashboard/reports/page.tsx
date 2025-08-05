'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Download, Calendar, TrendingUp, FileText, Filter, FileSpreadsheet, Users, BookOpen, Award, GraduationCap, Activity } from 'lucide-react'
import Card from '../../components/Card'
import Button from '../../components/Button'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import { useTranslation } from '../../contexts/LanguageContext'

type Profile = Database['public']['Tables']['profiles']['Row']
type Course = Database['public']['Tables']['courses']['Row']
type Enrollment = Database['public']['Tables']['enrollments']['Row']

interface ReportData {
  totalStudents: number
  totalInstructors: number
  totalCourses: number
  totalEnrollments: number
  completedCourses: number
  averageCompletionRate: number
  activeStudents: number
  coursesPerCategory: { category: string; count: number }[]
  enrollmentsByMonth: { month: string; count: number }[]
  topCourses: { title: string; enrollments: number }[]
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [generatingReport, setGeneratingReport] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const supabase = createClient()

  useEffect(() => {
    fetchReportData()
  }, [dateRange])

  const fetchReportData = async () => {
    try {
      setLoading(true)

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')

      const students = profiles?.filter(p => p.role === 'student') || []
      const instructors = profiles?.filter(p => p.role === 'instructor') || []
      const activeStudents = students.filter(s => s.status === 'active').length

      // Fetch courses
      const { data: courses } = await supabase
        .from('courses')
        .select('*')

      // Fetch enrollments
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('*')
        .gte('enrolled_at', dateRange.start)
        .lte('enrolled_at', dateRange.end)
        .in('status', ['active', 'completed'])

      const completedCourses = enrollments?.filter(e => e.status === 'completed').length || 0
      const totalEnrollments = enrollments?.length || 0
      const averageCompletionRate = totalEnrollments > 0 
        ? Math.round((completedCourses / totalEnrollments) * 100)
        : 0

      // Courses per category
      const categoryMap = new Map<string, number>()
      courses?.forEach(course => {
        const count = categoryMap.get(course.category) || 0
        categoryMap.set(course.category, count + 1)
      })
      const coursesPerCategory = Array.from(categoryMap.entries()).map(([category, count]) => ({
        category,
        count
      }))

      // Enrollments by month
      const monthMap = new Map<string, number>()
      enrollments?.forEach(enrollment => {
        if (enrollment.enrolled_at) {
          const date = new Date(enrollment.enrolled_at)
          const month = date.toLocaleDateString('pt-BR', { 
            month: 'short', 
            year: 'numeric' 
          })
          const count = monthMap.get(month) || 0
          monthMap.set(month, count + 1)
        }
      })
      const enrollmentsByMonth = Array.from(monthMap.entries()).map(([month, count]) => ({
        month,
        count
      }))

      // Top courses
      const courseEnrollmentMap = new Map<string, { title: string; count: number }>()
      enrollments?.forEach(enrollment => {
        const course = courses?.find(c => c.id === enrollment.course_id)
        if (course) {
          const existing = courseEnrollmentMap.get(course.id) || { title: course.title, count: 0 }
          courseEnrollmentMap.set(course.id, { 
            title: course.title, 
            count: existing.count + 1 
          })
        }
      })
      const topCourses = Array.from(courseEnrollmentMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(({ title, count }) => ({ title, enrollments: count }))

      setReportData({
        totalStudents: students.length,
        totalInstructors: instructors.length,
        totalCourses: courses?.length || 0,
        totalEnrollments,
        completedCourses,
        averageCompletionRate,
        activeStudents,
        coursesPerCategory,
        enrollmentsByMonth,
        topCourses
      })
    } catch (error) {
      console.error('Error fetching report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async (reportType: string) => {
    setGeneratingReport(reportType)
    
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Handle different report types
    if (reportType === 'grades') {
      generateGradesHistoryReport()
    } else if (reportType === 'enrollments') {
      generateEnrollmentAndCompletionReport()
    } else if (reportType === 'access') {
      generateAccessReport()
    } else {
      // In a real application, you would generate actual PDF/Excel files here
      alert(t('reports.reportGenerated'))
    }
    
    setGeneratingReport(null)
  }

  const generateGradesHistoryReport = () => {
    // Create CSV content for grades history
    let csvContent = 'data:text/csv;charset=utf-8,'
    
    // Add headers
    csvContent += 'Aluno,Email,Curso,Disciplina,Teste,Tipo,Data,Nota,Status\n'
    
    // Simulated data
    const gradesData = [
      {
        student: 'João Silva',
        email: 'joao.silva@email.com',
        course: 'Fundamentos de Engenharia Naval',
        subject: 'Engenharia Naval Básica',
        test: 'Avaliação de Hidrostática',
        type: 'Quiz',
        date: '2024-02-15',
        grade: 85,
        status: 'Aprovado'
      },
      {
        student: 'Maria Santos',
        email: 'maria.santos@email.com',
        course: 'Fundamentos de Engenharia Naval',
        subject: 'Engenharia Naval Básica',
        test: 'Avaliação de Hidrostática',
        type: 'Quiz',
        date: '2024-02-15',
        grade: 92,
        status: 'Aprovado'
      },
      {
        student: 'Pedro Oliveira',
        email: 'pedro.oliveira@email.com',
        course: 'Propulsão Naval',
        subject: 'Sistemas de Propulsão Marítima',
        test: 'Prova Final - Propulsão Naval',
        type: 'Prova',
        date: '2024-02-20',
        grade: 78,
        status: 'Aprovado'
      },
      {
        student: 'Ana Costa',
        email: 'ana.costa@email.com',
        course: 'Normas de Segurança',
        subject: 'Segurança Marítima e SOLAS',
        test: 'Teste de SOLAS - Módulo 1',
        type: 'Quiz',
        date: '2024-02-25',
        grade: 95,
        status: 'Aprovado'
      },
      {
        student: 'Carlos Ferreira',
        email: 'carlos.ferreira@email.com',
        course: 'Fundamentos de Engenharia Naval',
        subject: 'Engenharia Naval Básica',
        test: 'Simulado de Estabilidade',
        type: 'Simulado',
        date: '2024-03-01',
        grade: 68,
        status: 'Aprovado'
      }
    ]
    
    // Add data rows
    gradesData.forEach(grade => {
      csvContent += `${grade.student},${grade.email},${grade.course},${grade.subject},${grade.test},${grade.type},${grade.date},${grade.grade},${grade.status}\n`
    })
    
    // Add summary
    csvContent += '\n\nResumo\n'
    csvContent += 'Total de Avaliações,5\n'
    csvContent += 'Média Geral,83.6\n'
    csvContent += 'Taxa de Aprovação,100%\n'
    
    // Create download link
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `historico_notas_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    alert(t('reports.gradesReportGenerated'))
  }

  const generateEnrollmentAndCompletionReport = () => {
    // Create CSV content for enrollments and completions
    let csvContent = 'data:text/csv;charset=utf-8,'
    
    // Add headers
    csvContent += 'Relatório de Matrículas e Conclusões\n'
    csvContent += `Período: ${new Date(dateRange.start).toLocaleDateString('pt-BR')} - ${new Date(dateRange.end).toLocaleDateString('pt-BR')}\n\n`
    
    // Enrollments section
    csvContent += 'MATRÍCULAS\n'
    csvContent += 'Aluno,Email,Curso,Data de Matrícula,Status\n'
    
    // Simulated enrollment data
    const enrollmentData = [
      { student: 'João Silva', email: 'joao.silva@email.com', course: 'Fundamentos de Engenharia Naval', date: '2024-02-01', status: 'Ativo' },
      { student: 'Maria Santos', email: 'maria.santos@email.com', course: 'Propulsão Naval', date: '2024-02-05', status: 'Ativo' },
      { student: 'Pedro Oliveira', email: 'pedro.oliveira@email.com', course: 'Normas de Segurança', date: '2024-02-10', status: 'Ativo' },
      { student: 'Ana Costa', email: 'ana.costa@email.com', course: 'Fundamentos de Engenharia Naval', date: '2024-02-15', status: 'Ativo' },
      { student: 'Carlos Ferreira', email: 'carlos.ferreira@email.com', course: 'Propulsão Naval', date: '2024-02-20', status: 'Ativo' }
    ]
    
    enrollmentData.forEach(enrollment => {
      csvContent += `${enrollment.student},${enrollment.email},${enrollment.course},${enrollment.date},${enrollment.status}\n`
    })
    
    // Completions section
    csvContent += '\n\nCONCLUSÕES\n'
    csvContent += 'Aluno,Email,Curso,Data de Conclusão,Nota Final,Certificado\n'
    
    // Simulated completion data
    const completionData = [
      { student: 'Lucas Mendes', email: 'lucas.mendes@email.com', course: 'Fundamentos de Engenharia Naval', completionDate: '2024-02-28', finalGrade: 87, certificate: 'SIM' },
      { student: 'Juliana Rocha', email: 'juliana.rocha@email.com', course: 'Normas de Segurança', completionDate: '2024-03-01', finalGrade: 92, certificate: 'SIM' },
      { student: 'Roberto Lima', email: 'roberto.lima@email.com', course: 'Propulsão Naval', completionDate: '2024-03-05', finalGrade: 78, certificate: 'SIM' }
    ]
    
    completionData.forEach(completion => {
      csvContent += `${completion.student},${completion.email},${completion.course},${completion.completionDate},${completion.finalGrade},${completion.certificate}\n`
    })
    
    // Summary
    csvContent += '\n\nRESUMO\n'
    csvContent += `Total de Matrículas no Período,${enrollmentData.length}\n`
    csvContent += `Total de Conclusões no Período,${completionData.length}\n`
    csvContent += `Taxa de Conclusão,${Math.round((completionData.length / (reportData?.totalEnrollments || 1)) * 100)}%\n`
    csvContent += `Nota Média dos Concluintes,${(completionData.reduce((acc, c) => acc + c.finalGrade, 0) / completionData.length).toFixed(1)}\n`
    
    // Create download link
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `relatorio_matriculas_conclusoes_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    alert('Relatório de Matrículas e Conclusões gerado com sucesso!')
  }

  const generateAccessReport = () => {
    // Create CSV content for student access statistics
    let csvContent = 'data:text/csv;charset=utf-8,'
    
    // Add headers
    csvContent += 'Relatório de Estatísticas de Acesso dos Alunos\n'
    csvContent += `Período: ${new Date(dateRange.start).toLocaleDateString('pt-BR')} - ${new Date(dateRange.end).toLocaleDateString('pt-BR')}\n\n`
    
    // Student access section
    csvContent += 'ESTATÍSTICAS POR ALUNO\n'
    csvContent += 'Aluno,Email,Último Acesso,Total de Acessos,Tempo Total (horas),Tempo Médio por Sessão (min),Cursos Acessados,Conclusão Média (%)\n'
    
    const studentAccessData = [
      { name: 'João Silva', email: 'joao.silva@email.com', lastAccess: '2024-03-15 14:30', totalAccess: 156, totalHours: 48.5, avgSession: 18.6, coursesAccessed: 3, avgCompletion: 72 },
      { name: 'Maria Santos', email: 'maria.santos@email.com', lastAccess: '2024-03-15 09:15', totalAccess: 234, totalHours: 67.2, avgSession: 17.2, coursesAccessed: 4, avgCompletion: 85 },
      { name: 'Pedro Oliveira', email: 'pedro.oliveira@email.com', lastAccess: '2024-03-14 20:45', totalAccess: 98, totalHours: 32.1, avgSession: 19.6, coursesAccessed: 2, avgCompletion: 60 },
      { name: 'Ana Costa', email: 'ana.costa@email.com', lastAccess: '2024-03-15 16:20', totalAccess: 312, totalHours: 89.7, avgSession: 17.2, coursesAccessed: 5, avgCompletion: 92 },
      { name: 'Carlos Ferreira', email: 'carlos.ferreira@email.com', lastAccess: '2024-03-13 11:00', totalAccess: 87, totalHours: 21.3, avgSession: 14.7, coursesAccessed: 2, avgCompletion: 45 }
    ]
    
    studentAccessData.forEach(student => {
      csvContent += `${student.name},${student.email},${student.lastAccess},${student.totalAccess},${student.totalHours},${student.avgSession},${student.coursesAccessed},${student.avgCompletion}\n`
    })
    
    // Daily access pattern
    csvContent += '\n\nPADRÃO DE ACESSO DIÁRIO\n'
    csvContent += 'Dia da Semana,Total de Acessos,Pico de Usuários,Horário de Pico\n'
    
    const dailyPattern = [
      { day: 'Segunda-feira', accesses: 542, peakUsers: 123, peakTime: '19:00-20:00' },
      { day: 'Terça-feira', accesses: 498, peakUsers: 115, peakTime: '20:00-21:00' },
      { day: 'Quarta-feira', accesses: 523, peakUsers: 118, peakTime: '19:00-20:00' },
      { day: 'Quinta-feira', accesses: 467, peakUsers: 102, peakTime: '21:00-22:00' },
      { day: 'Sexta-feira', accesses: 321, peakUsers: 78, peakTime: '18:00-19:00' },
      { day: 'Sábado', accesses: 234, peakUsers: 56, peakTime: '10:00-11:00' },
      { day: 'Domingo', accesses: 198, peakUsers: 43, peakTime: '20:00-21:00' }
    ]
    
    dailyPattern.forEach(day => {
      csvContent += `${day.day},${day.accesses},${day.peakUsers},${day.peakTime}\n`
    })
    
    // Course engagement
    csvContent += '\n\nENGAJAMENTO POR CURSO\n'
    csvContent += 'Curso,Alunos Ativos,Tempo Médio (horas),Taxa de Conclusão (%),Avaliação Média\n'
    
    const courseEngagement = [
      { course: 'Fundamentos de Engenharia Naval', activeStudents: 145, avgTime: 24.3, completionRate: 78, avgRating: 4.5 },
      { course: 'Propulsão Naval', activeStudents: 98, avgTime: 18.7, completionRate: 65, avgRating: 4.2 },
      { course: 'Normas de Segurança', activeStudents: 234, avgTime: 15.2, completionRate: 89, avgRating: 4.7 },
      { course: 'Manutenção Naval', activeStudents: 76, avgTime: 21.5, completionRate: 71, avgRating: 4.3 }
    ]
    
    courseEngagement.forEach(course => {
      csvContent += `${course.course},${course.activeStudents},${course.avgTime},${course.completionRate},${course.avgRating}\n`
    })
    
    // Summary statistics
    csvContent += '\n\nRESUMO GERAL\n'
    csvContent += 'Métrica,Valor\n'
    csvContent += `Total de Alunos Ativos,${reportData?.activeStudents || 0}\n`
    csvContent += `Média de Acessos por Aluno,${Math.round(studentAccessData.reduce((acc, s) => acc + s.totalAccess, 0) / studentAccessData.length)}\n`
    csvContent += `Tempo Médio de Estudo por Aluno,${(studentAccessData.reduce((acc, s) => acc + s.totalHours, 0) / studentAccessData.length).toFixed(1)} horas\n`
    csvContent += `Taxa Média de Conclusão,${Math.round(studentAccessData.reduce((acc, s) => acc + s.avgCompletion, 0) / studentAccessData.length)}%\n`
    csvContent += 'Horário de Maior Acesso,19:00-21:00\n'
    csvContent += 'Dia com Mais Acessos,Segunda-feira\n'
    
    // Create download link
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `relatorio_acesso_alunos_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    alert('Relatório de Estatísticas de Acesso dos Alunos gerado com sucesso!')
  }


  const exportToExcel = () => {
    if (!reportData) return

    // Create CSV content
    let csvContent = 'data:text/csv;charset=utf-8,'
    
    // Add headers and data
    csvContent += `${t('reports.metric')},${t('reports.value')}\n`
    csvContent += `${t('dashboard.totalStudents')},${reportData.totalStudents}\n`
    csvContent += `${t('reports.activeStudents')},${reportData.activeStudents}\n`
    csvContent += `${t('dashboard.instructors')},${reportData.totalInstructors}\n`
    csvContent += `${t('courses.totalCourses')},${reportData.totalCourses}\n`
    csvContent += `${t('reports.totalEnrollments')},${reportData.totalEnrollments}\n`
    csvContent += `${t('reports.coursesCompleted')},${reportData.completedCourses}\n`
    csvContent += `${t('reports.averageCompletion')},${reportData.averageCompletionRate}%\n`
    
    csvContent += `\n${t('reports.coursesByCategory')}\n`
    csvContent += `${t('courses.category')},${t('reports.quantity')}\n`
    reportData.coursesPerCategory.forEach(item => {
      csvContent += `${item.category},${item.count}\n`
    })
    
    csvContent += `\n${t('reports.top5Courses')}\n`
    csvContent += `${t('courses.courseTitle')},${t('reports.enrollments')}\n`
    reportData.topCourses.forEach(course => {
      csvContent += `${course.title},${course.enrollments}\n`
    })

    // Create download link
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `relatorio_swiftedu_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const reports = [
    {
      title: t('reports.gradesHistoryReport'),
      description: t('reports.gradesHistoryReportDesc'),
      type: 'grades',
      icon: GraduationCap,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10'
    },
    {
      title: t('reports.enrollmentReport'),
      description: 'Relatório completo de matrículas e conclusões de cursos',
      type: 'enrollments',
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Estatísticas de Acesso dos Alunos',
      description: 'Acompanhe o acesso dos alunos: frequência, tempo de estudo e engajamento',
      type: 'access',
      icon: Activity,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    }
  ]

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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gold">{t('reports.title')}</h1>
          <p className="text-gold-300 mt-1">{t('reports.subtitle')}</p>
        </div>
        <Button 
          variant="primary" 
          icon={<FileSpreadsheet className="w-5 h-5" />}
          onClick={exportToExcel}
        >
          {t('reports.export')} Excel
        </Button>
      </div>

      {/* Date Filter */}
      <Card>
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gold-400" />
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
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="text-center">
            <p className="text-4xl font-bold text-gold">{reportData?.totalEnrollments || 0}</p>
            <p className="text-gold-300 mt-1">{t('reports.enrollments')}</p>
            <p className="text-gold-400 text-sm mt-2">{t('reports.inPeriod')}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-4xl font-bold text-gold">{reportData?.averageCompletionRate || 0}%</p>
            <p className="text-gold-300 mt-1">{t('reports.completionRate')}</p>
            <p className="text-gold-400 text-sm mt-2">{t('reports.overallAverage')}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-4xl font-bold text-gold">{reportData?.activeStudents || 0}</p>
            <p className="text-gold-300 mt-1">{t('reports.activeStudents')}</p>
            <p className="text-gold-400 text-sm mt-2">{t('dashboard.total')}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-4xl font-bold text-gold">{reportData?.totalCourses || 0}</p>
            <p className="text-gold-300 mt-1">{t('courses.title')}</p>
            <p className="text-gold-400 text-sm mt-2">{t('reports.available')}</p>
          </div>
        </Card>
      </div>

      {/* Available Reports */}
      <Card title={t('reports.availableReports')} subtitle={t('reports.selectReport')}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {reports.map((report, index) => {
            const Icon = report.icon
            const isGenerating = generatingReport === report.type
            
            return (
              <div key={index} className="border border-gold-500/20 rounded-lg p-4 hover:bg-navy-700/30 transition-colors">
                <div className="flex flex-col items-center text-center">
                  <div className={`p-3 ${report.bgColor} rounded-lg ${report.color} mb-3`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <h4 className="font-semibold text-gold mb-1">{report.title}</h4>
                  <p className="text-gold-300 text-sm mb-4">{report.description}</p>
                  <Button 
                    variant="primary" 
                    size="sm"
                    className="w-full"
                    onClick={() => generateReport(report.type)}
                    disabled={isGenerating}
                  >
                    {isGenerating ? t('reports.generating') : t('reports.generateReport')}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Data Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Courses */}
        <Card title={t('reports.top5Courses')} subtitle={t('reports.byEnrollments')}>
          <div className="space-y-3 mt-4">
            {reportData?.topCourses.map((course, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-gold-400 font-bold">#{index + 1}</span>
                  <span className="text-gold-200">{course.title}</span>
                </div>
                <span className="text-gold-300 font-medium">{course.enrollments} {t('dashboard.students')}</span>
              </div>
            ))}
            {(!reportData?.topCourses || reportData.topCourses.length === 0) && (
              <p className="text-gold-300 text-center py-4">{t('reports.noCoursesInPeriod')}</p>
            )}
          </div>
        </Card>

        {/* Courses by Category */}
        <Card title={t('reports.coursesByCategory')}>
          <div className="space-y-3 mt-4">
            {reportData?.coursesPerCategory.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-gold-200">{item.category}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gold-300 font-medium">{item.count} {t('reports.courses')}</span>
                  <div className="w-24 bg-navy-900/50 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-gold-500 to-gold-600 h-2 rounded-full"
                      style={{ 
                        width: `${Math.min((item.count / (reportData?.totalCourses || 1)) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {(!reportData?.coursesPerCategory || reportData.coursesPerCategory.length === 0) && (
              <p className="text-gold-300 text-center py-4">{t('reports.noCategoriesFound')}</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}