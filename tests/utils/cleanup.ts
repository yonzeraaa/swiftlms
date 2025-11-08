import { getTestServiceClient } from '../setup/supabase'

export const cleanupDatabase = async (tables: string[]) => {
  const supabase = getTestServiceClient()

  for (const table of tables.reverse()) {
    const { error } = await supabase
      .from(table)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (error) {
      console.error(`Failed to cleanup ${table}:`, error)
    }
  }
}

export const cleanupTestData = async () => {
  await cleanupDatabase([
    'test_grades',
    'test_attempts',
    'question_options',
    'questions',
    'tests',
    'lesson_progress',
    'lessons',
    'course_modules',
    'enrollments',
    'certificates',
    'materials_imported',
    'tcc_submissions',
    'courses',
    'users',
    'organizations',
  ])
}
