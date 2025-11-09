# 🔄 Migration Guide: Client Components → Server Actions

## Overview

This guide explains how to migrate client-side Supabase queries to server actions to eliminate token exposure risk.

---

## Why Migrate?

**Current Risk:** Client components using `createClient()` from `@supabase/ssr` expose auth tokens in JavaScript-readable cookies, making them vulnerable to XSS attacks.

**Solution:** Move data fetching to server-side (Server Components or Server Actions) where tokens remain secure.

---

## Architecture Options

### Option 1: Server Components (Recommended for Data Display)

**Best for:** Pages that primarily display data without much interactivity

```typescript
// app/student-dashboard/grades/page.tsx
import { getStudentGrades } from '@/lib/actions/student-dashboard'

// This is a Server Component (no 'use client')
export default async function GradesPage() {
  const grades = await getStudentGrades()

  return <GradesList grades={grades} />
}
```

**Pros:**
- Zero JavaScript sent for data fetching
- Fastest initial page load
- No token exposure

**Cons:**
- Limited interactivity
- Requires client components for forms/interactions

### Option 2: Server Actions + Client Components

**Best for:** Interactive pages that need real-time updates

```typescript
// app/student-dashboard/courses/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { getEnrolledCourses } from '@/lib/actions/student-dashboard'

export default function CoursesPage() {
  const [courses, setCourses] = useState([])

  useEffect(() => {
    getEnrolledCourses().then(setCourses)
  }, [])

  return <CoursesList courses={courses} />
}
```

**Pros:**
- Maintains interactivity
- Server actions can be called from client
- Gradual migration path

**Cons:**
- Still ships some JavaScript
- Slightly slower than pure Server Components

---

## Migration Steps

### Step 1: Create Server Action

Create a file in `lib/actions/` with 'use server' directive:

```typescript
// lib/actions/student-dashboard.ts
'use server'

import { createClient } from '@/lib/supabase/server'  // ← Server client
import { redirect } from 'next/navigation'

export async function getStudentGrades() {
  const supabase = await createClient()

  // Check auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Fetch data with RLS protection
  const { data } = await supabase
    .from('test_attempts')
    .select('*')
    .eq('student_id', user.id)

  return data
}
```

**Key Points:**
- Use `'use server'` at top of file
- Import from `@/lib/supabase/server` (not client)
- Handle auth redirects with `redirect()`
- Return plain data (not Supabase client)

### Step 2: Convert Page to Server Component

Remove `'use client'` and `useEffect`:

```typescript
// BEFORE (Client Component)
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function GradesPage() {
  const [grades, setGrades] = useState([])
  const supabase = createClient()

  useEffect(() => {
    supabase.from('test_attempts')
      .select('*')
      .then(({ data }) => setGrades(data))
  }, [])

  return <div>{grades.map(...)}</div>
}
```

```typescript
// AFTER (Server Component)
import { getStudentGrades } from '@/lib/actions/student-dashboard'

export default async function GradesPage() {
  const grades = await getStudentGrades()

  return <div>{grades.map(...)}</div>
}
```

### Step 3: Handle Interactivity with Client Components

For interactive elements, create separate client components:

```typescript
// app/student-dashboard/grades/page.tsx (Server Component)
import { getStudentGrades } from '@/lib/actions/student-dashboard'
import GradesTable from './GradesTable'

export default async function GradesPage() {
  const grades = await getStudentGrades()

  return <GradesTable initialGrades={grades} />
}
```

```typescript
// app/student-dashboard/grades/GradesTable.tsx (Client Component)
'use client'

export default function GradesTable({ initialGrades }) {
  const [grades, setGrades] = useState(initialGrades)
  const [sortOrder, setSortOrder] = useState('desc')

  // Interactive logic here

  return <table>...</table>
}
```

---

## Common Patterns

### Pattern 1: User Profile Check

```typescript
// BEFORE
const { data: { user } } = await supabase.auth.getUser()
if (!user) router.push('/')

// AFTER (in server action)
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/')
```

### Pattern 2: RLS Queries

```typescript
// BEFORE (Client)
const { data } = await supabase
  .from('enrollments')
  .select('*')
  .eq('student_id', user.id)

// AFTER (Server Action)
export async function getEnrollments() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('enrollments')
    .select('*')
    .eq('student_id', user.id)

  return data || []
}
```

### Pattern 3: Mutations (Forms)

```typescript
// app/student-dashboard/settings/actions.ts
'use server'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  await supabase
    .from('profiles')
    .update({
      name: formData.get('name'),
      bio: formData.get('bio')
    })
    .eq('id', user.id)

  revalidatePath('/student-dashboard/settings')
}
```

```typescript
// app/student-dashboard/settings/page.tsx
'use client'

import { updateProfile } from './actions'

export default function SettingsPage() {
  return (
    <form action={updateProfile}>
      <input name="name" />
      <button type="submit">Save</button>
    </form>
  )
}
```

---

## Migration Priority

### Phase 1: High-Risk Pages (Immediate)
✅ Completed: Server actions created in `lib/actions/student-dashboard.ts`

Migrate these first:
- [ ] `/student-dashboard` - Main dashboard
- [ ] `/student-dashboard/grades` - Student grades
- [ ] `/student-dashboard/certificates` - Certificates
- [ ] `/dashboard` - Admin dashboard
- [ ] `/dashboard/users` - User management

### Phase 2: Medium-Risk Pages (Short-term)
- [ ] `/student-dashboard/courses` - Course listings
- [ ] `/student-dashboard/evaluations` - Test listings
- [ ] `/dashboard/courses` - Course management
- [ ] `/dashboard/reports` - Report generation

### Phase 3: Low-Risk Pages (Long-term)
- [ ] `/student-dashboard/settings` - User settings
- [ ] `/dashboard/settings` - Admin settings
- [ ] Other static/informational pages

---

## Testing Checklist

After each migration:

- [ ] Page loads without errors
- [ ] Data displays correctly
- [ ] Auth redirects work (try logging out)
- [ ] RLS policies respected (can't see other users' data)
- [ ] Interactive features still work
- [ ] Forms submit successfully
- [ ] Real-time updates (if applicable)

---

## Rollback Plan

If migration breaks functionality:

1. **Revert to client component:**
   ```bash
   git revert <commit-hash>
   ```

2. **Keep data fetching client-side temporarily:**
   - Current CSP headers still provide XSS protection
   - Rate limiting prevents brute force
   - Regular security audits catch issues early

3. **File bug report:**
   - Document what broke
   - Include error messages
   - Note which data wasn't loading

---

## Example: Complete Migration

Here's a full before/after example:

### Before (Client Component with Exposed Tokens)

```typescript
// app/student-dashboard/grades/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'  // ← Exposes tokens
import { useRouter } from 'next/navigation'

export default function GradesPage() {
  const [grades, setGrades] = useState([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchGrades()
  }, [])

  const fetchGrades = async () => {
    // Auth check client-side (insecure)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/')
      return
    }

    // Data fetch client-side (sends tokens over network)
    const { data } = await supabase
      .from('test_attempts')
      .select(`
        *,
        tests (
          title,
          total_points
        )
      `)
      .eq('student_id', user.id)
      .order('submitted_at', { ascending: false })

    setGrades(data || [])
    setLoading(false)
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <h1>My Grades</h1>
      {grades.map(grade => (
        <div key={grade.id}>
          {grade.tests.title}: {grade.score}/{grade.tests.total_points}
        </div>
      ))}
    </div>
  )
}
```

### After (Server Component with Secure Tokens)

```typescript
// app/student-dashboard/grades/page.tsx
import { getStudentGrades } from '@/lib/actions/student-dashboard'
import GradesTable from './GradesTable'

// Server Component (no 'use client')
export default async function GradesPage() {
  // Fetch happens server-side, tokens never exposed
  const grades = await getStudentGrades()

  return (
    <div>
      <h1>My Grades</h1>
      <GradesTable grades={grades} />
    </div>
  )
}
```

```typescript
// app/student-dashboard/grades/GradesTable.tsx
'use client'

// Client component for interactivity only, no data fetching
export default function GradesTable({ grades }) {
  const [sortOrder, setSortOrder] = useState('desc')

  const sortedGrades = [...grades].sort((a, b) =>
    sortOrder === 'desc'
      ? b.submitted_at - a.submitted_at
      : a.submitted_at - b.submitted_at
  )

  return (
    <div>
      <button onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}>
        Sort {sortOrder === 'desc' ? '↓' : '↑'}
      </button>
      {sortedGrades.map(grade => (
        <div key={grade.id}>
          {grade.tests.title}: {grade.score}/{grade.tests.total_points}
        </div>
      ))}
    </div>
  )
}
```

```typescript
// lib/actions/student-dashboard.ts
'use server'

import { createClient } from '@/lib/supabase/server'  // ← Server client
import { redirect } from 'next/navigation'

export async function getStudentGrades() {
  const supabase = await createClient()

  // Auth check server-side (secure)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Data fetch server-side (tokens never leave server)
  const { data: grades } = await supabase
    .from('test_attempts')
    .select(`
      *,
      tests (
        title,
        total_points
      )
    `)
    .eq('student_id', user.id)
    .order('submitted_at', { ascending: false })

  return grades || []
}
```

**Security Benefits:**
- ✅ Tokens never sent to client
- ✅ Auth checks happen server-side
- ✅ RLS queries execute on server
- ✅ No XSS attack surface for token theft
- ✅ Faster initial page load (less JavaScript)

---

## Additional Resources

- [Next.js Server Actions Docs](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Server vs Client Components](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns)
- [Supabase Server-Side Auth](https://supabase.com/docs/guides/auth/server-side)

---

**Last Updated:** 2025-01-09
**Status:** Server actions created, migration in progress
