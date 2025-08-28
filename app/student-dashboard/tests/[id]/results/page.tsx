'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Card from '@/app/components/Card'
import Button from '@/app/components/Button'
import { useTranslation } from '@/app/contexts/LanguageContext'

export default function TestResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { t } = useTranslation()
  
  return (
    <div className="min-h-screen bg-navy-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link href="/student-dashboard/tests">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
            </Button>
          </Link>
        </div>

        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4 text-gold-500">
            Sistema de Testes em Manutenção
          </h2>
          <p className="text-gray-300 mb-6">
            O sistema de testes está sendo atualizado para uma melhor experiência.
          </p>
          <Button onClick={() => router.push('/student-dashboard')}>
            Voltar ao Dashboard
          </Button>
        </Card>
      </div>
    </div>
  )
}