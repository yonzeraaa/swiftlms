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
    // course_id: string; // No longer needed here
    // Optionally fetch course title too if needed for display
}

const AdminLessonsPage: React.FC = () => {
    // Get both courseId and disciplineId from URL
    // Get only disciplineId from URL (route will need updating later)
    const { disciplineId } = useParams<{ disciplineId: string }>();
    const [discipline, setDiscipline] = useState<Discipline | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const lessonListRef = useRef<LessonListHandle>(null); // For refreshing later

    useEffect(() => {
        const fetchDiscipline = async () => {
            if (!disciplineId) { // Check only disciplineId
                setError("ID do curso ou disciplina não encontrado na URL.");
                setLoading(false);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const { data, error: fetchError } = await supabase
                    .from('disciplines')
                    .select('id, title, number') // Select needed fields (no course_id)
                    .eq('id', disciplineId)
                    // Remove .eq('course_id', courseId)
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
    }, [disciplineId]); // Depend only on disciplineId

    const handleLessonAdded = () => {
        lessonListRef.current?.refreshLessons();
    };

    if (loading) return <div>Carregando detalhes da disciplina...</div>;
    if (error) return <div style={{ color: 'red' }}>Erro: {error}</div>;
    if (!discipline) return <div>Disciplina não encontrada.</div>;

    // Construct the back link URL dynamically
    // Update back link to point to the central discipline bank
    const backToDisciplinesUrl = `/admin/disciplines-bank`;

    return (
        <div className={styles.pageContainer}> {/* Apply container style */}
            <Link to={backToDisciplinesUrl} className={styles.backLink}>&larr; Voltar para Banco de Disciplinas</Link> {/* Apply link style */}
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