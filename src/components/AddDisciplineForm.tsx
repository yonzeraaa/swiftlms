// src/components/AddDisciplineForm.tsx
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import styles from './AddDisciplineForm.module.css'; // Import styles

interface AddDisciplineFormProps {
  courseId: string; // ID of the course to add the discipline to
  onDisciplineAdded: () => void; // Callback to refresh the list
}

const AddDisciplineForm: React.FC<AddDisciplineFormProps> = ({ courseId, onDisciplineAdded }) => {
  const [title, setTitle] = useState('');
  const [number, setNumber] = useState(''); // Store as string "01", "02" etc.
  const [order, setOrder] = useState<number | ''>(''); // Optional explicit order
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Helper to format number (e.g., 1 -> "01", 10 -> "10")
  const formatNumber = (numStr: string): string => {
    const num = parseInt(numStr, 10);
    if (isNaN(num) || num <= 0) return '';
    return num < 10 ? `0${num}` : `${num}`;
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    // Allow only digits
    if (/^\d*$/.test(rawValue)) {
        setNumber(rawValue); // Store raw input temporarily
    }
  };

  const handleNumberBlur = () => {
    // Format on blur
    setNumber(formatNumber(number));
  };

   const handleOrderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOrder(val === '' ? '' : parseInt(val, 10));
  };


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formattedNumber = formatNumber(number); // Ensure formatting before submit
    const finalOrder = order === '' ? null : order; // Handle empty string for order

    if (!title.trim()) {
      setError('O título da disciplina é obrigatório.');
      setLoading(false);
      return;
    }
     if (!formattedNumber) {
      setError('O número da disciplina é obrigatório (ex: 01, 02).');
      setLoading(false);
      return;
    }


    try {
      // Admin role allows insert via RLS policy
      const { error: insertError } = await supabase
        .from('disciplines')
        .insert([{
            course_id: courseId,
            title: title.trim(),
            number: formattedNumber, // Use formatted number
            order: finalOrder // Use final order value
        }]);

      if (insertError) throw insertError;

      setSuccess(`Disciplina "${title.trim()}" (${formattedNumber}) adicionada com sucesso!`);
      setTitle(''); // Clear form
      setNumber('');
      setOrder('');
      onDisciplineAdded(); // Trigger refresh in parent
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
          <label htmlFor="disciplineNumber">Número:</label>
          <input
            type="text" // Use text to allow leading zero input
            id="disciplineNumber"
            value={number}
            onChange={handleNumberChange}
            onBlur={handleNumberBlur} // Format on blur
            required
            disabled={loading}
            placeholder="Ex: 01"
            pattern="\d+" // Basic pattern for digits
            title="Digite o número da disciplina (ex: 1, 2, 10)"
            style={{ width: '50px', marginRight: '10px' }}
          />
           <label htmlFor="disciplineTitle">Título:</label>
          <input
            type="text"
            id="disciplineTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={loading}
            placeholder="Ex: Introdução"
            style={{ width: '300px', marginRight: '10px' }}
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