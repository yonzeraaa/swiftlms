# CONTEXTO DERIVADO AUTOMATICAMENTE - SwiftLMS

**Data de Análise:** 2025-11-08  
**Repositório:** SwiftLMS (swiftlms)  
**Branch Principal:** master  
**Status Git:** clean

---

## SUMÁRIO EXECUTIVO

SwiftLMS é um Learning Management System (LMS) completo desenvolvido em Next.js 15 (App Router) com Supabase como backend. O sistema oferece funcionalidades de gerenciamento de cursos, módulos, disciplinas, aulas, avaliações (testes), certificados, importação de conteúdo do Google Drive e relatórios avançados de desempenho acadêmico. Possui dois dashboards principais: um administrativo/instrutor e outro para alunos.

---

## 1. INVENTÁRIO COMPLETO DA STACK TECNOLÓGICA

### 1.1 Runtime e Linguagens

**[CONFIANÇA: ALTO]** Node.js v22.20.0 detectado  
Evidência: Executado `node --version` retornou "v22.20.0"

**[CONFIANÇA: ALTO]** NPM v10.9.3 como gerenciador de pacotes  
Evidência: Executado `npm --version` retornou "10.9.3"

**[CONFIANÇA: ALTO]** TypeScript 5.9.2  
Evidência: package.json:81 ("typescript": "5.9.2")

**[CONFIANÇA: ALTO]** Target ES2017  
Evidência: tsconfig.json:3 ("target": "ES2017")

### 1.2 Framework Web e UI

**[CONFIANÇA: ALTO]** Next.js 15.4.5 (App Router)  
Evidência: package.json:52 ("next": "^15.4.5")  
Evidência secundária: Estrutura de diretórios app/, middleware.ts, app/api/

**[CONFIANÇA: ALTO]** React 19.1.1  
Evidência: package.json:56 ("react": "^19.1.1")

**[CONFIANÇA: ALTO]** React DOM 19.1.1  
Evidência: package.json:57 ("react-dom": "^19.1.1")

**[CONFIANÇA: ALTO]** TailwindCSS 3.4.17  
Evidência: package.json:64 ("tailwindcss": "^3.4.17")  
Evidência secundária: tailwind.config.js, postcss.config.js

**[CONFIANÇA: ALTO]** Framer Motion 12.23.12 (animações)  
Evidência: package.json:47 ("framer-motion": "^12.23.12")

**[CONFIANÇA: ALTO]** Radix UI (componentes headless)  
Evidência: package.json:27-30 (@radix-ui/react-dialog, dropdown-menu, tabs, tooltip)

**[CONFIANÇA: ALTO]** Lucide React 0.536.0 (ícones)  
Evidência: package.json:51 ("lucide-react": "^0.536.0")

**[CONFIANÇA: ALTO]** React Hot Toast 2.5.2 (notificações)  
Evidência: package.json:59 ("react-hot-toast": "^2.5.2")

**[CONFIANÇA: ALTO]** Design System customizado com tokens navy/gold  
Evidência: tailwind.config.js:27-101 define cores personalizadas navy e gold

### 1.3 Banco de Dados e ORM

**[CONFIANÇA: ALTO]** Supabase (PostgreSQL via API)  
Evidência: package.json:33 ("@supabase/supabase-js": "^2.55.0")  
Evidência secundária: .env.local.example linhas 1-3, lib/supabase/*, lib/database.types.ts

**[CONFIANÇA: ALTO]** 25 tabelas principais identificadas  
Evidência: lib/database.types.ts possui 25 definições de tabela  
Tabelas principais:
- activity_logs
- certificate_requests
- certificate_requirements
- certificates
- course_modules
- course_reviews
- course_subjects
- courses
- enrollment_modules
- enrollments
- excel_templates
- lesson_progress
- lessons
- module_subjects
- profiles
- student_grade_overrides
- student_schedules
- subject_lessons
- subjects
- tcc_submissions
- test_answer_keys
- test_attempts
- test_grades
- tests
- subject_lessons_view (view)

**[CONFIANÇA: ALTO]** Sistema de migrações SQL nativo  
Evidência: supabase/migrations/ contém 18 arquivos .sql  
Última migração: 20251108000003_add_performance_indexes.sql

**[CONFIANÇA: ALTO]** Row Level Security (RLS) implementado  
Evidência: supabase/migrations/20251108000002_add_rls_test_tables.sql implementa RLS para test_attempts e test_grades

**[CONFIANÇA: ALTO]** Tipos TypeScript auto-gerados do schema  
Evidência: lib/database.types.ts (963 linhas) contém tipos completos do banco

**[CONFIANÇA: MÉDIO]** Sem ORM tradicional (Prisma/TypeORM)  
Evidência: Ausência de schema.prisma, ormconfig.json ou similar  
Uso direto da SDK do Supabase

### 1.4 Autenticação e Autorização

**[CONFIANÇA: ALTO]** Supabase Auth integrado  
Evidência: package.json:31-32 (@supabase/auth-helpers-nextjs, @supabase/ssr)  
Evidência secundária: app/api/auth/* (15 rotas de autenticação)

**[CONFIANÇA: ALTO]** Sistema de roles: admin, instructor, student  
Evidência: supabase/migrations/20251108000002_add_rls_test_tables.sql linhas 23-28  
Evidência secundária: middleware.ts implementa verificações de role

**[CONFIANÇA: ALTO]** Google OAuth configurado  
Evidência: .env.local.example:11-17 (NEXT_PUBLIC_GOOGLE_CLIENT_ID, NEXT_PUBLIC_GOOGLE_API_KEY)  
Evidência secundária: next.config.js:24-27 força injeção de variáveis Google

**[CONFIANÇA: ALTO]** Modo "View as Student" para admins  
Evidência: app/api/auth/view-as-student/route.ts, middleware.ts:7-64 (ensureUserEnrollmentForPreview)

**[CONFIANÇA: MÉDIO]** Cookies httpOnly para sessão  
Evidência: lib/supabase/cookie-storage.ts, lib/supabase/cookie-sync.ts  
Inferido: Implementação customizada de storage de cookies

### 1.5 Jobs, Filas e Background Processing

**[CONFIANÇA: BAIXO]** Possível uso de Inngest (desabilitado/removido)  
Evidência: .env.local.example:5-9 menciona Inngest, mas app/api/inngest/ vazio  
Evidência: package.json NÃO lista @inngest/* como dependência  
Conclusão: Configuração legada não mais em uso

**[CONFIANÇA: MÉDIO]** Importação Google Drive com polling manual  
Evidência: app/api/import/drive/route.ts implementa importação  
Evidência: VERCEL_ENV_VARS.md:8-22 configura timeouts e chunking  
Inferido: Sem queue engine, processamento síncrono com timeouts

### 1.6 Storage e Upload

**[CONFIANÇA: ALTO]** Supabase Storage para avatares e arquivos  
Evidência: README_SUPABASE.md:75-88 instrui criação do bucket "avatars"  
Evidência secundária: scripts/create-avatar-bucket.sql

**[CONFIANÇA: ALTO]** Bucket "excel_templates" para templates de relatórios  
Evidência: supabase/migrations/20251107000001_create_excel_templates_storage_policies.sql

**[CONFIANÇA: MÉDIO]** TUS protocol para upload resumable (possível)  
Evidência: lib/storage/tusUpload.ts existe  
Confiança média: Arquivo pode ser legado não utilizado

### 1.7 Integração com APIs Externas

**[CONFIANÇA: ALTO]** Google Drive API  
Evidência: app/api/import/drive/route.ts, app/api/fetch-google-doc/route.ts  
Evidência: .env.local.example:11-17 credenciais OAuth Google  
Evidência: VERCEL_ENV_VARS.md documenta timeouts específicos do Drive

**[CONFIANÇA: MÉDIO]** Google Docs Export API  
Evidência: app/api/import/drive/route.ts:92 usa docs.google.com/document/d/{id}/export  
Uso: Conversão de Google Docs para texto/extração de gabaritos

**[CONFIANÇA: BAIXO]** Possivelmente nenhuma API de pagamento  
Evidência: Nenhuma menção a Stripe, PayPal, PagSeguro em package.json ou env  
Conclusão: LMS aparentemente sem monetização direta

**[CONFIANÇA: BAIXO]** Possivelmente sem serviço de email transacional  
Evidência: Nenhuma menção a SendGrid, Mailgun, Resend em package.json  
Inferido: Email pode ser gerenciado pelo Supabase Auth nativo

### 1.8 Bibliotecas de Teste

**[CONFIANÇA: ALTO]** Vitest 3.2.4  
Evidência: package.json:82 ("vitest": "^3.2.4")  
Evidência secundária: vitest.config.ts, vitest.setup.ts

**[CONFIANÇA: ALTO]** Testing Library (React, Jest-DOM, User Events)  
Evidência: package.json:69-71  
- @testing-library/react: ^16.3.0  
- @testing-library/jest-dom: ^6.8.0  
- @testing-library/user-event: ^14.6.1

**[CONFIANÇA: ALTO]** JSDOM 27.0.0 (test environment)  
Evidência: package.json:80, vitest.config.ts:6

**[CONFIANÇA: ALTO]** 8 arquivos de teste existentes  
Evidência: Executado find retornou 8 arquivos .test.ts/.test.tsx  
Localização: __tests__/, app/api/*/\_\_tests\_\_/, lib/services/__tests__/

### 1.9 Build, Lint e Type-Check

**[CONFIANÇA: ALTO]** ESLint 9.32.0  
Evidência: package.json:78 ("eslint": "^9.32.0")  
Evidência secundária: .eslintrc.json

**[CONFIANÇA: ALTO]** TypeScript ESLint Plugin 8.39.0  
Evidência: package.json:76-77

**[CONFIANÇA: ALTO]** Next ESLint Config 15.4.5  
Evidência: package.json:79, .eslintrc.json:3 extends "next/core-web-vitals"

**[CONFIANÇA: ALTO]** Type-check script isolado  
Evidência: package.json:10 "type-check": "tsc --noEmit"

**[CONFIANÇA: ALTO]** PostCSS 8.5.6  
Evidência: package.json:54, postcss.config.js

### 1.10 Containerização e IaC

**[CONFIANÇA: BAIXO]** Sem Docker detectado  
Evidência: Nenhum Dockerfile ou docker-compose.yml encontrado

**[CONFIANÇA: BAIXO]** Sem Terraform/Pulumi detectado  
Evidência: Nenhum arquivo .tf, .hcl ou Pulumi.yaml encontrado

### 1.11 Deploy e Observabilidade

**[CONFIANÇA: ALTO]** Vercel como plataforma de deploy  
Evidência: vercel.json, .vercel/, DEPLOYMENT.md, VERCEL_ENV_VARS.md  
Evidência: MCP Vercel configurado (.mcp.json menciona supabase, indicando integração MCP)

**[CONFIANÇA: ALTO]** URL de produção: https://swiftedu-rose.vercel.app  
Evidência: DEPLOYMENT.md:4

**[CONFIANÇA: MÉDIO]** Activity Logs para auditoria  
Evidência: lib/database.types.ts:12-43 define tabela activity_logs  
Evidência: supabase/migrations/20251108000003_add_performance_indexes.sql:83-89 cria índices de auditoria

**[CONFIANÇA: BAIXO]** Sem logging centralizado externo detectado  
Evidência: Ausência de Datadog, Sentry, LogRocket em package.json

**[CONFIANÇA: BAIXO]** Sem APM/tracing detectado  
Evidência: Ausência de NewRelic, OpenTelemetry em package.json

### 1.12 Bibliotecas Utilitárias Especiais

**[CONFIANÇA: ALTO]** ExcelJS 4.4.0 (geração de planilhas)  
Evidência: package.json:46 ("exceljs": "^4.4.0")  
Uso: lib/excel-export.ts, lib/excel-template-engine.ts

**[CONFIÂNCIA: ALTO]** XLSX 0.18.5 (leitura de planilhas)  
Evidência: package.json:65 ("xlsx": "^0.18.5")

**[CONFIANÇA: ALTO]** jsPDF 3.0.1 (geração de PDFs)  
Evidência: package.json:49 ("jspdf": "^3.0.1")

**[CONFIANÇA: ALTO]** html2canvas 1.4.1 (captura de tela)  
Evidência: package.json:48 ("html2canvas": "^1.4.1")

**[CONFIANÇA: ALTO]** Puppeteer 24.18.0 (headless browser)  
Evidência: package.json:55 ("puppeteer": "^24.18.0")  
Uso provável: Geração de PDFs de certificados

**[CONFIANÇA: ALTO]** Recharts 3.1.2 (gráficos)  
Evidência: package.json:63 ("recharts": "^3.1.2")

**[CONFIANÇA: ALTO]** date-fns 4.1.0 (manipulação de datas)  
Evidência: package.json:43 ("date-fns": "^4.1.0")

**[CONFIANÇA: ALTO]** Zod 4.0.15 (validação)  
Evidência: package.json:66 ("zod": "^4.0.15")

**[CONFIANÇA: ALTO]** React Hook Form 7.62.0  
Evidência: package.json:58 ("react-hook-form": "^7.62.0")  
Evidência secundária: package.json:26 @hookform/resolvers

**[CONFIANÇA: ALTO]** DOMPurify 3.2.6 (sanitização HTML)  
Evidência: package.json:44 ("dompurify": "^3.2.6")

**[CONFIANÇA: ALTO]** dnd-kit (drag and drop)  
Evidência: package.json:23-25 (@dnd-kit/core, sortable, utilities)

**[CONFIANÇA: ALTO]** canvas-confetti 1.9.4 (celebrações)  
Evidência: package.json:41 ("canvas-confetti": "^1.9.4")

**[CONFIANÇA: ALTO]** lottie-react 2.4.1 (animações)  
Evidência: package.json:50 ("lottie-react": "^2.4.1")

---

## 2. ESTRUTURA DO PROJETO

### 2.1 Tipo de Repositório

**[CONFIANÇA: ALTO]** Monolito (não é monorepo)  
Evidência: Ausência de workspaces, lerna.json, pnpm-workspace.yaml, nx.json

### 2.2 Árvore de Diretórios Principais

```
/home/y0n/Documentos/swiftlms/
├── .claude/                    # Configurações Claude Code
├── .git/                       # Repositório Git
├── .next/                      # Build Next.js
├── .vercel/                    # Deploy Vercel
├── __tests__/                  # Testes raiz (middleware, integration)
├── app/                        # Next.js App Router
│   ├── api/                    # API Routes (14 grupos de endpoints)
│   │   ├── admin/
│   │   ├── auth/               # 15 rotas de autenticação
│   │   ├── certificates/
│   │   ├── courses/
│   │   ├── import/
│   │   ├── tests/
│   │   └── ...
│   ├── components/             # 75+ componentes React
│   │   ├── reports/
│   │   ├── Toast/
│   │   └── ui/
│   ├── contexts/               # LanguageContext, ThemeContext
│   ├── dashboard/              # Admin/Instructor Dashboard
│   │   ├── certificates/
│   │   ├── courses/
│   │   ├── modules/
│   │   ├── reports/
│   │   ├── subjects/
│   │   ├── templates/
│   │   ├── tests/
│   │   └── users/
│   ├── hooks/                  # Custom hooks (6 arquivos)
│   ├── i18n/                   # Internacionalização
│   ├── lib/                    # Utils específicos da app
│   ├── providers/              # AuthProvider
│   ├── student-dashboard/      # Student Dashboard
│   │   ├── calendar/
│   │   ├── certificates/
│   │   ├── course/
│   │   ├── evaluations/
│   │   ├── grades/
│   │   └── settings/
│   └── styles/                 # Estilos globais
├── lib/                        # Bibliotecas compartilhadas
│   ├── excel-template-mappers/ # Mappers para relatórios Excel
│   ├── reports/                # Lógica de relatórios
│   ├── services/               # Grade services, validation
│   ├── storage/                # Upload helpers
│   ├── supabase/               # 7 arquivos de config Supabase
│   ├── utils/                  # Utilitários gerais
│   └── validation/             # Validação de templates
├── node_modules/               # Dependências npm
├── public/                     # Assets estáticos
│   └── images/
├── scripts/                    # Scripts utilitários (5 arquivos)
├── supabase/                   # Configuração Supabase
│   └── migrations/             # 18 arquivos SQL
├── types/                      # Type definitions globais
├── docs/                       # Documentação
├── middleware.ts               # Next.js middleware
├── package.json                # Dependências e scripts
├── tsconfig.json               # Config TypeScript
├── tailwind.config.js          # Config TailwindCSS
├── next.config.js              # Config Next.js
├── vitest.config.ts            # Config Vitest
├── .eslintrc.json              # Config ESLint
└── [diversos .md]              # Documentação do projeto
```

### 2.3 Contagem de Arquivos Significativos

**[CONFIANÇA: ALTO]** 34 páginas (page.tsx)  
Evidência: Executado find retornou 34 arquivos page.tsx

**[CONFIANÇA: ALTO]** 75+ componentes React  
Evidência: Glob em app/components/ retornou 75 arquivos .tsx

**[CONFIANÇA: ALTO]** 35+ rotas API  
Evidência: Glob em app/api/ retornou 35 arquivos route.ts

**[CONFIANÇA: ALTO]** 18 migrações SQL  
Evidência: Listagem de supabase/migrations/

**[CONFIANÇA: ALTO]** 8 arquivos de teste  
Evidência: Find de *.test.ts retornou 8 arquivos (excluindo node_modules)

---

## 3. ARQUIVOS CRÍTICOS (Caminhos Absolutos)

### 3.1 Manifestos

- **/home/y0n/Documentos/swiftlms/package.json** (dependências npm)
- **/home/y0n/Documentos/swiftlms/package-lock.json** (lockfile npm)
- **/home/y0n/Documentos/swiftlms/tsconfig.json** (config TypeScript)

### 3.2 Configs de Framework

- **/home/y0n/Documentos/swiftlms/next.config.js** (Next.js)
- **/home/y0n/Documentos/swiftlms/tailwind.config.js** (TailwindCSS)
- **/home/y0n/Documentos/swiftlms/postcss.config.js** (PostCSS)
- **/home/y0n/Documentos/swiftlms/middleware.ts** (Next.js middleware)
- **/home/y0n/Documentos/swiftlms/vitest.config.ts** (Vitest)
- **/home/y0n/Documentos/swiftlms/vitest.setup.ts** (setup de testes)
- **/home/y0n/Documentos/swiftlms/.eslintrc.json** (ESLint)

### 3.3 Database Schema e Tipos

- **/home/y0n/Documentos/swiftlms/lib/database.types.ts** (963 linhas, tipos auto-gerados)
- **/home/y0n/Documentos/swiftlms/supabase/migrations/** (18 arquivos .sql)
  - Última: **20251108000003_add_performance_indexes.sql**
  - RLS: **20251108000002_add_rls_test_tables.sql**
  - Templates: **20251107000000_create_excel_templates.sql**

### 3.4 Supabase Configuration

- **/home/y0n/Documentos/swiftlms/lib/supabase/client.ts** (browser client)
- **/home/y0n/Documentos/swiftlms/lib/supabase/server.ts** (server client)
- **/home/y0n/Documentos/swiftlms/lib/supabase/admin.ts** (admin client)
- **/home/y0n/Documentos/swiftlms/lib/supabase/auth-helpers.ts** (helpers de auth)
- **/home/y0n/Documentos/swiftlms/lib/supabase/cookie-storage.ts** (cookies)
- **/home/y0n/Documentos/swiftlms/lib/supabase/cookie-sync.ts** (sync de cookies)
- **/home/y0n/Documentos/swiftlms/lib/supabase/client-fallback.ts** (fallback)

### 3.5 Autenticação e Autorização

- **/home/y0n/Documentos/swiftlms/middleware.ts** (verificação de sessão, RLS manual)
- **/home/y0n/Documentos/swiftlms/app/api/auth/** (15 rotas):
  - check/route.ts
  - login/route.ts
  - logout/route.ts
  - verify/route.ts
  - view-as-student/route.ts
  - [e 10 outros endpoints de debug/session management]

### 3.6 Business Logic Services

- **/home/y0n/Documentos/swiftlms/lib/services/grade-services.ts** (atribuição de notas)
- **/home/y0n/Documentos/swiftlms/lib/services/grade-validation.ts** (validação de consistência)
- **/home/y0n/Documentos/swiftlms/lib/services/grade-calculator.ts** (cálculo de médias)
- **/home/y0n/Documentos/swiftlms/lib/services/template-cleanup.ts** (limpeza de templates)

### 3.7 Importação Google Drive

- **/home/y0n/Documentos/swiftlms/app/api/import/drive/route.ts** (endpoint principal)
- **/home/y0n/Documentos/swiftlms/app/api/fetch-google-doc/route.ts** (fetch de docs)
- **/home/y0n/Documentos/swiftlms/lib/drive-import-utils.ts** (utils)

### 3.8 Geração de Relatórios Excel

- **/home/y0n/Documentos/swiftlms/lib/excel-template-engine.ts** (engine principal)
- **/home/y0n/Documentos/swiftlms/lib/excel-template-mappers/enrollments-mapper.ts**
- **/home/y0n/Documentos/swiftlms/lib/excel-template-mappers/grades-mapper.ts**
- **/home/y0n/Documentos/swiftlms/lib/excel-template-mappers/student-history-mapper.ts**
- **/home/y0n/Documentos/swiftlms/lib/excel-template-mappers/users-mapper.ts**
- **/home/y0n/Documentos/swiftlms/lib/excel-template-mappers/access-mapper.ts**

### 3.9 Frontend - Admin Dashboard

- **/home/y0n/Documentos/swiftlms/app/dashboard/layout.tsx** (layout principal)
- **/home/y0n/Documentos/swiftlms/app/dashboard/page.tsx** (home dashboard)
- **/home/y0n/Documentos/swiftlms/app/dashboard/courses/page.tsx**
- **/home/y0n/Documentos/swiftlms/app/dashboard/modules/page.tsx**
- **/home/y0n/Documentos/swiftlms/app/dashboard/subjects/page.tsx**
- **/home/y0n/Documentos/swiftlms/app/dashboard/lessons/page.tsx**
- **/home/y0n/Documentos/swiftlms/app/dashboard/tests/page.tsx**
- **/home/y0n/Documentos/swiftlms/app/dashboard/users/page.tsx**
- **/home/y0n/Documentos/swiftlms/app/dashboard/users/[id]/grades/page.tsx**
- **/home/y0n/Documentos/swiftlms/app/dashboard/reports/page.tsx**
- **/home/y0n/Documentos/swiftlms/app/dashboard/certificates/page.tsx**
- **/home/y0n/Documentos/swiftlms/app/dashboard/templates/page.tsx**
- **/home/y0n/Documentos/swiftlms/app/dashboard/tcc-evaluation/page.tsx**

### 3.10 Frontend - Student Dashboard

- **/home/y0n/Documentos/swiftlms/app/student-dashboard/layout.tsx**
- **/home/y0n/Documentos/swiftlms/app/student-dashboard/page.tsx**
- **/home/y0n/Documentos/swiftlms/app/student-dashboard/my-courses/page.tsx**
- **/home/y0n/Documentos/swiftlms/app/student-dashboard/course/[id]/page.tsx**
- **/home/y0n/Documentos/swiftlms/app/student-dashboard/evaluations/page.tsx**
- **/home/y0n/Documentos/swiftlms/app/student-dashboard/evaluations/[id]/page.tsx**
- **/home/y0n/Documentos/swiftlms/app/student-dashboard/evaluations/[id]/results/page.tsx**
- **/home/y0n/Documentos/swiftlms/app/student-dashboard/grades/page.tsx**
- **/home/y0n/Documentos/swiftlms/app/student-dashboard/certificates/page.tsx**
- **/home/y0n/Documentos/swiftlms/app/student-dashboard/certificates/tcc/page.tsx**
- **/home/y0n/Documentos/swiftlms/app/student-dashboard/calendar/page.tsx**
- **/home/y0n/Documentos/swiftlms/app/student-dashboard/progress/page.tsx**

### 3.11 Testes Existentes

- **/home/y0n/Documentos/swiftlms/__tests__/middleware.test.ts**
- **/home/y0n/Documentos/swiftlms/__tests__/integration/assign-grade-flow.test.ts**
- **/home/y0n/Documentos/swiftlms/app/api/certificates/__tests__/check-eligibility.test.ts**
- **/home/y0n/Documentos/swiftlms/app/api/courses/__tests__/enroll-route.test.ts**
- **/home/y0n/Documentos/swiftlms/app/api/tests/__tests__/submit-route.test.ts**
- **/home/y0n/Documentos/swiftlms/app/api/tests/utils/__tests__/answer-key.test.ts**
- **/home/y0n/Documentos/swiftlms/lib/services/__tests__/grade-services.test.ts**
- **/home/y0n/Documentos/swiftlms/lib/services/__tests__/grade-validation.test.ts**

### 3.12 Variáveis de Ambiente

- **/home/y0n/Documentos/swiftlms/.env.local.example** (template)
- **/home/y0n/Documentos/swiftlms/.env.local** (NÃO COMMITAR - possui valores reais)
- **/home/y0n/Documentos/swiftlms/.env.vercel.check** (verificação Vercel)
- **/home/y0n/Documentos/swiftlms/VERCEL_ENV_VARS.md** (documentação)

### 3.13 Scripts Utilitários

- **/home/y0n/Documentos/swiftlms/scripts/create-test-user.js** (criar usuário de teste)
- **/home/y0n/Documentos/swiftlms/scripts/create-avatar-bucket.sql** (bucket avatares)
- **/home/y0n/Documentos/swiftlms/scripts/create-subjects-tables.sql** (tabelas de disciplinas)
- **/home/y0n/Documentos/swiftlms/scripts/analyze-excel.js** (análise de planilhas)
- **/home/y0n/Documentos/swiftlms/scripts/analyze-excel-complete.js** (análise completa)
- **/home/y0n/Documentos/swiftlms/run-migration.js** (executar migrações)

### 3.14 Documentação

- **/home/y0n/Documentos/swiftlms/README.md** (readme principal)
- **/home/y0n/Documentos/swiftlms/README_SUPABASE.md** (config Supabase)
- **/home/y0n/Documentos/swiftlms/DEPLOYMENT.md** (instruções de deploy)
- **/home/y0n/Documentos/swiftlms/DATABASE_CHANGES.md** (changelog do banco)
- **/home/y0n/Documentos/swiftlms/VERCEL_ENV_VARS.md** (variáveis Vercel)
- **/home/y0n/Documentos/swiftlms/AGENTS.md** (guidelines do repositório)
- **/home/y0n/Documentos/swiftlms/CLAUDE.md** (instruções Claude Code)

### 3.15 MCP Configuration

- **/home/y0n/Documentos/swiftlms/.mcp.json** (MCP Supabase configurado)

---

## 4. DOMÍNIO E MODELO DE DADOS

### 4.1 Entidades Principais (do Schema Supabase)

#### **profiles**
```typescript
{
  id: string (PK)
  email: string
  full_name: string
  role: 'admin' | 'instructor' | 'student'
  avatar_url: string | null
  created_at: string
  updated_at: string
}
```

#### **courses**
```typescript
{
  id: string (PK)
  title: string
  slug: string
  description: string | null
  summary: string | null
  category: string
  difficulty: string
  duration_hours: number
  instructor_id: string | null (FK profiles)
  is_published: boolean | null
  is_featured: boolean | null
  thumbnail_url: string | null
  video_preview_url: string | null
  price: number | null
  learning_objectives: string[] | null
  prerequisites: string[] | null
  target_audience: string | null
  language: string | null
  created_at: string | null
  updated_at: string | null
}
```

#### **course_modules**
```typescript
{
  id: string (PK)
  course_id: string (FK courses)
  title: string
  description: string | null
  order_index: number
  is_required: boolean | null
  total_hours: number | null
  created_at: string | null
  updated_at: string | null
}
```

#### **subjects**
```typescript
{
  id: string (PK)
  title: string
  description: string | null
  credits: number | null
  workload_hours: number | null
  created_at: string | null
  updated_at: string | null
}
```

#### **module_subjects** (relação N:N)
```typescript
{
  id: string (PK)
  module_id: string (FK course_modules)
  subject_id: string (FK subjects)
  order_index: number | null
  created_at: string
}
```

#### **lessons**
```typescript
{
  id: string (PK)
  title: string
  description: string | null
  content: string | null
  content_type: string | null
  video_url: string | null
  drive_file_id: string | null
  order_index: number
  duration_minutes: number | null
  is_preview: boolean | null
  created_at: string | null
  updated_at: string | null
}
```

#### **subject_lessons** (relação N:N)
```typescript
{
  id: string (PK)
  subject_id: string (FK subjects)
  lesson_id: string (FK lessons)
  order_index: number | null
}
```

#### **enrollments**
```typescript
{
  id: string (PK)
  user_id: string (FK profiles)
  course_id: string (FK courses)
  enrolled_at: string
  status: string
  progress_percentage: number
  completed_at: string | null
  certificate_issued: boolean | null
  created_at: string | null
  updated_at: string | null
}
```

#### **enrollment_modules** (atribuição de módulos específicos)
```typescript
{
  id: string (PK)
  enrollment_id: string (FK enrollments)
  module_id: string (FK course_modules)
  assigned_at: string
}
```

#### **lesson_progress**
```typescript
{
  id: string (PK)
  user_id: string (FK profiles)
  lesson_id: string (FK lessons)
  enrollment_id: string (FK enrollments)
  is_completed: boolean | null
  completed_at: string | null
  last_accessed: string | null
  time_spent_seconds: number | null
  created_at: string | null
  updated_at: string | null
}
```

#### **tests**
```typescript
{
  id: string (PK)
  title: string
  description: string | null
  course_id: string (FK courses)
  subject_id: string | null (FK subjects)
  passing_score: number | null
  total_questions: number | null
  duration_minutes: number | null
  max_attempts: number | null
  is_active: boolean | null
  drive_file_id: string | null
  instructions: string | null
  created_at: string | null
  updated_at: string | null
}
```

#### **test_answer_keys**
```typescript
{
  id: string (PK)
  test_id: string (FK tests, UNIQUE)
  answers: Json
  question_count: number
  created_at: string
  updated_at: string
}
```

#### **test_attempts**
```typescript
{
  id: string (PK)
  user_id: string (FK profiles)
  test_id: string (FK tests)
  started_at: string
  submitted_at: string | null
  score: number | null
  answers: Json | null
  time_spent_seconds: number | null
  is_submitted: boolean | null
  created_at: string | null
  updated_at: string | null
}
```

#### **test_grades** (consolidado)
```typescript
{
  id: string (PK)
  user_id: string (FK profiles)
  test_id: string (FK tests)
  best_score: number
  total_attempts: number
  last_attempt_date: string
  course_id: string (FK courses)
  subject_id: string | null (FK subjects)
  created_at: string
  updated_at: string
}
// CONSTRAINT UNIQUE (user_id, test_id)
```

#### **student_grade_overrides** (substituição de nota)
```typescript
{
  id: string (PK)
  user_id: string (FK profiles, UNIQUE)
  final_grade: number
  tcc_grade: number | null
  override_reason: string | null
  overridden_at: string
  overridden_by: string | null (FK profiles)
  created_at: string
  updated_at: string
}
```

#### **certificates**
```typescript
{
  id: string (PK)
  user_id: string (FK profiles)
  course_id: string (FK courses)
  enrollment_id: string (FK enrollments)
  certificate_number: string
  verification_code: string
  issued_at: string | null
  grade: number | null
  final_grade: number | null
  course_hours: number | null
  instructor_name: string | null
  tcc_id: string | null (FK tcc_submissions)
  approval_status: string | null
  approved_at: string | null
  approved_by: string | null (FK profiles)
  rejection_reason: string | null
  metadata: Json | null
  created_at: string | null
  updated_at: string | null
}
```

#### **certificate_requests**
```typescript
{
  id: string (PK)
  user_id: string (FK profiles)
  course_id: string (FK courses)
  enrollment_id: string (FK enrollments)
  request_date: string | null
  status: string | null
  processed_at: string | null
  processed_by: string | null (FK profiles)
  notes: string | null
  total_lessons: number | null
  completed_lessons: number | null
  created_at: string | null
  updated_at: string | null
}
```

#### **tcc_submissions** (Trabalho de Conclusão de Curso)
```typescript
{
  id: string (PK)
  user_id: string (FK profiles)
  course_id: string (FK courses)
  title: string
  description: string | null
  file_url: string | null
  submitted_at: string | null
  status: string | null
  grade: number | null
  feedback: string | null
  evaluated_at: string | null
  evaluated_by: string | null (FK profiles)
  resubmission_count: number | null
  created_at: string | null
  updated_at: string | null
}
```

#### **activity_logs** (auditoria)
```typescript
{
  id: string (PK)
  user_id: string | null (FK profiles)
  entity_type: string
  entity_id: string | null
  entity_name: string | null
  action: string
  metadata: Json | null
  created_at: string
}
```

#### **excel_templates** (templates de relatório)
```typescript
{
  id: string (PK)
  name: string
  description: string | null
  file_path: string
  mapping_config: Json
  is_active: boolean
  created_by: string | null (FK profiles)
  created_at: string
  updated_at: string
}
```

#### **student_schedules** (cronograma)
```typescript
{
  id: string (PK)
  user_id: string (FK profiles)
  course_id: string (FK courses)
  module_id: string | null (FK course_modules)
  subject_id: string | null (FK subjects)
  lesson_id: string | null (FK lessons)
  scheduled_date: string
  completed: boolean
  created_at: string
  updated_at: string
}
```

#### **course_reviews** (avaliações de cursos)
```typescript
{
  id: string (PK)
  user_id: string (FK profiles)
  course_id: string (FK courses)
  rating: number
  title: string | null
  comment: string | null
  is_verified_purchase: boolean | null
  helpful_count: number | null
  created_at: string | null
  updated_at: string | null
}
```

### 4.2 Relacionamentos Críticos

**courses → course_modules** (1:N)  
**course_modules → module_subjects** (N:N via module_subjects)  
**subjects → subject_lessons** (N:N via subject_lessons)  
**lessons → lesson_progress** (1:N)  
**users(profiles) → enrollments** (1:N)  
**enrollments → enrollment_modules** (1:N) - matrícula em módulos específicos  
**enrollments → lesson_progress** (1:N)  
**tests → test_attempts** (1:N)  
**tests → test_answer_keys** (1:1)  
**test_attempts → test_grades** (N:1 consolidação)  
**enrollments → certificates** (1:1)  
**tcc_submissions → certificates** (1:1)

### 4.3 Regras de Negócio Evidentes

**[CONFIANÇA: ALTO]** Sistema de notas consolidadas  
Evidência: test_grades armazena best_score e total_attempts agregados de test_attempts  
Fonte: lib/database.types.ts:861-893

**[CONFIANÇA: ALTO]** RLS por role (admin, instructor, student)  
Evidência: Policies em supabase/migrations/20251108000002_add_rls_test_tables.sql  
- Alunos veem apenas suas próprias tentativas e notas
- Admins e instrutores veem tudo

**[CONFIANÇA: ALTO]** Sobrescrita manual de notas por admins  
Evidência: student_grade_overrides + lib/services/grade-services.ts:assignMaxGradeToStudent

**[CONFIANÇA: ALTO]** Certificados requerem aprovação manual  
Evidência: certificates.approval_status, certificate_requests.status  
Workflow: student request → admin review → approval/rejection

**[CONFIANÇA: ALTO]** Módulos opcionais vs obrigatórios  
Evidência: course_modules.is_required, enrollment_modules permite matrícula seletiva

**[CONFIANÇA: ALTO]** Importação automatizada de estrutura do Google Drive  
Evidência: app/api/import/drive/route.ts mapeia pastas → módulos, subpastas → disciplinas, arquivos → aulas/testes  
Pattern: Código numérico prefixo (ex: "01 - Módulo 1")

**[CONFIANÇA: ALTO]** Gabarito de testes extraído de Google Docs  
Evidência: app/api/tests/extract-answer-key/route.ts, parseAnswerKeyFromText em app/api/tests/utils/answer-key.ts

**[CONFIANÇA: ALTO]** Auditoria completa de ações  
Evidência: activity_logs registra entity_type, action, metadata (JSON)

**[CONFIANÇA: MÉDIO]** Progresso calculado via triggers  
Evidência: DATABASE_CHANGES.md:8-11 menciona triggers de recálculo automático  
Localização: Provavelmente em migrações antigas não visualizadas

**[CONFIANÇA: MÉDIO]** Limite de tentativas em testes (configurável)  
Evidência: tests.max_attempts | null  
Inferido: null = ilimitado

---

## 5. FLUXOS CRÍTICOS DE USUÁRIO

### 5.1 Onboarding de Aluno

**[CONFIANÇA: MÉDIO]**

1. Registro via Supabase Auth (email/password ou OAuth Google)
2. Criação automática de perfil em `profiles` (role: 'student')
3. Navegação para catálogo de cursos (`app/browse-courses`)
4. Matrícula em curso (`app/api/courses/enroll/route.ts`)
   - Cria registro em `enrollments` (status: 'active', progress: 0%)
5. Redirecionamento para `app/student-dashboard`

Lacuna: Não foi identificado fluxo de confirmação de email ou onboarding tutorial.

### 5.2 Visualização de Conteúdo (Aluno)

**[CONFIANÇA: ALTO]**

1. Acesso via `app/student-dashboard/my-courses/page.tsx`
2. Seleção de curso → `app/student-dashboard/course/[id]/page.tsx`
3. Lista de módulos/disciplinas/aulas
4. Click em aula:
   - Se video_url: Renderiza VideoPlayer
   - Se drive_file_id: Renderiza DocumentViewer (Google Drive embed)
   - Componentes: `app/student-dashboard/components/VideoPlayer.tsx`, `DocumentViewer.tsx`
5. Marca progresso:
   - POST para endpoint (provavelmente API não mapeada ou inline)
   - Atualiza `lesson_progress.is_completed = true`
   - Trigger recalcula `enrollments.progress_percentage`

### 5.3 Realização de Avaliação (Aluno)

**[CONFIÂNCIA: ALTO]**

1. Navegação: `app/student-dashboard/evaluations/page.tsx` (lista testes disponíveis)
2. Iniciar teste: `app/student-dashboard/evaluations/[id]/page.tsx`
   - Cria `test_attempts` com `started_at`, `is_submitted: false`
   - Renderiza `app/components/TestViewer.tsx`
3. Responder questões: UI atualiza `test_attempts.answers` (JSON)
4. Submeter: POST `app/api/tests/[id]/submit/route.ts`
   - Valida contra `test_answer_keys.answers`
   - Calcula score
   - Atualiza `test_attempts.submitted_at`, `test_attempts.score`
   - Upsert em `test_grades` (atualiza best_score se maior)
5. Ver resultado: `app/student-dashboard/evaluations/[id]/results/page.tsx`
   - Renderiza `app/components/TestResults.tsx`

### 5.4 Solicitação de Certificado (Aluno)

**[CONFIANÇA: ALTO]**

1. Acesso: `app/student-dashboard/certificates/page.tsx`
2. Verificação de elegibilidade: `app/api/certificates/check-eligibility/route.ts`
   - Valida: progress_percentage = 100%, notas mínimas, TCC aprovado (se aplicável)
3. Se elegível: Botão "Solicitar Certificado"
   - POST cria `certificate_requests` (status: 'pending')
4. Admin revisa: `app/dashboard/certificates/page.tsx`
   - Aprova ou rejeita
   - Se aprovado: Cria `certificates` (gera certificate_number, verification_code)
5. Aluno baixa PDF: Link em `app/student-dashboard/certificates/page.tsx`
   - Endpoint (não mapeado) gera PDF com Puppeteer/jsPDF

### 5.5 Submissão de TCC (Aluno)

**[CONFIANÇA: MÉDIO]**

1. Acesso: `app/student-dashboard/certificates/tcc/page.tsx`
2. Upload de arquivo (Supabase Storage)
3. POST cria `tcc_submissions` (status: 'submitted')
4. Admin avalia: `app/dashboard/tcc-evaluation/page.tsx`
   - Atribui nota, feedback
   - Atualiza `tcc_submissions.status = 'approved'`, `grade`, `evaluated_at`
5. Nota do TCC contribui para certificado final

### 5.6 Importação de Estrutura do Google Drive (Admin)

**[CONFIANÇA: ALTO]**

1. Admin acessa: `app/dashboard/structure/page.tsx`
2. Renderiza `app/components/DriveImportModal.tsx`
3. Usuário autoriza OAuth Google (popup)
4. Seleciona pasta raiz do Drive
5. POST `app/api/import/drive/route.ts`
   - Descobre hierarquia: Pasta → Módulo, Subpasta → Disciplina, Arquivo → Aula/Teste
   - Extrai código numérico (ex: "01 - Nome") para `order_index`
   - Para testes (arquivos .docx): Extrai gabarito via `app/api/tests/extract-answer-key/route.ts`
   - Cria/atualiza registros em `course_modules`, `subjects`, `lessons`, `tests`, `test_answer_keys`
6. Feedback em tempo real via `drive_import_events`

### 5.7 Atribuição Manual de Nota Máxima (Admin)

**[CONFIANÇA: ALTO]**

1. Admin acessa: `app/dashboard/users/[id]/grades/page.tsx`
2. Renderiza `app/components/StudentGradesReport.tsx`
3. Botão "Atribuir Nota 100" em teste específico
4. POST `app/api/admin/assign-grade/route.ts`
   - Chama `lib/services/grade-services.ts:assignMaxGradeToStudent`
   - Cria `test_attempts` com score=100 (marca como admin override)
   - Upsert `test_grades.best_score = 100`
   - Registra em `activity_logs`
5. UI atualiza imediatamente

### 5.8 Geração de Relatórios Excel (Admin)

**[CONFIANÇA: ALTO]**

1. Admin acessa: `app/dashboard/reports/page.tsx`
2. Seleciona tipo de relatório: Matrículas, Notas, Histórico, Acessos
3. Opção: Usar template customizado ou padrão
   - Templates: `app/dashboard/templates/page.tsx`
   - Upload .xlsx via `app/dashboard/templates/components/TemplateUploadModal.tsx`
   - Mapeamento de campos: `app/dashboard/templates/components/MappingEditor.tsx`
   - Storage: `excel_templates` + bucket Supabase Storage
4. Click "Gerar Relatório"
   - POST (endpoint não mapeado explicitamente)
   - Engine: `lib/excel-template-engine.ts`
   - Mappers específicos: `lib/excel-template-mappers/enrollments-mapper.ts`, `grades-mapper.ts`, etc.
   - Usa ExcelJS para preencher template
5. Download do .xlsx gerado

### 5.9 Modo "View as Student" (Admin)

**[CONFIANÇA: ALTO]**

1. Admin em dashboard: Toggle "Ver como Aluno"
2. POST `app/api/auth/view-as-student/route.ts`
   - Seta cookie/session flag
3. `middleware.ts:ensureUserEnrollmentForPreview` matricula admin em todos os cursos automaticamente
4. UI redireciona para `app/student-dashboard`
5. Admin navega como aluno (com todos os acessos liberados)
6. Sair do modo: POST `app/api/auth/logout` ou toggle off

---

## 6. INTEGRAÇÕES EXTERNAS

### 6.1 Google Drive API

**[CONFIANÇA: ALTO]**

**Propósito:** Importação de estrutura de cursos (módulos, disciplinas, aulas, testes) a partir de pastas organizadas no Google Drive.

**Endpoints utilizados:**
- Google Drive API v3 (files.list, files.get)
- Google Docs Export API (https://docs.google.com/document/d/{id}/export?format=txt)

**Autenticação:** OAuth 2.0 Client-Side Flow  
Evidência: .env.local.example:16 NEXT_PUBLIC_GOOGLE_CLIENT_ID

**Configurações:**
- Timeouts customizados: VERCEL_ENV_VARS.md:10-22
  - GOOGLE_DRIVE_DEFAULT_TIMEOUT_MS=180000 (3min)
  - GOOGLE_DRIVE_LIST_TIMEOUT_MS=180000
  - GOOGLE_DRIVE_EXPORT_TIMEOUT_MS=120000 (2min)

**Fluxo:**
1. Frontend abre popup OAuth Google
2. Usuário autoriza acesso readonly
3. Frontend envia access_token + folder_id para backend
4. Backend lista recursivamente arquivos/pastas
5. Cria estrutura no banco baseado em convenção de nomenclatura

**Limitações conhecidas:**
- Vercel timeout (13min no plano Pro) → Chunking implementado
- VERCEL_ENV_VARS.md:19 GOOGLE_DRIVE_BACKGROUND_MAX_RUNTIME_MS=780000 (13min)

### 6.2 Supabase Services

**[CONFIANÇA: ALTO]**

**Database:** PostgreSQL via REST API  
**Auth:** Supabase Auth (JWT)  
**Storage:** Supabase Storage (avatares, templates Excel, arquivos TCC)

**Project ID:** mdzgnktlsmkjecdbermo  
Evidência: next.config.js:8, .mcp.json:7, DEPLOYMENT.md:23

**Buckets identificados:**
- `avatars` (público)
- `excel_templates` (privado, apenas admins)
- Provavelmente `tcc_files` (inferido, não confirmado)

**MCP Integration:**  
Evidência: .mcp.json configura @supabase/mcp-server-supabase

---

## 7. NÍVEIS DE CONFIANÇA - RESUMO

### ALTO (Evidência Direta)

- Next.js 15.4.5, React 19.1.1, TypeScript 5.9.2
- Node.js 22.20.0, npm 10.9.3
- Supabase como backend (PostgreSQL + Auth + Storage)
- 25 tabelas SQL, 18 migrações, RLS ativo
- TailwindCSS 3.4.17 com design system navy/gold
- Vitest 3.2.4 + Testing Library
- 8 testes existentes
- 34 páginas Next.js, 75+ componentes
- Importação Google Drive funcional
- Geração de relatórios Excel com templates
- Sistema de notas com override manual
- Certificados com workflow de aprovação
- Deploy em Vercel (swiftedu-rose.vercel.app)

### MÉDIO (Inferido de Estrutura)

- TUS upload (arquivo existe, uso incerto)
- Triggers automáticos de progresso (mencionados, não visualizados)
- Email via Supabase Auth nativo (nenhum serviço externo detectado)
- Redis para cache (nenhuma evidência, provavelmente não usa)

### BAIXO (Suposição ou Ausência)

- Sistema de pagamentos (nenhuma evidência)
- Logging externo/APM (Sentry, Datadog, etc. - ausente)
- Docker/Kubernetes (ausente)
- Terraform/IaC (ausente)
- Inngest jobs (configuração legada, dependência removida)

---

## 8. LACUNAS E SUPOSIÇÕES

### 8.1 Informações Faltantes

**Triggers e Functions PostgreSQL:**  
Mencionados em DATABASE_CHANGES.md (fix_all_enrollment_progress, delete_user_completely, check_and_fix_enrollment_progress), mas código SQL não localizado em migrações recentes.  
**Ação recomendada:** Executar query no Supabase Dashboard para listar functions:
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_type='FUNCTION' AND routine_schema='public';
```

**Endpoint de download de certificados:**  
Lógica de geração PDF mencionada (Puppeteer/jsPDF), mas endpoint específico não encontrado em app/api/.  
**Ação recomendada:** Buscar por "certificate" e "pdf" em app/api/ ou verificar se é gerado client-side.

**Workflow de matrícula:**  
Endpoint identificado (app/api/courses/enroll/route.ts), mas lógica de validação (pré-requisitos, capacidade, preços) não confirmada.  
**Ação recomendada:** Ler código completo do endpoint.

**Sistema de notificações:**  
Toast notifications detectadas (React Hot Toast), mas notificações persistentes (email, push, in-app) não identificadas.  
**Ação recomendada:** Verificar se Supabase Realtime está configurado para notificações em tempo real.

**Internacionalização:**  
Diretório app/i18n/ existe, mas implementação não confirmada.  
**Ação recomendada:** Verificar se next-intl ou similar está configurado.

**Analytics:**  
Nenhuma evidência de Google Analytics, Mixpanel, PostHog.  
**Ação recomendada:** Confirmar se analytics é necessário para testes.

### 8.2 Defaults Razoáveis para Testes

**Banco de dados de teste:**  
Usar Supabase local com `supabase start` (Docker) ou criar projeto separado no Supabase Cloud para CI.

**Credenciais Google OAuth:**  
Mockar autenticação Google em testes unitários. Para testes E2E, usar conta de serviço ou OAuth sandbox.

**Storage:**  
Mockar Supabase Storage com filesystem local ou MinIO para testes de upload.

**Email:**  
Desabilitar envio de email em testes ou usar serviço fake (Ethereal, MailHog).

**Timeouts:**  
Reduzir timeouts do Google Drive em ambiente de teste para acelerar execução.

---

## 9. RECOMENDAÇÕES PARA COLETA DE INFORMAÇÕES FALTANTES

### 9.1 Queries SQL a Executar no Supabase

```sql
-- Listar todas as functions
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_schema='public' AND routine_type='FUNCTION';

-- Listar todos os triggers
SELECT trigger_name, event_object_table, action_statement 
FROM information_schema.triggers 
WHERE trigger_schema='public';

-- Verificar policies RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname='public';

-- Verificar índices
SELECT tablename, indexname, indexdef 
FROM pg_indexes 
WHERE schemaname='public' 
ORDER BY tablename, indexname;

-- Verificar views
SELECT table_name, view_definition 
FROM information_schema.views 
WHERE table_schema='public';
```

### 9.2 Arquivos a Inspecionar Manualmente

1. **app/api/courses/enroll/route.ts** - Lógica completa de matrícula
2. **app/api/*/route.ts** - Todos os endpoints não lidos
3. **lib/supabase/admin.ts** - Verificar se usa service_role key
4. **middleware.ts** (linhas 100-fim) - Lógica completa do middleware
5. **app/i18n/** - Confirmar se i18n está implementado
6. **app/lib/csp-config** - Content Security Policy (referenciado em middleware.ts:4)
7. **Buscar por "Inngest"** - Confirmar se foi completamente removido ou ainda usado

### 9.3 Testes a Executar

```bash
# Verificar se build passa
npm run build

# Executar suite de testes
npm run test:ci

# Type-check completo
npm run type-check

# Lint completo
npm run lint:full

# Verificar variáveis de ambiente
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
```

### 9.4 Comandos MCP Supabase

Se MCP Supabase está configurado (.mcp.json), pode-se usar:

```
mcp supabase list-tables
mcp supabase get-schema
mcp supabase list-functions
mcp supabase get-advisors --project-id=mdzgnktlsmkjecdbermo --type=security
mcp supabase get-advisors --project-id=mdzgnktlsmkjecdbermo --type=performance
```

---

## 10. FLUXOS CRÍTICOS PARA SUÍTE DE TESTES

### 10.1 Prioridade ALTA (Impacto no Negócio)

1. **Autenticação e Autorização**
   - Login/logout (email/password e Google OAuth)
   - Verificação de roles (admin, instructor, student)
   - RLS enforcement (alunos não veem dados de outros)
   - View-as-student mode

2. **Matrícula em Cursos**
   - Enrollment creation
   - Validação de duplicatas
   - Atualização de status

3. **Avaliações (Testes)**
   - Criação de tentativa
   - Submissão e correção automática
   - Cálculo de best_score
   - Atribuição manual de nota máxima (admin)
   - Validação de consistência test_attempts ↔ test_grades

4. **Certificados**
   - Verificação de elegibilidade
   - Workflow de solicitação
   - Aprovação/rejeição (admin)
   - Geração de PDF
   - Código de verificação

5. **Importação Google Drive**
   - Descoberta de estrutura
   - Criação de módulos/disciplinas/aulas/testes
   - Extração de gabarito de testes
   - Tratamento de erros e timeouts

### 10.2 Prioridade MÉDIA

6. **Progresso de Aprendizagem**
   - Marcação de aula como concluída
   - Recálculo de progress_percentage
   - Triggers automáticos

7. **Relatórios Excel**
   - Template upload e mapeamento
   - Geração de relatórios (enrollments, grades, history)
   - Download

8. **TCC Submission**
   - Upload de arquivo
   - Avaliação por instrutor
   - Integração com certificado

### 10.3 Prioridade BAIXA

9. **Gerenciamento de Estrutura**
   - CRUD de cursos/módulos/disciplinas/aulas
   - Reordenação (drag-and-drop)

10. **Reviews de Cursos**
    - Criação de review
    - Cálculo de média

---

## 11. MAPEAMENTO DE DEPENDÊNCIAS ENTRE MÓDULOS

### Camadas da Aplicação

```
┌─────────────────────────────────────────────────┐
│           Frontend (Next.js App Router)         │
│  - app/dashboard/*       (Admin/Instructor)     │
│  - app/student-dashboard/* (Student)            │
│  - app/components/*      (UI Components)        │
└─────────────────────────────────────────────────┘
                     ↓ (depende)
┌─────────────────────────────────────────────────┐
│              API Layer (app/api/*)              │
│  - Autenticação                                 │
│  - CRUD de entidades                            │
│  - Business logic endpoints                     │
└─────────────────────────────────────────────────┘
                     ↓ (depende)
┌─────────────────────────────────────────────────┐
│         Business Services (lib/services/*)      │
│  - grade-services.ts                            │
│  - grade-validation.ts                          │
│  - grade-calculator.ts                          │
│  - template-cleanup.ts                          │
└─────────────────────────────────────────────────┘
                     ↓ (depende)
┌─────────────────────────────────────────────────┐
│       Data Access (lib/supabase/*)              │
│  - client.ts, server.ts, admin.ts               │
│  - auth-helpers.ts                              │
└─────────────────────────────────────────────────┘
                     ↓ (depende)
┌─────────────────────────────────────────────────┐
│      Database (Supabase PostgreSQL)             │
│  - 25 tabelas                                   │
│  - RLS policies                                 │
│  - Functions & Triggers                         │
└─────────────────────────────────────────────────┘
```

### Módulos Externos

```
Google Drive API ←→ app/api/import/drive/route.ts
                 ←→ lib/drive-import-utils.ts

Supabase Auth ←→ middleware.ts (sessão)
              ←→ app/api/auth/* (login/logout)
              ←→ lib/supabase/auth-helpers.ts

Supabase Storage ←→ app/dashboard/templates/* (upload Excel)
                 ←→ (inferido) TCC upload
```

---

## 12. COVERAGE ATUAL DE TESTES

### Arquivos com Testes Existentes

1. **__tests__/middleware.test.ts** (49 linhas)
   - Testa `ensureUserEnrollmentForPreview`
   - Stub do Supabase client
   - 2 casos: sem cursos, matrícula em curso faltante

2. **__tests__/integration/assign-grade-flow.test.ts** (303 linhas)
   - Teste de integração completo do fluxo de atribuição de nota
   - Mock extensivo do Supabase
   - 4 cenários: sucesso, aluno não matriculado, primeira tentativa, auditoria

3. **app/api/certificates/__tests__/check-eligibility.test.ts**
   - (não lido, assumido teste do endpoint de elegibilidade)

4. **app/api/courses/__tests__/enroll-route.test.ts**
   - (não lido, assumido teste de matrícula)

5. **app/api/tests/__tests__/submit-route.test.ts**
   - (não lido, assumido teste de submissão de teste)

6. **app/api/tests/utils/__tests__/answer-key.test.ts**
   - (não lido, assumido teste de parsing de gabarito)

7. **lib/services/__tests__/grade-services.test.ts**
   - (não lido, assumido teste de grade-services)

8. **lib/services/__tests__/grade-validation.test.ts**
   - (não lido, assumido teste de grade-validation)

### Cobertura Estimada

**[CONFIANÇA: MÉDIO]** ~5-10% de cobertura de código  
Evidência: 8 arquivos de teste vs. ~110 arquivos .ts/.tsx em app/api/ e lib/

**Áreas SEM cobertura:**
- Frontend (0 testes de componentes React)
- Importação Google Drive (lógica complexa não testada)
- Geração de relatórios Excel (0 testes)
- Certificados (apenas check-eligibility testado)
- Progresso de aulas (0 testes)
- TCC submission (0 testes)

---

## 13. COMANDOS DE BUILD E TEST

### Desenvolvimento

```bash
npm run dev              # Next.js dev server (porta 3000)
```

### Build e Deploy

```bash
npm run build            # Produção build
npm run start            # Servir build
```

### Qualidade de Código

```bash
npm run lint             # ESLint
npm run type-check       # TypeScript check
npm run lint:strict      # type-check + lint
npm run lint:full        # lint + type-check + test:ci
```

### Testes

```bash
npm run test             # Vitest watch mode
npm run test:ci          # Vitest single run
npm run test:coverage    # Coverage report
```

### Scripts Utilitários

```bash
node scripts/create-test-user.js    # Criar usuário admin de teste
node run-migration.js               # Executar migração SQL
node scripts/analyze-excel.js       # Analisar estrutura de planilha
```

---

## 14. VARIÁVEIS DE AMBIENTE NECESSÁRIAS

### Essenciais (de .env.local.example)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://mdzgnktlsmkjecdbermo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<google_oauth_client_id>
NEXT_PUBLIC_GOOGLE_API_KEY=<google_api_key>
```

### Opcionais (Google Drive Import)

```bash
GOOGLE_DRIVE_IMPORT_CHUNK_MAX_MS=150000
GOOGLE_DRIVE_DEFAULT_TIMEOUT_MS=180000
GOOGLE_DRIVE_LIST_TIMEOUT_MS=180000
GOOGLE_DRIVE_EXPORT_TIMEOUT_MS=120000
GOOGLE_DRIVE_BACKGROUND_MAX_RUNTIME_MS=780000
GOOGLE_DRIVE_BACKGROUND_SAFETY_MS=60000
GOOGLE_DRIVE_BACKGROUND_LOOP_DELAY_MS=1500
GOOGLE_DRIVE_RUNNER_SECRET=<token_secreto>
```

### Deploy (Vercel)

```bash
NEXT_PUBLIC_APP_URL=https://swiftedu-rose.vercel.app
NODE_ENV=production
```

### Legado (Inngest - removido)

```bash
# INNGEST_EVENT_KEY=<removido>
# INNGEST_SIGNING_KEY=<removido>
```

---

## 15. OBSERVAÇÕES FINAIS

### Pontos Fortes da Arquitetura

✅ Tipos TypeScript auto-gerados do schema Supabase  
✅ RLS implementado para segurança de dados  
✅ Auditoria via activity_logs  
✅ Sistema de notas com consolidação e override  
✅ Workflow de certificados com aprovação manual  
✅ Importação automatizada do Google Drive  
✅ Relatórios customizáveis via templates Excel  
✅ Separação clara de dashboards (admin vs. student)  
✅ Middleware robusto para autenticação  

### Pontos de Atenção

⚠️ Coverage de testes muito baixa (~5-10%)  
⚠️ Nenhum teste de componentes React  
⚠️ Lógica de triggers/functions PostgreSQL não documentada  
⚠️ Dependência forte de timeouts do Vercel para import Google Drive  
⚠️ Sem logging centralizado ou APM  
⚠️ Configuração Inngest legada pode causar confusão  
⚠️ Sem testes E2E (Playwright/Cypress)  

### Recomendações Prioritárias

1. **Aumentar cobertura de testes:**
   - Unit tests para lib/services/
   - Component tests para app/components/ (prioritário: TestViewer, DriveImportModal, StudentGradesReport)
   - Integration tests para fluxos críticos (matrícula, importação Drive, geração certificado)
   - E2E tests com Playwright para user journeys completos

2. **Documentar database triggers e functions:**
   - Executar queries SQL de auditoria
   - Criar documentação em markdown

3. **Adicionar observabilidade:**
   - Sentry para error tracking
   - Logs estruturados (Winston/Pino)
   - Métricas de performance

4. **Revisar segurança:**
   - Audit de RLS policies
   - CSP headers (já implementado em middleware, validar configuração)
   - Rate limiting em endpoints públicos

5. **Melhorar developer experience:**
   - Setup automatizado com scripts/setup.sh
   - Docker Compose para Supabase local
   - Pre-commit hooks (Husky) para lint/type-check

---

## APÊNDICE A: COMANDOS DE ANÁLISE EXECUTADOS

```bash
# Detecção de runtime
node --version
npm --version

# Estrutura de diretórios
tree -L 3 -d app/
tree -L 3 -d lib/

# Contagem de arquivos
find -name "*.test.ts" -o -name "*.test.tsx" | wc -l
find -name "page.tsx" | wc -l

# Busca de padrões
grep -r "CREATE TABLE" supabase/migrations/
grep "export.*function" lib/services/ --files-with-matches

# Leitura de manifestos
cat package.json
cat tsconfig.json
cat next.config.js
cat vercel.json
cat .env.local.example
cat .mcp.json
```

---

## APÊNDICE B: GLOSSÁRIO DE TERMOS DO DOMÍNIO

- **Course (Curso):** Unidade principal de conteúdo educacional
- **Module (Módulo):** Agrupamento de disciplinas dentro de um curso
- **Subject (Disciplina):** Matéria específica com aulas associadas
- **Lesson (Aula):** Unidade de conteúdo (vídeo, documento, texto)
- **Test (Teste/Avaliação):** Prova com questões de múltipla escolha
- **Enrollment (Matrícula):** Relação aluno ↔ curso
- **Test Attempt (Tentativa de Teste):** Registro de uma tentativa de prova
- **Test Grade (Nota Consolidada):** Melhor nota do aluno em um teste
- **TCC (Trabalho de Conclusão de Curso):** Projeto final para certificação
- **Certificate (Certificado):** Documento emitido após conclusão do curso
- **Grade Override (Sobrescrita de Nota):** Atribuição manual de nota por admin
- **Activity Log (Log de Auditoria):** Registro de ações para compliance
- **Template Excel:** Modelo de planilha para geração de relatórios

---

**FIM DO DOCUMENTO**  
**Próximos Passos:** Utilizar este contexto para criar plano de testes detalhado.
