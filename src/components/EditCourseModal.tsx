// src/components/EditCourseModal.tsx (Updated with Activity Logging)
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { generateCourseCode } from '../utils/courseUtils';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth
import styles from './EditCourseModal.module.css';

interface Course {
    id: string;
    title: string;
    description: string | null;
    code: string | null;
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
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (course) {
            setTitle(course.title);
            setDescription(course.description || '');
            setCurrentCode(course.code || '');
            setError(null);
        } else {
            setTitle('');
            setDescription('');
            setCurrentCode('');
        }
    }, [course]);

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

            // Log the activity after successful update
            const logDetails: Record<string, any> = { course_title: trimmedTitle };
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


            alert('Curso atualizado com sucesso!');
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
                     <p className={styles.codeInfo}>Código Atual: {currentCode} {currentCode !== generateCourseCode(title.trim()) ? `(Novo será: ${generateCourseCode(title.trim())})` : ''}</p>

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