import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseAnswerKeyFromText } from '../../utils/answer-key'

function extractGoogleDocumentId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()

  try {
    const { id } = await params

    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('id, title, google_drive_url, description, is_active')
      .eq('id', id)
      .single()

    if (testError || !test) {
      return NextResponse.json({ error: 'Teste não encontrado' }, { status: 404 })
    }

    if (!test.google_drive_url) {
      return NextResponse.json({
        error: 'Teste não possui URL do Google Drive configurada'
      }, { status: 400 })
    }

    const docId = extractGoogleDocumentId(test.google_drive_url)
    if (!docId) {
      return NextResponse.json({ error: 'URL do Google Drive inválida' }, { status: 400 })
    }

    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`

    const response = await fetch(exportUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Erro ao baixar documento do Google Drive' }, { status: 502 })
    }

    const content = await response.text()

    if (!content.trim()) {
      return NextResponse.json({ error: 'Documento sem conteúdo' }, { status: 400 })
    }

    const parsedAnswerKey = parseAnswerKeyFromText(content)

    if (!parsedAnswerKey || parsedAnswerKey.length === 0) {
      return NextResponse.json({
        error: 'Gabarito não identificado no documento. Verifique o formato.'
      }, { status: 400 })
    }

    const { data: existingKeys, error: fetchKeysError } = await supabase
      .from('test_answer_keys')
      .select('question_number, correct_answer, points')
      .eq('test_id', test.id)
      .order('question_number', { ascending: true })

    if (fetchKeysError) {
      return NextResponse.json({ error: 'Erro ao ler gabarito atual' }, { status: 500 })
    }

    const normalizedExisting = (existingKeys || []).map(key => ({
      question_number: key.question_number,
      correct_answer: key.correct_answer.trim().toUpperCase(),
      points: key.points ?? 10
    }))

    const normalizedIncoming = parsedAnswerKey.map(entry => ({
      question_number: entry.questionNumber,
      correct_answer: entry.correctAnswer.trim().toUpperCase(),
      points: entry.points ?? 10
    })).sort((a, b) => a.question_number - b.question_number)

    const keysDiffer =
      normalizedExisting.length !== normalizedIncoming.length ||
      normalizedExisting.some((key, index) => {
        const incoming = normalizedIncoming[index]
        return (
          key.question_number !== incoming.question_number ||
          key.correct_answer !== incoming.correct_answer ||
          (key.points ?? 10) !== (incoming.points ?? 10)
        )
      })

    if (keysDiffer) {
      const { error: deleteError } = await supabase
        .from('test_answer_keys')
        .delete()
        .eq('test_id', test.id)

      if (deleteError) {
        return NextResponse.json({ error: 'Erro ao limpar gabarito antigo' }, { status: 500 })
      }

      const insertPayload = normalizedIncoming.map(entry => ({
        test_id: test.id,
        question_number: entry.question_number,
        correct_answer: entry.correct_answer,
        points: entry.points
      }))

      const { error: insertError } = await supabase
        .from('test_answer_keys')
        .insert(insertPayload)

      if (insertError) {
        return NextResponse.json({ error: 'Erro ao salvar novo gabarito' }, { status: 500 })
      }

      await supabase
        .from('tests')
        .update({
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', test.id)
    }

    const { data: refreshedKeys, error: refreshedError } = await supabase
      .from('test_answer_keys')
      .select('*')
      .eq('test_id', test.id)
      .order('question_number', { ascending: true })

    if (refreshedError) {
      return NextResponse.json({ error: 'Erro ao recuperar gabarito atualizado' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      updated: keysDiffer,
      answerKey: refreshedKeys
    })
  } catch (error) {
    console.error('[sync-answer-key] erro', error)
    return NextResponse.json({ error: 'Erro ao sincronizar gabarito' }, { status: 500 })
  }
}
