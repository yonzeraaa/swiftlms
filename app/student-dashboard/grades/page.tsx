import { getGradesUserInfo } from '@/lib/actions/student-grades'
import StudentGradesReport from '@/app/components/StudentGradesReport'
import { FileText } from 'lucide-react'
import Breadcrumbs from '../../components/ui/Breadcrumbs'
import Card from '@/app/components/Card'
import GradesPageClient from './GradesPageClient'

export const dynamic = 'force-dynamic'

export default async function StudentGradesPage() {
  const userInfo = await getGradesUserInfo()

  if (!userInfo) {
    return (
      <Card className="text-center py-12">
        <p className="text-gold-400">Erro ao carregar informações do usuário.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs className="mb-2" />

      <GradesPageClient
        userId={userInfo.id}
        userName={userInfo.fullName}
      />
    </div>
  )
}
