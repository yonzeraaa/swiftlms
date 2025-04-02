// src/components/AddCourseForm.tsx (Updated)
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { generateCourseCode } from '../utils/courseUtils'; // Import the helper function
import styles from './AddCourseForm.module.css'; // Import styles

interface AddCourseFormProps {
  onCourseAdded: () => void; // Callback to refresh the list after adding
}

const AddCourseForm: React.FC<AddCourseFormProps> = ({ onCourseAdded }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim() || null;
    const courseCode = generateCourseCode(trimmedTitle); // Generate code

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
      const { error: insertError } = await supabase
        .from('courses')
        .insert([{
            title: trimmedTitle,
            description: trimmedDescription,
            code: courseCode // Include the generated code
         }]);

      if (insertError) {
        if (insertError.message.includes('courses_code_key')) {
             throw new Error(`O código gerado '${courseCode}' já existe. Tente um título ligeiramente diferente.`);
        }
        throw insertError;
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
    <div className={styles.formContainer}> {/* Apply container style */}
      <h2>Adicionar Novo Curso</h2>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}> {/* Apply group style */}
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
        <div className={styles.formGroup}> {/* Apply group style */}
          <label htmlFor="courseDescription">Descrição:</label>
          <textarea
            id="courseDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            placeholder="Uma breve descrição do curso"
          />
        </div>
        <button type="submit" disabled={loading} className={styles.submitButton}> {/* Apply button style */}
          {loading ? 'Adicionando...' : 'Adicionar Curso'}
        </button>
        {error && <p className={styles.errorMessage}>Erro: {error}</p>} {/* Apply error style */}
        {success && <p className={styles.successMessage}>{success}</p>} {/* Apply success style */}
      </form>
    </div>
  );
};

export default AddCourseForm;