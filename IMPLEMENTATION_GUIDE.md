# Service Implementation Guide for SwiftLMS

Based on exploration of the codebase, this guide shows how to implement missing services.

## Template: StudentHistoryService (Most Critical)

### File Location
`/lib/services/StudentHistoryService.ts`

### Pattern (based on existing GradeCalculator)
```typescript
import { createClient } from '@/lib/supabase/server'
import { GradeCalculator } from './grade-calculator'

// 1. Define interfaces
export interface StudentHistoryData {
  // ... from student-history-mapper
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

// 2. Create class with static methods (like GradeCalculator)
export class StudentHistoryService {
  /**
   * Fetches complete student transcript
   * Replaces: fetchStudentHistoryData from mapper
   */
  static async getStudentTranscript(userId: string): Promise<StudentHistoryData> {
    // Implementation
  }
  
  /**
   * Calculates student GPA
   * Used by reports and transcripts
   */
  static async calculateStudentGPA(userId: string): Promise<number> {
    // Implementation
  }
}
```

### What to Extract From
- Move logic from: `/lib/excel-template-mappers/student-history-mapper.ts`
- Keep the `fetchStudentHistoryData()` function as-is initially
- Gradually refactor into service methods

### Usage in Components
**Before**:
```typescript
// StudentGradesReport.tsx
const data = await fetchStudentHistoryData(userId)
```

**After**:
```typescript
// StudentGradesReport.tsx
const data = await StudentHistoryService.getStudentTranscript(userId)
```

---

## Template: PermissionService (Security Critical)

### File Location
`/lib/services/PermissionService.ts`

### Pattern
```typescript
import { createClient } from '@/lib/supabase/server'

export class PermissionService {
  /**
   * Check if user is admin
   */
  static async isAdmin(userId: string): Promise<boolean> {
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    
    return profile?.role === 'admin'
  }
  
  /**
   * Check if user can view student data
   * - Admin can view anyone
   * - Instructor can view own course students
   * - Student can only view self
   */
  static async canViewStudent(
    viewerId: string,
    studentId: string
  ): Promise<boolean> {
    // Implementation
  }
  
  /**
   * Used in API routes as middleware
   */
  static async enforcePermission(
    viewerId: string,
    studentId: string
  ): Promise<void> {
    const allowed = await this.canViewStudent(viewerId, studentId)
    if (!allowed) {
      throw new Error('Unauthorized: Cannot access this student data')
    }
  }
}
```

### Usage in API Routes
**Example**: `/api/student-grades/[userId]/route.ts`
```typescript
export async function GET(request: Request, context: any) {
  const session = await getSession()
  const studentId = context.params.userId
  
  // Add permission check
  await PermissionService.enforcePermission(session.user.id, studentId)
  
  // Rest of route logic...
}
```

---

## Template: AuditLogService (Compliance)

### File Location
`/lib/services/AuditLogService.ts`

### Pattern
```typescript
import { createClient } from '@/lib/supabase/server'

export interface AuditEntry {
  action: string
  userId: string
  resourceType: string
  resourceId: string
  metadata?: Record<string, any>
}

export class AuditLogService {
  /**
   * Log an action
   * Used everywhere: grade assignment, course creation, etc.
   */
  static async logAction(entry: AuditEntry): Promise<void> {
    const supabase = await createClient()
    
    await supabase
      .from('activity_logs')
      .insert({
        user_id: entry.userId,
        action: entry.action,
        entity_type: entry.resourceType,
        entity_id: entry.resourceId,
        metadata: entry.metadata,
        created_at: new Date().toISOString()
      })
  }
}
```

### Usage Everywhere
```typescript
// In grade-services.ts
await AuditLogService.logAction({
  action: 'assign_max_grade',
  userId: adminId,
  resourceType: 'test_grade',
  resourceId: gradeId,
  metadata: { testId, studentId, previousScore, newScore }
})
```

---

## Pattern: Data Access vs Business Logic

### What Makes a Good Service
1. **Static methods** (like GradeCalculator) - no state needed
2. **Clear responsibility** - one job per class
3. **Uses other services** - composes functionality
4. **Testable** - pure functions preferred
5. **Type-safe** - interfaces for all inputs/outputs

### What NOT to Do
- Don't create instances (`new StudentHistoryService()`)
- Don't mix data access with business logic
- Don't duplicate database queries
- Don't skip error handling

---

## Implementation Checklist

### For Each New Service:
- [ ] Create file in `/lib/services/`
- [ ] Define interfaces at top
- [ ] Implement static class/functions
- [ ] Add JSDoc comments
- [ ] Create corresponding test file in `__tests__/`
- [ ] Update service imports in dependent files
- [ ] Update SERVICES_ANALYSIS.md

### Files to Update After Adding Service:
- `/lib/services/__tests__/[service].test.ts` - Add tests
- `/app/api/*/route.ts` - Use new service
- Components that directly query - use service instead
- `/SERVICES_ANALYSIS.md` - Mark as implemented

---

## Common Patterns in Codebase

### Pattern 1: Supabase Server Instance
```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
```

### Pattern 2: Defensive Queries
```typescript
const { data, error } = await supabase
  .from('table')
  .select('...')
  .eq('id', id)
  .maybeSingle()  // Don't throw if no results

if (error) throw new Error(`Error: ${error.message}`)
if (!data) return null  // Handle no results gracefully
```

### Pattern 3: Validation Result
```typescript
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  details?: Record<string, any>
}

// Return this pattern for all validations
return {
  isValid: errors.length === 0,
  errors,
  details: { ... }
}
```

### Pattern 4: Error Messages
```typescript
// All error messages in Portuguese (pt-BR)
throw new Error('Aluno não encontrado')
```

---

## Next Steps

1. Start with **PermissionService** (security critical)
2. Then **StudentHistoryService** (most used)
3. Then **AuditLogService** (affects entire system)
4. Then other services in priority order

Each service should:
- Be tested with unit tests
- Have clear documentation
- Be used to replace inline logic in routes/components
- Follow the patterns shown above

---

## References

- Existing Service Pattern: `/lib/services/grade-calculator.ts`
- Data Mapper Pattern: `/lib/excel-template-mappers/student-history-mapper.ts`
- API Route Pattern: `/app/api/admin/assign-grade/route.ts`
- Component Using Service: `/app/components/StudentGradesReport.tsx`

