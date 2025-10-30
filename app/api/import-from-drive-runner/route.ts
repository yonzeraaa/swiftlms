import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { runImportJob, type ImportRunnerPayload } from '@/app/api/import-from-drive/route'

export const runtime = 'nodejs'
export const maxDuration = 780

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as ImportRunnerPayload
  const expectedSecret = process.env.GOOGLE_DRIVE_RUNNER_SECRET ?? null

  if (expectedSecret && payload.secret !== expectedSecret) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { protocol, host } = new URL(request.url)
  const baseUrl = `${protocol}//${host}`

  waitUntil(
    runImportJob({ ...payload, secret: expectedSecret }, { baseUrl }).catch(error => {
      console.error('[IMPORT-RUNNER] Erro ao executar runner (endpoint)', error)
    })
  )

  return NextResponse.json({ accepted: true }, { status: 202 })
}
