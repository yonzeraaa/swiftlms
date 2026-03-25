import { describe, expect, it } from 'vitest'
import { resolveActivityEntityName } from '../activity-log-display'

describe('resolveActivityEntityName', () => {
  it('keeps the existing entity name for non-enrollment activities', () => {
    const entityName = resolveActivityEntityName(
      {
        action: 'course_created',
        entity_name: 'Curso de Navegacao',
      },
      new Map()
    )

    expect(entityName).toBe('Curso de Navegacao')
  })

  it('prefers the course title from metadata for enroll_students logs', () => {
    const entityName = resolveActivityEntityName(
      {
        action: 'enroll_students',
        entity_id: 'course-1',
        entity_name: '1 alunos',
        metadata: {
          courseTitle: 'Curso de Hidrodinamica',
        },
      },
      new Map([['course-1', 'Outro curso']])
    )

    expect(entityName).toBe('Curso de Hidrodinamica')
  })

  it('falls back to the course map for legacy enroll_students logs', () => {
    const entityName = resolveActivityEntityName(
      {
        action: 'enroll_students',
        entity_id: 'course-1',
        entity_name: '1 alunos',
      },
      new Map([['course-1', 'Curso de Estruturas Navais']])
    )

    expect(entityName).toBe('Curso de Estruturas Navais')
  })
})
