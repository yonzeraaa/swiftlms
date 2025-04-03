// src/components/AddDisciplineForm.tsx
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import styles from './AddDisciplineForm.module.css'; // Import styles

interface AddDisciplineFormProps {
  // courseId is no longer needed as disciplines are managed centrally
  onDisciplineCreated: () => void; // Callback after creation
}

const AddDisciplineForm: React.FC<AddDisciplineFormProps> = ({ onDisciplineCreated }) => {
  const [title, setTitle] = useState('');
  // const [number, setNumber] = useState(''); // Removed number state
  const [order, setOrder] = useState<number | ''>(''); // Optional explicit order
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    setLoading(true);
    setError(null);
    setSuccess(null);

    // const formattedNumber = formatNumber(number); // Removed number formatting
    const finalOrder = order === '' ? null : order; // Handle empty string for order

    if (!title.trim()) {
      setError('O título da disciplina é obrigatório.');
      setLoading(false);
      return;
    }
    // Removed validation for number
    // if (!formattedNumber) { ... }


    try {
      // Admin role allows insert via RLS policy
      const { error: insertError } = await supabase
        .from('disciplines')
        .insert([{
            // course_id is removed as disciplines are independent now
            title: title.trim(),
            number: null, // Set number to null or remove if DB default is null
            order: finalOrder // Use final order value
        }]);

      if (insertError) throw insertError;

      setSuccess(`Disciplina "${title.trim()}" adicionada com sucesso!`); // Removed number from success message
      setTitle(''); // Clear form
      // setNumber(''); // Removed number clearing
      setOrder('');
      onDisciplineCreated(); // Trigger callback in parent
    } catch (err: any) {
      console.error("Error adding discipline:", err);
      setError(err.message || 'Falha ao adicionar disciplina.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formContainer}> {/* Apply container style */}
      <h3>Adicionar Nova Disciplina</h3>
      <form onSubmit={handleSubmit}>
        <div className={styles.formRow}> {/* Apply row style */}
          {/* Removed Number Input */}
           <label htmlFor="disciplineTitle">Título:</label>
          <input
            type="text"
            id="disciplineTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={loading}
            placeholder="Ex: Introdução"
            style={{ flexGrow: 1, marginRight: '10px' }} /* Allow title to grow */
          />
           <label htmlFor="disciplineOrder">Ordem (Opcional):</label>
           <input
            type="number"
            id="disciplineOrder"
            value={order}
            onChange={handleOrderChange}
            disabled={loading}
            placeholder="Ex: 1"
            min="1"
             style={{ width: '60px' }}
          />
        </div>

        <button type="submit" disabled={loading} className={styles.submitButton}> {/* Apply button style */}
          {loading ? 'Adicionando...' : 'Adicionar Disciplina'}
        </button>
        {error && <p className={styles.errorMessage}>Erro: {error}</p>} {/* Apply error style */}
        {success && <p className={styles.successMessage}>{success}</p>} {/* Apply success style */}
      </form>
    </div>
  );
};

export default AddDisciplineForm;