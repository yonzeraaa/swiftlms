import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import styles from './EditDisciplineModal.module.css'; // To be created

// Re-use or define Discipline type (ensure it matches DisciplineBankList)
interface Discipline {
  id: string;
  title: string;
  number: string | null;
  order: number | null;
  description: string | null;
}

interface EditDisciplineModalProps {
    discipline: Discipline | null; // The discipline to edit
    onClose: () => void;
    onDisciplineUpdated: () => void; // Callback to refresh list in parent
}

const EditDisciplineModal: React.FC<EditDisciplineModalProps> = ({ discipline, onClose, onDisciplineUpdated }) => {
    const [title, setTitle] = useState('');
    // const [number, setNumber] = useState(''); // Removed number state
    const [order, setOrder] = useState<number | ''>('');
    const [description, setDescription] = useState(''); // Add state for description if needed
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Pre-fill form when discipline prop changes
    useEffect(() => {
        if (discipline) {
            setTitle(discipline.title);
            // setNumber(discipline.number || ''); // Removed number pre-fill
            setOrder(discipline.order ?? '');
            setDescription(discipline.description || ''); // Pre-fill description
            setError(null); // Clear previous errors
        } else {
            // Clear form if no discipline is selected (modal closed)
            setTitle('');
            // setNumber(''); // Removed number clear
            setOrder('');
            setDescription('');
            setError(null);
        }
    }, [discipline]);

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
        if (!discipline) return; // Should not happen if modal is open

        setLoading(true);
        setError(null);

        // const formattedNumber = formatNumber(number); // Removed number formatting
        const finalOrder = order === '' ? null : order;
        const trimmedTitle = title.trim();
        const trimmedDescription = description.trim() || null; // Handle description

        if (!trimmedTitle) {
            setError('O título da disciplina é obrigatório.');
            setLoading(false);
            return;
        }
        // Removed validation for number
        // if (!formattedNumber) { ... }

        try {
            const updateData = {
                title: trimmedTitle,
                number: null, // Set number to null or keep existing if needed
                order: finalOrder,
                description: trimmedDescription, // Include description
                // updated_at will be handled by trigger if exists
            };

            const { error: updateError } = await supabase
                .from('disciplines')
                .update(updateData)
                .eq('id', discipline.id);

            if (updateError) throw updateError;

            alert('Disciplina atualizada com sucesso!');
            onDisciplineUpdated(); // Refresh list in parent
            onClose(); // Close modal

        } catch (err: any) {
            console.error("Error updating discipline:", err);
            setError(err.message || 'Falha ao atualizar disciplina.');
        } finally {
            setLoading(false);
        }
    };

    // Don't render the modal if no discipline is selected
    if (!discipline) {
        return null;
    }

    return (
        <div className={styles.modalBackdrop} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <h2>Editar Disciplina: {discipline.title}</h2>
                <form onSubmit={handleSubmit}>
                    {/* Form Row: Number and Title */}
                    <div className={styles.formRow}>
                        {/* Removed Number Input */}
                        <label htmlFor="editDisciplineTitle">Título:</label>
                        <input
                            type="text"
                            id="editDisciplineTitle"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            disabled={loading}
                            placeholder="Ex: Introdução"
                            style={{ flexGrow: 1 }} // Allow title to take remaining space
                        />
                    </div>

                    {/* Form Row: Order and Description */}
                    <div className={styles.formRow}>
                         <label htmlFor="editDisciplineOrder">Ordem (Opcional):</label>
                         <input
                            type="number"
                            id="editDisciplineOrder"
                            value={order}
                            onChange={handleOrderChange}
                            disabled={loading}
                            placeholder="Ex: 1"
                            min="1"
                            style={{ width: '70px', marginRight: '10px' }}
                         />
                    </div>
                     <div className={styles.formGroup}> {/* Use formGroup for full width */}
                        <label htmlFor="editDisciplineDescription">Descrição (Opcional):</label>
                        <textarea
                            id="editDisciplineDescription"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={loading}
                            rows={3}
                            placeholder="Uma breve descrição da disciplina"
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

export default EditDisciplineModal;