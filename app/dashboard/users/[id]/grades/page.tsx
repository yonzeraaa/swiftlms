'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StudentGradesReport from '@/app/components/StudentGradesReport'
import { ArrowLeft, User, Calendar } from 'lucide-react'
import Card from '@/app/components/Card'
import Button from '@/app/components/Button'
import Link from 'next/link'

export default function AdminStudentGradesPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [userName, setUserName] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAndFetchUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedParams.id])

  const checkAdminAndFetchUser = async () => {
    try {
      // Verificar se o usuário atual é admin
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }
      
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      if (currentProfile?.role !== 'admin') {
        router.push('/dashboard')
        return
      }
      
      setIsAdmin(true)
      
      // Buscar informações do aluno
      const { data: studentProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', resolvedParams.id)
        .single()
      
      if (studentProfile) {
        setUserName(studentProfile.full_name || studentProfile.email || 'Aluno')
        setUserEmail(studentProfile.email || '')
      } else {
        router.push('/dashboard/users')
      }
    } catch (error) {
      console.error('Erro ao buscar informações:', error)
      router.push('/dashboard/users')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-navy-800/50 rounded-lg animate-pulse w-64" />
        <div className="h-32 bg-navy-800/50 rounded-xl animate-pulse" />
        <div className="h-96 bg-navy-800/50 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb e Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/users">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Voltar
          </Button>
        </Link>
        
        <div className="flex items-center gap-2 text-gold-400">
          <span>Dashboard</span>
          <span>/</span>
          <span>Usuários</span>
          <span>/</span>
          <span className="text-gold">{userName}</span>
          <span>/</span>
          <span className="text-gold">Notas</span>
        </div>
      </div>

      {/* Informações do Aluno */}
      <Card className="bg-gradient-to-r from-navy-800/50 to-navy-900/50">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gold-500/20 flex items-center justify-center">
            <User className="w-8 h-8 text-gold" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gold">Histórico de Notas</h1>
            <p className="text-gold-300">
              <span className="font-medium">Aluno:</span> {userName}
            </p>
            {userEmail && (
              <p className="text-gold-400 text-sm">
                <span className="font-medium">Email:</span> {userEmail}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Filtro de Data */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gold-400" />
            <span className="text-gold-300 text-sm font-medium">Filtrar por período:</span>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-1.5 bg-navy-900/50 border border-gold-500/30 rounded-lg text-gold-100 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
            <span className="text-gold-400">até</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-1.5 bg-navy-900/50 border border-gold-500/30 rounded-lg text-gold-100 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
        </div>
      </Card>

      {/* Componente de Relatório de Notas */}
      <StudentGradesReport
        userId={resolvedParams.id}
        userName={userName}
        showHeader={false}
        allowExport={true}
        dateRange={dateRange}
        allowEditing={true}
      />
    </div>
  )
}
