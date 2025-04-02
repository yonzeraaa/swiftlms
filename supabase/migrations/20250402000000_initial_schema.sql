

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."check_course_completion"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    total_lessons INT;
    completed_lessons INT;
    v_enrollment_id INT;
    v_course_id INT;
BEGIN
    -- Apenas executa se a lição foi marcada como concluída
    IF NEW.is_completed = true AND OLD.is_completed = false THEN
        -- Obtém o enrollment_id e course_id
        SELECT e.id, e.course_id INTO v_enrollment_id, v_course_id
        FROM public.enrollments e
        WHERE e.id = NEW.enrollment_id;

        -- Conta o total de lições publicadas no curso
        SELECT COUNT(*) INTO total_lessons
        FROM public.lessons l
        WHERE l.course_id = v_course_id AND l.is_published = true;

        -- Conta as lições concluídas para esta matrícula
        SELECT COUNT(*) INTO completed_lessons
        FROM public.progress p
        JOIN public.lessons l ON p.lesson_id = l.id
        WHERE p.enrollment_id = v_enrollment_id
          AND l.course_id = v_course_id -- Garante que são lições do mesmo curso
          AND p.is_completed = true
          AND l.is_published = true; -- Considera apenas lições publicadas

        -- Se todas as lições publicadas foram concluídas, marca a matrícula como concluída
        IF total_lessons > 0 AND completed_lessons >= total_lessons THEN
            UPDATE public.enrollments
            SET completed_at = NOW()
            WHERE id = v_enrollment_id;
        ELSE
             -- Garante que completed_at seja nulo se não estiver completo
             UPDATE public.enrollments
             SET completed_at = NULL
             WHERE id = v_enrollment_id AND completed_at IS NOT NULL;
        END IF;
    END IF;

    RETURN NEW; -- Retorna NEW pois é um gatilho AFTER UPDATE na tabela progress
END;
$$;


ALTER FUNCTION "public"."check_course_completion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_last_sign_in_for_users"("user_ids" "uuid"[]) RETURNS TABLE("id" "uuid", "last_sign_in_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT
    u.id,
    u.last_sign_in_at
  FROM auth.users u
  WHERE u.id = ANY(user_ids);
$$;


ALTER FUNCTION "public"."get_last_sign_in_for_users"("user_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_my_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_platform_stats"() RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  stats json;
BEGIN
  SELECT json_build_object(
    'studentCount', (SELECT count(*) FROM public.profiles WHERE role = 'aluno'),
    'courseCount', (SELECT count(*) FROM public.courses),
    'enrollmentCount', (SELECT count(*) FROM public.enrollments),
    'adminCount', (SELECT count(*) FROM public.profiles WHERE role = 'admin')
  ) INTO stats;
  RETURN stats;
END;
$$;


ALTER FUNCTION "public"."get_platform_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_popular_courses"("limit_count" integer DEFAULT 5) RETURNS TABLE("course_id" "uuid", "title" "text", "enrollment_count" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  select
    c.id as course_id,
    c.title,
    count(e.id)::bigint as enrollment_count -- Cast count to bigint to match potential return type expectation
  from
    public.courses c
  join
    public.enrollments e on c.id = e.course_id
  group by
    c.id, c.title
  order by
    enrollment_count desc
  limit limit_count;
$$;


ALTER FUNCTION "public"."get_popular_courses"("limit_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_course_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_course_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_lesson_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_lesson_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_profile_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_profile_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_progress_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
   IF NEW.is_completed = true AND OLD.is_completed = false THEN
       NEW.completed_at = NOW();
   END IF;
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_progress_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."categories_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."categories_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."categories_id_seq" OWNED BY "public"."categories"."id";



CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "code" character varying(10)
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


COMMENT ON TABLE "public"."courses" IS 'Stores course information.';



COMMENT ON COLUMN "public"."courses"."code" IS 'Unique code for the course (e.g., CNO).';



CREATE TABLE IF NOT EXISTS "public"."disciplines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "order_index" smallint DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "code" character varying(15),
    "number" "text",
    "order" "text"
);


ALTER TABLE "public"."disciplines" OWNER TO "postgres";


COMMENT ON TABLE "public"."disciplines" IS 'Stores disciplines or modules within a course.';



COMMENT ON COLUMN "public"."disciplines"."order_index" IS 'Determines the display order within a course.';



COMMENT ON COLUMN "public"."disciplines"."code" IS 'Unique code for the discipline (e.g., CCCC DD).';



CREATE TABLE IF NOT EXISTS "public"."enrollments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "enrolled_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."enrollments" OWNER TO "postgres";


COMMENT ON TABLE "public"."enrollments" IS 'Tracks user enrollment in courses.';



CREATE TABLE IF NOT EXISTS "public"."lesson_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "viewed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."lesson_views" OWNER TO "postgres";


COMMENT ON TABLE "public"."lesson_views" IS 'Tracks when a user views a specific lesson, used for progress calculation.';



COMMENT ON COLUMN "public"."lesson_views"."id" IS 'Unique identifier for the view record.';



COMMENT ON COLUMN "public"."lesson_views"."user_id" IS 'Foreign key referencing the user who viewed the lesson.';



COMMENT ON COLUMN "public"."lesson_views"."lesson_id" IS 'Foreign key referencing the lesson that was viewed.';



COMMENT ON COLUMN "public"."lesson_views"."viewed_at" IS 'Timestamp when the lesson was marked as viewed (can be updated if re-viewed).';



COMMENT ON COLUMN "public"."lesson_views"."created_at" IS 'Timestamp when the view record was first created.';



CREATE TABLE IF NOT EXISTS "public"."lessons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "discipline_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text",
    "video_url" "text",
    "order_index" smallint DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "code" character varying(20),
    "number" "text",
    "order" "text"
);


ALTER TABLE "public"."lessons" OWNER TO "postgres";


COMMENT ON TABLE "public"."lessons" IS 'Stores individual lessons within a discipline.';



COMMENT ON COLUMN "public"."lessons"."content" IS 'Main content of the lesson.';



COMMENT ON COLUMN "public"."lessons"."order_index" IS 'Determines the display order within a discipline.';



COMMENT ON COLUMN "public"."lessons"."code" IS 'Unique code for the lesson (e.g., CCCC DD AA).';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "role" "text" DEFAULT 'aluno'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "phone_number" "text",
    "account_status" "text" DEFAULT 'active'::"text" NOT NULL,
    "email" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."phone_number" IS 'User''s phone number.';



COMMENT ON COLUMN "public"."profiles"."account_status" IS 'Account status: active, frozen, etc.';



COMMENT ON COLUMN "public"."profiles"."email" IS 'User''s email address (synced from auth.users).';



CREATE TABLE IF NOT EXISTS "public"."progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enrollment_id" "uuid" NOT NULL,
    "lesson_id" "uuid",
    "completed" boolean DEFAULT false,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."progress" OWNER TO "postgres";


COMMENT ON TABLE "public"."progress" IS 'Tracks user progress within enrollments/lessons.';



ALTER TABLE ONLY "public"."categories" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."categories_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."disciplines"
    ADD CONSTRAINT "disciplines_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."disciplines"
    ADD CONSTRAINT "disciplines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_user_id_course_id_key" UNIQUE ("user_id", "course_id");



ALTER TABLE ONLY "public"."lesson_views"
    ADD CONSTRAINT "lesson_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lesson_views"
    ADD CONSTRAINT "lesson_views_user_lesson_unique" UNIQUE ("user_id", "lesson_id");



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."progress"
    ADD CONSTRAINT "progress_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_disciplines_course_id" ON "public"."disciplines" USING "btree" ("course_id");



CREATE INDEX "idx_enrollments_course_id" ON "public"."enrollments" USING "btree" ("course_id");



CREATE INDEX "idx_enrollments_user_id" ON "public"."enrollments" USING "btree" ("user_id");



CREATE INDEX "idx_lessons_discipline_id" ON "public"."lessons" USING "btree" ("discipline_id");



CREATE OR REPLACE TRIGGER "handle_courses_updated_at" BEFORE UPDATE ON "public"."courses" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_disciplines_updated_at" BEFORE UPDATE ON "public"."disciplines" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_lessons_updated_at" BEFORE UPDATE ON "public"."lessons" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_profile_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_profile_updated_at"();



ALTER TABLE ONLY "public"."disciplines"
    ADD CONSTRAINT "disciplines_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_views"
    ADD CONSTRAINT "lesson_views_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_views"
    ADD CONSTRAINT "lesson_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_discipline_id_fkey" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."progress"
    ADD CONSTRAINT "progress_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."progress"
    ADD CONSTRAINT "progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE SET NULL;



CREATE POLICY "Allow admin full access" ON "public"."courses" USING (("public"."get_my_role"() = 'admin'::"text")) WITH CHECK (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Allow admin full access" ON "public"."disciplines" USING (("public"."get_my_role"() = 'admin'::"text")) WITH CHECK (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Allow admin full access" ON "public"."lessons" USING (("public"."get_my_role"() = 'admin'::"text")) WITH CHECK (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Allow admin full access on courses" ON "public"."courses" USING (("public"."get_my_role"() = 'admin'::"text")) WITH CHECK (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Allow admin full access on disciplines" ON "public"."disciplines" USING (("public"."get_my_role"() = 'admin'::"text")) WITH CHECK (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Allow admin full access on enrollments" ON "public"."enrollments" USING (("public"."get_my_role"() = 'admin'::"text")) WITH CHECK (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Allow admin full access on lessons" ON "public"."lessons" USING (("public"."get_my_role"() = 'admin'::"text")) WITH CHECK (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Allow admin insert/delete access" ON "public"."enrollments" USING (("public"."get_my_role"() = 'admin'::"text")) WITH CHECK (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Allow admin read access" ON "public"."enrollments" FOR SELECT USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Allow admin read access" ON "public"."progress" FOR SELECT USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Allow enrolled students read access on courses" ON "public"."courses" FOR SELECT USING ((("public"."get_my_role"() = 'admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."enrollments"
  WHERE (("enrollments"."course_id" = "courses"."id") AND ("enrollments"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Allow enrolled students read access on disciplines" ON "public"."disciplines" FOR SELECT USING ((("public"."get_my_role"() = 'admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."enrollments"
  WHERE (("enrollments"."course_id" = "disciplines"."course_id") AND ("enrollments"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Allow enrolled students read access on lessons" ON "public"."lessons" FOR SELECT USING ((("public"."get_my_role"() = 'admin'::"text") OR (EXISTS ( SELECT 1
   FROM ("public"."enrollments" "e"
     JOIN "public"."disciplines" "d" ON (("e"."course_id" = "d"."course_id")))
  WHERE (("d"."id" = "lessons"."discipline_id") AND ("e"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Allow individual access" ON "public"."progress" USING (("auth"."uid"() = ( SELECT "enrollments"."user_id"
   FROM "public"."enrollments"
  WHERE ("enrollments"."id" = "progress"."enrollment_id"))));



CREATE POLICY "Allow individual read access" ON "public"."enrollments" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow individual read access" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Allow individual read access on enrollments" ON "public"."enrollments" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow individual update access" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Allow read access to authenticated users" ON "public"."courses" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow read access to authenticated users" ON "public"."disciplines" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow read access to authenticated users" ON "public"."lessons" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow users to insert their own lesson views" ON "public"."lesson_views" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow users to select their own lesson views" ON "public"."lesson_views" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."disciplines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."enrollments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lesson_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lessons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."progress" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."check_course_completion"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_course_completion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_course_completion"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_last_sign_in_for_users"("user_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_last_sign_in_for_users"("user_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_last_sign_in_for_users"("user_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_platform_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_platform_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_platform_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_popular_courses"("limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_popular_courses"("limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_popular_courses"("limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_course_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_course_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_course_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_lesson_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_lesson_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_lesson_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_profile_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_profile_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_profile_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_progress_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_progress_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_progress_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON TABLE "public"."disciplines" TO "anon";
GRANT ALL ON TABLE "public"."disciplines" TO "authenticated";
GRANT ALL ON TABLE "public"."disciplines" TO "service_role";



GRANT ALL ON TABLE "public"."enrollments" TO "anon";
GRANT ALL ON TABLE "public"."enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."enrollments" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_views" TO "anon";
GRANT ALL ON TABLE "public"."lesson_views" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_views" TO "service_role";



GRANT ALL ON TABLE "public"."lessons" TO "anon";
GRANT ALL ON TABLE "public"."lessons" TO "authenticated";
GRANT ALL ON TABLE "public"."lessons" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."progress" TO "anon";
GRANT ALL ON TABLE "public"."progress" TO "authenticated";
GRANT ALL ON TABLE "public"."progress" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
