// src/components/DisciplineList.tsx
import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import styles from './DisciplineList.module.css'; // Import styles
// import styles from './DisciplineList.module.css'; // Optional styles

interface Discipline {
  id: string;
  title: string;
  number: string | null; // Discipline number (e.g., "01")
  order: number | null; // Optional explicit order
  created_at: string;
}

interface DisciplineListProps {
  courseId: string; // ID of the course whose disciplines to list
}

export interface DisciplineListHandle {
  refreshDisciplines: () => void;
}

// Define the inner component logic
const DisciplineListComponent: React.ForwardRefRenderFunction<DisciplineListHandle, DisciplineListProps> = ({ courseId }, ref) => {
    const [disciplines, setDisciplines] = useState<Discipline[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDisciplines = useCallback(async () => {
        if (!courseId) return;

        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('disciplines')
                .select('id, title, number, order, created_at')
                .eq('course_id', courseId)
                .order('order', { ascending: true, nullsFirst: false })
                .order('number', { ascending: true });

            if (fetchError) throw fetchError;

            setDisciplines(data || []);
        } catch (err: any) {
            console.error("Error fetching disciplines:", err);
            setError(err.message || 'Falha ao buscar disciplinas.');
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        fetchDisciplines();
    }, [fetchDisciplines]);

    useImperativeHandle(ref, () => ({
        refreshDisciplines() {
            fetchDisciplines();
        }
    }));

    if (loading) return <div className={styles.loadingMessage}>Carregando disciplinas...</div>;
    if (error) return <div className={styles.errorMessage}>Erro: {error}</div>;

    return (
        <div className={styles.listContainer}>
            <h3>Disciplinas do Curso</h3>
            {disciplines.length === 0 ? (
                <p className={styles.noItemsMessage}>Nenhuma disciplina encontrada para este curso.</p>
            ) : (
                <ul>
                    {disciplines.map(discipline => (
                        <li key={discipline.id} className={styles.listItem}>
                            <strong>{discipline.number ? `${discipline.number}. ` : ''}{discipline.title}</strong>
                            <small> (Ordem: {discipline.order ?? 'N/A'})</small>
                            <div className={styles.actionsContainer}>
                                <Link to={`lessons`}>
                                    <button>Gerenciar Aulas</button>
                                </Link>
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
const DisciplineList = forwardRef(DisciplineListComponent);

export default DisciplineList;