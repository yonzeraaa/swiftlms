// src/components/EditCourseModal.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { generateCourseCode } from '../utils/courseUtils'; // Reuse code generator
import styles from './EditCourseModal.module.css'; // Create styles later

interface Course {
    id: string;
    title: string;
    description: string | null;
    code: string | null;
}

interface EditCourseModalProps {
    course: Course | null; // Course data to edit, or null if modal is closed
    onClose: () => void; // Function to close the modal
    onCourseUpdated: () => void; // Function to refresh list after update
}

const EditCourseModal: React.FC<EditCourseModalProps> = ({ course, onClose, onCourseUpdated }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [currentCode, setCurrentCode] = useState(''); // Store original code for comparison
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Pre-fill form when course data changes (modal opens)
    useEffect(() => {
        if (course) {
            setTitle(course.title);
            setDescription(course.description || '');
            setCurrentCode(course.code || ''); // Store original code
            setError(null); // Clear previous errors
        } else {
            // Reset form when modal closes
            setTitle('');
            setDescription('');
            setCurrentCode('');
        }
    }, [course]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!course) return; // Should not happen if modal is open

        setLoading(true);
        setError(null);

        const trimmedTitle = title.trim();
        const trimmedDescription = description.trim() || null;
        const newCode = generateCourseCode(trimmedTitle); // Generate new code based on potentially new title

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
            // Prepare update data
            const updateData: Partial<Course> = {
                title: trimmedTitle,
                description: trimmedDescription,
            };
            // Only update code if it changed AND is different from original
            if (newCode !== currentCode) {
                updateData.code = newCode;
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

    // Don't render anything if no course is selected (modal closed)
    if (!course) {
        return null;
    }

    // Render the modal
    return (
        <div className={styles.modalBackdrop} onClick={onClose}> {/* Close on backdrop click */}
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}> {/* Prevent closing when clicking inside */}
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