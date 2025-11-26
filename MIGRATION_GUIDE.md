# Guia de Migração Completa - Browser Client para Server Actions

## Status Atual: 2/17 Arquivos Migrados ✅

### ✅ COMPLETO: Priority 1 - Layouts (2 arquivos)
- ✅ app/dashboard/layout.tsx
- ✅ app/student-dashboard/layout.tsx

---

## 🚧 PENDENTE: 15 Arquivos Restantes

### Priority 2: Pages (2 arquivos)

#### 1. app/reset-password/ResetPasswordContent.tsx

**Operações atuais com browser client:**
- `supabase.auth.setSession()` - estabelece sessão de recuperação
- `supabase.auth.getSession()` - verifica sessão
- `supabase.auth.updateUser()` - reseta senha

**Migração necessária:**

1. Criar `lib/actions/reset-password.ts`:
```typescript
'use server'

import { createClient } from '@/lib/supabase/server'

export async function setRecoverySession(accessToken: string, refreshToken: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, session: data.session }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function resetUserPassword(newPassword: string) {
  try {
    const supabase = await createClient()

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
```

2. No componente ResetPasswordContent.tsx:
```typescript
// Remover:
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// Adicionar:
import { setRecoverySession, resetUserPassword } from '@/lib/actions/reset-password'

// Substituir chamadas:
// Antes:
await supabase.auth.setSession({ access_token, refresh_token })

// Depois:
await setRecoverySession(access_token, refresh_token)

// Antes:
await supabase.auth.updateUser({ password: newPassword })

// Depois:
await resetUserPassword(newPassword)
```

---

#### 2. app/dashboard/users/[id]/grades/page.tsx

**Operações atuais com browser client:**
- `supabase.auth.getUser()` - verifica usuário
- `supabase.from('profiles')` - busca perfil

**Migração necessária:**

1. Criar `lib/actions/user-grades.ts`:
```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function getUserGradesProfile(userId: string) {
  try {
    const supabase = await createClient()

    // Verify current user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      redirect('/')
    }

    // Get profile of the user whose grades we're viewing
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', userId)
      .single()

    if (profileError) {
      return { success: false, profile: null, error: profileError.message }
    }

    return { success: true, profile }
  } catch (error: any) {
    return { success: false, profile: null, error: error.message }
  }
}
```

2. No arquivo page.tsx:
```typescript
// Remover:
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// Adicionar:
import { getUserGradesProfile } from '@/lib/actions/user-grades'

// Substituir:
const result = await getUserGradesProfile(userId)
if (result.success) {
  // usar result.profile
}
```

---

### Priority 3: Componentes (5 arquivos)

#### 3. app/components/ForgotPasswordModal.tsx

**Operações:**
- `supabase.from('profiles').select()` - verifica se usuário existe
- `supabase.auth.resetPasswordForEmail()` - envia email de reset

**Server action necessária:**
```typescript
// lib/actions/forgot-password.ts
'use server'

export async function checkUserExistsAndSendReset(email: string) {
  const supabase = await createClient()

  // Check if user exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (!profile) {
    return { success: false, error: 'Usuário não encontrado' }
  }

  // Send reset email
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
```

---

#### 4. app/components/TestViewer.tsx

**Operações:**
- `supabase.from('test_answer_keys')` - busca gabaritos
- `supabase.channel()` - realtime subscription

**Migração:**
1. Criar server action para buscar gabaritos
2. **Para Realtime:** Se realmente necessário, manter browser client APENAS para essa feature
3. Considerar polling como alternativa ao realtime

```typescript
// lib/actions/test-viewer.ts
'use server'

export async function getTestAnswerKey(testId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('test_answer_keys')
    .select('*')
    .eq('test_id', testId)

  if (error) {
    return { success: false, data: null, error: error.message }
  }

  return { success: true, data }
}
```

---

#### 5. app/components/SubjectManager.tsx

**Operações:**
- `supabase.auth.getUser()` + `supabase.from('profiles')` - verifica admin
- `supabase.from('subjects')` - lista disciplinas
- `supabase.from('course_subjects')` - gerencia relações
- `.insert()` e `.delete()` - CRUD operations

**Migração:**
```typescript
// lib/actions/subject-manager.ts
'use server'

export async function getSubjectsForCourse(courseId: string) {
  const supabase = await createClient()

  // Verify admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { success: false, error: 'Not authorized' }
  }

  // Get subjects
  const { data: subjects, error: subjectsError } = await supabase
    .from('subjects')
    .select('*')
    .order('name')

  const { data: courseSubjects, error: courseError } = await supabase
    .from('course_subjects')
    .select('subject_id')
    .eq('course_id', courseId)

  if (subjectsError || courseError) {
    return { success: false, error: 'Error fetching data' }
  }

  return {
    success: true,
    subjects,
    courseSubjects: courseSubjects.map(cs => cs.subject_id)
  }
}

export async function addSubjectToCourse(courseId: string, subjectId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('course_subjects')
    .insert({ course_id: courseId, subject_id: subjectId })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function removeSubjectFromCourse(courseId: string, subjectId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('course_subjects')
    .delete()
    .eq('course_id', courseId)
    .eq('subject_id', subjectId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
```

---

#### 6. app/components/ui/CommandPalette.tsx

**Operações:**
- `supabase.auth.signOut()` - logout

**Migração:**
- Já existe `signOutAction()` em `lib/actions/auth.ts`
- Usar essa action em vez de chamar supabase direto

```typescript
// Remover:
const supabase = createClient()
await supabase.auth.signOut()

// Adicionar:
import { signOutAction } from '@/lib/actions/auth'
await signOutAction()
```

---

#### 7. app/components/CourseStructureManager.tsx

**Operações:**
- `supabase.from('course_modules')` - busca módulos
- `supabase.from('module_subjects')` - busca disciplinas
- `supabase.from('lessons')` - busca aulas
- `supabase.rpc()` - reordenação

**Migração:**
```typescript
// lib/actions/course-structure.ts
'use server'

export async function getCourseStructure(courseId: string) {
  const supabase = await createClient()

  const { data: modules, error: modulesError } = await supabase
    .from('course_modules')
    .select('*, module_subjects(*, subject:subjects(*)), lessons(*)')
    .eq('course_id', courseId)
    .order('order')

  if (modulesError) {
    return { success: false, data: null, error: modulesError.message }
  }

  return { success: true, data: modules }
}

export async function reorderModules(updates: any[]) {
  const supabase = await createClient()

  const { error } = await supabase.rpc('reorder_modules', {
    updates
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
```

---

### Priority 4: Biblioteca/Serviços (8 arquivos)

#### 8. app/lib/supabase-service.ts

**Operação:**
- Service class genérico que envolve browser client

**Migração:**
- **Opção 1:** Deletar arquivo e migrar todos os usos para server actions específicas
- **Opção 2:** Reescrever para usar server client:

```typescript
// Mudar de:
import { createClient } from '@/lib/supabase/client'

// Para:
import { createClient } from '@/lib/supabase/server'

// E tornar todas as funções 'use server' actions
```

---

#### 9-16. Excel Template Mappers (8 arquivos)

**Arquivos:**
- lib/use-template-for-report.ts
- lib/excel-template-engine.ts
- lib/excel-template-mappers/student-history-mapper.ts
- lib/excel-template-mappers/users-mapper.ts
- lib/excel-template-mappers/grades-mapper.ts
- lib/excel-template-mappers/enrollments-mapper.ts
- lib/excel-template-mappers/access-mapper.ts

**Operações comuns:**
- `supabase.from()` - queries em tabelas
- `supabase.storage.from().download()` - download de templates

**Migração geral:**

1. Tornar todas as funções 'use server' actions
2. Mudar imports de `@/lib/supabase/client` para `@/lib/supabase/server`
3. Para storage operations (download):

```typescript
// lib/actions/template-storage.ts
'use server'

export async function downloadTemplate(bucket: string, path: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .storage
    .from(bucket)
    .download(path)

  if (error) {
    return { success: false, data: null, error: error.message }
  }

  // Convert blob to buffer for server-side processing
  const buffer = Buffer.from(await data.arrayBuffer())

  return { success: true, data: buffer }
}
```

---

## Padrão de Migração Geral

Para qualquer arquivo com browser client:

### 1. Identificar operações
```typescript
// Encontre todos os:
supabase.auth.*
supabase.from().*
supabase.rpc()
supabase.storage.*
supabase.channel() // realtime
```

### 2. Criar server action
```typescript
// lib/actions/[nome-descritivo].ts
'use server'

import { createClient } from '@/lib/supabase/server'

export async function minhaOperacao(params) {
  try {
    const supabase = await createClient()

    // Verificar autenticação se necessário
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Fazer operação
    const { data, error } = await supabase.from('tabela').select()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
```

### 3. Atualizar componente
```typescript
// No componente client:

// Remover:
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// Adicionar:
import { minhaOperacao } from '@/lib/actions/[nome]'

// Substituir:
// Antes:
const { data } = await supabase.from('tabela').select()

// Depois:
const result = await minhaOperacao()
if (result.success) {
  const data = result.data
}
```

---

## Checklist de Migração

Para cada arquivo:

- [ ] Criar server action correspondente em `lib/actions/`
- [ ] Remover `import { createClient } from '@/lib/supabase/client'`
- [ ] Remover `const supabase = createClient()`
- [ ] Substituir todas as chamadas `supabase.*` por server actions
- [ ] Remover código de limpeza de localStorage/sessionStorage (se houver)
- [ ] Testar a funcionalidade
- [ ] Build deve passar sem erros
- [ ] Commit incremental

---

## Casos Especiais

### Realtime Subscriptions
Se o componente REALMENTE precisa de realtime:

**Opção A:** Polling (recomendado)
```typescript
useEffect(() => {
  const fetchData = async () => {
    const result = await minhaServerAction()
    setData(result.data)
  }

  fetchData()
  const interval = setInterval(fetchData, 30000) // poll a cada 30s

  return () => clearInterval(interval)
}, [])
```

**Opção B:** Manter browser client APENAS para realtime
- Documentar claramente que é usado só para realtime
- Aceitar o risco de localStorage (mitigado por CSP)
- Considerar Server-Sent Events como alternativa futura

### File Uploads
Para uploads diretos no Supabase Storage:

1. Gerar signed URL via server action:
```typescript
'use server'

export async function getUploadUrl(bucket: string, path: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .storage
    .from(bucket)
    .createSignedUploadUrl(path)

  if (error) {
    return { success: false, url: null, error: error.message }
  }

  return { success: true, url: data.signedUrl }
}
```

2. No cliente, usar a signed URL:
```typescript
const { url } = await getUploadUrl('bucket', 'path')
// Upload via fetch para a signed URL
```

---

## Testando a Migração

Após cada arquivo migrado:

```bash
# 1. Build deve passar
npm run build

# 2. Tests devem passar
npm test

# 3. Verificar no DevTools:
# - Application > Cookies: httpOnly ✓
# - Application > LocalStorage: sem tokens Supabase
# - Console: sem erros de autenticação
```

---

## Progresso

- [x] Priority 1: Layouts (2 arquivos) ✅
- [ ] Priority 2: Pages (2 arquivos)
  - [ ] reset-password/ResetPasswordContent.tsx
  - [ ] dashboard/users/[id]/grades/page.tsx
- [ ] Priority 3: Componentes (5 arquivos)
  - [ ] ForgotPasswordModal.tsx
  - [ ] TestViewer.tsx
  - [ ] SubjectManager.tsx
  - [ ] CommandPalette.tsx
  - [ ] CourseStructureManager.tsx
- [ ] Priority 4: Biblioteca (8 arquivos)
  - [ ] supabase-service.ts
  - [ ] use-template-for-report.ts
  - [ ] excel-template-engine.ts
  - [ ] 5 mapper files

**Total: 2/17 completo (11.8%)**
**Restante: 15 arquivos**

---

## Notas Finais

1. **Sempre testar após cada migração**
2. **Fazer commits incrementais** (por prioridade)
3. **Documentar casos especiais** (realtime, uploads)
4. **Verificar que localStorage está vazio** de tokens Supabase
5. **Confirmar httpOnly cookies** no DevTools

Boa sorte com a migração! 🚀
