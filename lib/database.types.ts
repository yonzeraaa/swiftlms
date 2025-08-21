export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
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
      certificate_requirements: {
        Row: {
          all_lessons_completed: boolean | null
          certificate_generated: boolean | null
          checked_at: string | null
          completed_lessons: number | null
          course_id: string | null
          enrollment_id: string | null
          highest_test_score: number | null
          id: string
          required_test_score: number | null
          requirements_met: boolean | null
          test_passed: boolean | null
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
          highest_test_score?: number | null
          id?: string
          required_test_score?: number | null
          requirements_met?: boolean | null
          test_passed?: boolean | null
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
          highest_test_score?: number | null
          id?: string
          required_test_score?: number | null
          requirements_met?: boolean | null
          test_passed?: boolean | null
          total_lessons?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificate_requirements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_statistics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "certificate_requirements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_requirements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "subject_lessons_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "certificate_requirements_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_number: string
          course_hours: number | null
          course_id: string
          created_at: string | null
          enrollment_id: string
          grade: number | null
          id: string
          instructor_name: string | null
          issued_at: string | null
          metadata: Json | null
          updated_at: string | null
          user_id: string
          verification_code: string
        }
        Insert: {
          certificate_number: string
          course_hours?: number | null
          course_id: string
          created_at?: string | null
          enrollment_id: string
          grade?: number | null
          id?: string
          instructor_name?: string | null
          issued_at?: string | null
          metadata?: Json | null
          updated_at?: string | null
          user_id: string
          verification_code: string
        }
        Update: {
          certificate_number?: string
          course_hours?: number | null
          course_id?: string
          created_at?: string | null
          enrollment_id?: string
          grade?: number | null
          id?: string
          instructor_name?: string | null
          issued_at?: string | null
          metadata?: Json | null
          updated_at?: string | null
          user_id?: string
          verification_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_statistics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "subject_lessons_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "certificates_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_management"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_statistics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "subject_lessons_view"
            referencedColumns: ["course_id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "course_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_statistics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "course_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "subject_lessons_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "course_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_management"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "course_subjects_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_statistics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "course_subjects_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_subjects_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "subject_lessons_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "course_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "courses_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "user_management"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_statistics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "subject_lessons_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_management"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "lesson_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_management"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "module_subjects_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
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
      question_options: {
        Row: {
          created_at: string | null
          id: string
          is_correct: boolean
          option_text: string
          order_index: number
          question_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_correct?: boolean
          option_text: string
          order_index?: number
          question_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_correct?: boolean
          option_text?: string
          order_index?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          explanation: string | null
          has_formula: boolean | null
          id: string
          is_active: boolean | null
          points: number
          question_image_url: string | null
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          subject_id: string | null
          tags: string[] | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          explanation?: string | null
          has_formula?: boolean | null
          id?: string
          is_active?: boolean | null
          points?: number
          question_image_url?: string | null
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          subject_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          explanation?: string | null
          has_formula?: boolean | null
          id?: string
          is_active?: boolean | null
          points?: number
          question_image_url?: string | null
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          subject_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_management"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "subject_lessons_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_lessons_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
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
      test_answers: {
        Row: {
          answer_text: string | null
          answered_at: string | null
          attempt_id: string
          id: string
          is_correct: boolean | null
          points_earned: number | null
          question_id: string
          selected_option_id: string | null
        }
        Insert: {
          answer_text?: string | null
          answered_at?: string | null
          attempt_id: string
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id: string
          selected_option_id?: string | null
        }
        Update: {
          answer_text?: string | null
          answered_at?: string | null
          attempt_id?: string
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id?: string
          selected_option_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_answers_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "question_options"
            referencedColumns: ["id"]
          },
        ]
      }
      test_attempts: {
        Row: {
          id: string
          ip_address: unknown | null
          score: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["attempt_status"]
          submitted_at: string | null
          test_id: string
          time_spent_minutes: number | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          id?: string
          ip_address?: unknown | null
          score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["attempt_status"]
          submitted_at?: string | null
          test_id: string
          time_spent_minutes?: number | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          id?: string
          ip_address?: unknown | null
          score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["attempt_status"]
          submitted_at?: string | null
          test_id?: string
          time_spent_minutes?: number | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_management"
            referencedColumns: ["id"]
          },
        ]
      }
      test_questions: {
        Row: {
          created_at: string | null
          id: string
          order_index: number
          points_override: number | null
          question_id: string
          test_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_index?: number
          points_override?: number | null
          question_id: string
          test_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          order_index?: number
          points_override?: number | null
          question_id?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          available_until: string | null
          course_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          instructions: string | null
          is_published: boolean | null
          max_attempts: number | null
          passing_score: number
          randomize_options: boolean | null
          randomize_questions: boolean | null
          scheduled_for: string | null
          show_answers: boolean | null
          show_results: boolean | null
          subject_id: string | null
          test_type: Database["public"]["Enums"]["test_type"]
          title: string
          total_points: number
          updated_at: string | null
        }
        Insert: {
          available_until?: string | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          instructions?: string | null
          is_published?: boolean | null
          max_attempts?: number | null
          passing_score?: number
          randomize_options?: boolean | null
          randomize_questions?: boolean | null
          scheduled_for?: string | null
          show_answers?: boolean | null
          show_results?: boolean | null
          subject_id?: string | null
          test_type?: Database["public"]["Enums"]["test_type"]
          title: string
          total_points?: number
          updated_at?: string | null
        }
        Update: {
          available_until?: string | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          instructions?: string | null
          is_published?: boolean | null
          max_attempts?: number | null
          passing_score?: number
          randomize_options?: boolean | null
          randomize_questions?: boolean | null
          scheduled_for?: string | null
          show_answers?: boolean | null
          show_results?: boolean | null
          subject_id?: string | null
          test_type?: Database["public"]["Enums"]["test_type"]
          title?: string
          total_points?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tests_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_statistics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "tests_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "subject_lessons_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "tests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_management"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      course_statistics: {
        Row: {
          average_rating: number | null
          completed_students: number | null
          course_id: string | null
          total_reviews: number | null
          total_students: number | null
        }
        Relationships: []
      }
      course_subjects_view: {
        Row: {
          course_id: string | null
          course_title: string | null
          created_at: string | null
          credits: number | null
          id: string | null
          is_required: boolean | null
          semester: number | null
          subject_code: string | null
          subject_description: string | null
          subject_id: string | null
          subject_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_subjects_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_statistics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "course_subjects_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_subjects_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "subject_lessons_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "course_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_lessons_view: {
        Row: {
          content_type: string | null
          course_id: string | null
          course_title: string | null
          created_at: string | null
          duration_minutes: number | null
          id: string | null
          lesson_description: string | null
          lesson_id: string | null
          lesson_title: string | null
          module_title: string | null
          subject_code: string | null
          subject_id: string | null
          subject_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_lessons_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_lessons_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_management: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          phone: string | null
          role: string | null
          status: string | null
          total_certificates: number | null
          total_enrollments: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_enrollment_progress: {
        Args: { p_enrollment_id: string }
        Returns: number
      }
      calculate_test_total_points: {
        Args: { test_id_param: string }
        Returns: number
      }
      check_and_fix_enrollment_progress: {
        Args: Record<PropertyKey, never>
        Returns: {
          actual_progress: number
          calculated_progress: number
          certificate_generated: boolean
          course_title: string
          user_email: string
          was_fixed: boolean
        }[]
      }
      delete_user_completely: {
        Args: { user_id_to_delete: string }
        Returns: boolean
      }
      fix_all_enrollment_progress: {
        Args: Record<PropertyKey, never>
        Returns: {
          enrollment_id: string
          new_progress: number
          old_progress: number
          status: string
        }[]
      }
      get_enrollment_count: {
        Args: { course_id: string }
        Returns: number
      }
      get_next_order_index: {
        Args: {
          p_filter_column: string
          p_filter_value: string
          p_table_name: string
        }
        Returns: number
      }
      get_user_progress_stats: {
        Args: { p_user_id: string }
        Returns: {
          completed_courses: number
          completed_lessons: number
          current_streak: number
          hours_completed: number
          in_progress_courses: number
          overall_progress: number
          total_certificates: number
          total_enrolled_courses: number
          total_hours_content: number
          total_lessons: number
        }[]
      }
      log_activity: {
        Args: {
          p_action: string
          p_entity_id?: string
          p_entity_name?: string
          p_entity_type: string
          p_metadata?: Json
          p_user_id: string
        }
        Returns: undefined
      }
      manually_generate_certificate: {
        Args: { p_enrollment_id: string }
        Returns: {
          certificate_id: string
          message: string
          success: boolean
        }[]
      }
      preview_user_deletion: {
        Args: { user_id_to_check: string }
        Returns: {
          count: number
          data_type: string
          details: string
        }[]
      }
      recalculate_enrollment_progress: {
        Args: { p_enrollment_id: string }
        Returns: undefined
      }
      reorder_course_modules: {
        Args: { p_course_id: string; p_module_ids: string[] }
        Returns: boolean
      }
      reorder_lessons: {
        Args: { p_lesson_ids: string[]; p_module_id: string }
        Returns: boolean
      }
      reorder_module_subjects: {
        Args: { p_module_id: string; p_subject_ids: string[] }
        Returns: boolean
      }
      update_certificate_requirements: {
        Args: { p_enrollment_id: string }
        Returns: {
          can_generate: boolean
          details: Json
          message: string
        }[]
      }
    }
    Enums: {
      attempt_status: "in_progress" | "completed" | "abandoned"
      difficulty_level: "easy" | "medium" | "hard"
      question_type: "multiple_choice" | "true_false" | "essay" | "fill_blank"
      test_type: "quiz" | "exam" | "practice"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      attempt_status: ["in_progress", "completed", "abandoned"],
      difficulty_level: ["easy", "medium", "hard"],
      question_type: ["multiple_choice", "true_false", "essay", "fill_blank"],
      test_type: ["quiz", "exam", "practice"],
    },
  },
} as const

export type Question = Database['public']['Tables']['questions']['Row']
export type QuestionOption = Database['public']['Tables']['question_options']['Row']