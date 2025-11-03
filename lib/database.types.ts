export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      certificate_requests: {
        Row: {
          completed_lessons: number | null
          course_id: string
          created_at: string | null
          enrollment_id: string
          id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          request_date: string | null
          status: string | null
          total_lessons: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_lessons?: number | null
          course_id: string
          created_at?: string | null
          enrollment_id: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          request_date?: string | null
          status?: string | null
          total_lessons?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_lessons?: number | null
          course_id?: string
          created_at?: string | null
          enrollment_id?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          request_date?: string | null
          status?: string | null
          total_lessons?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      certificate_requirements: {
        Row: {
          all_lessons_completed: boolean | null
          certificate_generated: boolean | null
          checked_at: string | null
          completed_lessons: number | null
          course_id: string | null
          enrollment_id: string | null
          id: string
          requirements_met: boolean | null
          total_lessons: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          all_lessons_completed?: boolean | null
          certificate_generated?: boolean | null
          checked_at?: string | null
          completed_lessons?: number | null
          course_id?: string | null
          enrollment_id?: string | null
          id?: string
          requirements_met?: boolean | null
          total_lessons?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          all_lessons_completed?: boolean | null
          certificate_generated?: boolean | null
          checked_at?: string | null
          completed_lessons?: number | null
          course_id?: string | null
          enrollment_id?: string | null
          id?: string
          requirements_met?: boolean | null
          total_lessons?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      certificates: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          certificate_number: string
          course_hours: number | null
          course_id: string
          created_at: string | null
          enrollment_id: string
          final_grade: number | null
          grade: number | null
          id: string
          instructor_name: string | null
          issued_at: string | null
          metadata: Json | null
          rejection_reason: string | null
          tcc_id: string | null
          updated_at: string | null
          user_id: string
          verification_code: string
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          certificate_number: string
          course_hours?: number | null
          course_id: string
          created_at?: string | null
          enrollment_id: string
          final_grade?: number | null
          grade?: number | null
          id?: string
          instructor_name?: string | null
          issued_at?: string | null
          metadata?: Json | null
          rejection_reason?: string | null
          tcc_id?: string | null
          updated_at?: string | null
          user_id: string
          verification_code: string
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          certificate_number?: string
          course_hours?: number | null
          course_id?: string
          created_at?: string | null
          enrollment_id?: string
          final_grade?: number | null
          grade?: number | null
          id?: string
          instructor_name?: string | null
          issued_at?: string | null
          metadata?: Json | null
          rejection_reason?: string | null
          tcc_id?: string | null
          updated_at?: string | null
          user_id?: string
          verification_code?: string
        }
        Relationships: []
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          id: string
          is_required: boolean | null
          order_index: number
          title: string
          total_hours: number | null
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          order_index: number
          title: string
          total_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          order_index?: number
          title?: string
          total_hours?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      course_reviews: {
        Row: {
          comment: string | null
          course_id: string
          created_at: string | null
          helpful_count: number | null
          id: string
          is_verified_purchase: boolean | null
          rating: number
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          course_id: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_verified_purchase?: boolean | null
          rating: number
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          course_id?: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_verified_purchase?: boolean | null
          rating?: number
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      course_subjects: {
        Row: {
          course_id: string
          created_at: string | null
          credits: number | null
          id: string
          is_required: boolean | null
          order_index: number | null
          semester: number | null
          subject_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          credits?: number | null
          id?: string
          is_required?: boolean | null
          order_index?: number | null
          semester?: number | null
          subject_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          credits?: number | null
          id?: string
          is_required?: boolean | null
          order_index?: number | null
          semester?: number | null
          subject_id?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          difficulty: string
          duration_hours: number
          id: string
          instructor_id: string | null
          is_featured: boolean | null
          is_published: boolean | null
          language: string | null
          learning_objectives: string[] | null
          prerequisites: string[] | null
          price: number | null
          slug: string
          summary: string | null
          target_audience: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          video_preview_url: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          difficulty: string
          duration_hours: number
          id?: string
          instructor_id?: string | null
          is_featured?: boolean | null
          is_published?: boolean | null
          language?: string | null
          learning_objectives?: string[] | null
          prerequisites?: string[] | null
          price?: number | null
          slug: string
          summary?: string | null
          target_audience?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          video_preview_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          difficulty?: string
          duration_hours?: number
          id?: string
          instructor_id?: string | null
          is_featured?: boolean | null
          is_published?: boolean | null
          language?: string | null
          learning_objectives?: string[] | null
          prerequisites?: string[] | null
          price?: number | null
          slug?: string
          summary?: string | null
          target_audience?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          video_preview_url?: string | null
        }
        Relationships: []
      }
      enrollment_modules: {
        Row: {
          assigned_at: string
          enrollment_id: string
          id: string
          module_id: string
        }
        Insert: {
          assigned_at?: string
          enrollment_id: string
          id?: string
          module_id: string
        }
        Update: {
          assigned_at?: string
          enrollment_id?: string
          id?: string
          module_id?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          enrolled_at: string | null
          id: string
          progress_percentage: number | null
          status: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          enrolled_at?: string | null
          id?: string
          progress_percentage?: number | null
          status?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string | null
          id?: string
          progress_percentage?: number | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      excel_templates: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          metadata: Json | null
          name: string
          storage_bucket: string
          storage_path: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name: string
          storage_bucket?: string
          storage_path: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name?: string
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          enrollment_id: string
          id: string
          is_completed: boolean | null
          last_accessed_at: string | null
          lesson_id: string
          progress_percentage: number | null
          started_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          enrollment_id: string
          id?: string
          is_completed?: boolean | null
          last_accessed_at?: string | null
          lesson_id: string
          progress_percentage?: number | null
          started_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          enrollment_id?: string
          id?: string
          is_completed?: boolean | null
          last_accessed_at?: string | null
          lesson_id?: string
          progress_percentage?: number | null
          started_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          content: string | null
          content_type: string
          content_url: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          is_preview: boolean | null
          module_id: string | null
          order_index: number
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          content_type: string
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_preview?: boolean | null
          module_id?: string | null
          order_index: number
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          content_type?: string
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_preview?: boolean | null
          module_id?: string | null
          order_index?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      module_subjects: {
        Row: {
          created_at: string | null
          id: string
          module_id: string
          order_index: number
          subject_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          module_id: string
          order_index?: number
          subject_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          module_id?: string
          order_index?: number
          subject_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          phone: string | null
          role: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      student_grade_overrides: {
        Row: {
          created_at: string
          id: string
          tcc_grade_override: number | null
          tcc_weight: number | null
          tests_average_override: number | null
          tests_weight: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tcc_grade_override?: number | null
          tcc_weight?: number | null
          tests_average_override?: number | null
          tests_weight?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tcc_grade_override?: number | null
          tcc_weight?: number | null
          tests_average_override?: number | null
          tests_weight?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_schedules: {
        Row: {
          created_at: string | null
          end_time: string
          id: string
          location: string | null
          start_time: string
          subject_id: string
          updated_at: string | null
          user_id: string
          weekday: number
        }
        Insert: {
          created_at?: string | null
          end_time: string
          id?: string
          location?: string | null
          start_time: string
          subject_id: string
          updated_at?: string | null
          user_id: string
          weekday: number
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          location?: string | null
          start_time?: string
          subject_id?: string
          updated_at?: string | null
          user_id?: string
          weekday?: number
        }
        Relationships: []
      }
      subject_lessons: {
        Row: {
          created_at: string | null
          id: string
          lesson_id: string
          subject_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          lesson_id: string
          subject_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          lesson_id?: string
          subject_id?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          code: string | null
          created_at: string | null
          description: string | null
          hours: number | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          hours?: number | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          hours?: number | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tcc_submissions: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          enrollment_id: string
          evaluated_at: string | null
          evaluated_by: string | null
          feedback: string | null
          file_url: string | null
          grade: number | null
          id: string
          status: string | null
          submission_date: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          enrollment_id: string
          evaluated_at?: string | null
          evaluated_by?: string | null
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          id?: string
          status?: string | null
          submission_date?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          enrollment_id?: string
          evaluated_at?: string | null
          evaluated_by?: string | null
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          id?: string
          status?: string | null
          submission_date?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      test_answer_keys: {
        Row: {
          correct_answer: string
          id: string
          justification: string | null
          points: number | null
          question_number: number
          test_id: string | null
        }
        Insert: {
          correct_answer: string
          id?: string
          justification?: string | null
          points?: number | null
          question_number: number
          test_id?: string | null
        }
        Update: {
          correct_answer?: string
          id?: string
          justification?: string | null
          points?: number | null
          question_number?: number
          test_id?: string | null
        }
        Relationships: []
      }
      test_attempts: {
        Row: {
          answers: Json | null
          attempt_number: number
          enrollment_id: string | null
          id: string
          passed: boolean | null
          score: number | null
          started_at: string | null
          submitted_at: string | null
          test_id: string | null
          time_spent_minutes: number | null
          user_id: string | null
        }
        Insert: {
          answers?: Json | null
          attempt_number: number
          enrollment_id?: string | null
          id?: string
          passed?: boolean | null
          score?: number | null
          started_at?: string | null
          submitted_at?: string | null
          test_id?: string | null
          time_spent_minutes?: number | null
          user_id?: string | null
        }
        Update: {
          answers?: Json | null
          attempt_number?: number
          enrollment_id?: string | null
          id?: string
          passed?: boolean | null
          score?: number | null
          started_at?: string | null
          submitted_at?: string | null
          test_id?: string | null
          time_spent_minutes?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      test_grades: {
        Row: {
          best_score: number | null
          course_id: string | null
          id: string
          last_attempt_date: string | null
          subject_id: string | null
          test_id: string | null
          total_attempts: number | null
          user_id: string | null
        }
        Insert: {
          best_score?: number | null
          course_id?: string | null
          id?: string
          last_attempt_date?: string | null
          subject_id?: string | null
          test_id?: string | null
          total_attempts?: number | null
          user_id?: string | null
        }
        Update: {
          best_score?: number | null
          course_id?: string | null
          id?: string
          last_attempt_date?: string | null
          subject_id?: string | null
          test_id?: string | null
          total_attempts?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      tests: {
        Row: {
          course_id: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          google_drive_url: string
          id: string
          is_active: boolean | null
          max_attempts: number | null
          module_id: string | null
          passing_score: number | null
          question_count: number | null
          subject_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          google_drive_url: string
          id?: string
          is_active?: boolean | null
          max_attempts?: number | null
          module_id?: string | null
          passing_score?: number | null
          question_count?: number | null
          subject_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          google_drive_url?: string
          id?: string
          is_active?: boolean | null
          max_attempts?: number | null
          module_id?: string | null
          passing_score?: number | null
          question_count?: number | null
          subject_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      subject_lessons_view: {
        Row: {
          subject_id: string | null
          subject_name: string | null
          subject_code: string | null
          lesson_id: string | null
          lesson_title: string | null
          lesson_order: number | null
          module_id: string | null
          course_id: string | null
        }
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
