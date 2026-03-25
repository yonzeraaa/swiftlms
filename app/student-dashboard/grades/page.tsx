import { getGradesUserInfo } from '@/lib/actions/student-grades'
import Card from '@/app/components/Card'
import GradesPageClient from './GradesPageClient'
import Spinner from '@/app/components/ui/Spinner'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

export default async function StudentGradesPage() {
  const userInfo = await getGradesUserInfo()

  if (!userInfo) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="xl" />
      </div>
    )
  }

  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="xl" />
      </div>
    }>
      <GradesPageClient
        userId={userInfo.id}
        userName={userInfo.fullName}
      />
    </Suspense>
  )
}
