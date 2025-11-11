-- Migration: Fix course_modules.code extraction
-- Date: 2025-11-11
-- Description: Correct regex to extract only the code before the hyphen (MLTA04 instead of MLTA04-GEST)

-- ============================================================================
-- Fix code extraction - remove everything after the first hyphen
-- ============================================================================

-- Update codes that were incorrectly extracted with the hyphen and subsequent text
-- Example: "MLTA04-GEST..." → "MLTA04"
UPDATE course_modules
SET code = (regexp_match(title, '^([^-]+)-'))[1]
WHERE title ~ '^.+-' AND code ~ '-';

-- Also update any that might have been missed in the first migration
UPDATE course_modules
SET code = (regexp_match(title, '^([^-]+)-'))[1]
WHERE title ~ '^.+-' AND code !~ '-' AND code NOT LIKE 'MOD%';

-- ============================================================================
-- Comment
-- ============================================================================

COMMENT ON COLUMN course_modules.code IS
'Unique code identifier for the module within the course (e.g., MLTA01, MOD01).
Extracted from title before the first hyphen, or auto-generated for modules without hyphen in title.';
