import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import styles from './StudentDashboard.module.css';

// Re-use types from MyCoursesPage or define locally if needed
interface BaseCourse {
    id: string;
    title: string;
    code: string | null;
}
interface CourseWithProgress extends BaseCourse {
    totalLessons: number;
    viewedLessons: number;
}
interface DisciplineId { id: string; }
interface LessonId { id: string; }

interface LastViewedInfo {
    courseId: string;
    courseTitle: string;
    lessonId: string; // We might not link directly to a lesson, but good to have
    lessonTitle: string;
    timestamp: number; // To potentially show recently viewed
}

const StudentDashboard: React.FC = () => {
    const { user } = useAuth();
    const [summaryCourses, setSummaryCourses] = useState<CourseWithProgress[]>([]);
    const [lastViewed, setLastViewed] = useState<LastViewedInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDashboardData = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        // Reset states
        setLoading(true);
        setError(null);
        setSummaryCourses([]); // Clear previous summary

        try {
            // Fetch enrollments (similar to MyCoursesPage)
            const { data: enrollmentData, error: enrollmentError } = await supabase
                .from('enrollments')
                .select(`courses (id, title, code)`) // Fetch needed fields
                .eq('user_id', user.id)
                .limit(5); // Limit for dashboard summary

            if (enrollmentError) throw enrollmentError;

            // Remove incorrect type assertion and handle potential array in 'courses'
            const baseCourses: BaseCourse[] = (enrollmentData ?? [])
                .map(enrollment => {
                    // If courses is an array, take the first element, otherwise use it directly (or null)
                    const courseData = Array.isArray(enrollment.courses)
                        ? enrollment.courses[0]
                        : enrollment.courses;
                    return courseData;
                })
                .filter((course): course is BaseCourse => course !== null); // Filter out nulls and assert type

            // Fetch progress concurrently (simplified version for dashboard)
            const coursesWithProgressPromises = baseCourses.map(async (course): Promise<CourseWithProgress> => {
                let totalLessonsCount = 0;
                let viewedLessonsCount = 0;
                try {
                    const { data: disciplineData, error: disciplineError } = await supabase
                        .from('disciplines').select('id').eq('course_id', course.id);
                    if (disciplineError) throw disciplineError;

                    const disciplineIds = (disciplineData as DisciplineId[])?.map(d => d.id) || [];
                    if (disciplineIds.length > 0) {
                        const { count: lessonCount, error: totalLessonsError } = await supabase
                            .from('lessons').select('id', { count: 'exact', head: true }).in('discipline_id', disciplineIds);
                        totalLessonsCount = totalLessonsError ? 0 : (lessonCount ?? 0);

                        if (totalLessonsCount > 0) {
                            const { data: lessonData, error: lessonError } = await supabase
                                .from('lessons').select('id').in('discipline_id', disciplineIds);
                            if (!lessonError && lessonData) {
                                const lessonIds = (lessonData as LessonId[])?.map(l => l.id) || [];
                                if (lessonIds.length > 0) {
                                    const { count: viewedCount, error: viewedLessonsError } = await supabase
                                        .from('lesson_views').select('lesson_id', { count: 'exact', head: true })
                                        .eq('user_id', user.id).in('lesson_id', lessonIds);
                                    viewedLessonsCount = viewedLessonsError ? 0 : (viewedCount ?? 0);
                                }
                            }
                        }
                    }
                } catch (progressError: any) {
                    console.warn(`Failed to fetch progress for course ${course.id} on dashboard:`, progressError);
                }
                return { ...course, totalLessons: totalLessonsCount, viewedLessons: viewedLessonsCount };
            });

            const resolvedCourses = await Promise.all(coursesWithProgressPromises);
            setSummaryCourses(resolvedCourses);

        } catch (err: any) {
            console.error("Error fetching dashboard data:", err);
            setError(err.message || 'Falha ao carregar dados do painel.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchDashboardData();

        // Retrieve last viewed from localStorage
        const storedLastViewed = localStorage.getItem('swiftlms_last_viewed');
        if (storedLastViewed) {
            try {
                const parsedData: LastViewedInfo = JSON.parse(storedLastViewed);
                // Optional: Check timestamp if you only want to show recent activity
                // const oneDay = 24 * 60 * 60 * 1000;
                // if (Date.now() - parsedData.timestamp < oneDay) {
                    setLastViewed(parsedData);
                // }
            } catch (e) {
                console.error("Error parsing last viewed data from localStorage", e);
                localStorage.removeItem('swiftlms_last_viewed'); // Clear invalid data
            }
        }
    }, [fetchDashboardData]); // Run when fetchDashboardData changes (which depends on user)

    return (
        <div className={styles.dashboardContainer}>
            <h1>Meu Painel</h1>
            {user && <p className={styles.welcomeMessage}>Bem-vindo, {user.email}!</p>}
            <hr />

            {/* Continue Learning Section */}
            {lastViewed && (
                <div className={styles.widget}>
                    <h2>Continuar Aprendendo</h2>
                    <Link to={`/student/courses/${lastViewed.courseId}`} className={styles.continueLink}>
                        <p>Voltar para: <strong>{lastViewed.courseTitle}</strong></p>
                        <small>Última aula vista: {lastViewed.lessonTitle}</small>
                    </Link>
                </div>
            )}

            {/* Course Progress Summary Section */}
            <div className={styles.widget}>
                <h2>Progresso nos Cursos</h2>
                {loading && <p>Carregando progresso...</p>}
                {error && <p className={styles.errorMessage}>Erro ao carregar progresso: {error}</p>}
                {!loading && !error && (
                    summaryCourses.length === 0 ? (
                        <p>Você não está inscrito em nenhum curso ainda.</p>
                    ) : (
                        <ul className={styles.summaryCourseList}>
                            {summaryCourses.map(course => (
                                <li key={course.id} className={styles.summaryCourseItem}>
                                    <Link to={`/student/courses/${course.id}`}>
                                        <strong>{course.title} {course.code ? `(${course.code})` : ''}</strong>
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
                 {summaryCourses.length > 0 && (
                     <Link to="/student/my-courses" className={styles.viewAllLink}>Ver todos os meus cursos</Link>
                 )}
            </div>

             {/* Placeholder for other potential widgets */}
             {/* <div className={styles.widget}>
                 <h2>Notificações</h2>
                 <p>Nenhuma notificação nova.</p>
             </div> */}

        </div>
    );
};

export default StudentDashboard;