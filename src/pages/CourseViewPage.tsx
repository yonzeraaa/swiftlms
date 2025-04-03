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
    video_urls: string[] | null; // Changed to array
}

const CourseViewPage: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const { user, isAdmin } = useAuth(); // Get current user and admin status
    const [courseData, setCourseData] = useState<CourseDetails | null>(null);
    const [disciplines, setDisciplines] = useState<Discipline[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null); // Track enrollment status
    const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null); // State for selected lesson
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
            // 1. Check enrollment ONLY if the current user is NOT an admin
            if (!isAdmin) {
                const { data: enrollmentData, error: enrollmentError } = await supabase
                    .from('enrollments')
                    .select('id')
                    .eq('user_id', user.id) // Check enrollment for the logged-in user
                    .eq('course_id', courseId)
                    .maybeSingle();

                if (enrollmentError) {
                    throw new Error(`Erro ao verificar inscrição: ${enrollmentError.message}`);
                }

                if (!enrollmentData) {
                    console.log("Student user not enrolled in this course.");
                    setIsEnrolled(false);
                    setError("Você não está inscrito neste curso.");
                    setLoading(false);
                    return; // Stop if student is not enrolled
                }
                console.log("Student user is enrolled.");
                setIsEnrolled(true);
            } else {
                // If user IS an admin, skip enrollment check and assume access
                console.log("Admin user accessing course view. Skipping enrollment check.");
                setIsEnrolled(true); // Allow admin to view content
            }

            // --- New Fetching Logic ---
            // 2. Fetch basic course details
            const { data: courseDetailsData, error: courseError } = await supabase
                .from('courses')
                .select('id, title, description, code')
                .eq('id', courseId)
                .single();

            if (courseError) throw new Error(`Erro ao buscar detalhes do curso: ${courseError.message}`);
            if (!courseDetailsData) throw new Error("Detalhes do curso não encontrados.");
            setCourseData(courseDetailsData);

            // 3. Fetch associated discipline IDs
            const { data: associationData, error: associationError } = await supabase
                .from('course_disciplines')
                .select('discipline_id')
                .eq('course_id', courseId);

            if (associationError) throw new Error(`Erro ao buscar disciplinas associadas: ${associationError.message}`);

            const associatedDisciplineIds = associationData?.map(item => item.discipline_id) || [];

            let fetchedDisciplinesWithLessons: Discipline[] = [];
            if (associatedDisciplineIds.length > 0) {
                // 4a. Fetch details for associated disciplines (without lessons initially)
                const { data: disciplinesData, error: disciplinesError } = await supabase
                    .from('disciplines')
                    .select('id, title, number, order') // Fetch basic details
                    .in('id', associatedDisciplineIds)
                    .order('order', { ascending: true, nullsFirst: false })
                    .order('number', { ascending: true });

                if (disciplinesError) throw new Error(`Erro ao buscar detalhes das disciplinas: ${disciplinesError.message}`);
                if (!disciplinesData) throw new Error("Disciplinas associadas não encontradas.");

                // 4b. Fetch all lesson associations for these disciplines
                const { data: lessonAssociations, error: assocError } = await supabase
                    .from('discipline_lessons')
                    .select('discipline_id, lesson_id')
                    .in('discipline_id', associatedDisciplineIds);

                if (assocError) throw new Error(`Erro ao buscar associações de aulas: ${assocError.message}`);

                const lessonIdMap = new Map<string, string[]>(); // Map disciplineId -> [lessonId]
                const allLessonIds = new Set<string>();
                (lessonAssociations || []).forEach(assoc => {
                    if (!lessonIdMap.has(assoc.discipline_id)) {
                        lessonIdMap.set(assoc.discipline_id, []);
                    }
                    lessonIdMap.get(assoc.discipline_id)!.push(assoc.lesson_id);
                    allLessonIds.add(assoc.lesson_id);
                });

                // 4c. Fetch details for all unique lessons needed
                let allLessonsData: Lesson[] = [];
                if (allLessonIds.size > 0) {
                    const { data: lessonsData, error: lessonsError } = await supabase
                        .from('lessons')
                        .select('id, title, number, order, content, video_urls') // Select the new array column
                        .in('id', Array.from(allLessonIds))
                        // Order lessons globally here; specific order per discipline can be handled client-side if needed
                        .order('order', { ascending: true, nullsFirst: false })
                        .order('number', { ascending: true });


                    if (lessonsError) throw new Error(`Erro ao buscar detalhes das aulas: ${lessonsError.message}`);
                    allLessonsData = lessonsData || [];
                }

                // 4d. Map lessons back to disciplines
                const lessonsById = new Map(allLessonsData.map(lesson => [lesson.id, lesson]));

                fetchedDisciplinesWithLessons = disciplinesData.map(discipline => {
                    const associatedLessonIdsForThisDisc = lessonIdMap.get(discipline.id) || [];
                    const lessonsForDiscipline = associatedLessonIdsForThisDisc
                        .map(lessonId => lessonsById.get(lessonId))
                        .filter((lesson): lesson is Lesson => lesson !== undefined)
                         // Re-sort lessons based on their own order properties
                        .sort((a, b) => {
                            const orderA = a.order ?? Infinity;
                            const orderB = b.order ?? Infinity;
                            if (orderA !== orderB) return orderA - orderB;
                            const numA = a.number ?? '';
                            const numB = b.number ?? '';
                            return numA.localeCompare(numB);
                        });

                    return {
                        ...discipline,
                        lessons: lessonsForDiscipline,
                    };
                });
            }
            setDisciplines(fetchedDisciplinesWithLessons); // Update state
            // --- End New Fetching Logic ---

            // 3. Fetch viewed lessons for this course *after* confirming enrollment and fetching course data
            // Fetch viewed lessons for the *currently logged-in user* (admin or student)
            // This allows admins to track their own viewing progress while testing
            if (user && courseId) {
                const lessonIdsInCourse = fetchedDisciplinesWithLessons
                    .flatMap(d => d.lessons?.map(l => l.id) || [])
                    .filter((id): id is string => !!id);

                if (lessonIdsInCourse.length > 0) {
                    const { data: viewedData, error: viewedError } = await supabase
                        .from('lesson_views')
                        .select('lesson_id')
                        .eq('user_id', user.id) // Always use the logged-in user's ID
                        .in('lesson_id', lessonIdsInCourse);

                    if (viewedError) {
                        console.warn("Error fetching viewed lessons for current user:", viewedError);
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
    }, [user, courseId, isAdmin]); // Add isAdmin to dependency array

    useEffect(() => {
        checkEnrollmentAndFetchData();
    }, [checkEnrollmentAndFetchData]);

    // Function to mark a lesson as viewed and save to localStorage
    const handleMarkLessonAsViewed = useCallback(async (lessonId: string) => {
        // Only allow marking as viewed if NOT an admin (or adjust based on desired behavior)
        // For now, let admins also mark viewed for testing purposes
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
    }, [user, viewedLessonIds, courseData, disciplines]); // Dependencies are correct

    // Toggle selected lesson
    const handleLessonClick = (lessonId: string) => {
        const isOpening = selectedLessonId !== lessonId;
        setSelectedLessonId(prevId => (prevId === lessonId ? null : lessonId));
        // Also mark as viewed when selected/opened
        if (isOpening) {
            handleMarkLessonAsViewed(lessonId);
        }
    };

    // Render states
    if (loading) return <div>Carregando curso...</div>; // Consider spinner
    // Show specific enrollment error first
    // Apply style to error messages
    // Error messages already have styles applied from previous attempt
    // Show enrollment error only if the user is NOT an admin
    if (!isAdmin && isEnrolled === false) return <div className={styles.errorMessage}>Acesso negado: Você não está inscrito neste curso. <Link to="/student">Voltar ao Painel</Link></div>;
    // Show general errors
    if (error) return <div className={styles.errorMessage}>Erro: {error} <Link to={isAdmin ? "/admin" : "/student"}>Voltar</Link></div>;
    if (!courseData) return <div className={styles.errorMessage}>Curso não encontrado. <Link to={isAdmin ? "/admin" : "/student"}>Voltar</Link></div>;


    return (
        <div className={styles.pageContainer}>
            <Link to={isAdmin ? "/admin/courses" : "/student/courses"} className={styles.backLink}>&larr; Voltar para Cursos</Link>
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
                                    <li key={lesson.id} className={`${styles.lessonItem} ${viewedLessonIds.has(lesson.id) ? styles.lessonViewed : ''} ${selectedLessonId === lesson.id ? styles.lessonSelected : ''}`}>
                                        {/* Make title clickable */}
                                        <h3 onClick={() => handleLessonClick(lesson.id)} className={styles.lessonTitleClickable}>
                                            {lesson.title} {/* Removed number display */}
                                            {/* Indicator for open/closed state */}
                                            <span className={styles.lessonToggleIndicator}>
                                                {selectedLessonId === lesson.id ? ' ▲' : ' ▼'}
                                            </span>
                                        </h3>

                                        {/* Conditionally render content and viewer */}
                                        {selectedLessonId === lesson.id && (
                                            <div className={styles.lessonViewerContainer}>
                                                {/* Basic content display */}
                                                {lesson.content && <p className={styles.lessonContent}>{lesson.content}</p>}

                                                {/* Embed Media Player (Video or PDF) */}
                                                {/* Iterate over video_urls array */}
                                                {lesson.video_urls && lesson.video_urls.length > 0 && (
                                                    lesson.video_urls.map((url, index) => {
                                                        const originalUrl = url; // Use the current URL from the array
                                                        const lowerCaseUrl = originalUrl.toLowerCase();

                                                        // Unique key for each item in the map
                                                        const itemKey = `${lesson.id}-url-${index}`;

                                                        // Check for Google Drive link first
                                                        if (lowerCaseUrl.includes('drive.google.com/file/d/')) {
                                                            try {
                                                                const urlObject = new URL(originalUrl);
                                                                const pathSegments = urlObject.pathname.split('/');
                                                                const fileIdIndex = pathSegments.findIndex(segment => segment === 'd');
                                                                if (fileIdIndex !== -1 && pathSegments.length > fileIdIndex + 1) {
                                                                    const fileId = pathSegments[fileIdIndex + 1];
                                                                    const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
                                                                    return (
                                                                        <div key={itemKey} className={styles.pdfWrapper}>
                                                                            <iframe
                                                                                src={embedUrl}
                                                                                className={styles.pdfViewer}
                                                                                title={`Google Drive Viewer ${index + 1}: ${lesson.title}`}
                                                                                allow="autoplay"
                                                                            >
                                                                                Seu navegador não suporta iframes ou o conteúdo não pode ser embutido. <a href={originalUrl} target="_blank" rel="noopener noreferrer">Abrir no Google Drive</a>.
                                                                            </iframe>
                                                                        </div>
                                                                    );
                                                                }
                                                            } catch (e) { console.error("Error parsing Google Drive URL:", e); }
                                                        }

                                                        // Check for YouTube URLs OR direct .mp4 URLs
                                                        if (lowerCaseUrl.includes('youtube.com') || lowerCaseUrl.includes('youtu.be') || lowerCaseUrl.endsWith('.mp4')) {
                                                            return (
                                                                <div key={itemKey} className={styles.playerWrapper}>
                                                                    <ReactPlayer
                                                                        className={styles.reactPlayer}
                                                                        url={originalUrl} // ReactPlayer handles YouTube & MP4
                                                                        width='100%'
                                                                        height='100%'
                                                                        controls={true}
                                                                        // Consider setting playing={false} by default for multiple videos
                                                                        playing={false}
                                                                    />
                                                                </div>
                                                            );
                                                        } else if (lowerCaseUrl.endsWith('.pdf')) { // Check for PDF next
                                                            return (
                                                                <div key={itemKey} className={styles.pdfWrapper}>
                                                                    <iframe
                                                                        src={originalUrl} // Use original URL case
                                                                        className={styles.pdfViewer}
                                                                        title={`PDF Viewer ${index + 1}: ${lesson.title}`}
                                                                    >
                                                                        Seu navegador não suporta iframes para visualização de PDF. Você pode <a href={originalUrl} target="_blank" rel="noopener noreferrer">baixar o PDF aqui</a>.
                                                                    </iframe>
                                                                </div>
                                                            );
                                                        } else {
                                                            // Fallback: Display message and download link for each unsupported URL
                                                            return (
                                                                <p key={itemKey} className={styles.unsupportedContent}>
                                                                    Conteúdo #{index + 1}: Este tipo não pode ser visualizado diretamente. <a href={originalUrl} download>Baixar conteúdo</a>.
                                                                </p>
                                                            );
                                                        }
                                                    }) // End map over urls
                                                )}
                                            </div> // End lessonViewerContainer
                                        )}
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