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
        Relationships: [
          {
            foreignKeyName: "certificate_requests_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_statistics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "certificate_requests_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_requests_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "subject_lessons_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "certificate_requests_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "user_management"
            referencedColumns: ["id"]
          },
        ]
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
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          certificate_number: string
          certificate_type: string | null
          conclusion_date: string | null
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
          pdf_path: string | null
          rejection_reason: string | null
          status: string | null
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
          certificate_type?: string | null
          conclusion_date?: string | null
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
          pdf_path?: string | null
          rejection_reason?: string | null
          status?: string | null
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
          certificate_type?: string | null
          conclusion_date?: string | null
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
          pdf_path?: string | null
          rejection_reason?: string | null
          status?: string | null
          tcc_id?: string | null
          updated_at?: string | null
          user_id?: string
          verification_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_management"
            referencedColumns: ["id"]
          },
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
            isOneToOne: true
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_tcc_id_fkey"
            columns: ["tcc_id"]
            isOneToOne: false
            referencedRelation: "tcc_submissions"
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
      drive_import_events: {
        Row: {
          context: Json | null
          created_at: string | null
          id: string
          item_id: string | null
          job_id: string
          level: string
          message: string
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          id?: string
          item_id?: string | null
          job_id: string
          level?: string
          message: string
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          id?: string
          item_id?: string | null
          job_id?: string
          level?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "drive_import_events_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "drive_import_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_import_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "drive_import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_import_items: {
        Row: {
          attempt_count: number
          created_at: string | null
          drive_file_id: string
          error: string | null
          id: string
          job_id: string
          kind: string | null
          metadata: Json | null
          mime_type: string | null
          name: string
          parent_id: string | null
          processed_at: string | null
          size_bytes: number | null
          status: string
          storage_bucket: string | null
          storage_content_type: string | null
          storage_path: string | null
          storage_public_url: string | null
          updated_at: string | null
          web_content_link: string | null
          web_view_link: string | null
        }
        Insert: {
          attempt_count?: number
          created_at?: string | null
          drive_file_id: string
          error?: string | null
          id?: string
          job_id: string
          kind?: string | null
          metadata?: Json | null
          mime_type?: string | null
          name: string
          parent_id?: string | null
          processed_at?: string | null
          size_bytes?: number | null
          status?: string
          storage_bucket?: string | null
          storage_content_type?: string | null
          storage_path?: string | null
          storage_public_url?: string | null
          updated_at?: string | null
          web_content_link?: string | null
          web_view_link?: string | null
        }
        Update: {
          attempt_count?: number
          created_at?: string | null
          drive_file_id?: string
          error?: string | null
          id?: string
          job_id?: string
          kind?: string | null
          metadata?: Json | null
          mime_type?: string | null
          name?: string
          parent_id?: string | null
          processed_at?: string | null
          size_bytes?: number | null
          status?: string
          storage_bucket?: string | null
          storage_content_type?: string | null
          storage_path?: string | null
          storage_public_url?: string | null
          updated_at?: string | null
          web_content_link?: string | null
          web_view_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drive_import_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "drive_import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_import_jobs: {
        Row: {
          cancellation_requested: boolean | null
          cancelled_at: string | null
          course_id: string | null
          created_at: string | null
          current_step: string | null
          error: string | null
          finished_at: string | null
          folder_id: string
          id: string
          metadata: Json | null
          processed_items: number | null
          started_at: string | null
          status: string
          total_items: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cancellation_requested?: boolean | null
          cancelled_at?: string | null
          course_id?: string | null
          created_at?: string | null
          current_step?: string | null
          error?: string | null
          finished_at?: string | null
          folder_id: string
          id?: string
          metadata?: Json | null
          processed_items?: number | null
          started_at?: string | null
          status?: string
          total_items?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cancellation_requested?: boolean | null
          cancelled_at?: string | null
          course_id?: string | null
          created_at?: string | null
          current_step?: string | null
          error?: string | null
          finished_at?: string | null
          folder_id?: string
          id?: string
          metadata?: Json | null
          processed_items?: number | null
          started_at?: string | null
          status?: string
          total_items?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drive_import_jobs_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_statistics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "drive_import_jobs_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_import_jobs_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "subject_lessons_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "drive_import_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_import_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_management"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_import_logs: {
        Row: {
          context: Json | null
          created_at: string | null
          id: string
          job_id: string
          level: string
          message: string
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          id?: string
          job_id: string
          level?: string
          message: string
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          id?: string
          job_id?: string
          level?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "drive_import_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "drive_import_jobs"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "enrollment_modules_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
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
      import_progress: {
        Row: {
          completed: boolean | null
          course_id: string | null
          created_at: string | null
          current_item: string | null
          current_step: string | null
          errors: Json | null
          id: string
          percentage: number | null
          phase: string | null
          processed_lessons: number | null
          processed_modules: number | null
          processed_subjects: number | null
          processed_tests: number | null
          started_at: string | null
          total_lessons: number | null
          total_modules: number | null
          total_subjects: number | null
          total_tests: number | null
          updated_at: string | null
          user_id: string | null
          warnings: Json | null
        }
        Insert: {
          completed?: boolean | null
          course_id?: string | null
          created_at?: string | null
          current_item?: string | null
          current_step?: string | null
          errors?: Json | null
          id: string
          percentage?: number | null
          phase?: string | null
          processed_lessons?: number | null
          processed_modules?: number | null
          processed_subjects?: number | null
          processed_tests?: number | null
          started_at?: string | null
          total_lessons?: number | null
          total_modules?: number | null
          total_subjects?: number | null
          total_tests?: number | null
          updated_at?: string | null
          user_id?: string | null
          warnings?: Json | null
        }
        Update: {
          completed?: boolean | null
          course_id?: string | null
          created_at?: string | null
          current_item?: string | null
          current_step?: string | null
          errors?: Json | null
          id?: string
          percentage?: number | null
          phase?: string | null
          processed_lessons?: number | null
          processed_modules?: number | null
          processed_subjects?: number | null
          processed_tests?: number | null
          started_at?: string | null
          total_lessons?: number | null
          total_modules?: number | null
          total_subjects?: number | null
          total_tests?: number | null
          updated_at?: string | null
          user_id?: string | null
          warnings?: Json | null
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
        Relationships: [
          {
            foreignKeyName: "student_grade_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_grade_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_management"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "student_schedules_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_management"
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
        Relationships: [
          {
            foreignKeyName: "tcc_submissions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_statistics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "tcc_submissions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tcc_submissions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "subject_lessons_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "tcc_submissions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tcc_submissions_evaluated_by_fkey"
            columns: ["evaluated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tcc_submissions_evaluated_by_fkey"
            columns: ["evaluated_by"]
            isOneToOne: false
            referencedRelation: "user_management"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tcc_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tcc_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_management"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "test_answer_keys_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "test_attempts_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
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
        Relationships: [
          {
            foreignKeyName: "test_grades_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_statistics"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "test_grades_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_grades_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "subject_lessons_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "test_grades_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_grades_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_grades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_grades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_management"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "tests_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
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
      approve_certificate_request: {
        Args: { p_admin_id: string; p_request_id: string }
        Returns: boolean
      }
      calculate_enrollment_progress: {
        Args: { p_enrollment_id: string }
        Returns: number
      }
      calculate_final_grade: {
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
      clean_old_import_progress: { Args: Record<PropertyKey, never>; Returns: undefined }
      create_certificate_request: {
        Args: { p_enrollment_id: string }
        Returns: {
          message: string
          request_id: string
          success: boolean
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
      get_enrollment_count: { Args: { course_id: string }; Returns: number }
      get_next_order_index: {
        Args: {
          p_filter_column: string
          p_filter_value: string
          p_table_name: string
        }
        Returns: number
      }
      get_user_approved_certificates_count: {
        Args: { p_user_id: string }
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
      refresh_module_total_hours: {
        Args: { p_module_id: string }
        Returns: undefined
      }
      reject_certificate_request: {
        Args: { p_admin_id: string; p_reason: string; p_request_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
