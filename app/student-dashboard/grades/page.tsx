import { getGradesUserInfo } from '@/lib/actions/student-grades'
import GradesPageClient from './GradesPageClient'
import Spinner from '@/app/components/ui/Spinner'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

export default async function StudentGradesPage() {
  const userInfo = await getGradesUserInfo()

  if (!userInfo) {
    return <Spinner fullPage size="xl" />
  }

  return (
    <Suspense fallback={<Spinner fullPage size="xl" />}>
      <GradesPageClient
        userId={userInfo.id}
        userName={userInfo.fullName}
      />
    </Suspense>
  )
}
