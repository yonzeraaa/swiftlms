# 🏗️ Arquitetura do Projeto SwiftLMS

## Tipo de Projeto

**SwiftLMS é uma aplicação Next.js 15** (React full-stack), NÃO um site HTML estático.

```
Framework: Next.js 15.5.3
Runtime: Node.js
Linguagem: TypeScript 5.9.2
Database: PostgreSQL (via Supabase)
Auth: Supabase Auth + NextAuth
```

---

## ❌ O que NÃO existe

```
❌ js/main.js          → Não existe pasta js/
❌ index.html          → Login é app/page.tsx (React)
❌ Formulários HTML    → Tudo é React (JSX/TSX)
❌ Scripts inline      → Código compilado pelo Next.js
❌ jQuery/vanilla JS   → React + TypeScript
```

---

## ✅ Estrutura Real

```
swiftlms/
├── app/                          # Next.js App Router (frontend + backend)
│   ├── page.tsx                  # ✅ PÁGINA DE LOGIN (não index.html)
│   ├── layout.tsx                # Layout raiz
│   ├── globals.css               # Estilos globais
│   │
│   ├── api/                      # ✅ BACKEND (API Routes)
│   │   ├── auth/                 # Endpoints de autenticação
│   │   │   ├── login/
│   │   │   │   └── route.ts      # ✅ POST /api/auth/login
│   │   │   ├── logout/
│   │   │   │   └── route.ts      # ✅ POST /api/auth/logout
│   │   │   └── ...
│   │   │
│   │   ├── courses/              # Endpoints de cursos
│   │   ├── tests/                # Endpoints de testes
│   │   └── users/                # Endpoints de usuários
│   │
│   ├── components/               # Componentes React reutilizáveis
│   │   ├── Button.tsx
│   │   ├── SessionProvider.tsx   # ✅ Provider de sessão
│   │   └── ...
│   │
│   ├── contexts/                 # React Context API
│   │   └── LanguageContext.tsx   # i18n
│   │
│   ├── dashboard/                # Páginas do dashboard admin
│   │   ├── page.tsx
│   │   ├── courses/
│   │   ├── users/
│   │   └── ...
│   │
│   └── student-dashboard/        # Páginas do dashboard aluno
│       ├── page.tsx
│       ├── courses/
│       └── ...
│
├── lib/                          # Lógica compartilhada
│   ├── auth/
│   │   └── session-manager.ts    # ✅ Gestão de tokens
│   │
│   ├── security/
│   │   └── csrf.ts               # ✅ Proteção CSRF
│   │
│   ├── validation/
│   │   ├── auth.ts               # ✅ Schemas Zod
│   │   ├── courses.ts
│   │   └── tests.ts
│   │
│   ├── services/                 # Lógica de negócio
│   │   ├── AuditLogService.ts
│   │   ├── CertificateService.ts
│   │   ├── EnrollmentService.ts
│   │   └── ...
│   │
│   ├── supabase/                 # Configuração Supabase
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── admin.ts
│   │
│   └── utils/
│       └── logger.ts             # ✅ Logger estruturado
│
├── middleware.ts                 # ✅ Middleware de segurança (HSTS, CSP, etc)
│
├── supabase/
│   └── migrations/               # Migrações SQL (18 arquivos)
│
├── public/                       # Assets estáticos (apenas imagens/ícones)
│   ├── favicon.ico
│   ├── favicon.png
│   └── images/
│
├── __tests__/                    # Testes unitários (826 testes)
│
├── package.json                  # Dependências npm
├── tsconfig.json                 # Configuração TypeScript
├── next.config.js                # Configuração Next.js
├── tailwind.config.js            # Configuração Tailwind CSS
│
├── SECURITY-IMPLEMENTATION.md    # ✅ Documentação de segurança
└── ARCHITECTURE.md               # ✅ Este arquivo
```

---

## 🔄 Fluxo de Requisição

### 1. Usuário acessa `/`

```
Browser
  ↓
Next.js Router
  ↓
middleware.ts → Verificações de segurança (HSTS, CSP, CORS)
  ↓
app/page.tsx → Renderiza componente React de login
  ↓
Browser recebe HTML + JS hidratado
```

### 2. Usuário submete login

```
app/page.tsx (handleSubmit)
  ↓
fetch('/api/auth/login', { method: 'POST', ... })
  ↓
middleware.ts → Verificações de segurança
  ↓
app/api/auth/login/route.ts
  ├─ validateCSRF()
  ├─ authRateLimiter.isAllowed()
  ├─ loginSchema.safeParse()
  ├─ supabase.auth.signInWithPassword()
  └─ response.cookies.set() → HttpOnly + Secure + SameSite
  ↓
Response { success: true, redirectUrl: '/dashboard' }
  ↓
lib/auth/session-manager.ts
  ├─ scheduleTokenRefresh() (timer 50min)
  ├─ resetInactivityTimer() (timer 30min)
  └─ setupActivityListeners()
  ↓
window.location.href = '/dashboard'
```

---

## 🔐 Camadas de Segurança

### Camada 1: Middleware Global
```typescript
// middleware.ts
✅ HSTS headers (força HTTPS)
✅ CSP headers (Content Security Policy)
✅ CORS configuration
✅ Cookie security settings
✅ Request origin validation
```

### Camada 2: Endpoint Protection
```typescript
// app/api/auth/login/route.ts
✅ CSRF validation (lib/security/csrf.ts)
✅ Rate limiting (app/lib/rate-limiter.ts)
✅ Input validation (lib/validation/auth.ts com Zod)
✅ Authentication (Supabase Auth)
✅ Secure cookies (HttpOnly + Secure + SameSite)
```

### Camada 3: Client-Side Session
```typescript
// lib/auth/session-manager.ts
✅ Auto-refresh tokens (50min antes de expirar)
✅ Inactivity detection (30min sem atividade)
✅ Activity listeners (mouse, keyboard, scroll, touch)
✅ Automatic logout on inactivity
```

---

## 📦 Tecnologias Utilizadas

### Frontend
- **React 19.1.1** - UI components
- **Next.js 15.5.3** - Framework full-stack
- **TypeScript 5.9.2** - Type safety
- **Tailwind CSS 3.4.17** - Styling
- **Framer Motion** - Animations
- **Radix UI** - Accessible components

### Backend
- **Next.js API Routes** - RESTful API
- **Supabase** - Database + Auth
- **Zod** - Schema validation
- **PostgreSQL** - Database

### Segurança
- **Supabase Auth** - JWT tokens
- **Custom CSRF protection** - Origin validation
- **Rate Limiter** - Brute force protection
- **Secure cookies** - HttpOnly + Secure + SameSite
- **HSTS** - HTTPS enforcement
- **CSP** - Content Security Policy

### DevOps
- **Vitest** - Unit testing (826 tests)
- **Playwright** - E2E testing
- **ESLint** - Code quality
- **Git** - Version control
- **Vercel** - Deployment (opcional)

---

## 🚀 Build & Deploy

### Desenvolvimento
```bash
npm run dev          # Inicia servidor local (localhost:3000)
npm run test:unit    # Roda 826 testes unitários
npm run lint         # ESLint
```

### Produção
```bash
npm run build        # Compila para produção
npm run start        # Inicia servidor produção
```

**Build Output:**
```
Route (app)                              Size  First Load JS
┌ ○ /                                 10.6 kB         216 kB
├ ƒ /api/auth/login                    210 B         102 kB
├ ƒ /api/auth/logout                   210 B         102 kB
├ ○ /dashboard                        5.09 kB         210 kB
├ ○ /student-dashboard                6.97 kB         216 kB
└ ... (57 rotas no total)

ƒ Middleware                          71.3 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

---

## 🔍 Verificação de Arquivos

```bash
# ❌ Arquivos que NÃO existem
$ find . -name "main.js" -o -name "index.html" | grep -v node_modules
(nenhum resultado)

# ❌ Diretório js/ não existe
$ ls js/
ls: cannot access 'js/': No such file or directory

# ✅ Arquivo de login REAL
$ ls app/page.tsx
app/page.tsx  ← Este é o "index.html" (React)

# ✅ Endpoint de login REAL
$ ls app/api/auth/login/route.ts
app/api/auth/login/route.ts  ← Este é o backend de autenticação
```

---

## 📚 Documentação Relacionada

- **SECURITY-IMPLEMENTATION.md** - Detalhes de implementação de segurança
- **CLAUDE.md** - Instruções do projeto
- **package.json** - Dependências e scripts
- **README.md** - Documentação geral (se existir)

---

## ⚠️ Conclusão

**SwiftLMS é uma aplicação Next.js moderna, não um site HTML estático.**

Todos os problemas citados sobre `js/main.js` e `index.html` **não se aplicam** porque esses arquivos **não existem** neste projeto.

A implementação real usa:
- ✅ React components (TSX)
- ✅ API Routes (TypeScript)
- ✅ Supabase Auth (JWT tokens)
- ✅ Secure cookies (HttpOnly + Secure + SameSite)
- ✅ Auto-refresh tokens (SessionManager)
- ✅ CSRF protection
- ✅ Rate limiting
- ✅ Input validation (Zod)

**Status:** ✅ Produção-ready com segurança robusta
