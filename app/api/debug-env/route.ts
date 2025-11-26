import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    hasEventKey: !!process.env.INNGEST_EVENT_KEY,
    hasSigningKey: !!process.env.INNGEST_SIGNING_KEY,
    eventKeyPrefix: process.env.INNGEST_EVENT_KEY?.substring(0, 10),
    signingKeyPrefix: process.env.INNGEST_SIGNING_KEY?.substring(0, 10),
    allEnvKeys: Object.keys(process.env).filter(key => key.includes('INNGEST')),
  })
}
