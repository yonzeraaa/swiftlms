import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import styles from './AdminAssociatedDisciplinesPage.module.css'; // We'll create this file next

// Interfaces (can be shared or defined locally)
interface Course {
    id: string;
    title: string;
    code: string | null;
}

interface AvailableDiscipline {
    id: string;
    title: string;
    number: string | null;
}

const AdminAssociatedDisciplinesPage: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const [course, setCourse] = useState<Course | null>(null);
    const [allDisciplines, setAllDisciplines] = useState<AvailableDiscipline[]>([]);
    const [initialAssociatedIds, setInitialAssociatedIds] = useState<Set<string>>(new Set());
    const [selectedDisciplineIds, setSelectedDisciplineIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Fetch course details, all disciplines, and current associations
    const fetchData = useCallback(async () => {
        if (!courseId) {
            setError("ID do curso não encontrado na URL.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        setSuccessMessage(null);
        setInitialAssociatedIds(new Set());
        setSelectedDisciplineIds(new Set());

        try {
            // Fetch course details
            const { data: courseData, error: courseError } = await supabase
                .from('courses')
                .select('id, title, code')
                .eq('id', courseId)
                .single();
            if (courseError) throw new Error(`Erro ao buscar curso: ${courseError.message}`);
            if (!courseData) throw new Error("Curso não encontrado.");
            setCourse(courseData);

            // Fetch all available disciplines
            const { data: allDisciplinesData, error: allDisciplinesError } = await supabase
                .from('disciplines')
                .select('id, title, number')
                .order('number', { ascending: true })
                .order('title', { ascending: true });
            if (allDisciplinesError) throw new Error(`Erro ao buscar disciplinas: ${allDisciplinesError.message}`);
            setAllDisciplines(allDisciplinesData || []);

            // Fetch currently associated discipline IDs
            const { data: associatedData, error: associatedError } = await supabase
                .from('course_disciplines')
                .select('discipline_id')
                .eq('course_id', courseId);
            if (associatedError) throw new Error(`Erro ao buscar associações: ${associatedError.message}`);

            const associatedIds = new Set(associatedData?.map(item => item.discipline_id) || []);
            setInitialAssociatedIds(associatedIds);
            setSelectedDisciplineIds(associatedIds); // Initialize selection

        } catch (err: any) {
            console.error("Error fetching data:", err);
            setError(err.message || 'Falha ao carregar dados.');
            setCourse(null);
            setAllDisciplines([]);
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle checkbox changes
    const handleSelectionChange = (disciplineId: string, isSelected: boolean) => {
        setSelectedDisciplineIds(prevIds => {
            const newIds = new Set(prevIds);
            if (isSelected) {
                newIds.add(disciplineId);
            } else {
                newIds.delete(disciplineId);
            }
            return newIds;
        });
        // Clear messages on interaction
        setError(null);
        setSuccessMessage(null);
    };

    // Handle saving changes
    const handleSaveChanges = async () => {
        if (!course) return;

        setSaving(true);
        setError(null);
        setSuccessMessage(null);

        const disciplinesToAdd = Array.from(selectedDisciplineIds).filter(id => !initialAssociatedIds.has(id));
        const disciplinesToRemove = Array.from(initialAssociatedIds).filter(id => !selectedDisciplineIds.has(id));
        let currentError: string | null = null;

        try {
            // Remove associations
            if (disciplinesToRemove.length > 0) {
                console.log("Removing associations:", disciplinesToRemove);
                const { error: deleteError } = await supabase
                    .from('course_disciplines')
                    .delete()
                    .eq('course_id', course.id)
                    .in('discipline_id', disciplinesToRemove);
                if (deleteError) {
                    console.error("Error removing associations:", deleteError);
                    currentError = `Erro ao remover disciplinas: ${deleteError.message}`;
                }
            }

            // Add associations (only proceed if removal didn't fail critically)
            if (disciplinesToAdd.length > 0 && !currentError) {
                console.log("Adding associations:", disciplinesToAdd);
                const newAssociations = disciplinesToAdd.map(disciplineId => ({
                    course_id: course.id,
                    discipline_id: disciplineId,
                }));
                const { error: insertError } = await supabase
                    .from('course_disciplines')
                    .insert(newAssociations);
                if (insertError) {
                    console.error("Error adding associations:", insertError);
                    // Append error message if removal also failed
                    currentError = currentError
                        ? `${currentError}; Erro ao adicionar disciplinas: ${insertError.message}`
                        : `Erro ao adicionar disciplinas: ${insertError.message}`;
                }
            }

            if (currentError) {
                setError(currentError);
            } else {
                setSuccessMessage('Associações de disciplinas atualizadas com sucesso!');
                // Update initial state to reflect saved changes
                setInitialAssociatedIds(new Set(selectedDisciplineIds));
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
        if (initialAssociatedIds.size !== selectedDisciplineIds.size) return true;
        for (const id of initialAssociatedIds) {
            if (!selectedDisciplineIds.has(id)) return true;
        }
        return false;
    })();


    if (loading) return <div>Carregando...</div>; // TODO: Add styled loader
    if (error && !course) return <div className={styles.errorMessage}>Erro: {error}</div>; // Show initial load error

    return (
        <div className={styles.pageContainer}>
            <Link to="/admin/courses" className={styles.backLink}>&larr; Voltar para Cursos</Link>
            {course ? (
                <h1>Gerenciar Disciplinas Associadas - {course.title} ({course.code})</h1>
            ) : (
                <h1>Gerenciar Disciplinas Associadas</h1>
            )}
            <p>Selecione as disciplinas do banco que devem fazer parte deste curso.</p>

            {error && <p className={styles.errorMessage}>{error}</p>}
            {successMessage && <p className={styles.successMessage}>{successMessage}</p>}

            <div className={styles.disciplineListContainer}>
                {allDisciplines.length === 0 ? (
                    <p>Nenhuma disciplina encontrada no banco.</p>
                ) : (
                    allDisciplines.map(discipline => (
                        <div key={discipline.id} className={styles.disciplineItem}>
                            <input
                                type="checkbox"
                                id={`assoc-disc-${discipline.id}`}
                                checked={selectedDisciplineIds.has(discipline.id)}
                                onChange={(e) => handleSelectionChange(discipline.id, e.target.checked)}
                                disabled={saving || loading}
                            />
                            <label htmlFor={`assoc-disc-${discipline.id}`}>
                                {discipline.number ? `${discipline.number}. ` : ''}{discipline.title}
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

export default AdminAssociatedDisciplinesPage; // Added default export