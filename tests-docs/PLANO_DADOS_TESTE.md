# 🗂️ PLANO DE DADOS DE TESTE - SwiftLMS

> **Versão:** 1.0.0
> **Data:** 2025-11-08
> **Baseado em:** CONTEXTO_DERIVADO_AUTOMATICAMENTE.md + PLANO_DE_TESTES.md

---

## 📚 ÍNDICE

- [1. VISÃO GERAL](#1-visão-geral)
- [2. ESTRATÉGIAS DE ISOLAMENTO](#2-estratégias-de-isolamento)
- [3. FACTORIES](#3-factories)
- [4. FIXTURES](#4-fixtures)
- [5. SEEDS](#5-seeds)
- [6. MOCKS E STUBS](#6-mocks-e-stubs)
- [7. LIMPEZA E RESET](#7-limpeza-e-reset)
- [8. GESTÃO DE SEGREDOS](#8-gestão-de-segredos)
- [9. DADOS SINTÉTICOS](#9-dados-sintéticos)
- [10. SNAPSHOTS](#10-snapshots)

---

## 1. VISÃO GERAL

### 1.1 Propósito

Este documento define como os **dados de teste** são gerenciados no SwiftLMS para garantir:
- ✅ **Isolamento**: testes não interferem uns com os outros
- ✅ **Determinismo**: mesmos dados, mesmos resultados
- ✅ **Realismo**: dados próximos do uso real, mas seguros
- ✅ **Performance**: criação rápida de dados de teste
- ✅ **Limpeza**: remoção automática após execução

### 1.2 Princípios

1. **Never use production data**: Nunca usar dados reais de produção
2. **Factories over Fixtures**: Prefer factories (dinâmicas) a fixtures (estáticas) quando possível
3. **Minimal & Focused**: Criar apenas dados necessários para o teste
4. **Cleanup Guaranteed**: Sempre limpar dados, mesmo em caso de falha
5. **Unique Identifiers**: Usar IDs únicos para evitar conflitos

### 1.3 Ferramentas

| Ferramenta | Uso | Justificativa |
|-----------|-----|---------------|
| **@faker-js/faker** | Geração de dados sintéticos | Biblioteca padrão, suporte a pt-BR |
| **Vitest beforeEach/afterEach** | Setup e cleanup | Nativo do test runner |
| **Supabase CLI** | Reset de DB local | Já presente no projeto |
| **Custom Factories** | Criação de objetos de teste | Customizável para domínio SwiftLMS |

---

## 2. ESTRATÉGIAS DE ISOLAMENTO

### 2.1 Por Tipo de Teste

| Tipo | Estratégia | Implementação | Tempo de Setup |
|------|-----------|---------------|----------------|
| **Unit** | Sem DB, mocks para I/O | `vi.mock()` | ~0ms |
| **Integration** | Transações (BEGIN/ROLLBACK) | `beforeEach: BEGIN`, `afterEach: ROLLBACK` | ~10ms |
| **E2E** | Schema temporário ou DB efêmero | `supabase db reset` ou Testcontainers | ~2-5s |
| **Security** | Transações (como Integration) | `BEGIN/ROLLBACK` | ~10ms |

### 2.2 Supabase Local (Recomendado para Int + E2E)

**Vantagens:**
- Auth + Storage + Edge Functions inclusos
- Comandos CLI nativos (`supabase start`, `supabase db reset`)
- Migrações aplicadas automaticamente

**Setup:**
```bash
# Iniciar Supabase local (uma vez, no CI ou local)
supabase start

# Obter URLs e keys
supabase status

# Reset completo entre suites
supabase db reset
```

**Configuração de Teste:**
```typescript
// tests/setup/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const getTestClient = () => {
  return createClient(
    process.env.SUPABASE_TEST_URL!, // http://localhost:54321
    process.env.SUPABASE_TEST_ANON_KEY!
  )
}
```

### 2.3 Transações para Integration Tests

**Estratégia:**
- `beforeEach`: `BEGIN TRANSACTION`
- Executar teste (INSERT/UPDATE/DELETE)
- `afterEach`: `ROLLBACK` (sempre, mesmo em falha)

**Implementação:**
```typescript
// tests/integration/setup.ts
import { getTestClient } from '../setup/supabase'

export const withTransaction = () => {
  let supabase: ReturnType<typeof getTestClient>

  beforeEach(async () => {
    supabase = getTestClient()
    // Supabase não expõe BEGIN diretamente, usar RPC
    await supabase.rpc('begin_transaction')
  })

  afterEach(async () => {
    await supabase.rpc('rollback_transaction')
  })

  return () => supabase
}
```

**Nota:** Supabase JS client não suporta transações explícitas. Alternativas:
1. **Opção A (Recomendada)**: Usar schema temporário por suite
2. **Opção B**: Cleanup manual em afterEach (deletar registros criados)
3. **Opção C**: Reset completo entre suites (mais lento)

### 2.4 Schema Temporário (Alternativa)

**Estratégia:**
- Criar schema `test_<random_id>` no beforeAll
- Aplicar migrações
- Executar testes
- Deletar schema no afterAll

**Implementação:**
```typescript
// tests/integration/setup-schema.ts
import { randomUUID } from 'crypto'
import { getTestClient } from '../setup/supabase'

export const withTestSchema = () => {
  let schemaName: string
  let supabase: ReturnType<typeof getTestClient>

  beforeAll(async () => {
    schemaName = `test_${randomUUID().replace(/-/g, '_')}`
    supabase = getTestClient()

    // Criar schema
    await supabase.rpc('create_schema', { name: schemaName })

    // Aplicar migrações (via CLI ou SQL)
    // ...
  })

  afterAll(async () => {
    await supabase.rpc('drop_schema', { name: schemaName })
  })

  return () => ({ supabase, schemaName })
}
```

---

## 3. FACTORIES

### 3.1 Princípios

- **Minimal Defaults**: Fornecer apenas dados obrigatórios por padrão
- **Override Friendly**: Permitir sobrescrever qualquer campo
- **Deterministic**: Usar seeds fixas quando necessário
- **Relationships**: Criar entidades relacionadas automaticamente se necessário

### 3.2 Factory Base (Genérica)

```typescript
// tests/fixtures/factories/base.factory.ts
import { faker } from '@faker-js/faker'

// Configurar locale pt-BR
faker.locale = 'pt_BR'

export type FactoryOptions<T> = Partial<T>

export const createFactory = <T>(
  defaults: () => T
) => {
  return (overrides?: FactoryOptions<T>): T => {
    return {
      ...defaults(),
      ...overrides,
    }
  }
}
```

### 3.3 User Factory

```typescript
// tests/fixtures/factories/user.factory.ts
import { faker } from '@faker-js/faker'
import { createFactory } from './base.factory'
import type { User } from '@/types/database'

export type UserRole = 'student' | 'teacher' | 'admin'

export const createUser = createFactory<User>(() => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  role: 'student',
  organization_id: faker.string.uuid(), // Sobrescrever em testes
  cpf: faker.br.cpf(), // @faker-js/faker tem suporte a BR
  phone: faker.phone.number('(##) #####-####'),
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
}))

// Variantes
export const createStudent = (overrides?: FactoryOptions<User>) =>
  createUser({ role: 'student', ...overrides })

export const createTeacher = (overrides?: FactoryOptions<User>) =>
  createUser({ role: 'teacher', ...overrides })

export const createAdmin = (overrides?: FactoryOptions<User>) =>
  createUser({ role: 'admin', ...overrides })
```

### 3.4 Course Factory

```typescript
// tests/fixtures/factories/course.factory.ts
import { faker } from '@faker-js/faker'
import { createFactory } from './base.factory'
import type { Course } from '@/types/database'

export const createCourse = createFactory<Course>(() => ({
  id: faker.string.uuid(),
  title: faker.lorem.words(3),
  description: faker.lorem.paragraph(),
  slug: faker.helpers.slugify(faker.lorem.words(3)).toLowerCase(),
  organization_id: faker.string.uuid(),
  instructor_id: faker.string.uuid(),
  status: 'active',
  duration_hours: faker.number.int({ min: 10, max: 200 }),
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
}))
```

### 3.5 Module Factory

```typescript
// tests/fixtures/factories/module.factory.ts
import { faker } from '@faker-js/faker'
import { createFactory } from './base.factory'
import type { CourseModule } from '@/types/database'

export const createModule = createFactory<CourseModule>(() => ({
  id: faker.string.uuid(),
  course_id: faker.string.uuid(),
  title: faker.lorem.words(2),
  description: faker.lorem.sentence(),
  order: faker.number.int({ min: 1, max: 10 }),
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
}))
```

### 3.6 Enrollment Factory

```typescript
// tests/fixtures/factories/enrollment.factory.ts
import { faker } from '@faker-js/faker'
import { createFactory } from './base.factory'
import type { Enrollment } from '@/types/database'

export const createEnrollment = createFactory<Enrollment>(() => ({
  id: faker.string.uuid(),
  student_id: faker.string.uuid(),
  course_id: faker.string.uuid(),
  progress: 0,
  status: 'active',
  enrolled_at: faker.date.past().toISOString(),
  completed_at: null,
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
}))

// Variante: enrollment completo
export const createCompletedEnrollment = (overrides?: FactoryOptions<Enrollment>) =>
  createEnrollment({
    progress: 100,
    status: 'completed',
    completed_at: faker.date.recent().toISOString(),
    ...overrides,
  })
```

### 3.7 Test Factory

```typescript
// tests/fixtures/factories/test.factory.ts
import { faker } from '@faker-js/faker'
import { createFactory } from './base.factory'
import type { Test } from '@/types/database'

export const createTest = createFactory<Test>(() => ({
  id: faker.string.uuid(),
  module_id: faker.string.uuid(),
  title: `Avaliação ${faker.lorem.words(2)}`,
  description: faker.lorem.paragraph(),
  passing_score: 7.0,
  max_attempts: 3,
  time_limit_minutes: 60,
  type: 'graded',
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
}))
```

### 3.8 Question Factory

```typescript
// tests/fixtures/factories/question.factory.ts
import { faker } from '@faker-js/faker'
import { createFactory } from './base.factory'
import type { Question, QuestionOption } from '@/types/database'

export const createQuestion = createFactory<Question>(() => ({
  id: faker.string.uuid(),
  test_id: faker.string.uuid(),
  type: 'multiple_choice',
  question_text: faker.lorem.sentence() + '?',
  order: faker.number.int({ min: 1, max: 20 }),
  points: 1,
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
}))

export const createQuestionOption = createFactory<QuestionOption>(() => ({
  id: faker.string.uuid(),
  question_id: faker.string.uuid(),
  option_text: faker.lorem.sentence(),
  is_correct: false,
  order: faker.number.int({ min: 1, max: 4 }),
}))

// Helper: criar questão com 4 opções (1 correta)
export const createQuestionWithOptions = (overrides?: Partial<Question>) => {
  const question = createQuestion(overrides)
  const options = [
    createQuestionOption({ question_id: question.id, is_correct: true, order: 1 }),
    createQuestionOption({ question_id: question.id, is_correct: false, order: 2 }),
    createQuestionOption({ question_id: question.id, is_correct: false, order: 3 }),
    createQuestionOption({ question_id: question.id, is_correct: false, order: 4 }),
  ]
  return { question, options }
}
```

### 3.9 TestAttempt Factory

```typescript
// tests/fixtures/factories/test-attempt.factory.ts
import { faker } from '@faker-js/faker'
import { createFactory } from './base.factory'
import type { TestAttempt } from '@/types/database'

export const createTestAttempt = createFactory<TestAttempt>(() => ({
  id: faker.string.uuid(),
  test_id: faker.string.uuid(),
  student_id: faker.string.uuid(),
  started_at: faker.date.past().toISOString(),
  submitted_at: faker.date.recent().toISOString(),
  answers: {}, // JSON com respostas
  score: null, // Calculado após submit
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
}))
```

### 3.10 Certificate Factory

```typescript
// tests/fixtures/factories/certificate.factory.ts
import { faker } from '@faker-js/faker'
import { createFactory } from './base.factory'
import type { Certificate } from '@/types/database'

export const createCertificate = createFactory<Certificate>(() => ({
  id: faker.string.uuid(),
  enrollment_id: faker.string.uuid(),
  student_id: faker.string.uuid(),
  course_id: faker.string.uuid(),
  status: 'pending',
  requested_at: faker.date.recent().toISOString(),
  approved_at: null,
  approved_by: null,
  certificate_url: null,
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
}))

export const createApprovedCertificate = (overrides?: FactoryOptions<Certificate>) =>
  createCertificate({
    status: 'approved',
    approved_at: faker.date.recent().toISOString(),
    approved_by: faker.string.uuid(),
    certificate_url: faker.internet.url() + '/certificate.pdf',
    ...overrides,
  })
```

### 3.11 Lista Completa de Factories

| Factory | Arquivo | Relacionamentos |
|---------|---------|-----------------|
| `createUser()` | `user.factory.ts` | organization_id |
| `createCourse()` | `course.factory.ts` | organization_id, instructor_id (user) |
| `createModule()` | `module.factory.ts` | course_id |
| `createLesson()` | `lesson.factory.ts` | module_id |
| `createTest()` | `test.factory.ts` | module_id |
| `createQuestion()` | `question.factory.ts` | test_id |
| `createEnrollment()` | `enrollment.factory.ts` | student_id (user), course_id |
| `createTestAttempt()` | `test-attempt.factory.ts` | test_id, student_id |
| `createTestGrade()` | `test-grade.factory.ts` | test_id, student_id, test_attempt_id |
| `createCertificate()` | `certificate.factory.ts` | enrollment_id, student_id, course_id |

---

## 4. FIXTURES

### 4.1 Quando Usar Fixtures (vs Factories)

**Use Fixtures quando:**
- Dados são **estáveis** e **compartilhados** entre múltiplos testes
- Dados representam **configuração** ou **referência** (ex: tipos de curso)
- Performance: evitar recriar os mesmos dados repetidamente

**Use Factories quando:**
- Dados são **específicos** de um teste
- Precisa de **variabilidade** (cada teste com dados diferentes)
- Testes precisam de **isolamento total**

### 4.2 Organization Fixture (Shared)

```typescript
// tests/fixtures/shared/organizations.fixture.ts
import type { Organization } from '@/types/database'

export const ORGANIZATIONS = {
  MAIN: {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'SwiftLMS Test Organization',
    slug: 'swiftlms-test',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  } satisfies Organization,

  SECONDARY: {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Second Org',
    slug: 'second-org',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  } satisfies Organization,
}
```

### 4.3 User Fixtures (Stable Test Users)

```typescript
// tests/fixtures/shared/users.fixture.ts
import type { User } from '@/types/database'
import { ORGANIZATIONS } from './organizations.fixture'

export const USERS = {
  STUDENT_1: {
    id: '10000000-0000-0000-0000-000000000001',
    email: 'student1@test.com',
    name: 'João Silva',
    role: 'student',
    organization_id: ORGANIZATIONS.MAIN.id,
    cpf: '123.456.789-01', // CPF fictício válido
    phone: '(11) 98765-4321',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  } satisfies User,

  TEACHER_1: {
    id: '20000000-0000-0000-0000-000000000001',
    email: 'teacher1@test.com',
    name: 'Maria Santos',
    role: 'teacher',
    organization_id: ORGANIZATIONS.MAIN.id,
    cpf: '987.654.321-01',
    phone: '(11) 91234-5678',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  } satisfies User,

  ADMIN_1: {
    id: '30000000-0000-0000-0000-000000000001',
    email: 'admin1@test.com',
    name: 'Carlos Admin',
    role: 'admin',
    organization_id: ORGANIZATIONS.MAIN.id,
    cpf: '111.222.333-01',
    phone: '(11) 99999-9999',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  } satisfies User,
}
```

### 4.4 Course Fixture (Sample Course)

```typescript
// tests/fixtures/shared/courses.fixture.ts
import type { Course } from '@/types/database'
import { ORGANIZATIONS, USERS } from './index'

export const COURSES = {
  INTRO_PROGRAMMING: {
    id: '40000000-0000-0000-0000-000000000001',
    title: 'Introdução à Programação',
    description: 'Curso básico de programação com JavaScript',
    slug: 'intro-programming',
    organization_id: ORGANIZATIONS.MAIN.id,
    instructor_id: USERS.TEACHER_1.id,
    status: 'active',
    duration_hours: 40,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  } satisfies Course,
}
```

---

## 5. SEEDS

### 5.1 Propósito

Seeds são usados para:
- **E2E Tests**: popular DB com dados estáveis para testes de interface
- **Local Dev**: facilitar desenvolvimento com dados realistas
- **Smoke Tests**: validar sistema em staging/prod com dados mínimos

### 5.2 Seed 1: Minimal (Para E2E Críticos)

**Conteúdo:**
- 1 organização
- 3 usuários (student, teacher, admin)
- 1 curso com 2 módulos
- 3 lições por módulo
- 1 teste por módulo (5 questões cada)

**Arquivo:**
```typescript
// tests/fixtures/seeds/minimal.seed.ts
import { getTestClient } from '../../setup/supabase'
import { ORGANIZATIONS, USERS, COURSES } from '../shared'

export const seedMinimal = async () => {
  const supabase = getTestClient()

  // 1. Inserir organização
  await supabase.from('organizations').insert(ORGANIZATIONS.MAIN)

  // 2. Inserir usuários
  await supabase.from('users').insert([
    USERS.STUDENT_1,
    USERS.TEACHER_1,
    USERS.ADMIN_1,
  ])

  // 3. Inserir curso
  await supabase.from('courses').insert(COURSES.INTRO_PROGRAMMING)

  // 4. Inserir módulos
  const modules = [
    {
      id: '50000000-0000-0000-0000-000000000001',
      course_id: COURSES.INTRO_PROGRAMMING.id,
      title: 'Módulo 1: Fundamentos',
      order: 1,
    },
    {
      id: '50000000-0000-0000-0000-000000000002',
      course_id: COURSES.INTRO_PROGRAMMING.id,
      title: 'Módulo 2: Práticas',
      order: 2,
    },
  ]
  await supabase.from('course_modules').insert(modules)

  // 5. Inserir lições (simplificado)
  // ...

  // 6. Inserir testes e questões
  // ...

  console.log('✅ Minimal seed completed')
}
```

### 5.3 Seed 2: Complete (Para Testes de Relatórios)

**Conteúdo:**
- 1 organização
- 10 estudantes
- 3 cursos completos
- Enrollments e notas variadas

**Arquivo:**
```typescript
// tests/fixtures/seeds/complete.seed.ts
import { getTestClient } from '../../setup/supabase'
import { createStudent, createCourse, createEnrollment, createTestGrade } from '../factories'

export const seedComplete = async () => {
  const supabase = getTestClient()
  const orgId = '00000000-0000-0000-0000-000000000001'

  // Criar 10 estudantes
  const students = Array.from({ length: 10 }, (_, i) =>
    createStudent({ organization_id: orgId })
  )
  await supabase.from('users').insert(students)

  // Criar 3 cursos
  const courses = Array.from({ length: 3 }, (_, i) =>
    createCourse({ organization_id: orgId })
  )
  await supabase.from('courses').insert(courses)

  // Matricular estudantes em cursos (variado)
  // Estudante 1: matriculado em curso 1 (100%, aprovado)
  // Estudante 2: matriculado em curso 1 (50%, em andamento)
  // ...

  console.log('✅ Complete seed completed')
}
```

### 5.4 Seed 3: RLS Testing (Para Testes de Segurança)

**Conteúdo:**
- 2 organizações
- Usuários em cada organização (student, teacher, admin)
- Cursos e enrollments em cada organização

**Propósito:** Validar que RLS policies isolam dados entre organizações

### 5.5 Seed 4: Performance (Para Testes de Carga)

**Conteúdo:**
- 100 estudantes
- 50 cursos
- 1000 enrollments
- 5000 test attempts

**Propósito:** Validar performance com volume realista

---

## 6. MOCKS E STUBS

### 6.1 Google Drive API

**Estratégia:** Usar MSW (Mock Service Worker) ou stubs manuais

**Mock de API Response:**
```typescript
// tests/fixtures/mocks/google-drive.mock.ts
import { http, HttpResponse } from 'msw'

export const googleDriveMocks = [
  // Listar arquivos de uma pasta
  http.get('https://www.googleapis.com/drive/v3/files', () => {
    return HttpResponse.json({
      files: [
        {
          id: 'file-1',
          name: 'Aula 1.pdf',
          mimeType: 'application/pdf',
          size: '1024000',
        },
        {
          id: 'file-2',
          name: 'Exercícios.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: '512000',
        },
      ],
    })
  }),

  // Download de arquivo
  http.get('https://www.googleapis.com/drive/v3/files/:fileId', () => {
    return HttpResponse.arrayBuffer(
      new ArrayBuffer(1024), // Mock de conteúdo binário
      { headers: { 'Content-Type': 'application/pdf' } }
    )
  }),

  // Erro: timeout
  http.get('https://www.googleapis.com/drive/v3/files/timeout', () => {
    return HttpResponse.error()
  }),
]
```

**Setup em Teste:**
```typescript
// tests/integration/api/gdrive/import.test.ts
import { setupServer } from 'msw/node'
import { googleDriveMocks } from '../../fixtures/mocks/google-drive.mock'

const server = setupServer(...googleDriveMocks)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Google Drive Import', () => {
  it('should import files from folder', async () => {
    // Teste usa mocks automaticamente
  })
})
```

### 6.2 Supabase Storage

**Estratégia:** Usar Supabase local (já inclui Storage) ou mock se necessário

**Mock (se não usar Supabase local):**
```typescript
// tests/fixtures/mocks/supabase-storage.mock.ts
import { vi } from 'vitest'

export const mockSupabaseStorage = () => {
  return {
    upload: vi.fn().mockResolvedValue({
      data: { path: 'test-org/test-file.pdf' },
      error: null,
    }),
    download: vi.fn().mockResolvedValue({
      data: new Blob(['mock content'], { type: 'application/pdf' }),
      error: null,
    }),
    remove: vi.fn().mockResolvedValue({ error: null }),
  }
}
```

### 6.3 Email Service (Futuro)

Se SwiftLMS implementar envio de emails (certificados, notificações):

```typescript
// tests/fixtures/mocks/email.mock.ts
import { vi } from 'vitest'

export const mockEmailService = () => {
  const sendEmail = vi.fn().mockResolvedValue({ success: true })
  return { sendEmail }
}
```

---

## 7. LIMPEZA E RESET

### 7.1 Estratégias por Tipo de Teste

| Tipo | Estratégia | Comando/Código |
|------|-----------|----------------|
| **Unit** | Nada (sem DB) | - |
| **Integration** | Rollback transação | `ROLLBACK` em afterEach |
| **E2E Suite** | Reset completo | `supabase db reset` entre suites |
| **E2E Spec** | Cleanup manual | Deletar registros criados em afterEach |

### 7.2 Cleanup Manual (Integration/E2E)

**Helper:**
```typescript
// tests/utils/cleanup.ts
import { getTestClient } from '../setup/supabase'

export const cleanupDatabase = async (tables: string[]) => {
  const supabase = getTestClient()

  // Deletar em ordem reversa (respeitar FKs)
  for (const table of tables.reverse()) {
    const { error } = await supabase
      .from(table)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Deletar tudo

    if (error) {
      console.error(`Failed to cleanup ${table}:`, error)
    }
  }
}
```

**Uso:**
```typescript
// tests/integration/api/enrollments/create.test.ts
import { cleanupDatabase } from '../../../utils/cleanup'

afterEach(async () => {
  await cleanupDatabase([
    'test_grades',
    'test_attempts',
    'enrollments',
    'users',
    'courses',
  ])
})
```

### 7.3 Reset Completo (Entre Suites E2E)

**Script:**
```bash
#!/bin/bash
# scripts/test-reset-db.sh

echo "🔄 Resetting Supabase database..."
supabase db reset --no-migrations
supabase db push
echo "✅ Database reset complete"
```

**Uso em CI:**
```yaml
# .github/workflows/test.yml
- name: Reset DB before E2E
  run: npm run test:reset-db

- name: Run E2E tests
  run: npm run test:e2e
```

---

## 8. GESTÃO DE SEGREDOS

### 8.1 Variáveis de Ambiente para Testes

**Arquivo:**
```bash
# .env.test (não commitar se houver dados sensíveis)
# Para uso local e CI

# Supabase Local
SUPABASE_TEST_URL=http://localhost:54321
SUPABASE_TEST_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_TEST_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Drive (mock em tests, real apenas em staging)
GOOGLE_DRIVE_CLIENT_ID=mock-client-id
GOOGLE_DRIVE_CLIENT_SECRET=mock-secret
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Outros
NODE_ENV=test
```

### 8.2 Segredos no CI (GitHub Actions)

```yaml
# .github/workflows/test.yml
env:
  SUPABASE_TEST_URL: ${{ secrets.SUPABASE_TEST_URL }}
  SUPABASE_TEST_ANON_KEY: ${{ secrets.SUPABASE_TEST_ANON_KEY }}
```

### 8.3 Regras

- ❌ **NUNCA** commitar:
  - Tokens reais de API (Google Drive, etc.)
  - Senhas de produção
  - Service Role Keys de produção

- ✅ **OK para commitar** (se em `.env.test.example`):
  - URLs de Supabase local (localhost)
  - Keys de Supabase local (geradas automaticamente)
  - Dados fictícios (CPF, email, etc.)

---

## 9. DADOS SINTÉTICOS

### 9.1 Faker.js - Configuração

```typescript
// tests/fixtures/setup-faker.ts
import { faker } from '@faker-js/faker'

// Configurar locale padrão
faker.locale = 'pt_BR'

// Seed determinística (para testes consistentes)
export const setDeterministicSeed = () => {
  faker.seed(12345)
}

// Seed aleatória (para testes de robustez)
export const setRandomSeed = () => {
  faker.seed(Date.now())
}
```

### 9.2 CPF Válidos (Fictícios)

```typescript
// tests/fixtures/utils/cpf.ts
export const generateValidCPF = (): string => {
  // Algoritmo de geração de CPF válido (fictício)
  const randomDigits = Array.from({ length: 9 }, () =>
    Math.floor(Math.random() * 10)
  )

  // Calcular dígitos verificadores
  const firstDigit = calculateCPFDigit(randomDigits, 10)
  const secondDigit = calculateCPFDigit([...randomDigits, firstDigit], 11)

  const cpf = [...randomDigits, firstDigit, secondDigit].join('')

  // Formatar com máscara
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

const calculateCPFDigit = (digits: number[], factor: number): number => {
  const sum = digits.reduce((acc, digit, i) => acc + digit * (factor - i), 0)
  const remainder = sum % 11
  return remainder < 2 ? 0 : 11 - remainder
}
```

### 9.3 Emails de Teste

**Padrão:** `test-{uuid}@swiftlms.local`

```typescript
// tests/fixtures/utils/email.ts
import { faker } from '@faker-js/faker'

export const generateTestEmail = (): string => {
  return `test-${faker.string.uuid()}@swiftlms.local`
}
```

**Vantagem:** Domínio `.local` nunca será real, evita conflitos

---

## 10. SNAPSHOTS

### 10.1 Quando Usar Snapshots

**Use snapshots para:**
- **Estrutura de relatórios** (Excel/PDF): validar que layout não mudou
- **Respostas de API** (contratos): validar que formato JSON é consistente
- **Componentes React**: validar HTML gerado (com cautela)

**NÃO use snapshots para:**
- Dados dinâmicos (timestamps, UUIDs)
- Conteúdo de usuário
- Testes de lógica (preferir assertions explícitas)

### 10.2 Exemplo: Snapshot de API Response

```typescript
// tests/integration/api/courses/list.test.ts
import { expect, it } from 'vitest'
import { getTestClient } from '../../setup/supabase'

it('should return courses in expected format', async () => {
  const supabase = getTestClient()
  const { data } = await supabase.from('courses').select('*').limit(1)

  // Substituir campos dinâmicos antes de snapshot
  const normalized = data?.map(course => ({
    ...course,
    id: '<uuid>',
    created_at: '<timestamp>',
    updated_at: '<timestamp>',
  }))

  expect(normalized).toMatchSnapshot()
})
```

**Snapshot gerado:**
```typescript
// tests/integration/api/courses/__snapshots__/list.test.ts.snap
exports[`should return courses in expected format 1`] = `
[
  {
    "id": "<uuid>",
    "title": "Introdução à Programação",
    "description": "Curso básico...",
    "slug": "intro-programming",
    "status": "active",
    "created_at": "<timestamp>",
    "updated_at": "<timestamp>",
  },
]
`
```

### 10.3 Atualizar Snapshots

```bash
# Atualizar todos os snapshots
npm run test -- -u

# Atualizar snapshots de um arquivo específico
npm run test -- path/to/test.ts -u
```

---

## 11. CHECKLIST DE IMPLEMENTAÇÃO

### 11.1 Fase 1: Factories (Semana 1)

- [ ] Criar `base.factory.ts`
- [ ] Criar factories para 9 entidades principais:
  - [ ] User
  - [ ] Course
  - [ ] Module
  - [ ] Enrollment
  - [ ] Test
  - [ ] Question
  - [ ] TestAttempt
  - [ ] TestGrade
  - [ ] Certificate
- [ ] Adicionar testes unitários para factories (validar campos obrigatórios)

### 11.2 Fase 2: Fixtures e Seeds (Semana 2)

- [ ] Criar fixtures compartilhadas (organizations, users)
- [ ] Criar seed `minimal` (para E2E críticos)
- [ ] Criar seed `complete` (para relatórios)
- [ ] Criar seed `rls` (para segurança)
- [ ] Adicionar script `npm run test:seed`

### 11.3 Fase 3: Mocks (Semana 2-3)

- [ ] Configurar MSW para Google Drive API
- [ ] Criar mocks de respostas (sucesso, erro, timeout)
- [ ] Testar mocks em integration tests

### 11.4 Fase 4: Cleanup (Semana 3)

- [ ] Implementar `cleanupDatabase()` helper
- [ ] Adicionar `afterEach` em todos os integration tests
- [ ] Criar script `test-reset-db.sh`
- [ ] Configurar reset no CI

---

## 12. COMANDOS ÚTEIS

```bash
# Seeds
npm run test:seed:minimal      # Popular DB com dados mínimos
npm run test:seed:complete     # Popular DB com dados completos
npm run test:seed:rls          # Popular DB para testes RLS

# Reset
npm run test:reset-db          # Reset completo do DB de teste

# Factories (exemplos em testes)
npm run test:factory           # Testar factories isoladamente
```

---

## 13. REFERÊNCIAS

- **@faker-js/faker**: https://fakerjs.dev/
- **MSW (Mock Service Worker)**: https://mswjs.io/
- **Supabase CLI**: https://supabase.com/docs/guides/cli
- **Vitest**: https://vitest.dev/

---

**FIM DO PLANO DE DADOS DE TESTE**

> Este documento é vivo e deve ser atualizado conforme novas entidades são adicionadas ou estratégias de teste evoluem.
