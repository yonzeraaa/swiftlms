import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import styles from './MyCoursesPage.module.css'; // Ensure this CSS module exists

// Define the shape of a basic course object fetched initially
interface BaseCourse {
    id: string;
    title: string;
    description: string | null;
    code: string | null;
}

// Define the shape of a course object with progress
interface CourseWithProgress extends BaseCourse {
    totalLessons: number;
    viewedLessons: number;
}

// Removed unused DisciplineId interface definition

// Define the shape for lesson IDs (Removed as it's no longer used directly here)
// interface LessonId {
//     id: string;
// }

const MyCoursesPage: React.FC = () => {
    const { user } = useAuth();
    const [enrolledCourses, setEnrolledCourses] = useState<CourseWithProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchEnrolledCourses = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // 1. Fetch enrollments with basic course details
            // Supabase types should infer enrollmentData as: { courses: BaseCourse | null }[] | null
            const { data: enrollmentData, error: enrollmentError } = await supabase
                .from('enrollments')
                .select(`
                    courses (
                        id,
                        title,
                        description,
                        code
                    )
                `)
                .eq('user_id', user.id);

            if (enrollmentError) throw enrollmentError;

            // 2. Extract valid course objects, handling potential array in 'courses'
            const validBaseCourses: BaseCourse[] = (enrollmentData ?? [])
                .map(enrollment => {
                    // If courses is an array, take the first element, otherwise use it directly (or null)
                    const courseData = Array.isArray(enrollment.courses)
                        ? enrollment.courses[0]
                        : enrollment.courses;
                    return courseData;
                })
                .filter((course): course is BaseCourse => course !== null); // Filter out nulls and assert type

            // 3. Fetch progress for each valid course concurrently
            const coursesWithProgressPromises = validBaseCourses.map(async (course): Promise<CourseWithProgress> => { // Explicitly type the course parameter and return promise
                let totalLessonsCount = 0;
                let viewedLessonsCount = 0;

                try {
                    // Get associated discipline IDs from the junction table
                    const { data: associationData, error: associationError } = await supabase
                        .from('course_disciplines')
                        .select('discipline_id')
                        .eq('course_id', course.id);

                    // Rename variables for clarity
                    if (associationError) {
                        console.warn(`Error fetching associated disciplines for course ${course.id}:`, associationError.message);
                    } else {
                        // Extract discipline IDs from the association data
                        const disciplineIds = associationData?.map(assoc => assoc.discipline_id) || [];

                        if (disciplineIds.length > 0) {
                            // Fetch lesson IDs associated with these disciplines
                            const { data: lessonAssocData, error: lessonAssocError } = await supabase
                                .from('discipline_lessons')
                                .select('lesson_id')
                                .in('discipline_id', disciplineIds);

                            if (lessonAssocError) {
                                console.warn(`Error fetching lesson associations for course ${course.id}:`, lessonAssocError.message);
                            } else {
                                const lessonIds = [...new Set(lessonAssocData?.map(assoc => assoc.lesson_id) || [])]; // Get unique lesson IDs
                                totalLessonsCount = lessonIds.length;

                                // Fetch viewed lessons count only if there are lessons associated
                                if (totalLessonsCount > 0) {
                                    const { count: viewedCount, error: viewedLessonsError } = await supabase
                                        .from('lesson_views')
                                        .select('lesson_id', { count: 'exact', head: true })
                                        .eq('user_id', user.id)
                                        .in('lesson_id', lessonIds);

                                    viewedLessonsCount = viewedLessonsError ? 0 : (viewedCount ?? 0);
                                    if (viewedLessonsError) console.warn(`Error fetching viewed lessons for course ${course.id}:`, viewedLessonsError.message);
                                }
                            }
                        }
                    }
                } catch (progressError: any) {
                    console.error(`Failed to fetch progress for course ${course.id}:`, progressError);
                }

                // Return the combined object matching CourseWithProgress
                return {
                    id: course.id,
                    title: course.title,
                    description: course.description,
                    code: course.code,
                    totalLessons: totalLessonsCount,
                    viewedLessons: viewedLessonsCount,
                };
            });

            // 4. Resolve all promises and update state
            const resolvedCoursesWithProgress = await Promise.all(coursesWithProgressPromises);
            setEnrolledCourses(resolvedCoursesWithProgress); // Type should now match

        } catch (err: any) {
            console.error("Error fetching enrolled courses:", err);
            setError(err.message || 'Falha ao buscar seus cursos inscritos.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchEnrolledCourses();
    }, [fetchEnrolledCourses]);

    return (
        <div className={styles.pageContainer}>
            <h1>Meus Cursos</h1>
            {loading && <p>Carregando cursos...</p>}
            {error && <p className={styles.errorMessage}>Erro: {error}</p>}
            {!loading && !error && (
                enrolledCourses.length === 0 ? (
                    <p>Você ainda não está inscrito em nenhum curso.</p>
                ) : (
                    <ul className={styles.courseList}>
                        {enrolledCourses.map((course) => (
                            <li key={course.id} className={styles.courseItem}>
                                <Link to={`/student/courses/${course.id}`} className={styles.courseLink}>
                                    <div className={styles.courseInfo}>
                                        <strong>{course.title} {course.code ? `(${course.code})` : ''}</strong>
                                        <p>{course.description || 'Sem descrição.'}</p>
                                    </div>
                                    <div className={styles.progressContainer}>
                                        <span className={styles.progressText}>
                                            {course.viewedLessons} / {course.totalLessons} aulas
                                        </span>
                                        <div className={styles.progressBarBackground}>
                                            <div
                                                className={styles.progressBarForeground}
                                                style={{ width: `${course.totalLessons > 0 ? (course.viewedLessons / course.totalLessons) * 100 : 0}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )
            )}
        </div>
    );
};

export default MyCoursesPage;
