import LoginPageClient from './LoginPageClient'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface LoginPageProps {
  searchParams: Promise<{ 'forgot-password'?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient()
  const [
    { data: { session } },
    resolvedSearchParams,
  ] = await Promise.all([
    supabase.auth.getSession(),
    searchParams,
  ])

  if (session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    redirect(profile?.role === 'student' ? '/student-dashboard' : '/dashboard')
  }

  return (
    <LoginPageClient
      initialForgotPasswordOpen={resolvedSearchParams['forgot-password'] === 'true'}
    />
  )
}
