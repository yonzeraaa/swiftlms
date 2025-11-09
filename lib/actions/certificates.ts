'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Database } from '@/lib/database.types'

type Certificate = Database['public']['Tables']['certificates']['Row']
type Course = Database['public']['Tables']['courses']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

interface CertificateWithDetails extends Certificate {
  course: Course
  user: Profile
  certificate_type?: 'technical' | 'lato-sensu'
}

interface CertificateRequest {
  id: string
  enrollment_id: string
  course_id: string
  status: 'pending' | 'approved' | 'rejected'
  request_date: string
  processed_at?: string
  notes?: string
  course?: Course
  certificate_type: 'technical' | 'lato-sensu'
}

/**
 * Get user certificates and requests
 * SECURITY: Server-side only, no token exposure
 */
export async function getUserCertificatesData() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    // Fetch approved certificates with course details
    const { data: certificatesData, error } = await supabase
      .from('certificates')
      .select(`
        *,
        course:courses(*),
        user:profiles!certificates_user_id_fkey(*)
      `)
      .eq('user_id', user.id)
      .eq('approval_status', 'approved')
      .order('issued_at', { ascending: false })

    if (error) {
      console.error('Error fetching certificates:', error)
    }

    // Fetch pending certificate requests
    const { data: requestsData } = await supabase
      .from('certificate_requests')
      .select(`
        *,
        course:courses(*)
      `)
      .eq('user_id', user.id)
      .in('status', ['pending', 'rejected'])
      .order('request_date', { ascending: false })

    return {
      certificates: (certificatesData || []) as any as CertificateWithDetails[],
      requests: (requestsData || []) as any as CertificateRequest[]
    }
  } catch (error) {
    console.error('Error fetching certificates:', error)
    return {
      certificates: [],
      requests: []
    }
  }
}
