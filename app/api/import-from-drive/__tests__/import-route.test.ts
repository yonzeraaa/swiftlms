import { describe, it, expect, vi } from 'vitest'
import type { drive_v3 } from 'googleapis'
import '../route'

const {
  FOLDER_MIME_TYPE,
  parseGoogleDriveFolder,
  importToDatabase,
  isTestFile,
} = (globalThis as any).__IMPORT_FROM_DRIVE_TESTABLES

describe('isTestFile', () => {
  it('flags titles containing the standalone word TESTE', () => {
    expect(isTestFile('Aula TESTE 1')).toBe(true)
    expect(isTestFile('Revisão - Teste-Final')).toBe(true)
  })

  it('does not match when TESTE is absent as a word', () => {
    expect(isTestFile('Simulado final')).toBe(false)
    expect(isTestFile('Testefinal')).toBe(false)
    expect(isTestFile('Aula de contestação')).toBe(false)
  })
})

describe('Google Drive import parsing', () => {
  it('groups lessons and detects tests within the Drive hierarchy', async () => {
    const filesByParent: Record<string, drive_v3.Schema$File[]> = {
      'root-folder': [
        { id: 'module-1', name: null, mimeType: FOLDER_MIME_TYPE },
        { id: 'ignored', name: 'Loose Asset.pdf', mimeType: 'application/pdf' },
      ],
      'module-1': [
        { id: 'subject-1', name: undefined, mimeType: FOLDER_MIME_TYPE },
        { id: 'stray', name: 'overview.png', mimeType: 'image/png' },
      ],
      'subject-1': [
        { id: 'lesson-1', name: 'A01-Introducao.pdf', mimeType: 'application/pdf' },
        { id: 'test-1', name: 'Teste FINAL', mimeType: 'application/vnd.google-apps.document' },
      ],
    }

    const driveStub = {
      files: {
        list: vi.fn(async ({ q }: { q: string }) => {
          const match = q.match(/'([^']+)' in parents/)
          const parentId = match?.[1]
          return {
            data: {
              files: parentId ? filesByParent[parentId] ?? [] : [],
            },
          }
        }) as any,
        export: vi.fn(async ({ fileId, mimeType }: { fileId: string; mimeType: string }) => {
          if (fileId === 'test-1' && mimeType === 'text/plain') {
            return {
              data: 'Gabarito\n1. A\n',
            }
          }
          return { data: '' }
        }) as any,
      },
    }

    const structure = await parseGoogleDriveFolder(
      driveStub as unknown as drive_v3.Drive,
      'root-folder',
      'course-1'
    )

    expect(structure.modules).toHaveLength(1)
    const [module] = structure.modules
    expect(module.name).toBe('Módulo 1')
    expect(module.subjects).toHaveLength(1)

    const [subject] = module.subjects
    expect(subject.name).toBe('Módulo 1 - Disciplina 1')
    expect(subject.lessons).toHaveLength(1)
    expect(subject.lessons[0]).toMatchObject({
      code: 'A01',
      name: 'Introducao',
      contentType: 'text',
    })

    expect(subject.tests).toHaveLength(1)
    expect(subject.tests[0]).toMatchObject({
      name: 'Teste FINAL',
      order: 1,
      contentType: 'test',
      contentUrl: 'https://drive.google.com/file/d/test-1/view',
    })
    expect(subject.tests[0]).not.toHaveProperty('code')
    expect(subject.tests[0].answerKey).toEqual([
      { questionNumber: 1, correctAnswer: 'A', points: 10 }
    ])
  })
})

describe('Database import orchestration', () => {
  const buildSupabaseStub = () => {
    const inserts = {
      modules: [] as any[],
      subjects: [] as any[],
      lessons: [] as any[],
      moduleSubjects: [] as any[],
      subjectLessons: [] as any[],
      tests: [] as any[],
      testAnswerKeys: [] as any[],
    }

    let moduleCounter = 0
    let subjectCounter = 0
    let lessonCounter = 0

    const supabase = {
      from(table: string) {
       if (table === 'course_modules') {
         return {
            select: (fields?: string) => {
              if (fields === 'order_index') {
                return {
                  eq: () => ({
                    order: () => ({
                      limit: async () => ({ data: [], error: null }),
                    }),
                  }),
                }
              }

              const builder: any = {
                eq: () => builder,
                order: () => ({
                  limit: async () => ({ data: [], error: null }),
                }),
                single: async () => ({ data: null, error: null }),
              }

              return builder
            },
            insert: (payload: any) => {
              const newModule = { ...payload, id: `module-${++moduleCounter}` }
              inserts.modules.push(newModule)
              return {
                select: () => ({
                  single: async () => ({ data: newModule, error: null }),
                }),
              }
            },
          }
        }

        if (table === 'subjects') {
          return {
            select: () => {
              const builder: any = {
                eq: () => builder,
                maybeSingle: async () => ({ data: null, error: null }),
                single: async () => ({ data: null, error: null }),
              }

              return builder
            },
            insert: (payload: any) => {
              const newSubject = { ...payload, id: `subject-${++subjectCounter}` }
              inserts.subjects.push(newSubject)
              return {
                select: () => ({
                  single: async () => ({ data: newSubject, error: null }),
                }),
              }
            },
          }
        }

        if (table === 'module_subjects') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: async () => ({ data: null, error: null }),
                }),
              }),
            }),
            insert: async (payload: any) => {
              inserts.moduleSubjects.push(payload)
              return { error: null }
            },
          }
        }

        if (table === 'lessons') {
          return {
            select: (fields: string) => {
              if (fields === 'order_index') {
                return {
                  eq: () => ({
                    order: () => ({
                      limit: async () => ({ data: [], error: null }),
                    }),
                  }),
                }
              }

              return {
                eq: () => ({
                  eq: () => ({
                    single: async () => ({ data: null, error: null }),
                  }),
                }),
              }
            },
            insert: (payload: any) => {
              const newLesson = { ...payload, id: `lesson-${++lessonCounter}` }
              inserts.lessons.push(newLesson)
              return {
                select: () => ({
                  single: async () => ({ data: newLesson, error: null }),
                }),
              }
            },
            delete: () => ({ error: null }),
          }
        }

        if (table === 'subject_lessons') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: async () => ({ data: null, error: null }),
                }),
              }),
            }),
            insert: async (payload: any) => {
              inserts.subjectLessons.push(payload)
              return { error: null }
            },
          }
        }

        if (table === 'tests') {
          return {
            select: () => {
              const builder: any = {
                eq: () => builder,
                maybeSingle: async () => ({ data: null, error: null }),
              }

              return builder
            },
            insert: (payload: any) => {
              const newTest = { ...payload, id: `test-${inserts.tests.length + 1}` }
              inserts.tests.push(newTest)
              return {
                select: () => ({
                  single: async () => ({ data: newTest, error: null })
                })
              }
            },
          }
        }

        if (table === 'test_answer_keys') {
          return {
            insert: async (payload: any[]) => {
              inserts.testAnswerKeys.push(...payload)
              return { error: null }
            },
          }
        }

        throw new Error(`Unexpected table access: ${table}`)
      },
    }

    return { supabase: supabase as any, inserts }
  }

  it('persists modules, lessons and tests for new imports', async () => {
    const { supabase, inserts } = buildSupabaseStub()

    const structure = {
      modules: [
        {
          name: 'Módulo 1',
          order: 1,
          subjects: [
            {
              name: 'DISC1 - Disciplina 1',
              code: 'SUB_DISC1_DISCIPLINA_1',
              order: 1,
              lessons: [
                {
                  name: 'Introdução',
                  code: 'A01',
                  order: 1,
                  contentType: 'text',
                  description: 'Aula importada',
                  contentUrl: 'https://drive/url/lesson-1',
                },
              ],
              tests: [
                {
                  name: 'Teste FINAL',
                  order: 1,
                  contentType: 'test',
                  contentUrl: 'https://drive/url/test-1',
                  description: 'Teste importado',
                  answerKey: [
                    { questionNumber: 1, correctAnswer: 'A', points: 10 }
                  ],
                  requiresManualAnswerKey: false,
                },
              ],
            },
          ],
        },
      ],
    }

    await importToDatabase(structure as any, 'course-1', supabase)

    expect(inserts.modules).toHaveLength(1)
    expect(inserts.modules[0]).toMatchObject({
      title: 'Módulo 1',
      course_id: 'course-1',
    })

    expect(inserts.subjects).toHaveLength(1)
    expect(inserts.subjects[0]).toMatchObject({
      code: 'SUB_DISC1_DISCIPLINA_1',
      name: 'DISC1 - Disciplina 1',
    })

    expect(inserts.moduleSubjects).toHaveLength(1)
    expect(inserts.lessons).toHaveLength(1)
    expect(inserts.lessons[0]).toMatchObject({
      title: 'A01 - Introdução',
      module_id: inserts.modules[0].id,
      content_url: 'https://drive/url/lesson-1',
    })

    expect(inserts.subjectLessons).toHaveLength(1)
    expect(inserts.tests).toHaveLength(1)
    expect(inserts.tests[0]).toMatchObject({
      title: 'Teste FINAL',
      course_id: 'course-1',
      google_drive_url: 'https://drive/url/test-1',
      is_active: true,
    })
    expect(inserts.testAnswerKeys).toEqual([
      { test_id: inserts.tests[0].id, question_number: 1, correct_answer: 'A', points: 10 }
    ])
  })
})
