# PLANO DE TESTES - SwiftLMS

**Versão:** 1.0  
**Data:** 2025-11-08  
**Baseado em:** CONTEXTO_DERIVADO_AUTOMATICAMENTE.md  
**Status:** Documento vivo - atualizar conforme evolução do projeto

---

## 1. VISÃO GERAL E OBJETIVOS

### 1.1 Propósito da Suíte de Testes

Este plano estabelece a estratégia completa de testes automatizados para o **SwiftLMS**, um Learning Management System construído em Next.js 15 + React 19 + TypeScript + Supabase. O objetivo é garantir:

1. **Confiabilidade**: Sistema estável em produção, com detecção precoce de regressões
2. **Segurança**: Validação rigorosa de RLS policies, autorização e isolamento de dados
3. **Manutenibilidade**: Confiança para refatorar código sem quebrar funcionalidades
4. **Velocidade de desenvolvimento**: Feedback rápido em CI/CD para deploys seguros

### 1.2 Metas de Qualidade Mensuráveis

| Métrica | Valor Atual | Meta 3 Meses | Meta 6 Meses |
|---------|-------------|--------------|--------------|
| **Cobertura de Código** | ~5-10% | 60% | 75% |
| **Cobertura de Fluxos Críticos** | 20% (2/10) | 80% (8/10) | 100% (10/10) |
| **Testes Unit** | 8 arquivos | 50+ arquivos | 100+ arquivos |
| **Testes Integration** | 1 arquivo | 15+ arquivos | 30+ arquivos |
| **Testes E2E** | 0 specs | 5 specs | 10 specs |
| **Tempo de Execução CI** | <1min | <5min | <10min |
| **Taxa de Flakiness** | N/A | <2% | <1% |

### 1.3 Definição de Sucesso

✅ **Critérios de Sucesso Imediatos (1 mês)**:
- Setup completo de Playwright para E2E
- Cobertura de 100% dos fluxos P0 (autenticação, matrícula, testes/notas, certificados)
- CI bloqueando merges com testes falhando
- Cobertura mínima de 40% em lib/services/

✅ **Critérios de Sucesso de Médio Prazo (3 meses)**:
- Todos os endpoints API com integration tests
- E2E cobrindo 9 jornadas críticas de usuário
- Security tests para todas as RLS policies
- Cobertura de 60%+ overall

✅ **Critérios de Sucesso de Longo Prazo (6 meses)**:
- Visual regression tests implementados
- Performance benchmarks estabelecidos
- Documentação completa de casos de teste
- Cultura de TDD no time

---

## 2. PIRÂMIDE DE TESTES (customizada para SwiftLMS)

```
              E2E (5%)
          ┌──────────────┐
         │  Smoke (2%)   │
        ├────────────────┤
       │  Integration    │ (25%)
      ├──────────────────┤
     │   Unit Tests      │ (68%)
    └────────────────────┘
```

### Distribuição e Justificativa

#### **Unit Tests (68% - ~200 arquivos)**

**O quê testar:**
- ✅ Funções puras em `lib/services/` (grade-services, grade-calculator, grade-validation)
- ✅ Utilitários em `lib/utils/`, `lib/validation/`
- ✅ Parsers: `app/api/tests/utils/answer-key.ts` (parseAnswerKeyFromText)
- ✅ Formatadores: date-fns wrappers, currency formatters
- ✅ Validadores Zod: schemas de formulários
- ✅ Mappers: `lib/excel-template-mappers/*`
- ✅ Business logic isolada (sem I/O)

**Exemplo de priorização:**
- P0: `lib/services/grade-services.ts` (assignMaxGradeToStudent, ensureGradeConsistency)
- P0: `lib/services/grade-calculator.ts` (calculateFinalGrade, calculateWeightedAverage)
- P1: `lib/excel-template-engine.ts` (fillTemplate, validateMapping)
- P1: `lib/drive-import-utils.ts` (extractOrderIndex, parseStructure)
- P2: `lib/utils/formatting.ts` (formatDate, formatCurrency)

**Características:**
- Sem dependências externas (DB, API, filesystem)
- Mocks apenas para clock (vi.useFakeTimers) e randomness (vi.spyOn)
- Execução em milissegundos (<100ms por suite)
- Cobertura target: **80% statements, 75% branches**

#### **Integration Tests (25% - ~40 arquivos)**

**O quê testar:**
- ✅ API Routes completas (`app/api/*/route.ts`)
- ✅ Interação com Supabase (autenticação, queries, RLS)
- ✅ Fluxos multi-tabela (enrollment → enrollment_modules → activity_logs)
- ✅ Upload/download Supabase Storage
- ✅ Transações e rollbacks
- ✅ Middleware (autenticação, CSP headers)

**Exemplo de priorização:**
- P0: `app/api/auth/login/route.ts` (autenticação completa)
- P0: `app/api/courses/enroll/route.ts` (matrícula com validações)
- P0: `app/api/tests/[id]/submit/route.ts` (submissão + correção + consolidação)
- P0: `app/api/admin/assign-grade/route.ts` (override manual de nota)
- P1: `app/api/import/drive/route.ts` (importação Google Drive - mock de API)
- P1: `app/api/certificates/check-eligibility/route.ts` (validação de elegibilidade)

**Características:**
- Banco de dados real (Supabase local ou schema temporário)
- **Isolamento via transações**: BEGIN antes de cada teste, ROLLBACK no afterEach
- Mock de APIs externas (Google Drive, Google Docs)
- Cobertura target: **70% statements, 65% branches**

#### **E2E Tests (5% - ~10 specs)**

**O quê testar:**
- ✅ Jornadas completas de usuário (login → ação → resultado)
- ✅ Interação entre frontend e backend
- ✅ Fluxos multi-página
- ✅ Validação de UI (elementos visíveis, estados corretos)

**Exemplo de specs (baseado nos 9 fluxos críticos):**
1. **auth.spec.ts**: Login/logout (email/password + Google OAuth mock)
2. **enrollment.spec.ts**: Matrícula em curso → visualização no dashboard
3. **test-taking.spec.ts**: Realizar teste → submeter → ver resultado
4. **grade-override.spec.ts**: Admin atribui nota 100 → aluno vê nota atualizada
5. **certificate-request.spec.ts**: Solicitar certificado → admin aprova → download PDF
6. **drive-import.spec.ts**: Importar estrutura do Drive (mock de OAuth)
7. **view-as-student.spec.ts**: Admin ativa modo → navega como aluno → desativa
8. **excel-report.spec.ts**: Gerar relatório de notas → download
9. **tcc-submission.spec.ts**: Submeter TCC → avaliação → nota final

**Características:**
- Playwright (Chromium obrigatório, Firefox/WebKit opcionais)
- Banco de dados efêmero (seed antes de cada spec, cleanup depois)
- Mock de OAuth Google via MSW ou stub
- Cobertura target: **100% dos fluxos P0, 80% dos fluxos P1**

#### **Smoke Tests (2% - ~5 specs)**

**O quê testar:**
- ✅ Health check pós-deploy
- ✅ Páginas principais carregam sem erro 500
- ✅ Autenticação funciona
- ✅ DB conectividade

**Exemplo de specs:**
1. **health.spec.ts**: GET /api/health retorna 200
2. **pages-load.spec.ts**: Dashboard, student-dashboard, login carregam
3. **auth-smoke.spec.ts**: Login com credenciais de teste funciona
4. **db-smoke.spec.ts**: Query simples no Supabase retorna dados

**Características:**
- Executados em staging e production
- Sem modificação de dados
- Timeout curto (30s por spec)
- Notificação imediata se falhar

---

## 3. METAS DE COBERTURA E GATES DE CI

### 3.1 Thresholds de Cobertura por Camada

```json
// vitest.config.ts - coverage thresholds
{
  "coverage": {
    "provider": "v8",
    "reporter": ["text", "json", "html", "lcov"],
    "thresholds": {
      "global": {
        "statements": 60,
        "branches": 55,
        "functions": 60,
        "lines": 60
      },
      "lib/services/": {
        "statements": 80,
        "branches": 75,
        "functions": 80,
        "lines": 80
      },
      "lib/utils/": {
        "statements": 70,
        "branches": 65,
        "functions": 70,
        "lines": 70
      },
      "lib/validation/": {
        "statements": 75,
        "branches": 70,
        "functions": 75,
        "lines": 75
      },
      "app/api/": {
        "statements": 50,
        "branches": 45,
        "functions": 50,
        "lines": 50
      }
    },
    "exclude": [
      "**/*.config.{ts,js}",
      "**/node_modules/**",
      "**/*.test.{ts,tsx}",
      "**/__tests__/**",
      "**/types/**",
      "lib/database.types.ts",
      "**/*.d.ts"
    ]
  }
}
```

### 3.2 Gates de Qualidade em CI

#### ❌ BLOQUEIA MERGE (exit code 1):

1. **Qualquer teste falhando** (unit, integration, E2E)
2. **Cobertura abaixo dos thresholds**
3. **ESLint errors** (warnings OK)
4. **TypeScript type errors**
5. **Build failure** (`npm run build`)
6. **Testes conhecidos como flaky falhando 3x consecutivas**

#### ⚠️ WARNING (não bloqueia, mas notifica):

1. **Cobertura diminuiu >2% vs. branch base**
2. **Tempo de execução aumentou >20%**
3. **Novos ESLint warnings** (max +5 permitidos)
4. **Testes marcados como `.skip` ou `.todo`** (deve ter issue linkada)

### 3.3 Política de Skip/Todo em Testes

```typescript
// ✅ PERMITIDO (com justificativa)
test.skip('importar 1000+ arquivos do Drive', () => {
  // TODO: Implementar após otimização de chunking
  // Issue: #123
});

test.todo('validar certificado com QR code');
// Blocked: Aguardando biblioteca de QR code

// ❌ NÃO PERMITIDO (sem contexto)
test.skip('algum teste', () => {
  // Não funciona
});
```

**Regra:** Todo `.skip` ou `.todo` deve ter:
- Comentário explicando o motivo
- Link para issue do GitHub/Jira
- Prazo estimado de resolução (se aplicável)

---

## 4. MATRIZ DE EXECUÇÃO

### 4.1 Navegadores (E2E)

| Navegador | Status | Ambientes | Justificativa |
|-----------|--------|-----------|---------------|
| **Chromium** | ✅ Obrigatório | Local, CI, Staging | Base de usuários (65%+) |
| **Firefox** | ⚠️ Recomendado | CI (1x/semana) | Validação cross-browser |
| **WebKit** | 🔵 Opcional | Local | Usuários macOS/iOS |

**Configuração Playwright:**
```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { 
      name: 'firefox', 
      use: { ...devices['Desktop Firefox'] },
      testMatch: /smoke\.spec\.ts$/ // Apenas smoke em Firefox
    },
  ],
});
```

### 4.2 Dispositivos/Viewports

| Device | Viewport | Prioridade | Casos de Uso |
|--------|----------|------------|--------------|
| **Desktop** | 1920x1080 | P0 | Dashboard admin/instrutor |
| **Tablet** | 768x1024 | P1 | Student dashboard |
| **Mobile** | 375x667 | P2 | Visualização de conteúdo |

### 4.3 Sistemas Operacionais (CI)

- **Linux (Ubuntu 22.04)**: Obrigatório (GitHub Actions / Vercel)
- **macOS**: Opcional (apenas para WebKit se necessário)
- **Windows**: Não suportado inicialmente

### 4.4 Ambientes

| Ambiente | Testes Executados | Frequência | DB |
|----------|-------------------|------------|-----|
| **Local Dev** | Unit, Integration | On-demand (watch) | Supabase local |
| **CI (PR)** | Unit, Integration, E2E | Cada commit | Schema temporário |
| **CI (Merge)** | Unit, Integration, E2E, Security | Cada merge em master | Schema temporário |
| **Staging** | Smoke | Pós-deploy | Staging DB (seed fixture) |
| **Production** | Smoke | Pós-deploy + 1x/hora | Production (read-only queries) |

---

## 5. ESTRATÉGIAS ANTI-FLAKINESS

### 5.1 Isolamento de Testes

```typescript
// ✅ BOM: Cada teste com transação própria
describe('Enrollment API', () => {
  let supabase: SupabaseClient;
  
  beforeEach(async () => {
    supabase = createClient(URL, ANON_KEY);
    await supabase.rpc('begin_transaction'); // Custom RPC
  });
  
  afterEach(async () => {
    await supabase.rpc('rollback_transaction');
  });
  
  test('creates enrollment', async () => {
    // Dados criados aqui são revertidos no afterEach
  });
});

// ❌ RUIM: Estado compartilhado entre testes
let userId: string; // Global mutable
test('create user', () => { userId = '123'; });
test('delete user', () => { /* depende do teste anterior */ });
```

### 5.2 Determinismo

```typescript
// ✅ BOM: Clock controlado
import { vi } from 'vitest';

test('calcula prazo de certificado', () => {
  const now = new Date('2025-01-15T10:00:00Z');
  vi.setSystemTime(now);
  
  const deadline = calculateDeadline();
  expect(deadline).toBe('2025-02-15T10:00:00Z');
  
  vi.useRealTimers();
});

// ✅ BOM: Seeds fixas
const SEED_USERS = [
  { id: 'user-1', email: 'admin@test.com', role: 'admin' },
  { id: 'user-2', email: 'student@test.com', role: 'student' },
];

// ❌ RUIM: Timestamp real (não determinístico)
const createdAt = new Date(); // Diferente a cada execução
```

### 5.3 Esperas Inteligentes (E2E)

```typescript
// ✅ BOM: waitFor com predicado
await page.waitForSelector('[data-testid="grades-loaded"]', {
  state: 'visible',
  timeout: 5000,
});

await expect(page.locator('.grade-card')).toHaveCount(5);

// ✅ BOM: Espera por resposta de API
await page.waitForResponse(
  (res) => res.url().includes('/api/tests/submit') && res.status() === 200
);

// ❌ RUIM: Sleep cego
await page.waitForTimeout(3000); // NUNCA fazer isso
```

### 5.4 Retries

```typescript
// playwright.config.ts
export default defineConfig({
  retries: process.env.CI ? 2 : 0, // Apenas em CI
  
  // Critério: retry apenas em timeouts, não em asserções
  expect: {
    timeout: 10000,
  },
});

// ✅ BOM: Retry específico para testes conhecidos como instáveis
test('importação Google Drive', { retries: 1 }, async () => {
  // API externa pode ter latência variável
});

// ❌ RUIM: Retry para esconder bugs
test('calcula nota', { retries: 3 }, () => {
  // Se falha deterministicamente, não use retry!
});
```

### 5.5 Cleanup Garantido

```typescript
// ✅ BOM: try/finally para cleanup mesmo em falhas
test('upload de arquivo TCC', async () => {
  const filePath = '/tmp/test-tcc.pdf';
  
  try {
    await uploadFile(filePath);
    // asserções
  } finally {
    await deleteFile(filePath); // Sempre executa
  }
});

// ✅ BOM: afterEach com error handling
afterEach(async () => {
  try {
    await cleanupTestData();
  } catch (error) {
    console.error('Cleanup failed:', error);
    // Não propaga erro para não mascarar falha do teste
  }
});
```

### 5.6 Concorrência Controlada

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    // Testes paralelos apenas se independentes
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4, // CI: detectar automaticamente
      },
    },
    
    // Isolar testes que compartilham recursos
    sequence: {
      concurrent: true,
      shuffle: false, // Determinístico
    },
  },
});

// Forçar sequencial para testes com DB compartilhado
describe.sequential('Migration Tests', () => {
  test('migração 001', () => {});
  test('migração 002', () => {}); // Espera 001 terminar
});
```

---

## 6. GESTÃO DE DADOS DE TESTE

### 6.1 Factories/Fixtures

#### Biblioteca Escolhida
**@faker-js/faker** + **Factories manuais** (pattern)

```typescript
// tests/fixtures/factories/user.factory.ts
import { faker } from '@faker-js/faker';
import type { Profile } from '@/lib/database.types';

export const createUser = (overrides?: Partial<Profile>): Profile => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  full_name: faker.person.fullName(),
  role: 'student',
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Uso
const admin = createUser({ role: 'admin', email: 'admin@test.com' });
const student = createUser({ full_name: 'João Silva' });
```

#### Factories Necessárias

1. **UserFactory** (`tests/fixtures/factories/user.factory.ts`)
   - Roles: admin, instructor, student
   - Com/sem avatar
   - Email válido (faker.internet.email())

2. **CourseFactory** (`tests/fixtures/factories/course.factory.ts`)
   - Published/draft
   - Com/sem thumbnail
   - Vários níveis de dificuldade

3. **ModuleFactory** (`tests/fixtures/factories/module.factory.ts`)
   - Required/optional
   - Order index sequencial

4. **SubjectFactory** (`tests/fixtures/factories/subject.factory.ts`)
   - Cargas horárias variadas
   - Com/sem créditos

5. **LessonFactory** (`tests/fixtures/factories/lesson.factory.ts`)
   - Tipos: video, document, text
   - Com/sem drive_file_id

6. **TestFactory** (`tests/fixtures/factories/test.factory.ts`)
   - Com/sem limite de tentativas
   - Passing score configurável
   - Com gabarito associado

7. **EnrollmentFactory** (`tests/fixtures/factories/enrollment.factory.ts`)
   - Status: active, completed, dropped
   - Progress: 0-100%

8. **TestAttemptFactory** (`tests/fixtures/factories/test-attempt.factory.ts`)
   - Submitted/in-progress
   - Score: 0-100 ou null

9. **CertificateFactory** (`tests/fixtures/factories/certificate.factory.ts`)
   - Approval status: pending, approved, rejected
   - Com verification code único

### 6.2 Seeds Idempotentes

```typescript
// tests/fixtures/seeds/basic-structure.seed.ts
import { createClient } from '@supabase/supabase-js';
import { createUser, createCourse, createModule } from '../factories';

export async function seedBasicStructure(supabase: SupabaseClient) {
  // Idempotente: delete antes de inserir
  await supabase.from('profiles').delete().eq('email', 'admin@seed.test');
  
  const admin = createUser({
    id: 'seed-admin-001',
    email: 'admin@seed.test',
    role: 'admin',
  });
  
  await supabase.from('profiles').insert(admin);
  
  const course = createCourse({
    id: 'seed-course-001',
    title: 'Curso de Teste E2E',
    instructor_id: admin.id,
  });
  
  await supabase.from('courses').insert(course);
  
  // Retorna IDs para uso em testes
  return { adminId: admin.id, courseId: course.id };
}
```

#### Seeds Necessárias

1. **basic-structure.seed.ts**: 1 admin, 1 instrutor, 3 alunos, 1 curso completo
2. **grades-scenario.seed.ts**: Alunos com notas variadas (aprovados, reprovados, em progresso)
3. **certificate-scenario.seed.ts**: Alunos elegíveis e não-elegíveis para certificado
4. **drive-import-scenario.seed.ts**: Estrutura de pastas mock para testes de importação

### 6.3 Isolamento e Reversão

#### Unit Tests
```typescript
// SEM DB - Mocks completos
import { vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(),
    // ... mock completo
  })),
}));
```

#### Integration Tests
```typescript
// COM DB - Transações
import { createClient } from '@supabase/supabase-js';

describe('Enrollment API', () => {
  let supabase: SupabaseClient;
  
  beforeEach(async () => {
    supabase = createClient(TEST_URL, TEST_KEY);
    await supabase.rpc('tests_begin_transaction');
  });
  
  afterEach(async () => {
    await supabase.rpc('tests_rollback_transaction');
  });
  
  test('creates enrollment', async () => {
    // Tudo aqui é revertido automaticamente
  });
});
```

**Alternativa: Schema temporário**
```typescript
// tests/setup/db-setup.ts
export async function setupTestSchema() {
  const schemaName = `test_${Date.now()}`;
  await supabase.rpc('create_schema', { name: schemaName });
  await applyMigrations(schemaName);
  return schemaName;
}

export async function teardownTestSchema(schemaName: string) {
  await supabase.rpc('drop_schema', { name: schemaName, cascade: true });
}
```

#### E2E Tests
```typescript
// DB efêmero com seed
beforeAll(async () => {
  // Opção 1: Supabase local com reset
  await exec('supabase db reset');
  await seedBasicStructure();
  
  // Opção 2: Schema temporário
  testSchema = await setupTestSchema();
});

afterAll(async () => {
  if (testSchema) {
    await teardownTestSchema(testSchema);
  }
});
```

### 6.4 Dados Sensíveis

#### ❌ NUNCA:
- Usar emails/CPFs/telefones reais
- Carregar dump de produção para testes
- Commitar credenciais em seeds

#### ✅ SEMPRE:
```typescript
// Dados fictícios válidos
export const TEST_USERS = {
  admin: {
    email: 'admin@test.swiftlms.local', // .local = fake
    cpf: '000.000.000-00', // CPF inválido conhecido
    phone: '+55 11 00000-0000',
  },
  student: {
    email: faker.internet.email({ provider: 'test.swiftlms.local' }),
    cpf: generateFakeCPF(), // Função que gera CPF estruturalmente válido
  },
};

// Anonimização se usar snapshot
function anonymizeSnapshot(data: any) {
  return {
    ...data,
    email: '[REDACTED]',
    full_name: '[REDACTED]',
    cpf: '000.000.000-00',
  };
}
```

---

## 7. OBSERVABILIDADE DOS TESTES

### 7.1 Logs e Traces

#### Níveis de Log por Tipo de Teste

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    silent: process.env.CI ? false : true, // Verbose em CI
    reporters: ['verbose', 'json', 'junit'],
    
    setupFiles: ['./tests/setup/logging.ts'],
  },
});

// tests/setup/logging.ts
import { beforeEach, afterEach } from 'vitest';

const consoleErrors: string[] = [];

beforeEach(() => {
  consoleErrors.length = 0;
  
  // Captura console.error/warn
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    consoleErrors.push(args.join(' '));
  });
});

afterEach(() => {
  // Falha teste se houve console.error não esperado
  if (consoleErrors.length > 0) {
    throw new Error(`Unexpected console.error: ${consoleErrors.join('\n')}`);
  }
  
  vi.restoreAllMocks();
});
```

#### Request/Response Logging (Integration)

```typescript
// tests/utils/http-logger.ts
export function logHttpCall(method: string, url: string, body?: any, response?: any) {
  if (process.env.TEST_LOG_HTTP === 'true') {
    console.log(`[HTTP] ${method} ${url}`);
    if (body) console.log('[REQ]', JSON.stringify(body, null, 2));
    if (response) console.log('[RES]', JSON.stringify(response, null, 2));
  }
}

// Uso em teste
test('creates enrollment', async () => {
  const response = await fetch('/api/courses/enroll', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  
  logHttpCall('POST', '/api/courses/enroll', payload, await response.json());
});
```

### 7.2 Artefatos

#### Configuração Playwright

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    // Screenshots automáticos em falhas
    screenshot: 'only-on-failure',
    
    // Vídeo apenas em retry ou falha
    video: 'retain-on-failure',
    
    // Trace completo em falhas
    trace: 'retain-on-failure',
  },
  
  // Diretório de artefatos
  outputDir: 'tests-results/',
});
```

#### Coverage Reports

```bash
# package.json
{
  "scripts": {
    "test:coverage": "vitest run --coverage",
    "test:coverage:ui": "vitest --coverage --ui"
  }
}

# Gerados:
# - coverage/lcov.info (para Codecov/Coveralls)
# - coverage/index.html (visualização local)
# - coverage/coverage-final.json (para análise programática)
```

#### Artefatos no CI

```yaml
# .github/workflows/test.yml
- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
    
- name: Upload Playwright artifacts
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-artifacts
    path: tests-results/
    retention-days: 7
```

### 7.3 Relatórios

#### JUnit para CI

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    reporters: [
      'default',
      ['junit', { outputFile: 'test-results/junit.xml' }],
    ],
  },
});
```

#### Dashboard de Cobertura

**Opções:**
1. **Codecov** (SaaS, gratuito para open-source)
2. **Coveralls** (similar ao Codecov)
3. **Local HTML**: `npx http-server coverage/`

#### Métricas Customizadas

```typescript
// tests/utils/metrics.ts
export class TestMetrics {
  private static startTime: number;
  
  static startSuite(suiteName: string) {
    this.startTime = Date.now();
    console.log(`[METRICS] Suite ${suiteName} started`);
  }
  
  static endSuite(suiteName: string) {
    const duration = Date.now() - this.startTime;
    console.log(`[METRICS] Suite ${suiteName} finished in ${duration}ms`);
    
    // Enviar para sistema de métricas (se configurado)
    if (process.env.METRICS_ENDPOINT) {
      fetch(process.env.METRICS_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({ suite: suiteName, duration }),
      });
    }
  }
}

// Uso
beforeAll(() => TestMetrics.startSuite('Enrollment Tests'));
afterAll(() => TestMetrics.endSuite('Enrollment Tests'));
```

**Métricas Rastreadas:**
- Tempo de execução por suite
- Taxa de flakiness (testes que passam no retry)
- Cobertura temporal (evolução ao longo do tempo)
- Distribuição de testes (unit/integration/e2e)

---

## 8. MATRIZ DE RISCOS E PRIORIZAÇÃO

### P0 (Quebra impede uso do sistema) - DEVE ter 100% cobertura

#### 8.1 Autenticação e Autorização

**Risco:** Acesso não autorizado a dados sensíveis, bypass de RLS

**Testes Obrigatórios:**
- ✅ Login email/password válido/inválido
- ✅ Logout limpa sessão corretamente
- ✅ Google OAuth flow (mock)
- ✅ Verificação de role em middleware
- ✅ RLS policies para `test_attempts` (aluno vê apenas suas tentativas)
- ✅ RLS policies para `test_grades` (aluno vê apenas suas notas)
- ✅ RLS policies para `enrollments` (aluno não vê matrículas de outros)
- ✅ Admin consegue ver tudo
- ✅ Instrutor vê apenas cursos que leciona
- ✅ View-as-student mode: admin consegue se matricular automaticamente
- ✅ View-as-student mode: admin volta ao perfil normal corretamente

**Arquivos críticos:**
- `middleware.ts` (ensureUserEnrollmentForPreview)
- `app/api/auth/login/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/auth/view-as-student/route.ts`
- Migrações RLS: `20251108000002_add_rls_test_tables.sql`

#### 8.2 Visualização de Cursos e Módulos

**Risco:** Aluno não consegue acessar conteúdo matriculado

**Testes Obrigatórios:**
- ✅ Aluno matriculado vê lista de cursos
- ✅ Aluno não matriculado não vê módulos restritos
- ✅ Módulos obrigatórios aparecem para todos
- ✅ Módulos opcionais aparecem apenas se matriculado (enrollment_modules)
- ✅ Aulas com drive_file_id renderizam embed
- ✅ Aulas com video_url renderizam player

**Arquivos críticos:**
- `app/student-dashboard/my-courses/page.tsx`
- `app/student-dashboard/course/[id]/page.tsx`
- `app/components/VideoPlayer.tsx`
- `app/components/DocumentViewer.tsx`

#### 8.3 Realização de Testes e Atribuição de Notas

**Risco:** Notas incorretas, perda de tentativas, inconsistência de dados

**Testes Obrigatórios:**
- ✅ Criar tentativa (test_attempts) ao iniciar teste
- ✅ Submeter respostas e calcular score corretamente
- ✅ Validação contra gabarito (test_answer_keys)
- ✅ Atualizar test_grades com best_score (upsert)
- ✅ Respeitar max_attempts (se configurado)
- ✅ Atribuição manual de nota 100 por admin (assignMaxGradeToStudent)
- ✅ Verificar consistência test_attempts ↔ test_grades (grade-validation.ts)
- ✅ Registro em activity_logs ao atribuir nota manual
- ✅ Aluno vê nota atualizada imediatamente no dashboard

**Arquivos críticos:**
- `app/api/tests/[id]/submit/route.ts`
- `app/api/admin/assign-grade/route.ts`
- `lib/services/grade-services.ts` (assignMaxGradeToStudent)
- `lib/services/grade-validation.ts` (validateGradeConsistency)
- `lib/services/grade-calculator.ts`

#### 8.4 Cálculo e Exibição de Notas

**Risco:** Média calculada errada, aluno reprovado indevidamente

**Testes Obrigatórios:**
- ✅ Cálculo de média ponderada (por disciplina, por módulo)
- ✅ Integração de nota de TCC (se aplicável)
- ✅ Override manual de nota final (student_grade_overrides)
- ✅ Dashboard de aluno exibe notas corretas
- ✅ Relatório de notas (Excel) com dados corretos
- ✅ Histórico completo do aluno (student-history-mapper)

**Arquivos críticos:**
- `lib/services/grade-calculator.ts`
- `lib/excel-template-mappers/grades-mapper.ts`
- `lib/excel-template-mappers/student-history-mapper.ts`
- `app/student-dashboard/grades/page.tsx`

#### 8.5 RLS Policies (Segurança Crítica)

**Risco:** Data leak, acesso cross-tenant

**Testes Obrigatórios:**
- ✅ Aluno A não vê dados de Aluno B (mesmo curso)
- ✅ Instrutor vê apenas cursos que leciona
- ✅ Admin vê tudo (bypass de RLS)
- ✅ SELECT/INSERT/UPDATE/DELETE policies em todas as tabelas sensíveis
- ✅ Isolamento por organization_id (se multi-tenant no futuro)

**Como testar:**
```typescript
test('RLS: student cannot see other students grades', async () => {
  const studentA = createUser({ role: 'student' });
  const studentB = createUser({ role: 'student' });
  
  // Login como studentA
  const supabaseA = createClientWithAuth(studentA.id);
  
  // Tentar buscar notas de studentB
  const { data, error } = await supabaseA
    .from('test_grades')
    .select('*')
    .eq('user_id', studentB.id);
  
  expect(data).toHaveLength(0); // RLS bloqueou
  expect(error).toBeNull(); // Sem erro, apenas resultados vazios
});
```

**Arquivos críticos:**
- `supabase/migrations/20251108000002_add_rls_test_tables.sql`
- Todas as migrações com `ENABLE ROW LEVEL SECURITY`

---

### P1 (Quebra afeta funcionalidade importante) - DEVE ter 80% cobertura

#### 8.6 Importação Google Drive

**Risco:** Estrutura importada incorretamente, perda de dados

**Testes Obrigatórios:**
- ✅ Descoberta de hierarquia (pasta → módulo, subpasta → disciplina)
- ✅ Extração de order_index de códigos numéricos ("01 - Nome")
- ✅ Criação de aulas (lessons) a partir de arquivos
- ✅ Criação de testes (tests) a partir de .docx
- ✅ Extração de gabarito de Google Docs (parseAnswerKeyFromText)
- ✅ Timeout handling (3min default)
- ✅ Chunking para evitar timeout Vercel

**Como testar:**
```typescript
test('importação Google Drive: estrutura completa', async () => {
  // Mock da API do Google Drive
  nock('https://www.googleapis.com')
    .get('/drive/v3/files')
    .query(true)
    .reply(200, mockDriveResponse);
  
  const result = await POST('/api/import/drive', {
    body: { folderId: 'mock-folder-id', courseId: 'course-1' },
  });
  
  expect(result.modules).toHaveLength(3);
  expect(result.subjects).toHaveLength(8);
  expect(result.lessons).toHaveLength(24);
  expect(result.tests).toHaveLength(5);
});
```

**Arquivos críticos:**
- `app/api/import/drive/route.ts`
- `lib/drive-import-utils.ts`
- `app/api/tests/extract-answer-key/route.ts`
- `app/api/tests/utils/answer-key.ts`

#### 8.7 Geração de Certificados

**Risco:** Certificado não gerado, verificação falha

**Testes Obrigatórios:**
- ✅ Verificação de elegibilidade (progress=100%, notas mínimas, TCC aprovado)
- ✅ Workflow: solicitação → revisão admin → aprovação
- ✅ Geração de certificate_number único
- ✅ Geração de verification_code único
- ✅ Geração de PDF (mock de Puppeteer)
- ✅ Rejeição com motivo

**Arquivos críticos:**
- `app/api/certificates/check-eligibility/route.ts`
- `app/dashboard/certificates/page.tsx` (admin approval)
- `app/student-dashboard/certificates/page.tsx` (student view)

#### 8.8 Submissão de TCC

**Risco:** Arquivo não upado, nota não integrada

**Testes Obrigatórios:**
- ✅ Upload para Supabase Storage
- ✅ Criação de tcc_submissions
- ✅ Avaliação por instrutor (nota + feedback)
- ✅ Integração de nota de TCC com certificado

**Arquivos críticos:**
- `app/student-dashboard/certificates/tcc/page.tsx`
- `app/dashboard/tcc-evaluation/page.tsx`

#### 8.9 Relatórios Excel/PDF

**Risco:** Dados incorretos, template quebrado

**Testes Obrigatórios:**
- ✅ Upload de template .xlsx
- ✅ Mapeamento de campos (MappingEditor)
- ✅ Geração de relatório de matrículas (enrollments-mapper)
- ✅ Geração de relatório de notas (grades-mapper)
- ✅ Geração de histórico do aluno (student-history-mapper)
- ✅ Download de arquivo gerado

**Arquivos críticos:**
- `lib/excel-template-engine.ts`
- `lib/excel-template-mappers/*.ts`
- `app/dashboard/templates/page.tsx`

#### 8.10 View as Student (Teacher)

**Risco:** Admin fica "preso" no modo, dados corrompidos

**Testes Obrigatórios:**
- ✅ Ativar modo view-as-student
- ✅ Auto-matrícula em todos os cursos
- ✅ Navegação como aluno
- ✅ Desativar modo (volta ao perfil admin)
- ✅ Matrículas criadas são marcadas como "preview" (metadata)

**Arquivos críticos:**
- `middleware.ts` (ensureUserEnrollmentForPreview)
- `app/api/auth/view-as-student/route.ts`

---

### P2 (Quebra afeta UX, não funcionalidade core) - PODE ter 50% cobertura

#### 8.11 Filtros e Ordenação

- Filtros de cursos por categoria/dificuldade
- Ordenação de tabelas (alunos, notas)
- Busca de alunos por nome/email

#### 8.12 Preferências de UI

- Tema claro/escuro (se implementado)
- Idioma (i18n)
- Tamanho de fonte

#### 8.13 Tooltips e Ajudas Contextuais

- Tooltips em botões
- Mensagens de erro amigáveis
- Tour de onboarding

---

## 9. COBERTURA OBRIGATÓRIA DE BANCO DE DADOS

### 9.1 Migrações

**Teste: Aplicação completa do zero ao estado atual**

```typescript
// tests/database/migrations.test.ts
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

test('aplica todas as migrações sem erro', async () => {
  // Reset completo
  await execAsync('supabase db reset --db-url $TEST_DB_URL');
  
  // Aplica migrações
  await execAsync('supabase db push --db-url $TEST_DB_URL');
  
  // Verifica estado final
  const { data } = await supabase
    .from('supabase_migrations')
    .select('*')
    .order('version', { ascending: true });
  
  expect(data).toHaveLength(18); // 18 migrações identificadas
  expect(data?.[17].name).toBe('20251108000003_add_performance_indexes');
});

test('rollback de migrações (se implementado)', async () => {
  // Testar down migrations, se existirem
  // SwiftLMS aparentemente não tem down migrations
  test.skip('não implementado');
});
```

### 9.2 Esquema

**PKs, FKs, UNIQUE, CHECK constraints**

```typescript
test('valida constraints do schema', async () => {
  // Unique constraint em email
  const user1 = createUser({ email: 'duplicate@test.com' });
  await supabase.from('profiles').insert(user1);
  
  const user2 = createUser({ email: 'duplicate@test.com' });
  const { error } = await supabase.from('profiles').insert(user2);
  
  expect(error?.code).toBe('23505'); // Postgres unique violation
});

test('valida foreign keys', async () => {
  // FK: enrollments.user_id → profiles.id
  const { error } = await supabase.from('enrollments').insert({
    id: 'enroll-1',
    user_id: 'non-existent-user',
    course_id: 'course-1',
    enrolled_at: new Date().toISOString(),
    status: 'active',
    progress_percentage: 0,
  });
  
  expect(error?.code).toBe('23503'); // FK violation
});

test('valida check constraints', async () => {
  // Exemplo: progress_percentage entre 0 e 100
  const { error } = await supabase.from('enrollments').insert({
    user_id: 'user-1',
    course_id: 'course-1',
    progress_percentage: 150, // Inválido
  });
  
  expect(error?.code).toBe('23514'); // Check constraint violation
});
```

**Índices das queries críticas**

```typescript
test('verifica índices de performance', async () => {
  const { data: indexes } = await supabase.rpc('get_table_indexes', {
    table_name: 'test_grades',
  });
  
  const expectedIndexes = [
    'test_grades_user_id_idx',
    'test_grades_test_id_idx',
    'test_grades_course_id_idx',
    'test_grades_user_test_unique', // UNIQUE (user_id, test_id)
  ];
  
  expectedIndexes.forEach(indexName => {
    expect(indexes).toContainEqual(
      expect.objectContaining({ indexname: indexName })
    );
  });
});

test('queries críticas usam índices (EXPLAIN ANALYZE)', async () => {
  // Criar dados de teste
  await seedManyGrades(1000); // 1000 registros
  
  const query = supabase
    .from('test_grades')
    .select('*')
    .eq('user_id', 'user-1')
    .eq('course_id', 'course-1');
  
  // Executar EXPLAIN ANALYZE
  const plan = await supabase.rpc('explain_query', {
    query: query.toString(),
  });
  
  // Verificar que usa Index Scan (não Seq Scan)
  expect(plan).toContain('Index Scan');
  expect(plan).not.toContain('Seq Scan');
});
```

**Collation/Timezone**

```typescript
test('valida timezone UTC', async () => {
  const { data } = await supabase.rpc('show_timezone');
  expect(data).toBe('UTC');
});

test('timestamps são armazenados em UTC', async () => {
  const now = new Date('2025-01-15T10:00:00-03:00'); // BRT
  
  const user = createUser({ created_at: now.toISOString() });
  await supabase.from('profiles').insert(user);
  
  const { data } = await supabase
    .from('profiles')
    .select('created_at')
    .eq('id', user.id)
    .single();
  
  // Deve retornar em UTC (13:00 UTC)
  expect(data?.created_at).toBe('2025-01-15T13:00:00.000Z');
});
```

**Precisão de tipos (DECIMAL para notas)**

```typescript
test('notas usam precisão adequada', async () => {
  const { data } = await supabase.rpc('get_column_type', {
    table_name: 'test_grades',
    column_name: 'best_score',
  });
  
  expect(data).toBe('numeric'); // Ou DECIMAL, não float
});

test('calcula média sem perda de precisão', async () => {
  const grades = [7.333333, 8.666667, 9.1];
  const average = grades.reduce((a, b) => a + b, 0) / grades.length;
  
  // Arredondar para 2 casas
  expect(Number(average.toFixed(2))).toBe(8.37);
});
```

### 9.3 Integridade

**Cascatas (ON DELETE CASCADE/SET NULL)**

```typescript
test('delete de curso remove módulos (CASCADE)', async () => {
  const course = createCourse({ id: 'course-1' });
  const module = createModule({ course_id: 'course-1' });
  
  await supabase.from('courses').insert(course);
  await supabase.from('course_modules').insert(module);
  
  // Delete curso
  await supabase.from('courses').delete().eq('id', 'course-1');
  
  // Módulos devem ter sido deletados em cascata
  const { data } = await supabase
    .from('course_modules')
    .select('*')
    .eq('id', module.id);
  
  expect(data).toHaveLength(0);
});

test('delete de usuário com soft-delete (deleted_at)', async () => {
  // Se implementado
  test.todo('verificar se SwiftLMS usa soft-delete');
});
```

**Triggers (atualização automática de timestamps)**

```typescript
test('updated_at é atualizado automaticamente', async () => {
  const user = createUser();
  await supabase.from('profiles').insert(user);
  
  const { data: before } = await supabase
    .from('profiles')
    .select('updated_at')
    .eq('id', user.id)
    .single();
  
  // Espera 1 segundo
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Atualiza registro
  await supabase
    .from('profiles')
    .update({ full_name: 'Novo Nome' })
    .eq('id', user.id);
  
  const { data: after } = await supabase
    .from('profiles')
    .select('updated_at')
    .eq('id', user.id)
    .single();
  
  expect(new Date(after!.updated_at).getTime()).toBeGreaterThan(
    new Date(before!.updated_at).getTime()
  );
});

test('trigger de recálculo de progresso', async () => {
  // DATABASE_CHANGES.md menciona trigger fix_all_enrollment_progress
  test.todo('verificar se trigger existe e testar comportamento');
});
```

### 9.4 Transações

**Commit/rollback em operações multi-tabela**

```typescript
test('transação: matrícula + módulos + auditoria (commit)', async () => {
  await supabase.rpc('begin_transaction');
  
  try {
    // 1. Criar enrollment
    const enrollment = createEnrollment();
    await supabase.from('enrollments').insert(enrollment);
    
    // 2. Criar enrollment_modules
    const modules = [
      { enrollment_id: enrollment.id, module_id: 'mod-1' },
      { enrollment_id: enrollment.id, module_id: 'mod-2' },
    ];
    await supabase.from('enrollment_modules').insert(modules);
    
    // 3. Registrar em activity_logs
    await supabase.from('activity_logs').insert({
      user_id: enrollment.user_id,
      entity_type: 'enrollment',
      entity_id: enrollment.id,
      action: 'created',
    });
    
    await supabase.rpc('commit_transaction');
  } catch (error) {
    await supabase.rpc('rollback_transaction');
    throw error;
  }
  
  // Verificar que tudo foi commitado
  const { data } = await supabase
    .from('enrollments')
    .select('*, enrollment_modules(*), activity_logs(*)')
    .eq('id', enrollment.id)
    .single();
  
  expect(data?.enrollment_modules).toHaveLength(2);
  expect(data?.activity_logs).toHaveLength(1);
});

test('transação: rollback em erro', async () => {
  await supabase.rpc('begin_transaction');
  
  try {
    await supabase.from('enrollments').insert(createEnrollment());
    
    // Simular erro (FK inválida)
    await supabase.from('enrollment_modules').insert({
      enrollment_id: 'non-existent',
      module_id: 'mod-1',
    });
    
    await supabase.rpc('commit_transaction');
  } catch (error) {
    await supabase.rpc('rollback_transaction');
  }
  
  // Verificar que enrollment foi revertido
  const { data } = await supabase.from('enrollments').select('*');
  expect(data).toHaveLength(0);
});
```

**Idempotência (importações, webhooks)**

```typescript
test('importação do Drive é idempotente', async () => {
  const payload = { folderId: 'folder-1', courseId: 'course-1' };
  
  // Primeira importação
  const result1 = await POST('/api/import/drive', { body: payload });
  expect(result1.modules).toHaveLength(3);
  
  // Segunda importação (mesmo payload)
  const result2 = await POST('/api/import/drive', { body: payload });
  expect(result2.modules).toHaveLength(3); // Não duplica
  
  // Verificar que não há duplicatas no DB
  const { data } = await supabase
    .from('course_modules')
    .select('*')
    .eq('course_id', 'course-1');
  
  expect(data).toHaveLength(3); // Apenas 3 módulos
});
```

### 9.5 Segurança (RLS Policies)

**Detalhado na seção 8.5 (Matriz de Riscos - P0)**

### 9.6 Desempenho

**Orçamentos de tempo para queries P0**

```typescript
test('query de notas do aluno < 100ms (p50)', async () => {
  await seedManyGrades(500); // 500 registros
  
  const iterations = 10;
  const timings: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    
    await supabase
      .from('test_grades')
      .select('*, tests(title), subjects(title)')
      .eq('user_id', 'user-1')
      .eq('course_id', 'course-1');
    
    timings.push(performance.now() - start);
  }
  
  const p50 = timings.sort()[Math.floor(iterations / 2)];
  const p95 = timings.sort()[Math.floor(iterations * 0.95)];
  
  expect(p50).toBeLessThan(100); // p50 < 100ms
  expect(p95).toBeLessThan(500); // p95 < 500ms
});
```

**Verificação de uso de índices (EXPLAIN ANALYZE)**

```typescript
test('dashboard do aluno usa índices', async () => {
  const plan = await supabase.rpc('explain_analyze', {
    query: `
      SELECT * FROM enrollments
      WHERE user_id = 'user-1'
      AND status = 'active'
    `,
  });
  
  expect(plan).toContain('Index Scan using enrollments_user_id_status_idx');
  expect(plan).not.toContain('Seq Scan');
});
```

### 9.7 Ambiente de Teste

**Opções (escolher uma):**

#### Opção 1: Supabase Local (Docker)

```bash
# Pré-requisito: Docker instalado
supabase start

# Em tests/setup/db.ts
export const TEST_DB_URL = 'postgresql://postgres:postgres@localhost:54322/postgres';
export const TEST_SUPABASE_URL = 'http://localhost:54321';
export const TEST_SUPABASE_ANON_KEY = '...'; # Key local
```

**Prós:**
- ✅ Ambiente idêntico à produção
- ✅ Migrações aplicadas automaticamente
- ✅ Supabase Studio local para debug

**Contras:**
- ⚠️ Requer Docker
- ⚠️ Mais lento que schema temporário

#### Opção 2: Schema Temporário em Instância de Test

```typescript
// tests/setup/db.ts
export async function setupTestSchema() {
  const schemaName = `test_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  
  await supabase.rpc('create_schema', { name: schemaName });
  
  // Aplicar migrações no schema
  await applyMigrationsToSchema(schemaName);
  
  // Configurar search_path
  await supabase.rpc('set_search_path', { path: schemaName });
  
  return schemaName;
}
```

**Prós:**
- ✅ Mais rápido
- ✅ Não requer Docker
- ✅ Isolamento total entre testes

**Contras:**
- ⚠️ Precisa de instância Supabase dedicada para testes
- ⚠️ Migrações precisam ser aplicadas manualmente

#### Opção 3: Testcontainers com PostgreSQL 15+

```typescript
// tests/setup/testcontainers.ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';

export async function setupTestDB() {
  const container = await new PostgreSqlContainer('postgres:15')
    .withDatabase('swiftlms_test')
    .withUsername('test')
    .withPassword('test')
    .start();
  
  const connectionString = container.getConnectionUri();
  
  // Aplicar migrações
  await applyMigrations(connectionString);
  
  return { container, connectionString };
}
```

**Prós:**
- ✅ Isolamento completo
- ✅ Paralelização total
- ✅ Não precisa de Supabase

**Contras:**
- ⚠️ Sem Supabase Auth/Storage (precisa mockar)
- ⚠️ Mais complexo de configurar

**Recomendação:** **Opção 1 (Supabase Local)** para desenvolvimento local e CI.

---

## 10. SELEÇÃO DE FERRAMENTAS

### 10.1 Ferramentas Já Presentes (REUTILIZAR)

| Ferramenta | Versão | Uso | Status |
|------------|--------|-----|--------|
| **Vitest** | 3.2.4 | Test runner (unit + integration) | ✅ Configurado |
| **@testing-library/react** | 16.3.0 | Component testing | ✅ Configurado |
| **@testing-library/jest-dom** | 6.8.0 | Matchers customizados | ✅ Configurado |
| **@testing-library/user-event** | 14.6.1 | Simulação de eventos | ✅ Configurado |
| **JSDOM** | 27.0.0 | DOM environment | ✅ Configurado |
| **vi.fn(), vi.mock()** | Nativo Vitest | Mocking | ✅ Pronto |

### 10.2 Ferramentas a Adicionar

#### E2E: Playwright ✅

**Por que Playwright:**
- ✅ Melhor suporte para Next.js App Router (vs. Cypress)
- ✅ Multi-browser nativo (Chromium, Firefox, WebKit)
- ✅ Auto-wait inteligente (menos flakiness)
- ✅ Parallelization built-in
- ✅ Visual regression com screenshots nativos
- ✅ Trace viewer para debug

**Alternativa considerada e descartada:**
- ❌ Cypress: Não suporta bem App Router, single-browser padrão

**Instalação:**
```bash
npm install -D @playwright/test @playwright/experimental-ct-react
npx playwright install
```

**Configuração inicial:**
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/e2e-junit.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### DB Testing: Supabase CLI + Scripts Customizados ✅

**Por que NÃO usar @testcontainers:**
- Supabase local (via CLI) oferece Supabase Auth + Storage + Edge Functions
- Testcontainers com PostgreSQL puro não tem essas features

**Instalação:**
```bash
# Supabase CLI
npm install -D supabase

# Inicializar (se ainda não feito)
npx supabase init
```

**Scripts de setup:**
```typescript
// tests/setup/supabase-local.ts
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export async function startSupabaseLocal() {
  console.log('Starting Supabase local...');
  await execAsync('supabase start');
  
  // Aguardar serviços subirem
  await new Promise(resolve => setTimeout(resolve, 5000));
}

export async function resetSupabaseDB() {
  console.log('Resetting Supabase DB...');
  await execAsync('supabase db reset');
}

export async function stopSupabaseLocal() {
  console.log('Stopping Supabase local...');
  await execAsync('supabase stop');
}
```

#### Factories: @faker-js/faker ✅

**Por que Faker:**
- ✅ Dados realistas (emails, nomes, datas)
- ✅ Seed determinística (para reproduzibilidade)
- ✅ Amplamente usado (maturidade)

**Instalação:**
```bash
npm install -D @faker-js/faker
```

**Exemplo de uso:**
```typescript
import { faker } from '@faker-js/faker';

// Seed determinística
faker.seed(12345);

export const createUser = (overrides?: Partial<Profile>) => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  full_name: faker.person.fullName(),
  role: 'student' as const,
  ...overrides,
});
```

#### Coverage: Vitest --coverage (c8/v8 nativo) ✅

**Por que usar cobertura nativa:**
- ✅ Já integrada ao Vitest
- ✅ Rápida (V8 engine)
- ✅ Suporte a thresholds por diretório

**Instalação:**
```bash
npm install -D @vitest/coverage-v8
```

**Configuração (já mostrada na seção 3.1)**

#### Visual Regression: Playwright Visual Comparisons (P2) 🔵

**Por que adiar:**
- Visual regression é P2 (não bloqueia funcionalidade)
- Gera muitos artefatos (custo de storage)
- Sujeito a flakiness (fontes, anti-aliasing)

**Quando implementar:**
- Após atingir 60% de cobertura funcional
- Quando houver design system estável
- Se houver regressões visuais recorrentes

**Como implementar (futuro):**
```typescript
// tests/e2e/visual/dashboard.spec.ts
test('dashboard layout estável', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveScreenshot('dashboard.png', {
    maxDiffPixels: 100, // Tolerância
  });
});
```

### 10.3 Integração com Stack Existente

```
┌──────────────────────────────────────────────┐
│          Vitest (Unit + Integration)         │
│  - vitest.config.ts                          │
│  - vitest.setup.ts                           │
│  - @testing-library/react                    │
└──────────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────┐
│           Playwright (E2E)                   │
│  - playwright.config.ts                      │
│  - tests/e2e/*.spec.ts                       │
└──────────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────┐
│        Supabase Local (DB de Teste)          │
│  - supabase start/stop/reset                 │
│  - tests/setup/supabase-local.ts             │
└──────────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────┐
│         Factories (@faker-js/faker)          │
│  - tests/fixtures/factories/*.ts             │
└──────────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────┐
│            CI (GitHub Actions)               │
│  - .github/workflows/test.yml                │
│  - JUnit reports, Coverage upload            │
└──────────────────────────────────────────────┘
```

---

## 11. INTEGRAÇÃO COM CI/CD (Vercel + GitHub Actions)

### 11.1 Setup do Ambiente de Teste

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  pull_request:
    branches: [master]
  push:
    branches: [master]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: ESLint
        run: npm run lint
      
      - name: TypeScript Check
        run: npm run type-check

  unit-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run Unit Tests
        run: npm run test:ci
      
      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unit
      
      - name: Check Coverage Thresholds
        run: npm run test:coverage

  integration-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest
      
      - name: Start Supabase Local
        run: supabase start
      
      - name: Apply Migrations
        run: supabase db reset --db-url postgresql://postgres:postgres@localhost:54322/postgres
      
      - name: Run Integration Tests
        run: npm run test:integration
        env:
          TEST_SUPABASE_URL: http://localhost:54321
          TEST_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
      
      - name: Stop Supabase
        if: always()
        run: supabase stop

  e2e-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps chromium
      
      - name: Setup Supabase Local
        uses: supabase/setup-cli@v1
      
      - name: Start Supabase Local
        run: supabase start
      
      - name: Seed Test Data
        run: npm run test:seed
      
      - name: Build Next.js
        run: npm run build
      
      - name: Run E2E Tests
        run: npx playwright test
        env:
          CI: true
      
      - name: Upload Playwright Report
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
      
      - name: Upload Screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-screenshots
          path: tests-results/
          retention-days: 7

  build-production:
    runs-on: ubuntu-latest
    needs: [lint-and-typecheck, unit-tests, integration-tests]
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
      
      - name: Upload Build Artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build
          path: .next/
          retention-days: 1
```

### 11.2 Jobs Separados (Resumo)

| Job | Duração Estimada | Paralelo | Bloqueia Merge |
|-----|------------------|----------|----------------|
| **Lint & Type Check** | ~1min | ✅ | ✅ |
| **Unit Tests** | ~2-5min | ✅ | ✅ |
| **Integration Tests** | ~5-10min | ✅ | ✅ |
| **E2E Tests** | ~10-20min | ⚠️ (via sharding) | ✅ |
| **Build Production** | ~3-5min | ❌ (depende dos anteriores) | ✅ |
| **Security Static Analysis** | ~2min | ✅ | ⚠️ (warning) |
| **Smoke Post-Deploy** | ~1min | ❌ (após deploy) | ⚠️ (alerta) |

**Total (pipeline completo):** ~15-25min

### 11.3 Gates de Qualidade

#### ❌ BLOQUEIA MERGE:

```yaml
# .github/workflows/test.yml (resumido)
jobs:
  quality-gate:
    runs-on: ubuntu-latest
    needs: [lint-and-typecheck, unit-tests, integration-tests, e2e-tests, build-production]
    steps:
      - name: All Checks Passed
        run: echo "✅ Qualidade validada. Merge permitido."
```

**Condições:**
- ✅ Todos os jobs anteriores com `status: success`
- ✅ Cobertura >= thresholds (verificado em `unit-tests` job)
- ✅ Lint sem erros
- ✅ Build sucesso

#### ⚠️ WARNING (Não Bloqueia):

```yaml
# Exemplo: verificar diminuição de cobertura
- name: Compare Coverage
  run: |
    BASE_COVERAGE=$(curl -s https://codecov.io/api/.../coverage/master | jq '.commit.totals.coverage')
    CURRENT_COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
    DIFF=$(echo "$CURRENT_COVERAGE - $BASE_COVERAGE" | bc)
    
    if (( $(echo "$DIFF < -2" | bc -l) )); then
      echo "⚠️ Warning: Coverage decreased by ${DIFF}%"
      # Comentar no PR (usando GitHub API)
    fi
```

### 11.4 Artefatos

```yaml
# Upload de coverage
- name: Upload Coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
    flags: unit,integration
    name: swiftlms-coverage

# Upload de JUnit (para dashboards)
- name: Upload Test Results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: test-results
    path: test-results/junit.xml

# Upload de Playwright artifacts (apenas em falha)
- name: Upload Playwright Report
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
    retention-days: 7
```

### 11.5 Otimizações

#### Cache de Dependências

```yaml
- name: Setup Node
  uses: actions/setup-node@v4
  with:
    node-version: '22'
    cache: 'npm' # ✅ Cache automático de node_modules
```

#### Cache de Playwright Browsers

```yaml
- name: Cache Playwright Browsers
  uses: actions/cache@v3
  id: playwright-cache
  with:
    path: ~/.cache/ms-playwright
    key: ${{ runner.os }}-playwright-${{ hashFiles('package-lock.json') }}

- name: Install Playwright Browsers
  if: steps.playwright-cache.outputs.cache-hit != 'true'
  run: npx playwright install --with-deps chromium
```

#### Paralelização Inteligente

```yaml
# Vitest: usar todos os cores disponíveis
- name: Run Unit Tests
  run: npm run test:ci -- --maxConcurrency=4

# Playwright: sharding em múltiplos runners
strategy:
  matrix:
    shardIndex: [1, 2, 3, 4]
    shardTotal: [4]
steps:
  - name: Run E2E Tests (Shard ${{ matrix.shardIndex }})
    run: npx playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
```

### 11.6 Smoke Tests Post-Deploy (Vercel)

```yaml
# .github/workflows/smoke-tests.yml
name: Smoke Tests

on:
  deployment_status:

jobs:
  smoke:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'
      
      - name: Install Playwright
        run: npm install -D @playwright/test && npx playwright install chromium
      
      - name: Run Smoke Tests
        run: npx playwright test tests/e2e/smoke/
        env:
          BASE_URL: ${{ github.event.deployment_status.target_url }}
      
      - name: Notify on Failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "🚨 Smoke tests failed on ${{ github.event.deployment_status.environment }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 12. CASOS ESPECIAIS DO SWIFTLMS

### 12.1 Google Drive Integration

#### Unit Tests: Parsing de Respostas da API

```typescript
// tests/unit/drive-import-utils.test.ts
import { extractOrderIndex, parseStructure } from '@/lib/drive-import-utils';

describe('Drive Import Utils', () => {
  test('extrai order_index de código numérico', () => {
    expect(extractOrderIndex('01 - Módulo Introdução')).toBe(1);
    expect(extractOrderIndex('10 - Módulo Avançado')).toBe(10);
    expect(extractOrderIndex('Sem código')).toBe(0); // Fallback
  });
  
  test('parseia estrutura de pastas', () => {
    const mockFiles = [
      { id: '1', name: '01 - Módulo 1', mimeType: 'folder', parents: ['root'] },
      { id: '2', name: '01 - Disciplina A', mimeType: 'folder', parents: ['1'] },
      { id: '3', name: 'Aula 1.pdf', mimeType: 'application/pdf', parents: ['2'] },
    ];
    
    const structure = parseStructure(mockFiles);
    
    expect(structure.modules).toHaveLength(1);
    expect(structure.modules[0].subjects).toHaveLength(1);
    expect(structure.modules[0].subjects[0].lessons).toHaveLength(1);
  });
});
```

#### Integration Tests: Mock de API com MSW

```typescript
// tests/integration/drive-import.test.ts
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  // Mock Google Drive API
  http.get('https://www.googleapis.com/drive/v3/files', () => {
    return HttpResponse.json({
      files: [
        { id: '1', name: '01 - Módulo 1', mimeType: 'application/vnd.google-apps.folder' },
        // ...
      ],
    });
  }),
  
  // Mock Google Docs Export
  http.get('https://docs.google.com/document/:id/export', () => {
    return HttpResponse.text('1. B\n2. A\n3. C\n'); // Gabarito
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('importa estrutura completa do Drive', async () => {
  const response = await POST('/api/import/drive', {
    body: { folderId: 'root', courseId: 'course-1', accessToken: 'mock-token' },
  });
  
  expect(response.status).toBe(200);
  expect(response.modules).toHaveLength(1);
  
  // Verificar no DB
  const { data } = await supabase
    .from('course_modules')
    .select('*, subjects(*, lessons(*))')
    .eq('course_id', 'course-1');
  
  expect(data).toHaveLength(1);
});
```

#### E2E Tests: Usar Conta de Teste do Google

```typescript
// tests/e2e/drive-import.spec.ts
import { test, expect } from '@playwright/test';

test('importa estrutura do Drive (OAuth mock)', async ({ page, context }) => {
  // Mock OAuth popup
  await context.route('https://accounts.google.com/o/oauth2/**', route => {
    route.fulfill({
      status: 302,
      headers: {
        Location: 'http://localhost:3000/dashboard?code=mock-auth-code',
      },
    });
  });
  
  // Mock Google Drive API
  await context.route('https://www.googleapis.com/drive/v3/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ files: mockDriveStructure }),
    });
  });
  
  await page.goto('/dashboard/structure');
  await page.click('button:has-text("Importar do Google Drive")');
  
  // Aguardar importação
  await expect(page.locator('.import-status')).toHaveText('Importação concluída', {
    timeout: 30000,
  });
  
  // Verificar módulos criados
  await page.goto('/dashboard/modules');
  await expect(page.locator('.module-card')).toHaveCount(3);
});
```

#### Segurança: Nunca Commitar Tokens Reais

```bash
# .gitignore (já deve ter)
.env.local
.env*.local
*.token
credentials.json

# .env.test.example (template para testes)
GOOGLE_DRIVE_TEST_TOKEN=mock-token-not-real
GOOGLE_DRIVE_TEST_FOLDER_ID=mock-folder-id
```

### 12.2 PDF/Excel Generation

#### Unit Tests: Conteúdo Gerado (Estrutura JSON)

```typescript
// tests/unit/excel-template-engine.test.ts
import { fillTemplate } from '@/lib/excel-template-engine';
import { gradesMapper } from '@/lib/excel-template-mappers/grades-mapper';

test('preenche template de notas corretamente', () => {
  const template = {
    sheetName: 'Notas',
    columns: ['Nome', 'Nota', 'Status'],
    mapping: {
      'Nome': 'full_name',
      'Nota': 'best_score',
      'Status': 'status',
    },
  };
  
  const data = [
    { full_name: 'João Silva', best_score: 85, status: 'Aprovado' },
    { full_name: 'Maria Santos', best_score: 62, status: 'Aprovado' },
  ];
  
  const filled = fillTemplate(template, data, gradesMapper);
  
  expect(filled.rows).toHaveLength(2);
  expect(filled.rows[0]).toEqual(['João Silva', 85, 'Aprovado']);
});
```

#### Integration Tests: Validar Bytes Gerados (Magic Numbers)

```typescript
// tests/integration/excel-generation.test.ts
test('gera Excel válido', async () => {
  const response = await POST('/api/reports/grades', {
    body: { courseId: 'course-1', templateId: 'template-1' },
  });
  
  expect(response.headers.get('content-type')).toBe(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  // Magic number de .xlsx: PK (50 4B 03 04)
  expect(bytes[0]).toBe(0x50); // P
  expect(bytes[1]).toBe(0x4B); // K
  expect(bytes[2]).toBe(0x03);
  expect(bytes[3]).toBe(0x04);
  
  // Verificar tamanho mínimo
  expect(buffer.byteLength).toBeGreaterThan(1000);
});

test('gera PDF válido', async () => {
  const response = await POST('/api/certificates/generate', {
    body: { certificateId: 'cert-1' },
  });
  
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  // Magic number de PDF: %PDF-
  expect(String.fromCharCode(...bytes.slice(0, 5))).toBe('%PDF-');
});
```

#### E2E Tests: Download e Abertura Simulada

```typescript
// tests/e2e/excel-report.spec.ts
test('baixa relatório de notas', async ({ page }) => {
  await page.goto('/dashboard/reports');
  await page.selectOption('select[name="report-type"]', 'grades');
  
  // Interceptar download
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('button:has-text("Gerar Relatório")'),
  ]);
  
  expect(download.suggestedFilename()).toMatch(/relatorio-notas.*\.xlsx/);
  
  const path = await download.path();
  expect(path).toBeTruthy();
  
  // Verificar tamanho
  const fs = require('node:fs');
  const stats = fs.statSync(path!);
  expect(stats.size).toBeGreaterThan(1000);
});
```

### 12.3 Supabase Storage

#### Integration Tests: Upload → Download → Hash Validation

```typescript
// tests/integration/storage.test.ts
import crypto from 'node:crypto';

test('upload e download de arquivo TCC', async () => {
  const fileContent = 'Conteúdo do TCC em PDF...';
  const fileHash = crypto.createHash('sha256').update(fileContent).digest('hex');
  
  // Upload
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('tcc_files')
    .upload('user-1/tcc.pdf', Buffer.from(fileContent), {
      contentType: 'application/pdf',
    });
  
  expect(uploadError).toBeNull();
  expect(uploadData?.path).toBe('user-1/tcc.pdf');
  
  // Download
  const { data: downloadData, error: downloadError } = await supabase.storage
    .from('tcc_files')
    .download('user-1/tcc.pdf');
  
  expect(downloadError).toBeNull();
  
  const downloadedContent = await downloadData!.text();
  const downloadedHash = crypto.createHash('sha256').update(downloadedContent).digest('hex');
  
  expect(downloadedHash).toBe(fileHash); // Integridade validada
});
```

#### Cleanup: Deletar Arquivos de Teste no afterEach

```typescript
afterEach(async () => {
  // Deletar todos os arquivos de teste
  const { data: files } = await supabase.storage
    .from('tcc_files')
    .list('user-1/');
  
  if (files) {
    const paths = files.map(f => `user-1/${f.name}`);
    await supabase.storage.from('tcc_files').remove(paths);
  }
});
```

### 12.4 Cálculo de Notas

#### Unit Tests: Funções Puras de Cálculo

```typescript
// tests/unit/grade-calculator.test.ts
import { calculateWeightedAverage, isApproved } from '@/lib/services/grade-calculator';

describe('Grade Calculator', () => {
  test('calcula média ponderada corretamente', () => {
    const grades = [
      { score: 7.5, weight: 2 },
      { score: 8.0, weight: 3 },
      { score: 9.0, weight: 1 },
    ];
    
    const avg = calculateWeightedAverage(grades);
    
    // (7.5*2 + 8.0*3 + 9.0*1) / (2+3+1) = 48/6 = 8.0
    expect(avg).toBe(8.0);
  });
  
  test('determina aprovação (nota >= 7.0)', () => {
    expect(isApproved(7.0)).toBe(true);
    expect(isApproved(8.5)).toBe(true);
    expect(isApproved(6.9)).toBe(false);
    expect(isApproved(5.0)).toBe(false);
  });
  
  test('trata caso sem notas', () => {
    expect(calculateWeightedAverage([])).toBe(0);
  });
});
```

#### Integration Tests: Persistência Correta no DB

```typescript
// tests/integration/grade-calculation.test.ts
test('calcula e persiste nota final corretamente', async () => {
  const student = createUser({ role: 'student' });
  const course = createCourse();
  const test1 = createTest({ course_id: course.id, weight: 2 });
  const test2 = createTest({ course_id: course.id, weight: 3 });
  
  await supabase.from('profiles').insert(student);
  await supabase.from('courses').insert(course);
  await supabase.from('tests').insert([test1, test2]);
  
  // Simular tentativas
  await supabase.from('test_grades').insert([
    { user_id: student.id, test_id: test1.id, best_score: 7.5, course_id: course.id },
    { user_id: student.id, test_id: test2.id, best_score: 8.0, course_id: course.id },
  ]);
  
  // Calcular nota final
  const response = await POST('/api/grades/calculate', {
    body: { userId: student.id, courseId: course.id },
  });
  
  expect(response.finalGrade).toBe(7.8); // (7.5*2 + 8.0*3) / 5
  
  // Verificar persistência
  const { data } = await supabase
    .from('enrollments')
    .select('final_grade')
    .eq('user_id', student.id)
    .eq('course_id', course.id)
    .single();
  
  expect(data?.final_grade).toBe(7.8);
});
```

#### E2E Tests: Visualização no Dashboard do Estudante

```typescript
// tests/e2e/grades.spec.ts
test('aluno visualiza suas notas no dashboard', async ({ page }) => {
  // Seed: aluno com notas
  await seedStudent({
    email: 'student@test.com',
    grades: [
      { test: 'Teste 1', score: 8.5 },
      { test: 'Teste 2', score: 7.0 },
    ],
  });
  
  // Login
  await page.goto('/login');
  await page.fill('input[name="email"]', 'student@test.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // Navegar para notas
  await page.goto('/student-dashboard/grades');
  
  // Verificar notas exibidas
  await expect(page.locator('.grade-card >> text=Teste 1')).toBeVisible();
  await expect(page.locator('.grade-card >> text=8.5')).toBeVisible();
  await expect(page.locator('.grade-card >> text=Teste 2')).toBeVisible();
  await expect(page.locator('.grade-card >> text=7.0')).toBeVisible();
  
  // Verificar média
  await expect(page.locator('.final-grade')).toHaveText('7.75');
});
```

---

## 13. POLÍTICAS DE MANUTENÇÃO

### 13.1 Periodicidade

#### Semanal (Segunda-feira, 30min)

**Responsável:** QA Lead ou Dev Sênior

**Ações:**
- ✅ Revisar testes flaky (>2 falhas nos últimos 7 dias)
- ✅ Analisar relatório de cobertura (aumentou/diminuiu?)
- ✅ Verificar duração de CI (está aumentando?)
- ✅ Revisar PRs com testes `.skip` ou `.todo` (há issue linkada?)

**Critério de Sucesso:**
- Taxa de flakiness <2%
- Duração de CI estável (variação <10%)
- Zero `.skip` sem issue

#### Mensal (Primeira Sexta-feira, 2h)

**Responsável:** Time completo (sessão de pairing)

**Ações:**
- ✅ Revisar cobertura por módulo (identificar gaps)
- ✅ Adicionar casos de teste faltantes (pelo menos 5 novos testes)
- ✅ Atualizar factories se houver mudanças no schema
- ✅ Revisar seeds (ainda são representativas?)
- ✅ Executar testes de segurança (RLS, SQL injection)

**Critério de Sucesso:**
- Cobertura aumentou ou manteve
- Pelo menos 5 novos testes adicionados
- Seeds atualizadas se houve migration

#### Trimestral (Planning Sprint, 1 dia)

**Responsável:** Tech Lead + QA

**Ações:**
- ✅ Revisar riscos P0/P1/P2 (há novos fluxos críticos?)
- ✅ Atualizar PLANO_DE_TESTES.md
- ✅ Atualizar CONTEXTO_DERIVADO_AUTOMATICAMENTE.md
- ✅ Revisar artefatos de CI (storage usage, custo)
- ✅ Planejar melhorias (ex: adicionar visual regression)
- ✅ Treinamento de time (novas ferramentas, melhores práticas)

**Critério de Sucesso:**
- Documentação atualizada
- Roadmap de testes definido para próximo trimestre
- Time alinhado com práticas

#### Semestral (Offsite, meio período)

**Responsável:** Time completo + Stakeholders

**Ações:**
- ✅ Auditoria completa de segurança (RLS, Auth, Storage)
- ✅ Review de arquitetura de testes (ferramentas ainda adequadas?)
- ✅ Análise de ROI (tempo economizado com testes vs. custo de manutenção)
- ✅ Planejar migração de ferramentas se necessário
- ✅ Retrospectiva: o que funcionou? O que não funcionou?

**Critério de Sucesso:**
- Relatório de auditoria com ações definidas
- Consenso sobre ferramentas
- Plano de ação para próximos 6 meses

### 13.2 Evolução

#### Triggers de Adição de Testes

**Regra:** Para cada mudança de código, avaliar necessidade de teste

| Mudança | Teste Obrigatório |
|---------|-------------------|
| **Novo endpoint API** | ✅ Integration test |
| **Novo componente crítico** | ✅ Unit test (lógica) + Component test (renderização) |
| **Novo fluxo de usuário** | ✅ E2E test |
| **Mudança em RLS policy** | ✅ Security test |
| **Nova migração** | ✅ Migration test (aplicação + rollback) |
| **Refactor sem mudança de comportamento** | ⚠️ Testes existentes devem passar |
| **Bug fix** | ✅ Regression test (reproduzir bug antes de corrigir) |

**Processo:**
1. Dev cria PR com código + testes
2. CI valida testes passam
3. Reviewer verifica cobertura adequada
4. Merge apenas se cobertura >= threshold

#### Exemplo de Regression Test (Bug Fix)

```typescript
// Issue #456: Aluno conseguia ver notas de outro aluno
test('regression: RLS impede acesso cross-student (#456)', async () => {
  const studentA = createUser({ id: 'student-a' });
  const studentB = createUser({ id: 'student-b' });
  
  await supabase.from('profiles').insert([studentA, studentB]);
  
  // Criar nota para studentB
  await supabase.from('test_grades').insert({
    user_id: studentB.id,
    test_id: 'test-1',
    best_score: 95,
  });
  
  // Login como studentA
  const supabaseA = createClientWithAuth(studentA.id);
  
  // Tentar acessar nota de studentB (antes do fix, retornava dados)
  const { data, error } = await supabaseA
    .from('test_grades')
    .select('*')
    .eq('user_id', studentB.id);
  
  expect(data).toHaveLength(0); // RLS bloqueou (fix aplicado)
  expect(error).toBeNull();
});
```

### 13.3 Documentação

#### Atualizar CONTEXTO_DERIVADO quando houver:

1. **Nova migração**
   - Adicionar em seção "4. DOMÍNIO E MODELO DE DADOS"
   - Atualizar contagem de migrações
   - Documentar novas tabelas/colunas

2. **Nova integração externa**
   - Adicionar em seção "6. INTEGRAÇÕES EXTERNAS"
   - Documentar autenticação, endpoints, timeouts

3. **Mudança arquitetural**
   - Atualizar seção "2. ESTRUTURA DO PROJETO"
   - Atualizar "11. MAPEAMENTO DE DEPENDÊNCIAS"

4. **Split/merge de módulos**
   - Revisar seção "5. FLUXOS CRÍTICOS"
   - Atualizar "10. FLUXOS CRÍTICOS PARA SUÍTE DE TESTES"

#### Atualizar PLANO_DE_TESTES.md quando houver:

1. **Nova ferramenta adicionada**
   - Seção "10. SELEÇÃO DE FERRAMENTAS"
   - Justificar escolha, alternativas consideradas

2. **Mudança em thresholds de cobertura**
   - Seção "3. METAS DE COBERTURA"
   - Documentar motivo da mudança

3. **Novo risco identificado**
   - Seção "8. MATRIZ DE RISCOS"
   - Priorizar (P0/P1/P2)

4. **Mudança em CI/CD**
   - Seção "11. INTEGRAÇÃO COM CI/CD"
   - Atualizar workflows

**Versionamento:**
- Usar semver (1.0, 1.1, 2.0)
- Changelog no topo do documento
- Datas de alteração

**Exemplo de Changelog:**
```markdown
## Changelog

### 1.2 (2025-02-15)
- Adicionado: Visual regression tests (Seção 10.2)
- Atualizado: Thresholds de cobertura (Seção 3.1)
- Removido: Suporte a WebKit (Seção 4.1)

### 1.1 (2025-01-20)
- Adicionado: Security tests para RLS (Seção 8.5)
- Atualizado: Setup de CI com Supabase local (Seção 11.1)

### 1.0 (2025-11-08)
- Versão inicial
```

---

## 14. CRONOGRAMA DE IMPLEMENTAÇÃO

### Fase 1: Fundação (Semanas 1-2)

**Objetivo:** Estabelecer infraestrutura básica de testes

**Tarefas:**

| Tarefa | Responsável | Duração | Entregável |
|--------|-------------|---------|------------|
| Instalar e configurar Playwright | Dev 1 | 2h | `playwright.config.ts` |
| Criar factories básicas (User, Course, Test) | Dev 2 | 4h | `tests/fixtures/factories/` |
| Setup Supabase local para testes | Dev 1 | 3h | `tests/setup/supabase-local.ts` |
| Configurar CI básico (lint + type-check + unit) | Dev 2 | 3h | `.github/workflows/test.yml` |
| Primeiros 10 unit tests (lib/services/) | Time | 6h | Cobertura 30% em lib/services/ |

**Critério de Sucesso:**
- ✅ CI rodando em PRs
- ✅ Playwright instalado e executando teste de exemplo
- ✅ Pelo menos 10 unit tests passando

**Riscos:**
- ⚠️ Dificuldade em configurar Supabase local (mitigação: usar schema temporário)
- ⚠️ Time não familiarizado com Playwright (mitigação: pairing session)

---

### Fase 2: Integration (Semanas 3-4)

**Objetivo:** Cobrir endpoints API críticos

**Tarefas:**

| Tarefa | Responsável | Duração | Entregável |
|--------|-------------|---------|------------|
| Setup de DB de teste (transações) | Dev 1 | 4h | `tests/setup/db.ts` |
| Integration tests: Autenticação (login/logout) | Dev 2 | 3h | `tests/integration/auth.test.ts` |
| Integration tests: Matrícula | Dev 3 | 3h | `tests/integration/enrollment.test.ts` |
| Integration tests: Submissão de teste | Dev 1 | 4h | `tests/integration/test-submission.test.ts` |
| Integration tests: Atribuição de nota (admin) | Dev 2 | 3h | `tests/integration/grade-assignment.test.ts` |
| RLS policy tests | Dev 3 | 4h | `tests/security/rls.test.ts` |
| Adicionar job de integration tests no CI | Dev 1 | 2h | Atualizar workflow |

**Critério de Sucesso:**
- ✅ 15+ integration tests passando
- ✅ Cobertura de 50% em `app/api/`
- ✅ Todos os testes RLS implementados

**Riscos:**
- ⚠️ Flakiness em testes de DB (mitigação: transações + cleanup rigoroso)
- ⚠️ Lentidão de CI (mitigação: paralelização)

---

### Fase 3: E2E Crítico (Semanas 5-6)

**Objetivo:** Garantir fluxos P0 funcionam end-to-end

**Tarefas:**

| Tarefa | Responsável | Duração | Entregável |
|--------|-------------|---------|------------|
| E2E: Autenticação (login/logout) | Dev 1 | 3h | `tests/e2e/auth.spec.ts` |
| E2E: Matrícula em curso | Dev 2 | 3h | `tests/e2e/enrollment.spec.ts` |
| E2E: Realizar e submeter teste | Dev 3 | 4h | `tests/e2e/test-taking.spec.ts` |
| E2E: Admin atribui nota 100 | Dev 1 | 3h | `tests/e2e/grade-override.spec.ts` |
| E2E: Solicitar e aprovar certificado | Dev 2 | 4h | `tests/e2e/certificate.spec.ts` |
| Seeds para E2E | Dev 3 | 3h | `tests/fixtures/seeds/` |
| Smoke tests pós-deploy | Dev 1 | 2h | `tests/e2e/smoke/*.spec.ts` |
| Adicionar job de E2E no CI | Dev 2 | 2h | Atualizar workflow |

**Critério de Sucesso:**
- ✅ 5+ specs E2E passando (fluxos P0)
- ✅ Smoke tests rodando em staging/prod
- ✅ CI completo (lint + unit + integration + e2e)

**Riscos:**
- ⚠️ E2E lentos (mitigação: sharding)
- ⚠️ Flakiness alto (mitigação: retry + waitFor)

---

### Fase 4: Expansão e Refinamento (Semanas 7-8)

**Objetivo:** Aumentar cobertura e adicionar testes P1

**Tarefas:**

| Tarefa | Responsável | Duração | Entregável |
|--------|-------------|---------|------------|
| E2E: Importação Google Drive (mock) | Dev 1 | 5h | `tests/e2e/drive-import.spec.ts` |
| E2E: Geração de relatório Excel | Dev 2 | 4h | `tests/e2e/excel-report.spec.ts` |
| E2E: Submissão de TCC | Dev 3 | 3h | `tests/e2e/tcc-submission.spec.ts` |
| E2E: View-as-student mode | Dev 1 | 3h | `tests/e2e/view-as-student.spec.ts` |
| Security tests: SQL injection, XSS | Dev 2 | 4h | `tests/security/injection.test.ts` |
| Performance benchmarks (queries críticas) | Dev 3 | 4h | `tests/performance/benchmarks.test.ts` |
| Documentação final (README, guias) | Dev 1 | 3h | `tests-docs/INSTRUCOES_EXECUCAO.md` |
| Review de cobertura (meta 60%) | Time | 2h | Identificar gaps |

**Critério de Sucesso:**
- ✅ 10+ specs E2E (cobrindo P0 + P1)
- ✅ Cobertura global >= 60%
- ✅ Documentação completa
- ✅ Security tests implementados

**Riscos:**
- ⚠️ Escopo creep (mitigação: priorizar P1 apenas)

---

### Resumo do Cronograma

| Fase | Duração | Entregas Principais | Cobertura Esperada |
|------|---------|---------------------|--------------------|
| **1. Fundação** | 2 semanas | Playwright setup, 10 unit tests, CI básico | 30% lib/services/ |
| **2. Integration** | 2 semanas | 15 integration tests, RLS tests | 50% app/api/ |
| **3. E2E Crítico** | 2 semanas | 5 specs E2E (P0), smoke tests | 100% fluxos P0 |
| **4. Expansão** | 2 semanas | 10 specs E2E (P0+P1), security tests | 60% global |

**Total:** 8 semanas (2 meses) para implementação completa

---

## 15. APÊNDICES

### A. Comandos Úteis

#### Local Development

```bash
# Testes
npm run test                  # Unit + Integration (watch mode)
npm run test:unit             # Apenas unit tests
npm run test:integration      # Apenas integration tests
npm run test:e2e              # E2E com Playwright
npm run test:coverage         # Coverage report (HTML + LCOV)
npm run test:watch            # Watch mode (unit)

# Supabase
supabase start                # Inicia Supabase local (Docker)
supabase stop                 # Para Supabase local
supabase db reset             # Reset DB de teste
supabase db push              # Aplica migrações
npm run test:seed             # Popula dados de teste

# CI Simulation
npm run test:ci               # Sem watch, com coverage
npm run test:e2e:ci           # E2E headless
npm run lint:full             # lint + type-check + test:ci
```

#### CI (GitHub Actions)

```bash
# Executar workflow localmente (com act)
act pull_request              # Simula PR
act push                      # Simula push

# Verificar secrets
gh secret list

# Forçar re-run de job falhado
gh run rerun <run-id> --failed
```

#### Debugging

```bash
# Vitest UI (interactive)
npm run test -- --ui

# Playwright UI mode
npx playwright test --ui

# Playwright debug mode
npx playwright test --debug

# Coverage detalhada por arquivo
npx vitest run --coverage --reporter=verbose

# EXPLAIN de query
psql $TEST_DB_URL -c "EXPLAIN ANALYZE SELECT * FROM test_grades WHERE user_id='user-1';"
```

### B. Estrutura de Diretórios Proposta

```
swiftlms/
├── tests-docs/                        # 📄 Documentação de testes
│   ├── CONTEXTO_DERIVADO_AUTOMATICAMENTE.md
│   ├── PLANO_DE_TESTES.md             # ← Este documento
│   ├── CATALOGO_DE_CASOS.md           # TODO: Catálogo detalhado de casos
│   ├── CHECKLIST-E2E.md               # TODO: Checklist de validação E2E
│   └── INSTRUCOES_EXECUCAO.md         # TODO: Como rodar testes
│
├── tests/                             # 🧪 Suíte automatizada
│   ├── unit/                          # Unit tests (~200 arquivos)
│   │   ├── lib/
│   │   │   ├── services/
│   │   │   │   ├── grade-services.test.ts
│   │   │   │   ├── grade-validation.test.ts
│   │   │   │   └── grade-calculator.test.ts
│   │   │   ├── utils/
│   │   │   │   ├── formatting.test.ts
│   │   │   │   └── validation.test.ts
│   │   │   └── excel-template-mappers/
│   │   │       ├── grades-mapper.test.ts
│   │   │       └── student-history-mapper.test.ts
│   │   └── app/
│   │       └── api/
│   │           └── tests/
│   │               └── utils/
│   │                   └── answer-key.test.ts
│   │
│   ├── integration/                   # Integration tests (~40 arquivos)
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login.test.ts
│   │   │   │   └── logout.test.ts
│   │   │   ├── courses/
│   │   │   │   └── enroll.test.ts
│   │   │   ├── tests/
│   │   │   │   └── submit.test.ts
│   │   │   ├── admin/
│   │   │   │   └── assign-grade.test.ts
│   │   │   └── certificates/
│   │   │       └── check-eligibility.test.ts
│   │   ├── storage/
│   │   │   └── upload-download.test.ts
│   │   └── middleware.test.ts
│   │
│   ├── e2e/                           # E2E tests (~10 specs)
│   │   ├── auth.spec.ts
│   │   ├── enrollment.spec.ts
│   │   ├── test-taking.spec.ts
│   │   ├── grade-override.spec.ts
│   │   ├── certificate-request.spec.ts
│   │   ├── drive-import.spec.ts
│   │   ├── view-as-student.spec.ts
│   │   ├── excel-report.spec.ts
│   │   ├── tcc-submission.spec.ts
│   │   └── smoke/
│   │       ├── health.spec.ts
│   │       ├── pages-load.spec.ts
│   │       └── auth-smoke.spec.ts
│   │
│   ├── security/                      # Security tests
│   │   ├── rls.test.ts                # RLS policies
│   │   ├── auth.test.ts               # Autorização
│   │   └── injection.test.ts          # SQL injection, XSS
│   │
│   ├── performance/                   # Performance tests
│   │   └── benchmarks.test.ts         # Query performance
│   │
│   ├── fixtures/                      # Dados de teste
│   │   ├── factories/
│   │   │   ├── user.factory.ts
│   │   │   ├── course.factory.ts
│   │   │   ├── module.factory.ts
│   │   │   ├── subject.factory.ts
│   │   │   ├── lesson.factory.ts
│   │   │   ├── test.factory.ts
│   │   │   ├── enrollment.factory.ts
│   │   │   ├── test-attempt.factory.ts
│   │   │   └── certificate.factory.ts
│   │   ├── seeds/
│   │   │   ├── basic-structure.seed.ts
│   │   │   ├── grades-scenario.seed.ts
│   │   │   ├── certificate-scenario.seed.ts
│   │   │   └── drive-import-scenario.seed.ts
│   │   └── mocks/
│   │       ├── google-drive-api.mock.ts
│   │       └── supabase-storage.mock.ts
│   │
│   └── setup/                         # Setup de ambiente
│       ├── supabase-local.ts          # Start/stop Supabase
│       ├── db.ts                      # Transações, schemas
│       ├── logging.ts                 # Captura de logs
│       └── global-setup.ts            # Playwright global setup
│
├── scripts/                           # 🔧 Scripts utilitários
│   ├── test-setup.sh                  # Setup inicial de testes
│   ├── test-seed.ts                   # Seed via CLI
│   └── test-cleanup.sh                # Cleanup após testes
│
├── .github/                           # 🚀 CI/CD
│   └── workflows/
│       ├── test.yml                   # Pipeline principal
│       └── smoke-tests.yml            # Smoke pós-deploy
│
├── vitest.config.ts                   # ⚙️ Config Vitest
├── vitest.setup.ts                    # Setup global Vitest
├── playwright.config.ts               # ⚙️ Config Playwright
└── package.json                       # Scripts de teste
```

### C. Glossário

| Termo | Definição |
|-------|-----------|
| **Flaky Test** | Teste que falha intermitentemente sem mudança no código, geralmente por condições de race, timeouts ou estado compartilhado |
| **Smoke Test** | Teste básico pós-deploy verificando se o sistema "respira" (páginas carregam, DB conecta, auth funciona) |
| **RLS (Row Level Security)** | Feature do PostgreSQL que restringe acesso a linhas de tabela baseado em policies (usado pelo Supabase para multi-tenancy) |
| **Factory** | Função que cria objetos de teste com valores defaults razoáveis e permite overrides (ex: `createUser({ role: 'admin' })`) |
| **Fixture** | Dados estáticos para testes, geralmente carregados uma vez e reutilizados (ex: seed de usuários) |
| **Mock** | Substituição de dependência externa por versão controlada que simula comportamento (ex: mock de API do Google Drive) |
| **Stub** | Versão simplificada de uma função que retorna valores predefinidos (similar a mock, mas sem verificação de chamadas) |
| **Seed** | Script que popula banco de dados com dados de teste de forma idempotente (pode ser executado múltiplas vezes) |
| **Snapshot** | Captura de estado (JSON, screenshot, HTML) para comparação em testes futuros (visual regression) |
| **Coverage** | Percentual de código executado por testes (statements, branches, functions, lines) |
| **Threshold** | Limite mínimo de cobertura que deve ser atingido (falha CI se não atingir) |
| **P0/P1/P2** | Priorização de riscos: P0 = crítico (bloqueia uso), P1 = importante (afeta features), P2 = UX (melhorias) |
| **Regression Test** | Teste adicionado após bug fix para garantir que o bug não retorne |
| **Integration Test** | Teste que valida interação entre múltiplos componentes (ex: API + DB + Auth) |
| **E2E (End-to-End)** | Teste que simula jornada completa de usuário (frontend + backend + DB) |
| **Sharding** | Divisão de suíte de testes em múltiplos runners paralelos para reduzir tempo de execução |
| **Idempotente** | Operação que pode ser executada múltiplas vezes sem efeitos colaterais (ex: seed que deleta antes de inserir) |
| **Magic Number** | Bytes iniciais de arquivo que identificam seu tipo (ex: `%PDF-` para PDF, `PK` para ZIP/.xlsx) |
| **LCOV** | Formato de relatório de cobertura usado por ferramentas como Codecov |
| **JUnit XML** | Formato de relatório de testes usado por dashboards de CI |
| **MSW (Mock Service Worker)** | Biblioteca para mockar APIs HTTP em testes (intercepta requests do navegador/Node) |

---

## FIM DO PLANO DE TESTES

**Próximos Passos:**
1. ✅ Revisar este plano com o time
2. ✅ Aprovar cronograma e alocar recursos
3. ✅ Iniciar Fase 1 (Fundação)
4. ✅ Criar issues no GitHub/Jira para cada tarefa
5. ✅ Configurar dashboards de cobertura (Codecov/Coveralls)

**Documento Vivo:** Este plano deve ser atualizado conforme:
- Mudanças na arquitetura
- Descoberta de novos riscos
- Feedback de falhas em produção
- Mudanças em integrações externas

**Manter Sincronizado Com:**
- `CONTEXTO_DERIVADO_AUTOMATICAMENTE.md`
- Migrations em `supabase/migrations/`
- Configurações de CI em `.github/workflows/`

---

**Versão:** 1.0  
**Última Atualização:** 2025-11-08  
**Mantenedor:** Time de Desenvolvimento SwiftLMS
