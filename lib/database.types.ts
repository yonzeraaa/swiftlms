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
      subjects: {
        Row: {
          id: string
          name: string
          code: string | null
          description: string | null
          hours: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          code?: string | null
          description?: string | null
          hours?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          code?: string | null
          description?: string | null
          hours?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      module_subjects: {
        Row: {
          id: string
          module_id: string | null
          subject_id: string | null
          order_index: number
          created_at: string | null
        }
        Insert: {
          id?: string
          module_id?: string | null
          subject_id?: string | null
          order_index: number
          created_at?: string | null
        }
        Update: {
          id?: string
          module_id?: string | null
          subject_id?: string | null
          order_index?: number
          created_at?: string | null
        }
        Relationships: []
      }
      course_subjects: {
        Row: {
          id: string
          course_id: string | null
          subject_id: string | null
          order_index: number
          created_at: string | null
        }
        Insert: {
          id?: string
          course_id?: string | null
          subject_id?: string | null
          order_index: number
          created_at?: string | null
        }
        Update: {
          id?: string
          course_id?: string | null
          subject_id?: string | null
          order_index?: number
          created_at?: string | null
        }
        Relationships: []
      }
      subject_lessons: {
        Row: {
          id: string
          subject_id: string | null
          lesson_id: string | null
          order_index: number
          created_at: string | null
        }
        Insert: {
          id?: string
          subject_id?: string | null
          lesson_id?: string | null
          order_index: number
          created_at?: string | null
        }
        Update: {
          id?: string
          subject_id?: string | null
          lesson_id?: string | null
          order_index?: number
          created_at?: string | null
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          entity_type: string | null
          entity_id: string | null
          entity_name: string | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          entity_type?: string | null
          entity_id?: string | null
          entity_name?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          entity_type?: string | null
          entity_id?: string | null
          entity_name?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
      certificates: {
        Row: {
          id: string
          enrollment_id: string
          user_id: string
          course_id: string
          certificate_type: string
          issued_at: string | null
          approval_status: string | null
          certificate_number: string | null
          validation_code: string | null
          pdf_url: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          enrollment_id: string
          user_id: string
          course_id: string
          certificate_type: string
          issued_at?: string | null
          approval_status?: string | null
          certificate_number?: string | null
          validation_code?: string | null
          pdf_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          enrollment_id?: string
          user_id?: string
          course_id?: string
          certificate_type?: string
          issued_at?: string | null
          approval_status?: string | null
          certificate_number?: string | null
          validation_code?: string | null
          pdf_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      certificate_requests: {
        Row: {
          id: string
          enrollment_id: string
          user_id: string
          course_id: string
          certificate_type: string
          total_lessons: number | null
          completed_lessons: number | null
          status: string | null
          request_date: string | null
          processed_date: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          enrollment_id: string
          user_id: string
          course_id: string
          certificate_type: string
          total_lessons?: number | null
          completed_lessons?: number | null
          status?: string | null
          request_date?: string | null
          processed_date?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          enrollment_id?: string
          user_id?: string
          course_id?: string
          certificate_type?: string
          total_lessons?: number | null
          completed_lessons?: number | null
          status?: string | null
          request_date?: string | null
          processed_date?: string | null
          created_at?: string | null
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
