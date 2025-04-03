# Refactoring Plan: Course/Discipline Many-to-Many Relationship

**Goal:** Refactor the application to support a many-to-many relationship between Courses and Disciplines, allowing disciplines to be reused across multiple courses.

**1. Database Schema Changes (using Supabase Migrations)**

*   **Create Junction Table (`course_disciplines`):**
    *   This table will link `courses` and `disciplines`.
    *   Columns:
        *   `course_id` (UUID, Foreign Key referencing `courses.id`, ON DELETE CASCADE)
        *   `discipline_id` (UUID, Foreign Key referencing `disciplines.id`, ON DELETE CASCADE)
        *   `created_at` (TIMESTAMPTZ, default NOW())
        *   Primary Key: (`course_id`, `discipline_id`) - Ensures a discipline is linked only once per course.
    *   Indexes: Add indexes on `course_id` and `discipline_id` for efficient lookups.
*   **Modify `disciplines` Table:**
    *   **Remove `course_id` column:** This column is no longer needed as the relationship is now managed by `course_disciplines`.
    *   **Remove Foreign Key:** Drop the foreign key constraint associated with the old `disciplines.course_id`.
    *   *(Consideration)*: Keep `order` and `number` fields if they are still relevant for a discipline *in general*, or decide if ordering should be managed within the `course_disciplines` table (e.g., add an `order_in_course` column there). For simplicity now, let's assume `order` and `number` remain on `disciplines` representing a general characteristic.
*   **Modify `lessons` Table:**
    *   No direct changes needed here, as lessons still belong to a discipline (`discipline_id`).

**2. Backend Changes (RLS Policies & Functions)**

*   **Update RLS Policies:**
    *   `courses`: Policies remain largely the same for admin access. Student read access might need adjustment if it previously relied on checking disciplines directly linked via `course_id`.
    *   `disciplines`:
        *   Admin access: Allow full CRUD.
        *   Student read access: Needs modification. Students should only be able to read disciplines that are linked (via `course_disciplines`) to a course they are enrolled in.
    *   `lessons`: Student read access needs modification. Students should only read lessons belonging to disciplines linked (via `course_disciplines`) to courses they are enrolled in.
    *   `course_disciplines` (New Policies):
        *   Admin access: Allow full CRUD.
        *   Student read access: Allow students to read links (`course_id`, `discipline_id`) for courses they are enrolled in.
    *   `lesson_views`: Policies likely remain the same (based on `user_id` and `lesson_id`).
*   **Review/Update Functions/RPCs:**
    *   `get_platform_stats`: No change likely needed.
    *   `get_recent_activity_with_profiles`: Might need updates if activity details relied on the old `disciplines.course_id`.
    *   Any other custom functions interacting with courses/disciplines/lessons need review.

**3. Frontend (UI/Component) Changes**

*   **New Admin Page: Central Discipline Management (`src/pages/AdminDisciplinesBankPage.tsx`)**
    *   Purpose: Create, Read, Update, Delete (CRUD) disciplines independently.
    *   Components:
        *   Use `AddDisciplineForm.tsx` (modified to remove `courseId` prop).
        *   Create a new `DisciplineBankList.tsx` component to display all disciplines with edit/delete options.
        *   Navigation: Add a link in the `Sidebar.tsx` (e.g., "Banco de Disciplinas").
*   **Modify Course Management:**
    *   `src/pages/AdminCoursesPage.tsx`:
        *   Remove or repurpose the `AdminDisciplinesPage.tsx` link/logic.
    *   `src/components/CourseList.tsx`:
        *   Change the "Gerenciar Disciplinas" button. It should now likely navigate to a view showing disciplines *associated* with that specific course via the `course_disciplines` table. This might involve creating a new component or modifying `DisciplineList.tsx`.
    *   `src/components/AddCourseForm.tsx` & `src/components/EditCourseModal.tsx`:
        *   Add UI element (e.g., multi-select dropdown, checklist populated by fetching all disciplines from the bank) to select/deselect disciplines to associate with the course.
        *   On save/update, manage entries in the `course_disciplines` junction table based on the selection.
*   **Modify Lesson Management:**
    *   `src/pages/AdminLessonsPage.tsx`:
        *   Navigation to this page might change. It could be accessed from the new `AdminDisciplinesBankPage.tsx` or from the list of associated disciplines within a course view.
        *   The core logic remains tied to `disciplineId`, but fetching the discipline details won't involve `courseId`.
*   **Modify Student View:**
    *   `src/pages/CourseViewPage.tsx`:
        *   Update data fetching: Fetch course -> Fetch associated `discipline_id`s from `course_disciplines` where `course_id` matches -> Fetch details for those `discipline_id`s, including their lessons.
    *   `src/pages/MyCoursesPage.tsx` & `src/pages/StudentDashboard.tsx`:
        *   Update progress calculation: Fetch course -> Fetch associated `discipline_id`s -> Fetch `lesson_id`s for those disciplines -> Fetch `lesson_views` for those `lesson_id`s and the current `user_id`.

**4. Data Migration Plan**

*   **Step 1: Create Migration File (Supabase CLI):** Define the creation of the `course_disciplines` table.
*   **Step 2: Create Migration File (Supabase CLI):**
    *   Write SQL script to populate `course_disciplines` using existing data:
        ```sql
        INSERT INTO public.course_disciplines (course_id, discipline_id)
        SELECT course_id, id
        FROM public.disciplines
        WHERE course_id IS NOT NULL;
        ```
*   **Step 3: Verify Data:** Manually check the `course_disciplines` table to ensure correct associations were created.
*   **Step 4: Create Migration File (Supabase CLI):**
    *   Drop the foreign key constraint `disciplines_course_id_fkey`.
    *   Drop the `course_id` column from the `disciplines` table.
*   **Execution:** Run these migrations sequentially using `supabase db push` (for local dev) or apply them to staging/production environments carefully. *This process might require brief downtime or read-only mode during the migration.*

**5. Tooling**

*   All database schema changes and data migration steps will be implemented using SQL migration files managed by the **Supabase CLI**.

**6. Visualization (Mermaid Diagram)**

```mermaid
graph TD
    subgraph Entities
        C[Courses]
        D[Disciplines]
        L[Lessons]
        U[Users/Profiles]
        E[Enrollments]
        LV[Lesson Views]
    end

    subgraph Junction Tables
        CD(course_disciplines)
    end

    C --o CD --o D
    D --|has many| L
    U --|enrolls in| E --|for| C
    U --|views| LV --|of| L

    style CD fill:#eee,stroke:#333,stroke-width:2px