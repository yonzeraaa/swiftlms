import { redirect } from 'next/navigation'
import { getAuthenticatedSetupUser } from '@/lib/setup/server'
import SetupWizardClient from './SetupWizardClient'

export default async function SetupPage() {
  try {
    const { profile } = await getAuthenticatedSetupUser()
    return <SetupWizardClient currentUserEmail={profile.email} />
  } catch {
    redirect('/')
  }
}
