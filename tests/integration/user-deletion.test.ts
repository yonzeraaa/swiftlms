import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// Create admin client for testing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey)

// Skip tests if Supabase config is not available
const describeOrSkip = hasSupabaseConfig ? describe : describe.skip

const supabase = hasSupabaseConfig
  ? createClient<Database>(supabaseUrl!, supabaseKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

describeOrSkip('User Deletion RPCs', () => {
  let testUserId: string
  let testCourseId: string
  let testEnrollmentId: string
  let testLessonId: string

  beforeAll(async () => {
    if (!supabase) return
    // Create test user in profiles (without auth.users for simplicity)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        full_name: 'Test User for Deletion',
        email: 'test-deletion@example.com',
        role: 'student',
        status: 'active'
      })
      .select()
      .single()

    if (profileError) throw profileError
    testUserId = profile.id

    // Create test course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert({
        title: 'Test Course for Deletion',
        slug: 'test-deletion-course',
        description: 'Test',
        status: 'published',
        instructor_id: testUserId // User as instructor
      })
      .select()
      .single()

    if (courseError) throw courseError
    testCourseId = course.id

    // Create test module
    const { data: module, error: moduleError } = await supabase
      .from('course_modules')
      .insert({
        course_id: testCourseId,
        title: 'Test Module',
        order_index: 1
      })
      .select()
      .single()

    if (moduleError) throw moduleError

    // Create test lesson
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .insert({
        module_id: module.id,
        title: 'Test Lesson',
        order_index: 1
      })
      .select()
      .single()

    if (lessonError) throw lessonError
    testLessonId = lesson.id

    // Create enrollment for the user
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .insert({
        user_id: testUserId,
        course_id: testCourseId,
        status: 'active'
      })
      .select()
      .single()

    if (enrollmentError) throw enrollmentError
    testEnrollmentId = enrollment.id

    // Create test data in various tables
    await supabase.from('lesson_progress').insert({
      user_id: testUserId,
      enrollment_id: testEnrollmentId,
      lesson_id: testLessonId,
      is_completed: true
    })

    await supabase.from('activity_logs').insert({
      user_id: testUserId,
      activity_type: 'test',
      description: 'Test activity'
    })

    await supabase.from('course_reviews').insert({
      user_id: testUserId,
      course_id: testCourseId,
      rating: 5,
      comment: 'Great course!'
    })

    // Create test subject
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .insert({
        name: 'Test Subject',
        code: 'TST001'
      })
      .select()
      .single()

    if (subjectError) throw subjectError

    // Create test
    const { data: test, error: testError } = await supabase
      .from('tests')
      .insert({
        course_id: testCourseId,
        module_id: module.id,
        subject_id: subject.id,
        title: 'Test Exam',
        max_attempts: 3,
        is_active: true
      })
      .select()
      .single()

    if (testError) throw testError

    // Create test attempt
    await supabase.from('test_attempts').insert({
      user_id: testUserId,
      enrollment_id: testEnrollmentId,
      test_id: test.id,
      score: 85
    })

    // Create test grade
    await supabase.from('test_grades').insert({
      user_id: testUserId,
      enrollment_id: testEnrollmentId,
      test_id: test.id,
      grade: 85
    })
  })

  afterAll(async () => {
    if (!supabase) return
    // Cleanup: delete test data
    if (testCourseId) {
      await supabase.from('courses').delete().eq('id', testCourseId)
    }
  })

  it('should preview user deletion with correct counts', async () => {
    if (!supabase) return
    const { data, error } = await supabase.rpc('preview_user_deletion', {
      user_id_to_check: testUserId
    })

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data).toHaveProperty('user_id', testUserId)
    expect(data).toHaveProperty('total_records_to_delete')
    expect(data).toHaveProperty('breakdown')

    // Verify counts
    const breakdown = data.breakdown
    expect(breakdown.lesson_progress).toBeGreaterThan(0)
    expect(breakdown.test_attempts).toBeGreaterThan(0)
    expect(breakdown.test_grades).toBeGreaterThan(0)
    expect(breakdown.enrollments).toBeGreaterThan(0)
    expect(breakdown.course_reviews).toBeGreaterThan(0)
    expect(breakdown.activity_logs).toBeGreaterThan(0)

    // Verify updates (user is instructor of course)
    const updates = data.updates
    expect(updates.courses_instructor_id_to_null).toBe(1)
  })

  it('should return error for non-existent user in preview', async () => {
    if (!supabase) return
    const fakeUserId = '00000000-0000-0000-0000-000000000000'
    const { data, error } = await supabase.rpc('preview_user_deletion', {
      user_id_to_check: fakeUserId
    })

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data).toHaveProperty('error', 'User not found')
  })

  it('should delete user completely and all related data', async () => {
    if (!supabase) return
    const { data, error } = await supabase.rpc('delete_user_completely', {
      user_id_to_delete: testUserId
    })

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data.success).toBe(true)
    expect(data.message).toBe('User and all related data deleted successfully')

    // Verify user is deleted from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select()
      .eq('id', testUserId)
      .maybeSingle()
    expect(profile).toBeNull()

    // Verify related data is deleted
    const { data: lessonProgress } = await supabase
      .from('lesson_progress')
      .select()
      .eq('user_id', testUserId)
    expect(lessonProgress).toHaveLength(0)

    const { data: testAttempts } = await supabase
      .from('test_attempts')
      .select()
      .eq('user_id', testUserId)
    expect(testAttempts).toHaveLength(0)

    const { data: testGrades } = await supabase
      .from('test_grades')
      .select()
      .eq('user_id', testUserId)
    expect(testGrades).toHaveLength(0)

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select()
      .eq('user_id', testUserId)
    expect(enrollments).toHaveLength(0)

    const { data: reviews } = await supabase
      .from('course_reviews')
      .select()
      .eq('user_id', testUserId)
    expect(reviews).toHaveLength(0)

    const { data: logs } = await supabase
      .from('activity_logs')
      .select()
      .eq('user_id', testUserId)
    expect(logs).toHaveLength(0)

    // Verify course still exists but instructor_id is NULL
    const { data: course } = await supabase
      .from('courses')
      .select()
      .eq('id', testCourseId)
      .single()
    expect(course).toBeDefined()
    expect(course.instructor_id).toBeNull()
  })

  it('should return error when trying to delete non-existent user', async () => {
    if (!supabase) return
    const fakeUserId = '00000000-0000-0000-0000-000000000000'
    const { data, error } = await supabase.rpc('delete_user_completely', {
      user_id_to_delete: fakeUserId
    })

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data.success).toBe(false)
    expect(data.error).toBe('User not found')
  })
})
