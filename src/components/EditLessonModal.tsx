import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import styles from './EditLessonModal.module.css'; // Será criado

// Re-use or define Lesson type (ensure it matches LessonBankList)
interface Lesson {
  id: string;
  title: string;
  number: string | null;
  order: number | null;
  content: string | null;
  video_url: string | null;
}

interface EditLessonModalProps {
    lesson: Lesson | null; // The lesson to edit
    onClose: () => void;
    onLessonUpdated: () => void; // Callback to refresh list in parent
}

const EditLessonModal: React.FC<EditLessonModalProps> = ({ lesson, onClose, onLessonUpdated }) => {
    const [title, setTitle] = useState('');
    // const [number, setNumber] = useState(''); // Removed number state
    const [order, setOrder] = useState<number | ''>('');
    const [content, setContent] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Pre-fill form when lesson prop changes
    useEffect(() => {
        if (lesson) {
            setTitle(lesson.title);
            // setNumber(lesson.number || ''); // Removed number pre-fill
            setOrder(lesson.order ?? '');
            setContent(lesson.content || '');
            setVideoUrl(lesson.video_url || '');
            setError(null); // Clear previous errors
        } else {
            // Clear form if no lesson is selected (modal closed)
            setTitle('');
            // setNumber(''); // Removed number clear
            setOrder('');
            setContent('');
            setVideoUrl('');
            setError(null);
        }
    }, [lesson]);

    // Removed number formatting and handling functions
    // const formatNumber = ...
    // const handleNumberChange = ...
    // const handleNumberBlur = ...

    const handleOrderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setOrder(val === '' ? '' : parseInt(val, 10));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!lesson) return; // Should not happen if modal is open

        setLoading(true);
        setError(null);

        // const formattedNumber = formatNumber(number); // Removed number formatting
        const finalOrder = order === '' ? null : order;
        const trimmedTitle = title.trim();
        const trimmedContent = content.trim() || null;
        const finalVideoUrl = videoUrl.trim() || null;

        if (!trimmedTitle) {
            setError('O título da aula é obrigatório.');
            setLoading(false);
            return;
        }
        // Removed validation for number
        // if (!formattedNumber) { ... }

        try {
            const updateData = {
                title: trimmedTitle,
                number: null, // Set number to null or keep existing if needed, depends on desired behavior
                order: finalOrder,
                content: trimmedContent,
                video_url: finalVideoUrl,
                // updated_at will be handled by trigger if exists
            };

            const { error: updateError } = await supabase
                .from('lessons')
                .update(updateData)
                .eq('id', lesson.id);

            if (updateError) throw updateError;

            alert('Aula atualizada com sucesso!');
            onLessonUpdated(); // Refresh list in parent
            onClose(); // Close modal

        } catch (err: any) {
            console.error("Error updating lesson:", err);
            setError(err.message || 'Falha ao atualizar aula.');
        } finally {
            setLoading(false);
        }
    };

    // Don't render the modal if no lesson is selected
    if (!lesson) {
        return null;
    }

    return (
        <div className={styles.modalBackdrop} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <h2>Editar Aula: {lesson.title}</h2>
                <form onSubmit={handleSubmit}>
                    {/* Row 1: Number and Title */}
                    <div className={styles.formRow}>
                        {/* Removed Number Input */}
                        <label htmlFor="editLessonTitle">Título:</label>
                        <input
                            type="text"
                            id="editLessonTitle"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            disabled={loading}
                            placeholder="Ex: Introdução"
                            style={{ flexGrow: 1 }} // Allow title to take remaining space
                        />
                    </div>

                    {/* Row 2: Order */}
                    <div className={styles.formRow}>
                         <label htmlFor="editLessonOrder">Ordem (Opcional):</label>
                         <input
                            type="number"
                            id="editLessonOrder"
                            value={order}
                            onChange={handleOrderChange}
                            disabled={loading}
                            placeholder="Ex: 1"
                            min="1"
                            style={{ width: '70px' }}
                         />
                    </div>

                    {/* Row 3: Content */}
                     <div className={styles.formGroup}>
                        <label htmlFor="editLessonContent">Conteúdo:</label>
                        <textarea
                            id="editLessonContent"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            disabled={loading}
                            rows={5}
                            placeholder="Digite o conteúdo principal da aula aqui..."
                            style={{ width: '100%' }}
                        />
                    </div>

                    {/* Row 4: Video URL */}
                     <div className={styles.formGroup}>
                        <label htmlFor="editLessonVideoUrl">URL do Vídeo/PDF (Opcional):</label>
                        <input
                            type="url"
                            id="editLessonVideoUrl"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            disabled={loading}
                            placeholder="https://... (YouTube, Vimeo, MP4, PDF, Google Drive)"
                            style={{ width: '100%' }}
                        />
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

export default EditLessonModal;