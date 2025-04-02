// src/components/LessonList.tsx
import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { supabase } from '../services/supabaseClient';
import styles from './LessonList.module.css'; // Import styles

interface Lesson {
  id: string;
  title: string;
  number: string | null; // Lesson number (e.g., "01")
  order: number | null; // Optional explicit order
  video_url: string | null;
  created_at: string;
}

interface LessonListProps {
  disciplineId: string; // ID of the discipline whose lessons to list
}

export interface LessonListHandle {
  refreshLessons: () => void;
}

// Define the inner component logic
const LessonListComponent: React.ForwardRefRenderFunction<LessonListHandle, LessonListProps> = ({ disciplineId }, ref) => {
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLessons = useCallback(async () => {
        if (!disciplineId) return;

        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('lessons')
                .select('id, title, number, order, video_url, created_at')
                .eq('discipline_id', disciplineId)
                .order('order', { ascending: true, nullsFirst: false })
                .order('number', { ascending: true });

            if (fetchError) throw fetchError;

            setLessons(data || []);
        } catch (err: any) {
            console.error("Error fetching lessons:", err);
            setError(err.message || 'Falha ao buscar aulas.');
        } finally {
            setLoading(false);
        }
    }, [disciplineId]);

    useEffect(() => {
        fetchLessons();
    }, [fetchLessons]);

    useImperativeHandle(ref, () => ({
        refreshLessons() {
            fetchLessons();
        }
    }));

    if (loading) return <div className={styles.loadingMessage}>Carregando aulas...</div>;
    if (error) return <div className={styles.errorMessage}>Erro: {error}</div>;

    return (
        <div className={styles.listContainer}>
            <h4>Aulas da Disciplina</h4>
            {lessons.length === 0 ? (
                <p className={styles.noItemsMessage}>Nenhuma aula encontrada para esta disciplina.</p>
            ) : (
                <ul>
                    {lessons.map(lesson => (
                        <li key={lesson.id} className={styles.listItem}>
                            <strong>{lesson.number ? `Aula ${lesson.number}: ` : ''}{lesson.title}</strong>
                            {lesson.video_url && <small> (<a href={lesson.video_url} target="_blank" rel="noopener noreferrer">Vídeo</a>)</small>}
                            <small> (Ordem: {lesson.order ?? 'N/A'})</small>
                            <div className={styles.actionsContainer}>
                                {/* Add Edit/Delete buttons later */}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

// Wrap the inner component with forwardRef
const LessonList = forwardRef(LessonListComponent);

export default LessonList;