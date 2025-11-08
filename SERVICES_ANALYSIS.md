# SwiftLMS Codebase Services Analysis

## Overview
This document identifies existing services, critical business logic, and services that need implementation in the SwiftLMS platform.

---

## 1. EXISTING SERVICES

### A. Certificate Service
**File**: `/lib/services/CertificateService.ts`
**Purpose**: Manages course completion certificates and eligibility validation

**Key Methods**:
- `canRequestCertificate(enrollment)` - Validates if student can request certificate
- `generateCertificateData()` - Prepares certificate data for generation
- `formatCompletionDate()` - Formats dates for certificates
- `getCertificateStatus()` - Returns status of certificate request
- `validateCertificateRequest()` - Comprehensive certificate validation

**Priority**: HIGH
**Status**: Implemented
**Locations Used**:
- `/app/api/certificates/check-eligibility/route.ts`
- Certificate request workflows

---

### B. Enrollment Service
**File**: `/lib/services/EnrollmentService.ts`
**Purpose**: Manages student course enrollments and progress tracking

**Key Methods**:
- `canEnroll()` - Validates enrollment eligibility
- `calculateProgress()` - Computes completion percentage
- `getEnrollmentStatus()` - Returns current enrollment state
- `getNextModuleToComplete()` - Identifies next module
- `shouldCompleteEnrollment()` - Determines if enrollment should be marked complete
- `validateEnrollment()` - Input validation

**Priority**: HIGH
**Status**: Implemented
**Locations Used**:
- `/app/api/courses/enroll/route.ts`
- Enrollment workflows throughout dashboard

---

### C. Test Grading Service
**File**: `/lib/services/TestGradingService.ts`
**Purpose**: Grades test submissions and provides feedback

**Key Methods**:
- `gradeTest()` - Calculates test score and determines pass/fail
- `validateAnswers()` - Ensures answer integrity
- `getFeedbackMessage()` - Generates feedback based on performance

**Priority**: HIGH
**Status**: Implemented
**Locations Used**:
- `/app/api/tests/[id]/submit/route.ts`

---

### D. Grade Services (Batch Operations)
**File**: `/lib/services/grade-services.ts`
**Purpose**: Batch grade assignment for administrative operations

**Key Methods**:
- `assignMaxGradeToStudent()` - Assigns maximum score to student for a test
- Supports admin overrides with audit logging
- Updates both `test_grades` and `test_attempts` tables
- Logs actions to `activity_logs`

**Priority**: HIGH
**Status**: Recently implemented (commit 81903df)
**Locations Used**:
- `/app/api/admin/assign-grade/route.ts`

---

### E. Grade Calculator Service
**File**: `/lib/services/grade-calculator.ts`
**Purpose**: Centralized calculation of averages and weighted grades

**Key Methods**:
- `calculateTestsAverage()` - Average of completed tests
- `calculateFinalAverage()` - Weighted average considering TCC
- `isApproved()` - Determines pass/fail based on minimum threshold
- Handles grade overrides

**Priority**: CRITICAL
**Status**: Implemented
**Locations Used**:
- Student grades report (`StudentGradesReport.tsx`)
- Grade validation workflows

---

### F. Grade Validation Service
**File**: `/lib/services/grade-validation.ts`
**Purpose**: Validates consistency between grade tables

**Key Methods**:
- `validateGradeConsistency()` - Ensures `test_grades` and `test_attempts` sync
- Detects data inconsistencies
- Provides detailed validation report

**Priority**: MEDIUM
**Status**: Implemented
**Locations Used**:
- Admin grade management
- Data integrity checks

---

### G. Template Cleanup Service
**File**: `/lib/services/template-cleanup.ts`
**Purpose**: Manages Excel template storage and cleanup

**Status**: Implemented

---

## 2. CRITICAL BUSINESS LOGIC NOT YET WRAPPED IN SERVICES

### A. Student History/Transcript Generation
**Files Referenced**:
- `/lib/excel-template-mappers/student-history-mapper.ts` - MAPPER ONLY
- `/lib/use-template-for-report.ts` - Report generation logic

**What Exists**:
- `fetchStudentHistoryData()` - Fetches student transcript data
- `mapStudentHistoryDataForTemplate()` - Formats data for templates
- Aggregates: enrollments, test attempts, TCC grades, lesson progress

**What's Missing**: Dedicated Service Class
- Currently scattered between mapper and template engine
- No dedicated business logic layer
- No caching or optimization

**Needed Methods**:
```typescript
class StudentHistoryService {
  // Core data retrieval
  getStudentTranscript(userId: string): Promise<StudentHistoryData>
  getStudentGradesBreakdown(userId: string): Promise<GradesBreakdown>
  getStudentProgressTimeline(userId: string): Promise<ProgressEvent[]>
  
  // Calculations
  calculateStudentGPA(userId: string): Promise<number>
  calculateCompletionPercentage(userId: string): Promise<number>
  
  // Formatting
  generateTranscriptReport(userId: string, format: 'pdf' | 'excel'): Promise<Blob>
  
  // Validation
  validateHistoricalData(userId: string): Promise<ValidationResult>
}
```

**Priority**: CRITICAL
**Tables Involved**:
- `enrollments`
- `test_attempts` / `test_grades`
- `tcc_submissions`
- `lesson_progress`
- `activity_logs`
- `course_modules`
- `courses`

---

### B. Report Generation Services
**Files Referenced**:
- `/lib/reports/formatters.ts` - Utilities only
- `/app/dashboard/reports/page.tsx` - Page component
- `/lib/use-template-for-report.ts` - Basic orchestration

**What Exists**:
- Report formatters for various data types
- Template-based report generation
- Excel export capabilities

**What's Missing**: Business Logic Services
- No comprehensive report generation service
- No caching for expensive reports
- No permission checking on report data
- No audit trail for report generation

**Needed Methods**:
```typescript
class ReportGenerationService {
  // Enrollment reports
  generateEnrollmentReport(dateRange): Promise<Blob>
  
  // Completion reports
  generateCompletionReport(dateRange): Promise<Blob>
  
  // Student activity reports
  generateActivityReport(dateRange): Promise<Blob>
  
  // Grades reports
  generateGradesReport(filters): Promise<Blob>
  
  // Financial reports
  generateFinancialReport(dateRange): Promise<Blob>
}
```

**Priority**: HIGH
**API Routes That Need This**:
- `/api/reports/*` (not yet implemented)

---

### C. Permission/Authorization Service (RLS Helper)
**Files Referenced**:
- `/lib/supabase/auth-helpers.ts` - Session management only
- `/lib/supabase/admin.ts` - Admin client

**What Exists**:
- Basic session management
- Admin client
- No RLS validation helpers

**What's Missing**: Permission checking service
- No method to check if user can view student data
- No method to check if user can edit grades
- No method to check if user can access reports
- No permission-based data filtering

**Needed Methods**:
```typescript
class PermissionService {
  // Role checks
  isAdmin(userId: string): Promise<boolean>
  isInstructor(userId: string): Promise<boolean>
  isStudent(userId: string): Promise<boolean>
  
  // Resource access
  canViewStudent(viewerId: string, studentId: string): Promise<boolean>
  canEditGrades(userId: string, courseId: string): Promise<boolean>
  canAccessReport(userId: string, reportType: string): Promise<boolean>
  
  // Data filtering
  filterGradesByPermission(userId: string, grades: Grade[]): Promise<Grade[]>
  filterStudentsByPermission(userId: string, students: Student[]): Promise<Student[]>
}
```

**Priority**: CRITICAL (Security)
**Tables Involved**:
- `profiles` (roles)

---

### D. Google Drive Integration Service
**Files Referenced**:
- `/app/api/import/drive/route.ts` - Route handler
- `/app/api/fetch-google-doc/route.ts` - Document fetching
- `/lib/drive-import-utils.ts` - Utilities only

**What Exists**:
- Route handlers for imports
- Basic document ID extraction
- Answer key parsing from Google Docs

**What's Missing**: Proper service abstraction
- No error handling service
- No retry logic
- No file validation service
- No import status tracking

**Needed Methods**:
```typescript
class GoogleDriveService {
  // Authentication
  getAuthClient(): Promise<google.auth.OAuth2>
  
  // Document operations
  fetchDocument(docId: string): Promise<DocumentContent>
  extractText(docId: string): Promise<string>
  
  // Structure import
  importCourseStructure(driveId: string, courseId: string): Promise<ImportResult>
  importModule(driveId: string, courseId: string): Promise<Module>
  importTest(driveId: string, courseId: string): Promise<TestWithAnswerKey>
  
  // Validation
  validateDocument(docId: string): Promise<ValidationResult>
}
```

**Priority**: MEDIUM-HIGH
**API Routes Using This**:
- `/api/import/drive/route.ts`
- `/api/fetch-google-doc/route.ts`

---

## 3. DATABASE TABLES NOT YET MAPPED TO SERVICES

### Tables with Existing Service Support:
- `enrollments` → EnrollmentService
- `test_attempts`, `test_grades` → TestGradingService, GradeCalculator
- `certificates` → CertificateService
- `profiles` → (needs PermissionService)

### Tables Missing Service Layer:
1. **`activity_logs`** - Needs audit service
   - No centralized logging service
   - Activity tracking scattered in routes
   
2. **`tcc_submissions`** - Needs TCC submission service
   - No dedicated service for TCC management
   - Grade calculation included in history mapper only

3. **`student_grade_overrides`** - Needs overrides service
   - Currently only accessed in StudentGradesReport
   - No dedicated management service

4. **`lesson_progress`** - Needs lesson progress service
   - Only referenced in student history mapper
   - No dedicated progress tracking service

5. **`test_answer_keys`** - Needs answer key service
   - Partially handled in `/app/api/tests/utils/answer-key.ts`
   - Needs consolidation into service

6. **`course_modules`, `lessons`, `subjects`** - Need course structure service
   - Scattered across API routes
   - No unified service

---

## 4. API ROUTES NEEDING SERVICE SUPPORT

### Routes without dedicated services:
- `/api/student-grades/[userId]/route.ts` - Needs StudentGradesService
- `/api/import/drive/route.ts` - Needs GoogleDriveService
- `/api/fetch-google-doc/route.ts` - Needs GoogleDriveService
- `/api/tests/extract-answer-key/route.ts` - Needs AnswerKeyService
- `/api/tests/[id]/sync-answer-key/route.ts` - Needs AnswerKeyService

---

## 5. COMPONENT-LEVEL LOGIC NEEDING EXTRACTION

### StudentGradesReport Component
**File**: `/app/components/StudentGradesReport.tsx`
**Issues**:
- Contains complex grade calculation logic
- Directly queries Supabase instead of using service
- Has inline data transformation
- No separation of concerns

**Should Extract To**:
- StudentHistoryService
- StudentGradesService

---

## 6. PRIORITY RANKING FOR SERVICE IMPLEMENTATION

### TIER 1 - CRITICAL (Implement First)
1. **StudentHistoryService** - Required for student transcripts, heavily used
2. **PermissionService** - Security-critical, needed for RLS enforcement
3. **ReportGenerationService** - Core reporting functionality
4. **StudentGradesService** - Student grades data access layer

### TIER 2 - HIGH (Implement Second)
5. **GoogleDriveService** - Course import functionality
6. **AuditLogService** - Centralized activity logging
7. **CourseStructureService** - Unify course/module/lesson management
8. **AnswerKeyService** - Test answer key management

### TIER 3 - MEDIUM (Nice to Have)
9. **TCCSubmissionService** - TCC management
10. **LessonProgressService** - Lesson progress tracking
11. **CacheService** - Performance optimization for reports

---

## 7. TECHNICAL DEBT & IMPROVEMENTS

### Code Organization
- Template mappers should be called "Data Providers" not "Mappers"
- Report generation logic is split between templates and mappers
- No consistent error handling pattern across services

### Testing
- Only basic tests exist for grade services
- No integration tests for report generation
- No permission tests

### Type Safety
- Many services use implicit `any` types
- Database types should be more strictly typed
- API responses need schemas (Zod/TypeScript)

---

## 8. DEPENDENCY GRAPH

```
StudentHistoryService
├── GradeCalculator (exists)
├── enrollments table
├── test_attempts table
├── test_grades table
├── tcc_submissions table
├── lesson_progress table
└── activity_logs table

ReportGenerationService
├── StudentHistoryService
├── StudentGradesService
├── EnrollmentService (exists)
└── Template Engine

PermissionService
├── profiles table
└── RLS policies (database)

StudentGradesReport Component
├── StudentHistoryService (missing)
├── StudentGradesService (missing)
├── GradeCalculator (exists)
└── GradeValidation (exists)
```

---

## Conclusion

The SwiftLMS codebase has a solid foundation with several well-implemented services (Certificate, Enrollment, Grading). However, there are critical gaps:

1. **Student History/Transcript**: Only mapper exists, needs full service
2. **Reporting**: Scattered across components and templates
3. **Permissions**: No dedicated service (security risk)
4. **Google Drive Integration**: Basic implementation, needs service layer
5. **Data Access**: Many components directly query Supabase

The recommended approach is to implement services in the priority order outlined above, starting with StudentHistoryService and PermissionService as they are most critical.
