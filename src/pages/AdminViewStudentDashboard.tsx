import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import styles from './StudentDashboard.module.css'; // Reutilizar estilos do dashboard normal

// Re-use types
interface BaseCourse {
    id: string;
    title: string;
    code: string | null;
}
interface CourseWithProgress extends BaseCourse {
    totalLessons: number;
    viewedLessons: number;
}
interface UserProfile { // Para o perfil do aluno visualizado
    id: string;
    email: string | null;
    full_name: string | null;
}

const AdminViewStudentDashboard: React.FC = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const { isAdmin } = useAuth(); // Get current admin user info (removed unused adminUser)
    const [studentProfile, setStudentProfile] = useState<UserProfile | null>(null);
    const [summaryCourses, setSummaryCourses] = useState<CourseWithProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStudentDashboardData = useCallback(async () => {
        if (!isAdmin) {
            setError("Acesso negado. Somente administradores podem visualizar esta página.");
            setLoading(false);
            return;
        }
        if (!studentId) {
            setError("ID do aluno não especificado na URL.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        setSummaryCourses([]);
        setStudentProfile(null);

        try {
            // 1. Fetch student profile
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('id, email, full_name')
                .eq('id', studentId)
                .maybeSingle(); // Use maybeSingle instead of single to return null if not found

            // Handle potential error from the query itself
            if (profileError) {
                // Don't throw if the error is just "No rows found" from maybeSingle, handle that below
                if (profileError.code !== 'PGRST116') { // PGRST116 = "Searched for a single row, but found no rows"
                    throw new Error(`Erro ao buscar perfil do aluno: ${profileError.message}`);
                }
                // If error is PGRST116, profileData will be null, handled next
            }
            // Handle the case where no profile was found (profileData is null)
            if (!profileData) {
                throw new Error(`Aluno com ID ${studentId} não encontrado na tabela de perfis.`);
            }
            setStudentProfile(profileData);

            // 2. Fetch enrollments for the student
            const { data: enrollmentData, error: enrollmentError } = await supabase
                .from('enrollments')
                .select(`courses (id, title, code)`)
                .eq('user_id', studentId)
                .limit(5); // Limit for dashboard summary

            if (enrollmentError) throw enrollmentError;

            const baseCourses: BaseCourse[] = (enrollmentData ?? [])
                .map(enrollment => Array.isArray(enrollment.courses) ? enrollment.courses[0] : enrollment.courses)
                .filter((course): course is BaseCourse => course !== null);

            // 3. Fetch progress for each course
            const coursesWithProgressPromises = baseCourses.map(async (course): Promise<CourseWithProgress> => {
                let totalLessonsCount = 0;
                let viewedLessonsCount = 0;
                try {
                    const { data: associationData, error: associationError } = await supabase
                        .from('course_disciplines')
                        .select('discipline_id')
                        .eq('course_id', course.id);
                    if (associationError) throw associationError;

                    const disciplineIds = associationData?.map(assoc => assoc.discipline_id) || [];
                    if (disciplineIds.length > 0) {
                        const { data: lessonAssocData, error: lessonAssocError } = await supabase
                            .from('discipline_lessons')
                            .select('lesson_id')
                            .in('discipline_id', disciplineIds);

                        if (lessonAssocError) throw lessonAssocError;

                        const lessonIds = [...new Set(lessonAssocData?.map(assoc => assoc.lesson_id) || [])];
                        totalLessonsCount = lessonIds.length;

                        if (totalLessonsCount > 0) {
                            const { count: viewedCount, error: viewedLessonsError } = await supabase
                                .from('lesson_views')
                                .select('lesson_id', { count: 'exact', head: true })
                                .eq('user_id', studentId) // Use studentId here
                                .in('lesson_id', lessonIds);

                            if (viewedLessonsError) throw viewedLessonsError;
                            viewedLessonsCount = viewedCount ?? 0;
                        }
                    }
                } catch (progressError: any) {
                    console.warn(`Failed to fetch progress for course ${course.id} for student ${studentId}:`, progressError);
                }
                return { ...course, totalLessons: totalLessonsCount, viewedLessons: viewedLessonsCount };
            });

            const resolvedCourses = await Promise.all(coursesWithProgressPromises);
            setSummaryCourses(resolvedCourses);

        } catch (err: any) {
            console.error("Error fetching student dashboard data for admin view:", err);
            setError(err.message || 'Falha ao carregar dados do painel do aluno.');
        } finally {
            setLoading(false);
        }
    }, [studentId, isAdmin]);

    useEffect(() => {
        fetchStudentDashboardData();
    }, [fetchStudentDashboardData]);

    // Redirect if not admin
    if (!loading && !isAdmin) {
        return <Navigate to="/admin" replace />;
    }

    return (
        <div className={styles.dashboardContainer}>
             <Link to="/admin/students" className={styles.backLink}>&larr; Voltar para Lista de Alunos</Link> {/* Added back link */}
            <h1>Painel do Aluno</h1>
            {loading && <p>Carregando dados do aluno...</p>}
            {error && <p className={styles.errorMessage}>Erro: {error}</p>}
            {studentProfile && !loading && (
                 <p className={styles.welcomeMessage}>
                    Visualizando como: {studentProfile.full_name || studentProfile.email || studentId}
                 </p>
            )}
            <hr />

            {/* Course Progress Summary Section */}
            {!loading && !error && studentProfile && (
                <div className={styles.widget}>
                    <h2>Progresso nos Cursos</h2>
                    {summaryCourses.length === 0 ? (
                        <p>Este aluno não está inscrito em nenhum curso.</p>
                    ) : (
                        <ul className={styles.summaryCourseList}>
                            {summaryCourses.map(course => (
                                <li key={course.id} className={styles.summaryCourseItem}>
                                    {/* Link para a visualização do curso pelo aluno (mantido) */}
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
                    )}
                    {/* Não mostrar link "Ver todos os cursos" aqui, pois o admin já tem acesso */}
                </div>
            )}
             {/* O widget "Continuar Aprendendo" é omitido pois depende do localStorage do aluno */}
        </div>
    );
};

export default AdminViewStudentDashboard;