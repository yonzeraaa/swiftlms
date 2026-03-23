import { getGradesUserInfo } from '@/lib/actions/student-grades'
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

      <GradesPageClient
        userId={userInfo.id}
        userName={userInfo.fullName}
      />
    </div>
  )
}
