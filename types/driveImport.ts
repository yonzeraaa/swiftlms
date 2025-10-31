export type DriveImportTaskType = 'module' | 'subject' | 'lesson' | 'test'

export interface DriveModuleInfo {
  originalIndex: number
  name: string
  code?: string
  order: number
  existingId?: string
}

export interface DriveSubjectInfo {
  originalIndex: number
  name: string
  code?: string
  order: number
  existingId?: string
  moduleCode?: string
}

export interface DriveLessonInfo {
  name: string
  code?: string
  order: number
  content?: string
  contentType: string
  contentUrl?: string
  description?: string
  questions?: any[]
}

export interface DriveTestInfo {
  name: string
  code?: string
  order: number
  contentType: string
  contentUrl?: string
  description?: string
  answerKey?: any[]
  requiresManualAnswerKey?: boolean
}

export interface DriveImportTaskBase {
  id: string
  type: DriveImportTaskType
  module: DriveModuleInfo
  subject?: DriveSubjectInfo
}

export interface DriveImportModuleTask extends DriveImportTaskBase {
  type: 'module'
}

export interface DriveImportSubjectTask extends DriveImportTaskBase {
  type: 'subject'
  subject: DriveSubjectInfo
}

export interface DriveImportLessonTask extends DriveImportTaskBase {
  type: 'lesson'
  subject: DriveSubjectInfo
  lesson: DriveLessonInfo
}

export interface DriveImportTestTask extends DriveImportTaskBase {
  type: 'test'
  subject: DriveSubjectInfo
  test: DriveTestInfo
}

export type DriveImportTask =
  | DriveImportModuleTask
  | DriveImportSubjectTask
  | DriveImportLessonTask
  | DriveImportTestTask

export interface DriveImportSummary {
  modules: number
  subjects: number
  lessons: number
  tests: number
}

export interface DriveImportListResponse {
  summary: DriveImportSummary
  tasks: DriveImportTask[]
  totals: DriveImportSummary
  nextCursor?: string | null
}

export interface DriveImportListCursor {
  resumeState: any
  progressSnapshot: {
    processedModules: number
    processedSubjects: number
    processedLessons: number
    processedTests: number
    totalModules: number
    totalSubjects: number
    totalLessons: number
    totalTests: number
  }
  totals: DriveImportSummary
}
