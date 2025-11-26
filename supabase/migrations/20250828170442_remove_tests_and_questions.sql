-- Remove all test and question related tables and enums

-- Drop dependent views/functions first
DROP FUNCTION IF EXISTS calculate_test_total_points CASCADE;

-- Drop tables (in order of dependencies)
DROP TABLE IF EXISTS test_answers CASCADE;
DROP TABLE IF EXISTS test_attempts CASCADE;
DROP TABLE IF EXISTS test_questions CASCADE;
DROP TABLE IF EXISTS tests CASCADE;
DROP TABLE IF EXISTS question_options CASCADE;
DROP TABLE IF EXISTS question_subjects CASCADE;
DROP TABLE IF EXISTS questions CASCADE;

-- Drop enums
DROP TYPE IF EXISTS attempt_status CASCADE;
DROP TYPE IF EXISTS difficulty_level CASCADE;
DROP TYPE IF EXISTS question_type CASCADE;
DROP TYPE IF EXISTS test_type CASCADE;