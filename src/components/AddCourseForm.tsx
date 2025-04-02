// src/components/AddCourseForm.tsx (Updated with Activity Logging)
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { generateCourseCode } from '../utils/courseUtils';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth
import styles from './AddCourseForm.module.css';

interface AddCourseFormProps {
  onCourseAdded: () => void;
}

const AddCourseForm: React.FC<AddCourseFormProps> = ({ onCourseAdded }) => {
  const { user } = useAuth(); // Get the current user
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) { // Ensure user is logged in
        setError("Usuário não autenticado.");
        return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim() || null;
    const courseCode = generateCourseCode(trimmedTitle);

    if (!trimmedTitle) {
      setError('O título do curso é obrigatório.');
      setLoading(false);
      return;
    }
    if (!courseCode) {
        setError('Não foi possível gerar um código para o título fornecido.');
        setLoading(false);
        return;
    }


    try {
      // Admin role allows insert via RLS policy
      // Modify insert to select the created course ID
      const { data: newCourseData, error: insertError } = await supabase
        .from('courses')
        .insert([{
            title: trimmedTitle,
            description: trimmedDescription,
            code: courseCode
         }])
         .select('id') // Select the ID of the inserted row
         .single(); // Expect only one row back

      if (insertError) {
        if (insertError.message.includes('courses_code_key')) {
             throw new Error(`O código gerado '${courseCode}' já existe. Tente um título ligeiramente diferente.`);
        }
        throw insertError;
      }

      if (!newCourseData || !newCourseData.id) {
          throw new Error('Falha ao obter o ID do curso recém-criado.');
      }

      const newCourseId = newCourseData.id;

      // Log the activity
      const { error: logError } = await supabase.from('activity_log').insert({
          user_id: user.id,
          action_type: 'course_created',
          target_id: newCourseId,
          target_type: 'course',
          details: { course_title: trimmedTitle, course_code: courseCode }
      });

      if (logError) {
          console.error("Error logging course creation activity:", logError);
          // Don't block user flow, just log the error
      }

      setSuccess(`Curso "${trimmedTitle}" (${courseCode}) adicionado com sucesso!`);
      setTitle(''); // Clear form
      setDescription('');
      onCourseAdded(); // Trigger refresh in parent
    } catch (err: any) {
      console.error("Error adding course:", err);
      setError(err.message || 'Falha ao adicionar curso.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <h2>Adicionar Novo Curso</h2>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="courseTitle">Título:</label>
          <input
            type="text"
            id="courseTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={loading}
            placeholder="Ex: Construção Naval e Offshore"
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="courseDescription">Descrição:</label>
          <textarea
            id="courseDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            placeholder="Uma breve descrição do curso"
          />
        </div>
        <button type="submit" disabled={loading} className={styles.submitButton}>
          {loading ? 'Adicionando...' : 'Adicionar Curso'}
        </button>
        {error && <p className={styles.errorMessage}>Erro: {error}</p>}
        {success && <p className={styles.successMessage}>{success}</p>}
      </form>
    </div>
  );
};

export default AddCourseForm;