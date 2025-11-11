-- Migration: Add code field to course_modules
-- Date: 2025-11-11
-- Description: Add code column to course_modules and populate with real codes from title

-- ============================================================================
-- 1. Add code column
-- ============================================================================

ALTER TABLE course_modules
ADD COLUMN code TEXT;

-- ============================================================================
-- 2. Populate code from existing title field
-- ============================================================================

-- Extract code from title using regex (before the hyphen)
-- Example: "MLTA01-CENÁRIO DE OPORTUNIDADES" → "MLTA01"
UPDATE course_modules
SET code = (regexp_match(title, '^([A-Za-z0-9._-]+)'))[1]
WHERE title ~ '^[A-Za-z0-9._-]+-';

-- ============================================================================
-- 3. Generate synthetic codes for modules without code in title
-- ============================================================================

-- For any module that still doesn't have a code, generate MOD## based on order_index
UPDATE course_modules
SET code = 'MOD' || LPAD((order_index + 1)::text, 2, '0')
WHERE code IS NULL OR TRIM(code) = '';

-- ============================================================================
-- 4. Add constraints
-- ============================================================================

-- Make code unique per course (same code can exist in different courses)
ALTER TABLE course_modules
ADD CONSTRAINT course_modules_code_unique UNIQUE (course_id, code);

-- Add NOT NULL constraint (now that all rows have values)
ALTER TABLE course_modules
ALTER COLUMN code SET NOT NULL;

-- ============================================================================
-- 5. Add comment for documentation
-- ============================================================================

COMMENT ON COLUMN course_modules.code IS
'Unique code identifier for the module within the course (e.g., MLTA01, MOD01). Extracted from title or auto-generated.';
