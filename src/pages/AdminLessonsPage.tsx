// src/pages/AdminLessonsPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import LessonList, { LessonListHandle } from '../components/LessonList';
import AddLessonForm from '../components/AddLessonForm'; // Import the form
import styles from './AdminLessonsPage.module.css'; // Import the CSS module

interface Discipline {
    id: string;
    title: string;
    number: string | null;
    course_id: string; // Keep course_id for breadcrumbs/back links
    // Optionally fetch course title too if needed for display
}

const AdminLessonsPage: React.FC = () => {
    // Get both courseId and disciplineId from URL
    const { courseId, disciplineId } = useParams<{ courseId: string; disciplineId: string }>();
    const [discipline, setDiscipline] = useState<Discipline | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const lessonListRef = useRef<LessonListHandle>(null); // For refreshing later

    useEffect(() => {
        const fetchDiscipline = async () => {
            if (!disciplineId || !courseId) { // Check both IDs
                setError("ID do curso ou disciplina não encontrado na URL.");
                setLoading(false);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const { data, error: fetchError } = await supabase
                    .from('disciplines')
                    .select('id, title, number, course_id') // Select needed fields
                    .eq('id', disciplineId)
                    .eq('course_id', courseId) // Ensure it belongs to the correct course
                    .single();

                if (fetchError) throw fetchError;
                if (!data) throw new Error("Disciplina não encontrada.");

                setDiscipline(data);
            } catch (err: any) {
                console.error("Error fetching discipline details:", err);
                setError(err.message || 'Falha ao buscar detalhes da disciplina.');
            } finally {
                setLoading(false);
            }
        };

        fetchDiscipline();
    }, [courseId, disciplineId]); // Depend on both IDs

    const handleLessonAdded = () => {
        lessonListRef.current?.refreshLessons();
    };

    if (loading) return <div>Carregando detalhes da disciplina...</div>;
    if (error) return <div style={{ color: 'red' }}>Erro: {error}</div>;
    if (!discipline) return <div>Disciplina não encontrada.</div>;

    // Construct the back link URL dynamically
    const backToDisciplinesUrl = `/admin/courses/${discipline.course_id}/disciplines`;

    return (
        <div className={styles.pageContainer}> {/* Apply container style */}
            <Link to={backToDisciplinesUrl} className={styles.backLink}>&larr; Voltar para Disciplinas</Link> {/* Apply link style */}
            <h1>Gerenciar Aulas - Disciplina: {discipline.number ? `${discipline.number}. ` : ''}{discipline.title}</h1>
            <p>Adicione, edite e organize as aulas para esta disciplina.</p>
            <hr />
            <AddLessonForm disciplineId={discipline.id} onLessonAdded={handleLessonAdded} /> {/* Render the form */}
            <hr />
            <LessonList disciplineId={discipline.id} ref={lessonListRef} /> {/* Render LessonList */}
        </div>
    );
};

export default AdminLessonsPage;