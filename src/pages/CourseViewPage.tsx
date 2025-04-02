// src/pages/CourseViewPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactPlayer from 'react-player/lazy'; // Import ReactPlayer (lazy load for better performance)
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import styles from './CourseViewPage.module.css'; // Import styles

// Re-use or define types
interface CourseDetails {
    id: string;
    title: string;
    description: string | null;
    code: string | null;
}
interface Discipline {
    id: string;
    title: string;
    number: string | null;
    order: number | null;
    lessons: Lesson[]; // Nest lessons within disciplines
}
interface Lesson {
    id: string;
    title: string;
    number: string | null;
    order: number | null;
    content: string | null;
    video_url: string | null;
}

const CourseViewPage: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const { user } = useAuth(); // Get current user
    const [courseData, setCourseData] = useState<CourseDetails | null>(null);
    const [disciplines, setDisciplines] = useState<Discipline[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null); // Track enrollment status
    const [viewedLessonIds, setViewedLessonIds] = useState<Set<string>>(new Set()); // Track viewed lessons

    const checkEnrollmentAndFetchData = useCallback(async () => {
        if (!user || !courseId) {
            setError("Usuário não autenticado ou ID do curso inválido.");
            setLoading(false);
            setIsEnrolled(false);
            return;
        }

        setLoading(true);
        setError(null);
        setIsEnrolled(null); // Reset enrollment status

        try {
            // 1. Check enrollment first (RLS allows reading own enrollment)
            const { data: enrollmentData, error: enrollmentError } = await supabase
                .from('enrollments')
                .select('id')
                .eq('user_id', user.id)
                .eq('course_id', courseId)
                .maybeSingle(); // Use maybeSingle to return null if not found

            if (enrollmentError) {
                throw new Error(`Erro ao verificar inscrição: ${enrollmentError.message}`);
            }

            if (!enrollmentData) {
                console.log("User not enrolled in this course.");
                setIsEnrolled(false);
                setError("Você não está inscrito neste curso.");
                setLoading(false);
                return; // Stop if not enrolled
            }

            console.log("User is enrolled. Fetching course data...");
            setIsEnrolled(true);

            // 2. Fetch course, disciplines, and lessons (RLS should allow if enrolled - needs refinement)
            // IMPORTANT: This query relies on RLS allowing enrolled users to read course/discipline/lesson data.
            // We will need to add/refine RLS policies later (Phase 2, Step 5).
            const { data, error: fetchError } = await supabase
                .from('courses')
                .select(`
                    id,
                    title,
                    description,
                    code,
                    disciplines (
                        id,
                        title,
                        number,
                        order,
                        lessons (
                            id,
                            title,
                            number,
                            order,
                            content,
                            video_url
                        )
                    )
                `)
                .eq('id', courseId)
                .order('order', { referencedTable: 'disciplines', ascending: true, nullsFirst: false })
                .order('number', { referencedTable: 'disciplines', ascending: true })
                .order('order', { referencedTable: 'disciplines.lessons', ascending: true, nullsFirst: false })
                .order('number', { referencedTable: 'disciplines.lessons', ascending: true })
                .single();

            if (fetchError) throw fetchError;
            if (!data) throw new Error("Curso não encontrado após verificação de inscrição.");

            // Separate course data from disciplines
            const { disciplines: fetchedDisciplines, ...courseDetails } = data;
            setCourseData(courseDetails as CourseDetails);
            setDisciplines(fetchedDisciplines as Discipline[] || []);

            // 3. Fetch viewed lessons for this course *after* confirming enrollment and fetching course data
            if (user && courseId) {
                const lessonIdsInCourse = (fetchedDisciplines as Discipline[] || [])
                    .flatMap(d => d.lessons?.map(l => l.id) || [])
                    .filter(id => id); // Get all valid lesson IDs

                if (lessonIdsInCourse.length > 0) {
                    const { data: viewedData, error: viewedError } = await supabase
                        .from('lesson_views')
                        .select('lesson_id')
                        .eq('user_id', user.id)
                        .in('lesson_id', lessonIdsInCourse);

                    if (viewedError) {
                        console.warn("Error fetching viewed lessons:", viewedError);
                    } else if (viewedData) {
                        setViewedLessonIds(new Set(viewedData.map(v => v.lesson_id)));
                    }
                }
            }

        } catch (err: any) {
            console.error("Error fetching course view data:", err);
            setError(err.message || 'Falha ao carregar dados do curso.');
            setCourseData(null);
            setDisciplines([]);
            // Keep isEnrolled state as determined earlier if possible
        } finally {
            setLoading(false);
        }
    }, [user, courseId]);

    useEffect(() => {
        checkEnrollmentAndFetchData();
    }, [checkEnrollmentAndFetchData]);

    // Function to mark a lesson as viewed and save to localStorage
    const handleMarkLessonAsViewed = useCallback(async (lessonId: string) => {
        if (!user || !courseData || !disciplines) {
             console.warn("Cannot mark lesson viewed: missing user, courseData, or disciplines");
             return;
        }

        const alreadyViewedInState = viewedLessonIds.has(lessonId);

        // Find lesson title (needed for localStorage)
        let lessonTitle = 'Aula desconhecida';
        for (const discipline of disciplines) {
            const foundLesson = discipline.lessons.find(l => l.id === lessonId);
            if (foundLesson) {
                lessonTitle = foundLesson.title;
                break;
            }
        }

        // Function to save to localStorage
        const saveLastViewed = () => {
             try {
                const lastViewedData = {
                    courseId: courseData.id,
                    courseTitle: courseData.title,
                    lessonId: lessonId,
                    lessonTitle: lessonTitle,
                    timestamp: Date.now()
                };
                localStorage.setItem('swiftlms_last_viewed', JSON.stringify(lastViewedData));
                console.log("Saved last viewed lesson to localStorage:", lastViewedData);
            } catch (e) {
                console.error("Failed to save last viewed lesson to localStorage:", e);
            }
        };

        // If already marked in state, just save to localStorage
        if (alreadyViewedInState) {
            saveLastViewed();
            return;
        }


        console.log(`Attempting to mark lesson ${lessonId} as viewed for user ${user.id}`);
        try {
            const { error: insertError } = await supabase
                .from('lesson_views')
                .insert({ user_id: user.id, lesson_id: lessonId });

            if (insertError) {
                 if (insertError.code === '23505') { // Handle duplicate constraint error
                    console.log(`Lesson ${lessonId} already marked as viewed (DB constraint). Updating state and localStorage.`);
                    setViewedLessonIds(prev => new Set(prev).add(lessonId)); // Ensure state is consistent
                    saveLastViewed(); // Save even if DB had it already
                 } else {
                    throw insertError; // Re-throw other DB errors
                 }
            } else {
                // Update state and save on successful insert
                setViewedLessonIds(prev => new Set(prev).add(lessonId));
                console.log(`Lesson ${lessonId} successfully marked as viewed in DB.`);
                saveLastViewed();
            }
        } catch (err: any) {
            console.error(`Error marking lesson ${lessonId} as viewed:`, err);
        }
    }, [user, viewedLessonIds, courseData, disciplines]); // Added courseData and disciplines as dependencies

    // Render states
    if (loading) return <div>Carregando curso...</div>; // Consider spinner
    // Show specific enrollment error first
    // Apply style to error messages
    // Error messages already have styles applied from previous attempt
    if (isEnrolled === false) return <div className={styles.errorMessage}>Acesso negado: Você não está inscrito neste curso. <Link to="/student">Voltar ao Painel</Link></div>;
    if (error) return <div className={styles.errorMessage}>Erro: {error} <Link to="/student">Voltar ao Painel</Link></div>;
    if (!courseData) return <div className={styles.errorMessage}>Curso não encontrado. <Link to="/student">Voltar ao Painel</Link></div>;


    return (
        <div className={styles.pageContainer}>
            <Link to="/student" className={styles.backLink}>&larr; Voltar ao Meu Painel</Link>
            <h1>{courseData.title} {courseData.code ? `(${courseData.code})` : ''}</h1>
            {courseData.description && <p className={styles.courseDescription}>{courseData.description}</p>}
            <hr />

            {disciplines.length === 0 ? (
                <p>Este curso ainda não possui disciplinas.</p>
            ) : (
                disciplines.map(discipline => (
                    <div key={discipline.id} className={styles.disciplineSection}>
                        <h2>{discipline.number ? `${discipline.number}. ` : ''}{discipline.title}</h2>
                        {discipline.lessons.length === 0 ? (
                            <p className={styles.noLessons}>Nenhuma aula encontrada para esta disciplina.</p>
                        ) : (
                            <ul className={styles.lessonList}>
                                {discipline.lessons.map(lesson => (
                                    <li key={lesson.id} className={`${styles.lessonItem} ${viewedLessonIds.has(lesson.id) ? styles.lessonViewed : ''}`}>
                                        <h3>{lesson.number ? `Aula ${lesson.number}: ` : ''}{lesson.title}</h3>
                                        {/* Basic content display */}
                                        {lesson.content && <p className={styles.lessonContent}>{lesson.content}</p>}
                                        {/* Embed Media Player (Video or PDF) */}
                                       {lesson.video_url && (() => {
                                           const url = lesson.video_url.toLowerCase();
                                           if (url.endsWith('.mp4')) {
                                               return (
                                                   <div className={styles.playerWrapper}>
                                                       <ReactPlayer
                                                           className={styles.reactPlayer}
                                                           url={lesson.video_url} // Use original URL case
                                                           width='100%'
                                                           height='100%'
                                                           controls={true}
                                                           onPlay={() => handleMarkLessonAsViewed(lesson.id)}
                                                       />
                                                   </div>
                                               );
                                           } else if (url.endsWith('.pdf')) {
                                               return (
                                                   <div className={styles.pdfWrapper}>
                                                       <iframe
                                                           src={lesson.video_url} // Use original URL case
                                                           className={styles.pdfViewer}
                                                           title={`PDF Viewer: ${lesson.title}`}
                                                           onLoad={() => handleMarkLessonAsViewed(lesson.id)} // Mark as viewed when PDF loads
                                                       >
                                                           Seu navegador não suporta iframes para visualização de PDF. Você pode <a href={lesson.video_url} target="_blank" rel="noopener noreferrer">baixar o PDF aqui</a>.
                                                       </iframe>
                                                   </div>
                                               );
                                           } else {
                                               // Optional: Handle other types or show a link
                                               return (
                                                   <p>
                                                       <a href={lesson.video_url} target="_blank" rel="noopener noreferrer">
                                                           Abrir conteúdo da aula (tipo desconhecido)
                                                       </a>
                                                   </p>
                                               );
                                           }
                                       })()}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ))
            )}
        </div>
    );
};

export default CourseViewPage;