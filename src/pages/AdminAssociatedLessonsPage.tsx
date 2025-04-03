import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import styles from './AdminAssociatedLessonsPage.module.css'; // Será criado

// Interfaces
interface Discipline {
    id: string;
    title: string;
    number: string | null;
}

interface AvailableLesson {
    id: string;
    title: string;
    number: string | null;
}

const AdminAssociatedLessonsPage: React.FC = () => {
    const { disciplineId } = useParams<{ disciplineId: string }>();
    const [discipline, setDiscipline] = useState<Discipline | null>(null);
    const [allLessons, setAllLessons] = useState<AvailableLesson[]>([]);
    const [initialAssociatedIds, setInitialAssociatedIds] = useState<Set<string>>(new Set());
    const [selectedLessonIds, setSelectedLessonIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Fetch discipline details, all lessons, and current associations
    const fetchData = useCallback(async () => {
        if (!disciplineId) {
            setError("ID da disciplina não encontrado na URL.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        setSuccessMessage(null);
        setInitialAssociatedIds(new Set());
        setSelectedLessonIds(new Set());

        try {
            // Fetch discipline details
            const { data: disciplineData, error: disciplineError } = await supabase
                .from('disciplines')
                .select('id, title, number')
                .eq('id', disciplineId)
                .single();
            if (disciplineError) throw new Error(`Erro ao buscar disciplina: ${disciplineError.message}`);
            if (!disciplineData) throw new Error("Disciplina não encontrada.");
            setDiscipline(disciplineData);

            // Fetch all available lessons from the bank
            const { data: allLessonsData, error: allLessonsError } = await supabase
                .from('lessons')
                .select('id, title, number')
                .order('number', { ascending: true })
                .order('title', { ascending: true });
            if (allLessonsError) throw new Error(`Erro ao buscar aulas do banco: ${allLessonsError.message}`);
            setAllLessons(allLessonsData || []);

            // Fetch currently associated lesson IDs for this discipline
            const { data: associatedData, error: associatedError } = await supabase
                .from('discipline_lessons')
                .select('lesson_id')
                .eq('discipline_id', disciplineId);
            if (associatedError) throw new Error(`Erro ao buscar associações de aulas: ${associatedError.message}`);

            const associatedIds = new Set(associatedData?.map(item => item.lesson_id) || []);
            setInitialAssociatedIds(associatedIds);
            setSelectedLessonIds(associatedIds); // Initialize selection

        } catch (err: any) {
            console.error("Error fetching data:", err);
            setError(err.message || 'Falha ao carregar dados.');
            setDiscipline(null);
            setAllLessons([]);
        } finally {
            setLoading(false);
        }
    }, [disciplineId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle checkbox changes
    const handleSelectionChange = (lessonId: string, isSelected: boolean) => {
        setSelectedLessonIds(prevIds => {
            const newIds = new Set(prevIds);
            if (isSelected) {
                newIds.add(lessonId);
            } else {
                newIds.delete(lessonId);
            }
            return newIds;
        });
        // Clear messages on interaction
        setError(null);
        setSuccessMessage(null);
    };

    // Handle saving changes
    const handleSaveChanges = async () => {
        if (!discipline) return;

        setSaving(true);
        setError(null);
        setSuccessMessage(null);

        const lessonsToAdd = Array.from(selectedLessonIds).filter(id => !initialAssociatedIds.has(id));
        const lessonsToRemove = Array.from(initialAssociatedIds).filter(id => !selectedLessonIds.has(id));
        let currentError: string | null = null;

        try {
            // Remove associations
            if (lessonsToRemove.length > 0) {
                console.log("Removing lesson associations:", lessonsToRemove);
                const { error: deleteError } = await supabase
                    .from('discipline_lessons')
                    .delete()
                    .eq('discipline_id', discipline.id)
                    .in('lesson_id', lessonsToRemove);
                if (deleteError) {
                    console.error("Error removing lesson associations:", deleteError);
                    currentError = `Erro ao remover aulas: ${deleteError.message}`;
                }
            }

            // Add associations (only proceed if removal didn't fail critically)
            if (lessonsToAdd.length > 0 && !currentError) {
                console.log("Adding lesson associations:", lessonsToAdd);
                const newAssociations = lessonsToAdd.map(lessonId => ({
                    discipline_id: discipline.id,
                    lesson_id: lessonId,
                }));
                const { error: insertError } = await supabase
                    .from('discipline_lessons')
                    .insert(newAssociations);
                if (insertError) {
                    console.error("Error adding lesson associations:", insertError);
                    currentError = currentError
                        ? `${currentError}; Erro ao adicionar aulas: ${insertError.message}`
                        : `Erro ao adicionar aulas: ${insertError.message}`;
                }
            }

            if (currentError) {
                setError(currentError);
            } else {
                setSuccessMessage('Associações de aulas atualizadas com sucesso!');
                // Update initial state to reflect saved changes
                setInitialAssociatedIds(new Set(selectedLessonIds));
            }

        } catch (err: any) {
            console.error("Unexpected error saving changes:", err);
            setError(err.message || 'Ocorreu um erro inesperado ao salvar as alterações.');
        } finally {
            setSaving(false);
        }
    };

    // Determine if changes have been made
    const hasChanges = (() => {
        if (initialAssociatedIds.size !== selectedLessonIds.size) return true;
        for (const id of initialAssociatedIds) {
            if (!selectedLessonIds.has(id)) return true;
        }
        return false;
    })();


    if (loading) return <div>Carregando...</div>; // TODO: Add styled loader
    if (error && !discipline) return <div className={styles.errorMessage}>Erro: {error}</div>; // Show initial load error

    return (
        <div className={styles.pageContainer}>
            {/* Update back link to point to the discipline bank */}
            <Link to="/admin/disciplines-bank" className={styles.backLink}>&larr; Voltar para Banco de Disciplinas</Link>
            {discipline ? (
                <h1>Gerenciar Aulas Associadas - {discipline.number ? `${discipline.number}. ` : ''}{discipline.title}</h1>
            ) : (
                <h1>Gerenciar Aulas Associadas</h1>
            )}
            <p>Selecione as aulas do banco que devem fazer parte desta disciplina.</p>

            {error && <p className={styles.errorMessage}>{error}</p>}
            {successMessage && <p className={styles.successMessage}>{successMessage}</p>}

            <div className={styles.lessonListContainer}> {/* Use a specific class */}
                {allLessons.length === 0 ? (
                    <p>Nenhuma aula encontrada no banco.</p>
                ) : (
                    allLessons.map(lesson => (
                        <div key={lesson.id} className={styles.lessonItem}> {/* Use a specific class */}
                            <input
                                type="checkbox"
                                id={`assoc-lesson-${lesson.id}`}
                                checked={selectedLessonIds.has(lesson.id)}
                                onChange={(e) => handleSelectionChange(lesson.id, e.target.checked)}
                                disabled={saving || loading}
                            />
                            <label htmlFor={`assoc-lesson-${lesson.id}`}>
                                {lesson.title} {/* Removed number display */}
                            </label>
                        </div>
                    ))
                )}
            </div>

            <div className={styles.buttonContainer}>
                <button
                    onClick={handleSaveChanges}
                    disabled={saving || loading || !hasChanges}
                    className={styles.saveButton}
                >
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>
        </div>
    );
};

export default AdminAssociatedLessonsPage;