// src/components/EditCourseModal.tsx (Updated with Activity Logging)
import React, { useState, useEffect, useCallback } from 'react'; // Import useCallback
import { supabase } from '../services/supabaseClient';
import { generateCourseCode } from '../utils/courseUtils';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth
import styles from './EditCourseModal.module.css';

interface Course {
    id: string;
    title: string;
    description: string | null;
    code: string | null;
    // No need to include disciplines here, we fetch associations separately
}

// Interface for basic discipline data fetched from the bank
interface AvailableDiscipline {
  id: string;
  title: string;
  number: string | null;
}

interface EditCourseModalProps {
    course: Course | null;
    onClose: () => void;
    onCourseUpdated: () => void;
}

const EditCourseModal: React.FC<EditCourseModalProps> = ({ course, onClose, onCourseUpdated }) => {
    const { user } = useAuth(); // Get the current user
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [currentCode, setCurrentCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null); // Error for course update itself

    // State for discipline management
    const [availableDisciplines, setAvailableDisciplines] = useState<AvailableDiscipline[]>([]);
    const [initialAssociatedIds, setInitialAssociatedIds] = useState<Set<string>>(new Set());
    const [selectedDisciplineIds, setSelectedDisciplineIds] = useState<Set<string>>(new Set());
    const [disciplinesLoading, setDisciplinesLoading] = useState<boolean>(false);
    const [disciplinesError, setDisciplinesError] = useState<string | null>(null);

    // Fetch available disciplines and current associations when modal opens/course changes
    useEffect(() => {
        const fetchDisciplinesData = async () => {
            if (!course) return; // Don't fetch if no course is selected

            setDisciplinesLoading(true);
            setDisciplinesError(null);
            setInitialAssociatedIds(new Set()); // Reset initial state
            setSelectedDisciplineIds(new Set()); // Reset selected state

            try {
                // Fetch all available disciplines
                const { data: allDisciplinesData, error: allDisciplinesError } = await supabase
                    .from('disciplines')
                    .select('id, title, number')
                    .order('number', { ascending: true })
                    .order('title', { ascending: true });

                if (allDisciplinesError) throw new Error(`Falha ao buscar disciplinas disponíveis: ${allDisciplinesError.message}`);
                setAvailableDisciplines(allDisciplinesData || []);

                // Fetch currently associated discipline IDs for this course
                const { data: associatedData, error: associatedError } = await supabase
                    .from('course_disciplines')
                    .select('discipline_id')
                    .eq('course_id', course.id);

                if (associatedError) throw new Error(`Falha ao buscar disciplinas associadas: ${associatedError.message}`);

                const associatedIds = new Set(associatedData?.map(item => item.discipline_id) || []);
                setInitialAssociatedIds(associatedIds);
                setSelectedDisciplineIds(associatedIds); // Initialize selection with current associations

            } catch (err: any) {
                console.error("Error fetching discipline data for modal:", err);
                setDisciplinesError(err.message || 'Falha ao carregar dados das disciplinas.');
                setAvailableDisciplines([]);
                setInitialAssociatedIds(new Set());
                setSelectedDisciplineIds(new Set());
            } finally {
                setDisciplinesLoading(false);
            }
        };

        if (course) {
            // Set basic course details
            setTitle(course.title);
            setDescription(course.description || '');
            setCurrentCode(course.code || '');
            setError(null); // Clear previous course update errors
            // Fetch discipline data
            fetchDisciplinesData();
        } else {
            // Clear form when no course is selected (modal closed)
            setTitle('');
            setDescription('');
            setCurrentCode('');
            setAvailableDisciplines([]);
            setInitialAssociatedIds(new Set());
            setSelectedDisciplineIds(new Set());
            setDisciplinesError(null);
        }
    }, [course]); // Rerun when the course prop changes

    // Handle checkbox change for selecting disciplines
    const handleDisciplineSelectionChange = (disciplineId: string, isSelected: boolean) => {
        setSelectedDisciplineIds(prevIds => {
        const newIds = new Set(prevIds);
        if (isSelected) {
            newIds.add(disciplineId);
        } else {
            newIds.delete(disciplineId);
        }
        return newIds;
        });
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!course || !user) { // Ensure course and user exist
             setError("Curso ou usuário não encontrado.");
             return;
        }

        setLoading(true);
        setError(null);

        const trimmedTitle = title.trim();
        const trimmedDescription = description.trim() || null;
        const newCode = generateCourseCode(trimmedTitle);

        if (!trimmedTitle) {
            setError('O título do curso é obrigatório.');
            setLoading(false);
            return;
        }
        if (!newCode) {
            setError('Não foi possível gerar um código para o título fornecido.');
            setLoading(false);
            return;
        }

        try {
            const updateData: Partial<Course> = {
                title: trimmedTitle,
                description: trimmedDescription,
            };
            let codeChanged = false;
            if (newCode !== currentCode) {
                updateData.code = newCode;
                codeChanged = true;
            }

            const { error: updateError } = await supabase
                .from('courses')
                .update(updateData)
                .eq('id', course.id);

            if (updateError) {
                 if (updateError.message.includes('courses_code_key')) {
                    throw new Error(`O novo código gerado '${newCode}' já existe. Tente um título ligeiramente diferente.`);
                }
                throw updateError;
            }

            // --- Manage Discipline Associations ---
            const disciplinesToAdd = Array.from(selectedDisciplineIds).filter(id => !initialAssociatedIds.has(id));
            const disciplinesToRemove = Array.from(initialAssociatedIds).filter(id => !selectedDisciplineIds.has(id));
            let associationError: string | null = null;

            // Remove associations
            if (disciplinesToRemove.length > 0) {
                console.log("Removing associations:", disciplinesToRemove);
                const { error: deleteError } = await supabase
                    .from('course_disciplines')
                    .delete()
                    .eq('course_id', course.id)
                    .in('discipline_id', disciplinesToRemove);

                if (deleteError) {
                    console.error("Error removing discipline associations:", deleteError);
                    associationError = `Falha ao remover associações: ${deleteError.message}`;
                    // Continue despite error to attempt adding new ones if any
                }
            }

            // Add associations
            if (disciplinesToAdd.length > 0) {
                console.log("Adding associations:", disciplinesToAdd);
                const newAssociations = disciplinesToAdd.map(disciplineId => ({
                    course_id: course.id,
                    discipline_id: disciplineId,
                }));
                const { error: insertError } = await supabase
                    .from('course_disciplines')
                    .insert(newAssociations);

                if (insertError) {
                    console.error("Error adding discipline associations:", insertError);
                    // Append to existing error or set new one
                    associationError = associationError
                        ? `${associationError}; Falha ao adicionar associações: ${insertError.message}`
                        : `Falha ao adicionar associações: ${insertError.message}`;
                }
            }
            // --- End Association Management ---


            // Log the activity after successful update (include association info)
            const logDetails: Record<string, any> = {
                course_title: trimmedTitle,
                disciplines_added: disciplinesToAdd.length,
                disciplines_removed: disciplinesToRemove.length
             };
            if (codeChanged) {
                logDetails.old_code = currentCode;
                logDetails.new_code = newCode;
            }
            // Add other changed fields if needed

            const { error: logError } = await supabase.from('activity_log').insert({
                user_id: user.id,
                action_type: 'course_updated',
                target_id: course.id,
                target_type: 'course',
                details: logDetails
            });

            if (logError) {
                console.error("Error logging course update activity:", logError);
                // Don't block user flow, just log the error
            }

            if (associationError) {
                 setError(associationError); // Show association error
                 alert('Curso atualizado, mas houve erro ao gerenciar disciplinas associadas.');
            } else {
                 alert('Curso e disciplinas associadas atualizados com sucesso!');
            }

            onCourseUpdated(); // Refresh list in parent
            onClose(); // Close modal

        } catch (err: any) {
            console.error("Error updating course:", err);
            setError(err.message || 'Falha ao atualizar curso.');
        } finally {
            setLoading(false);
        }
    };

    if (!course) {
        return null;
    }

    return (
        <div className={styles.modalBackdrop} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <h2>Editar Curso: {course.title}</h2>
                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label htmlFor="editCourseTitle">Título:</label>
                        <input
                            type="text"
                            id="editCourseTitle"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="editCourseDescription">Descrição:</label>
                        <textarea
                            id="editCourseDescription"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={loading}
                            rows={4}
                        />
                    </div>
                     <p className={styles.codeInfo}>Código Atual: {currentCode} {currentCode !== generateCourseCode(title.trim()) ? `(Novo código gerado: ${generateCourseCode(title.trim())})` : ''}</p>

                     {/* Discipline Selection Section */}
                     <div className={styles.formGroup}>
                        <label>Disciplinas Associadas:</label>
                        {disciplinesLoading && <p>Carregando disciplinas...</p>}
                        {disciplinesError && <p className={styles.errorMessage}>{disciplinesError}</p>}
                        {!disciplinesLoading && !disciplinesError && (
                            availableDisciplines.length === 0 ? (
                                <p>Nenhuma disciplina encontrada no banco.</p>
                            ) : (
                                <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--border-radius-sm)', padding: '10px', marginTop: '5px' }}>
                                    {availableDisciplines.map(discipline => (
                                        <div key={discipline.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                                            <input
                                                type="checkbox"
                                                id={`edit-discipline-select-${discipline.id}`}
                                                checked={selectedDisciplineIds.has(discipline.id)}
                                                onChange={(e) => handleDisciplineSelectionChange(discipline.id, e.target.checked)}
                                                disabled={loading} // Disable while main form is submitting
                                                style={{ marginRight: '8px', cursor: 'pointer' }}
                                            />
                                            <label htmlFor={`edit-discipline-select-${discipline.id}`} style={{ fontWeight: 'normal', cursor: 'pointer' }}>
                                                {discipline.number ? `${discipline.number}. ` : ''}{discipline.title}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}
                     </div>

                    {error && <p className={styles.errorMessage}>Erro: {error}</p>}

                    <div className={styles.buttonGroup}>
                        <button type="submit" disabled={loading} className={styles.saveButton}>
                            {loading ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                        <button type="button" onClick={onClose} disabled={loading} className={styles.cancelButton}>
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditCourseModal;